#!/usr/bin/env node
/**
 * Deep Source Verification — PubMed + Crossref APIs
 *
 * Verifies that PMID citations on framework edges match actual publications.
 * Cross-references metadata from both PubMed and Crossref to catch:
 *   - Invalid/non-existent PMIDs
 *   - Author name mismatches
 *   - Publication year mismatches
 *   - Title divergence between PubMed and Crossref (DOI mismatch indicator)
 *   - Missing metadata that can be auto-filled
 *
 * Usage:
 *   node scripts/verify-sources.cjs                          # audit coverage
 *   node scripts/verify-sources.cjs --verify                 # PubMed checks
 *   node scripts/verify-sources.cjs --verify --crossref      # + Crossref
 *   node scripts/verify-sources.cjs --verify --enrich        # auto-fill missing data
 *   node scripts/verify-sources.cjs --verify --crossref --enrich --output report.json
 *   node scripts/verify-sources.cjs --verify --limit=50      # first 50 PMIDs
 *   node scripts/verify-sources.cjs --claims                 # verify claims vs abstracts
 *   node scripts/verify-sources.cjs --claims --limit=20      # first 20 edges
 *   node scripts/verify-sources.cjs --metrics                # fetch citation metrics via iCite
 *   node scripts/verify-sources.cjs --metrics --enrich       # + write metrics to data file
 *
 * The --claims flag fetches PubMed abstracts and uses Claude to check whether
 * each edge's mechanismDescription / keyInsight is actually supported by the
 * cited paper. Requires ANTHROPIC_API_KEY.
 *
 * The --metrics flag fetches citation metrics from NIH iCite for all cited PMIDs:
 *   citation_count, relative_citation_ratio, nih_percentile, citations_per_year,
 *   is_clinical, apt (approximate potential to translate), etc.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', 'alz-market-viz', '.env') });
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'demo', 'src', 'data', 'ad-framework-data.json');
const CLAIMS_PROGRESS_PATH = path.join(__dirname, '..', 'output', 'claims-progress.json');

// ── Rate limits ─────────────────────────────────────────────────────
const PUBMED_DELAY_MS = 340;   // 3 req/sec without API key
const CROSSREF_DELAY_MS = 100; // polite pool: ~10 req/sec with mailto
const PUBMED_BATCH_SIZE = 50;
const IDCONV_BATCH_SIZE = 50;
const ICITE_BATCH_SIZE = 200;  // iCite supports up to 1000, but smaller batches are safer
const ICITE_DELAY_MS = 200;
const CROSSREF_MAILTO = 'verify@untangling-alzheimers.org';

// ── Helpers ─────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Normalize an author string to a lowercase family name for comparison. */
function normalizeAuthor(name) {
  if (!name) return '';
  const parts = name.replace(/\.$/, '').trim().split(/[\s,]+/);
  // Filter out initials (1-2 uppercase chars like "JA" or "J")
  const nonInitials = parts.filter((p) => {
    const stripped = p.replace(/[.\-]/g, '');
    return stripped.length > 2 || stripped !== stripped.toUpperCase();
  });
  return (nonInitials[0] || parts[0] || '').toLowerCase();
}

/** Extract a 4-digit year from a date string. */
function extractYear(dateStr) {
  if (!dateStr) return null;
  const match = String(dateStr).match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Compute word-overlap similarity between two titles.
 * Returns a value in [0, 1] where 1 = identical word sets.
 * Only considers words with 4+ characters to ignore articles/prepositions.
 */
function titleSimilarity(a, b) {
  if (!a || !b) return 1; // can't compare → assume OK
  const words = (s) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= 4),
    );
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 1;
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  return overlap / Math.min(wa.size, wb.size);
}

function pct(n, total) {
  return `${n}/${total} (${((100 * n) / total).toFixed(1)}%)`;
}

// ── PubMed E-utilities ──────────────────────────────────────────────

/**
 * Batch fetch PubMed article summaries.
 * Returns { [pmid]: { title, authors, firstAuthor, journal, year } | { error } }
 */
async function fetchPubMedBatch(pmids) {
  const url =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi` +
    `?db=pubmed&id=${pmids.join(',')}&retmode=json` +
    `&tool=canis-verify&email=${CROSSREF_MAILTO}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed HTTP ${res.status}`);
  const data = await res.json();
  const results = {};
  for (const pmid of pmids) {
    const doc = data?.result?.[pmid];
    if (!doc || doc.error) {
      results[pmid] = { error: doc?.error || 'Not found in PubMed' };
      continue;
    }
    results[pmid] = {
      title: doc.title || '',
      authors: (doc.authors || []).map((a) => a.name),
      firstAuthor: doc.authors?.[0]?.name || '',
      journal: doc.fulljournalname || doc.source || '',
      year: extractYear(doc.pubdate),
      pubdate: doc.pubdate || '',
    };
  }
  return results;
}

// ── NCBI ID Converter (PMID → DOI) ─────────────────────────────────

/**
 * Batch convert PMIDs to DOIs via NCBI's ID converter service.
 * Returns { [pmid]: doi_string }
 */
async function convertPmidsToDoi(pmids) {
  const url =
    `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/` +
    `?ids=${pmids.join(',')}&format=json&tool=canis-verify&email=${CROSSREF_MAILTO}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NCBI IDconv HTTP ${res.status}`);
  const data = await res.json();
  const results = {};
  for (const rec of data.records || []) {
    if (rec.pmid && rec.doi) {
      results[rec.pmid] = rec.doi;
    }
  }
  return results;
}

// ── Crossref API ────────────────────────────────────────────────────

/**
 * Fetch article metadata from Crossref by DOI.
 * Returns { doi, title, firstAuthor, journal, year, type } | { error }
 */
async function fetchCrossref(doi) {
  const url =
    `https://api.crossref.org/works/${encodeURIComponent(doi)}` +
    `?mailto=${CROSSREF_MAILTO}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': `CANIS-verify/1.0 (mailto:${CROSSREF_MAILTO})`,
    },
  });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const data = await res.json();
  const work = data?.message;
  if (!work) return { error: 'Empty Crossref response' };

  const firstFamily = work.author?.[0]?.family || '';

  // Prefer print date, then online, then created
  const dateParts =
    work['published-print']?.['date-parts']?.[0] ||
    work['published-online']?.['date-parts']?.[0] ||
    work['created']?.['date-parts']?.[0];
  const year = dateParts?.[0] || null;

  const title = Array.isArray(work.title)
    ? work.title[0]
    : work.title || '';

  const journal = Array.isArray(work['container-title'])
    ? work['container-title'][0]
    : work['container-title'] || '';

  return { doi, title, firstAuthor: firstFamily, journal, year, type: work.type };
}

// ── NIH iCite (citation metrics) ────────────────────────────────────

/**
 * Batch fetch citation metrics from NIH iCite.
 * Returns { [pmid]: { citation_count, rcr, nih_percentile, ... } }
 *
 * iCite fields we keep:
 *   citation_count          - total citations
 *   relative_citation_ratio - RCR (1.0 = field average)
 *   nih_percentile          - percentile among NIH papers (0-100)
 *   citations_per_year      - annual citation rate
 *   expected_citations_per_year
 *   field_citation_rate     - average citation rate in this field
 *   is_clinical             - clinical study flag
 *   is_research_article     - research article flag
 *   apt                     - approximate potential to translate (0-1)
 *   animal                  - animal study score (0-1)
 *   human                   - human study score (0-1)
 *   journal                 - journal name
 *   year                    - publication year
 *   title                   - article title
 *   doi                     - DOI
 */
async function fetchIciteBatch(pmids) {
  const url = `https://icite.od.nih.gov/api/pubs?pmids=${pmids.join(',')}&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iCite HTTP ${res.status}`);
  const data = await res.json();

  const results = {};
  for (const pub of data.data || []) {
    const pmid = String(pub.pmid);
    results[pmid] = {
      citation_count: pub.citation_count ?? 0,
      rcr: pub.relative_citation_ratio ?? null,
      nih_percentile: pub.nih_percentile ?? null,
      citations_per_year: pub.citations_per_year ?? null,
      expected_citations_per_year: pub.expected_citations_per_year ?? null,
      field_citation_rate: pub.field_citation_rate ?? null,
      is_clinical: pub.is_clinical ?? false,
      is_research_article: pub.is_research_article ?? true,
      apt: pub.apt ?? null,
      animal: pub.animal ?? null,
      human: pub.human ?? null,
      journal: pub.journal ?? '',
      year: pub.year ?? null,
      title: pub.title ?? '',
      doi: pub.doi ?? null,
    };
  }
  return results;
}

// ── PubMed Abstract Fetching (efetch) ───────────────────────────────

/**
 * Batch fetch PubMed abstracts via efetch XML endpoint.
 * Returns { [pmid]: abstract_text | null }
 */
async function fetchAbstractsBatch(pmids) {
  const url =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi` +
    `?db=pubmed&id=${pmids.join(',')}&rettype=abstract&retmode=xml` +
    `&tool=canis-verify&email=${CROSSREF_MAILTO}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed efetch HTTP ${res.status}`);
  const xml = await res.text();

  const results = {};
  // Parse each <PubmedArticle> block
  const articleBlocks = xml.split('<PubmedArticle>').slice(1);
  for (const block of articleBlocks) {
    const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    if (!pmidMatch) continue;
    const pmid = pmidMatch[1];

    // Extract all <AbstractText> elements and concatenate
    const abstractParts = [];
    const re = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
    let m;
    while ((m = re.exec(block)) !== null) {
      // Strip inline XML tags
      const text = m[1].replace(/<[^>]+>/g, '').trim();
      if (text) abstractParts.push(text);
    }
    results[pmid] = abstractParts.length > 0 ? abstractParts.join(' ') : null;
  }

  // Fill in any requested PMIDs that weren't in the response
  for (const pmid of pmids) {
    if (!(pmid in results)) results[pmid] = null;
  }
  return results;
}

// ── Claim Verification via Claude ───────────────────────────────────

const CLAIM_VERIFY_BATCH = 3;       // concurrent Claude calls
const CLAIM_BATCH_DELAY_MS = 2000;  // delay between batches
const CLAIM_MAX_RETRIES = 2;

/**
 * Build the strict claim verification prompt.
 */
function buildClaimPrompt(title, abstract, claims, sourceLabel, targetLabel) {
  const claimBlock = claims
    .map((c, i) => `${i + 1}. [${c.field}] "${c.text}"`)
    .join('\n');

  return `You are a strict scientific claim verifier. Your job is to determine whether claims made about a paper are actually supported by its abstract.

## Paper
Title: ${title}
Abstract: ${abstract}

## Edge context
This edge connects "${sourceLabel}" → "${targetLabel}" in a causal mechanistic network.

## Claims to verify
${claimBlock}

## Verification rules (FOLLOW EXACTLY)
- The claim can paraphrase or simplify the abstract, but must not ADD meaning, conclusions, or scope beyond what the abstract states.
- UNSUPPORTED if the claim makes factual assertions (numbers, mechanisms, outcomes) not present in the abstract.
- UNSUPPORTED if the claim generalizes a specific finding. Example: if the abstract says "necessary for glymphatic clearance effects" but the claim says "necessary mediator" (implying necessary for everything), that is unsupported.
- UNSUPPORTED if the claim draws an interpretive conclusion (e.g., "establishing X as Y") that the abstract does not itself state.
- UNSUPPORTED if the claim describes a different mechanism or process than what the abstract describes.
- UNSUPPORTED if the abstract does not mention or clearly imply the relationship described in the claim.
- SUPPORTED only if every factual assertion in the claim can be traced to a specific statement in the abstract.

## Response format
Return a JSON array with one object per claim:
[
  {"index": 1, "verdict": "SUPPORTED"|"UNSUPPORTED", "reason": "1-2 sentence explanation citing the relevant abstract text or explaining what is missing"}
]

Return ONLY the JSON array. No other text.`;
}

/**
 * Call Claude to verify claims. Returns parsed JSON array of verdicts.
 */
async function callClaudeForClaims(client, prompt) {
  for (let attempt = 0; attempt <= CLAIM_MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content[0]?.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array in response');
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      if (attempt < CLAIM_MAX_RETRIES) {
        await sleep((attempt + 1) * 2000);
      } else {
        throw err;
      }
    }
  }
}

// Common words to skip when generating text fragments
const SKIP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'of', 'and', 'or', 'to', 'for', 'is', 'are',
  'was', 'were', 'be', 'been', 'by', 'at', 'on', 'with', 'from', 'as',
  'that', 'this', 'it', 'its', 'has', 'have', 'had', 'not', 'but', 'our',
  'their', 'we', 'these', 'those', 'can', 'may', 'also', 'than', 'both',
]);

/**
 * Generate a #:~:text= URL fragment to highlight specific text on a page.
 * Selects 5-7 distinctive words from the text, stripping special chars
 * that cause problems in URL fragments.
 */
function generateTextFragment(text) {
  if (!text) return '';
  const words = text
    .replace(/[()[\]{}"'`,;:!?]/g, '')  // strip problematic chars
    .replace(/[-–—−]/g, ' ')            // dashes to spaces
    .split(/\s+/)
    .filter((w) => w.length > 0);

  // Skip leading common words, take 5-7 distinctive words
  const distinctive = [];
  for (const w of words) {
    if (distinctive.length === 0 && SKIP_WORDS.has(w.toLowerCase())) continue;
    distinctive.push(w);
    if (distinctive.length >= 6) break;
  }
  if (distinctive.length < 2) return '';
  const fragment = distinctive.join(' ');
  return `#:~:text=${encodeURIComponent(fragment)}`;
}

/**
 * Build a PubMed link, optionally with a text highlight fragment.
 */
function pubmedLink(pmid, highlightText) {
  const base = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  if (!highlightText) return base;
  const frag = generateTextFragment(highlightText);
  return frag ? `${base}${frag}` : base;
}

// ── Source Comparison ───────────────────────────────────────────────

/**
 * Compare edge metadata against PubMed and (optionally) Crossref.
 * Returns { issues: [...], enrichments: [...] }
 */
function compareSource(edge, pubmed, crossref, doi) {
  const issues = [];
  const enrichments = [];

  if (!pubmed || pubmed.error) return { issues, enrichments };

  const edgeAuthor = normalizeAuthor(edge.firstAuthor);
  const pmAuthor = normalizeAuthor(pubmed.firstAuthor);
  const crAuthor = crossref && !crossref.error
    ? normalizeAuthor(crossref.firstAuthor)
    : null;

  // ── Author ────────────────────────────────────────────────────

  if (edge.firstAuthor && pmAuthor && edgeAuthor !== pmAuthor) {
    // Check if Crossref agrees with PubMed or with edge
    let crossrefAgrees = null;
    if (crAuthor) {
      if (crAuthor === pmAuthor) crossrefAgrees = 'pubmed';
      else if (crAuthor === edgeAuthor) crossrefAgrees = 'edge';
      else crossrefAgrees = 'neither';
    }
    issues.push({
      field: 'firstAuthor',
      severity: 'error',
      edge: edge.firstAuthor,
      pubmed: pubmed.firstAuthor,
      crossref: crossref?.firstAuthor || null,
      crossrefAgrees,
    });
  }

  if (!edge.firstAuthor && pmAuthor) {
    enrichments.push({
      field: 'firstAuthor',
      value: pubmed.authors[0] || pubmed.firstAuthor,
      source: 'pubmed',
    });
  }

  // ── Year ──────────────────────────────────────────────────────

  if (edge.year && pubmed.year && edge.year !== pubmed.year) {
    const crYear = crossref && !crossref.error ? crossref.year : null;
    issues.push({
      field: 'year',
      severity: 'error',
      edge: edge.year,
      pubmed: pubmed.year,
      crossref: crYear,
    });
  }

  if (!edge.year && pubmed.year) {
    enrichments.push({ field: 'year', value: pubmed.year, source: 'pubmed' });
  }

  // ── Crossref cross-checks ────────────────────────────────────

  if (crossref && !crossref.error) {
    // Title divergence between PubMed and Crossref (DOI may point to wrong article)
    const sim = titleSimilarity(pubmed.title, crossref.title);
    if (sim < 0.4) {
      issues.push({
        field: 'title_divergence',
        severity: 'warning',
        detail: `PubMed/Crossref titles only ${(sim * 100).toFixed(0)}% similar — DOI may not match PMID`,
        pubmed: pubmed.title.slice(0, 120),
        crossref: crossref.title.slice(0, 120),
      });
    }

    // Year mismatch between PubMed and Crossref
    if (pubmed.year && crossref.year && pubmed.year !== crossref.year) {
      // ±1 year is common (online vs print date) — only flag if >1 year off
      if (Math.abs(pubmed.year - crossref.year) > 1) {
        issues.push({
          field: 'year_pubmed_vs_crossref',
          severity: 'warning',
          pubmed: pubmed.year,
          crossref: crossref.year,
        });
      }
    }
  }

  return { issues, enrichments };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const doVerify = args.includes('--verify');
  const doCrossref = args.includes('--crossref');
  const doEnrich = args.includes('--enrich');
  const doClaims = args.includes('--claims');
  const doMetrics = args.includes('--metrics');
  const outputArg = args.find((a) => a.startsWith('--output='));
  const outputPath = outputArg ? outputArg.split('=')[1] : null;
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const { nodes, edges, modules } = data;

  console.log('Source Verification Report');
  console.log('=========================\n');
  console.log(`Framework: ${nodes.length} nodes, ${edges.length} edges, ${modules.length} modules\n`);

  // ── 1. Coverage audit ──────────────────────────────────────────

  const total = edges.length;
  const withPmid = edges.filter((e) => e.pmid || e.evidence?.pmid).length;
  const withAuthor = edges.filter((e) => e.firstAuthor).length;
  const withYear = edges.filter((e) => e.year).length;
  const withMethod = edges.filter((e) => e.methodType).length;
  const withMech = edges.filter((e) => e.mechanismDescription).length;
  const fullyCited = edges.filter(
    (e) => (e.pmid || e.evidence?.pmid) && e.firstAuthor && e.year,
  ).length;

  console.log('Citation Coverage:');
  console.log(`  With PMID:              ${pct(withPmid, total)}`);
  console.log(`  With firstAuthor:       ${pct(withAuthor, total)}`);
  console.log(`  With year:              ${pct(withYear, total)}`);
  console.log(`  With methodType:        ${pct(withMethod, total)}`);
  console.log(`  With mechanismDesc:     ${pct(withMech, total)}`);
  console.log(`  Fully cited (pmid+a+y): ${pct(fullyCited, total)}`);

  // Method type distribution
  const methodDist = {};
  for (const e of edges) {
    const mt = e.methodType || '(none)';
    methodDist[mt] = (methodDist[mt] || 0) + 1;
  }
  console.log('\nMethod type distribution:');
  for (const [mt, count] of Object.entries(methodDist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${mt.padEnd(25)} ${count}`);
  }
  console.log();

  if (!doVerify && !doClaims && !doMetrics) {
    console.log('Run with --verify for PubMed validation.');
    console.log('Run with --verify --crossref for PubMed + Crossref cross-referencing.');
    console.log('Run with --verify --enrich to auto-fill missing firstAuthor/year.');
    console.log('Run with --claims for claim-vs-abstract verification.');
    console.log('Run with --metrics for citation metrics via iCite.\n');
    return;
  }

  // If only --claims (no --verify), skip PubMed metadata and jump to claims
  if (doClaims && !doVerify && !doMetrics) {
    const claimResults = await runClaimVerification(edges, limit);
    console.log('\n=== SUMMARY ===\n');
    if (claimResults) {
      console.log(`  Claims checked:     ${claimResults.total}`);
      console.log(`  Claims supported:   ${claimResults.supported}`);
      console.log(`  Claims unsupported: ${claimResults.unsupported}`);
      console.log(`  Claims errors:      ${claimResults.errors}`);
    }
    if (claimResults?.unsupported > 0) {
      console.log('\nEXIT 1: Unsupported claims found.');
      process.exit(1);
    }
    return;
  }

  // If only --metrics (no --verify), skip PubMed/Crossref and jump to metrics
  if (doMetrics && !doVerify) {
    const metricsResults = await runMetricsFetch(data, edges, doEnrich, limit, outputPath);
    // Also run claims if requested
    if (doClaims) {
      await runClaimVerification(edges, limit);
    }
    return;
  }

  // ── 2. Collect unique PMIDs ──────────────────────────────────

  const pmidToEdges = new Map();
  for (const e of edges) {
    const pmid = String(e.pmid || e.evidence?.pmid || '').trim();
    if (!pmid || pmid === 'undefined' || pmid === 'null') continue;
    if (!pmidToEdges.has(pmid)) pmidToEdges.set(pmid, []);
    pmidToEdges.get(pmid).push(e);
  }

  let uniquePmids = [...pmidToEdges.keys()];
  if (limit < uniquePmids.length) {
    uniquePmids = uniquePmids.slice(0, limit);
    console.log(`(Limited to first ${limit} PMIDs)\n`);
  }

  console.log(`Unique PMIDs to verify: ${uniquePmids.length}\n`);

  // ── 3. PubMed batch fetch ──────────────────────────────────

  console.log('Fetching PubMed metadata...');
  const pubmedData = {};
  let pubmedErrors = 0;

  for (let i = 0; i < uniquePmids.length; i += PUBMED_BATCH_SIZE) {
    const batch = uniquePmids.slice(i, i + PUBMED_BATCH_SIZE);
    const end = Math.min(i + PUBMED_BATCH_SIZE, uniquePmids.length);
    process.stdout.write(`  ${i + 1}–${end} of ${uniquePmids.length}...\r`);

    try {
      const results = await fetchPubMedBatch(batch);
      Object.assign(pubmedData, results);
    } catch (err) {
      console.log(`\n  PubMed batch error: ${err.message}`);
      for (const pmid of batch) {
        pubmedData[pmid] = { error: err.message };
        pubmedErrors++;
      }
    }

    if (i + PUBMED_BATCH_SIZE < uniquePmids.length) await sleep(PUBMED_DELAY_MS);
  }

  const invalidPmids = uniquePmids.filter((p) => pubmedData[p]?.error);
  const validPmids = uniquePmids.filter((p) => !pubmedData[p]?.error);
  console.log(
    `\nPubMed: ${validPmids.length} resolved, ${invalidPmids.length} invalid\n`,
  );

  if (invalidPmids.length > 0) {
    console.log('Invalid/unresolvable PMIDs:');
    for (const pmid of invalidPmids) {
      const edgeIds = pmidToEdges
        .get(pmid)
        .map((e) => e.id)
        .slice(0, 5)
        .join(', ');
      const suffix =
        pmidToEdges.get(pmid).length > 5
          ? ` (+${pmidToEdges.get(pmid).length - 5} more)`
          : '';
      console.log(
        `  PMID ${pmid}: ${pubmedData[pmid].error}  [edges: ${edgeIds}${suffix}]`,
      );
    }
    console.log();
  }

  // ── 4. PMID → DOI + Crossref (optional) ──────────────────

  const pmidToDoi = {};
  const crossrefData = {};

  if (doCrossref) {
    // 4a. Convert PMIDs to DOIs
    console.log('Resolving DOIs via NCBI ID converter...');

    for (let i = 0; i < validPmids.length; i += IDCONV_BATCH_SIZE) {
      const batch = validPmids.slice(i, i + IDCONV_BATCH_SIZE);
      const end = Math.min(i + IDCONV_BATCH_SIZE, validPmids.length);
      process.stdout.write(`  ${i + 1}–${end} of ${validPmids.length}...\r`);

      try {
        const results = await convertPmidsToDoi(batch);
        Object.assign(pmidToDoi, results);
      } catch (err) {
        console.log(`\n  ID converter error: ${err.message}`);
      }

      if (i + IDCONV_BATCH_SIZE < validPmids.length) await sleep(PUBMED_DELAY_MS);
    }

    const doiCount = Object.keys(pmidToDoi).length;
    console.log(
      `\nDOIs resolved: ${doiCount} of ${validPmids.length} (${((100 * doiCount) / Math.max(validPmids.length, 1)).toFixed(1)}%)\n`,
    );

    // 4b. Fetch Crossref metadata for each DOI
    if (doiCount > 0) {
      console.log('Fetching Crossref metadata...');
      const entries = Object.entries(pmidToDoi);
      let crErrors = 0;

      for (let i = 0; i < entries.length; i++) {
        const [pmid, doi] = entries[i];
        process.stdout.write(`  ${i + 1}/${entries.length}...\r`);

        try {
          crossrefData[pmid] = await fetchCrossref(doi);
          if (crossrefData[pmid].error) crErrors++;
        } catch (err) {
          crossrefData[pmid] = { error: err.message };
          crErrors++;
        }

        if (i + 1 < entries.length) await sleep(CROSSREF_DELAY_MS);
      }

      const crOk = entries.length - crErrors;
      console.log(`\nCrossref: ${crOk} resolved, ${crErrors} errors\n`);
    }
  }

  // ── 5. Compare and report ────────────────────────────────

  console.log('=== VERIFICATION RESULTS ===\n');

  let verified = 0;
  let errorCount = 0;
  let warningCount = 0;
  const allIssues = [];      // { edgeId, pmid, doi, issues[] }
  const allEnrichments = []; // { edgeId, pmid, enrichments[] }

  for (const pmid of uniquePmids) {
    const pm = pubmedData[pmid];
    if (pm?.error) continue; // already reported as invalid

    const cr = crossrefData[pmid] || null;
    const doi = pmidToDoi[pmid] || null;

    for (const edge of pmidToEdges.get(pmid)) {
      const { issues, enrichments } = compareSource(edge, pm, cr, doi);

      if (issues.length > 0) {
        const hasError = issues.some((i) => i.severity === 'error');
        if (hasError) errorCount++;
        else warningCount++;
        allIssues.push({ edgeId: edge.id, pmid, doi, issues });
      } else {
        verified++;
      }

      if (enrichments.length > 0) {
        allEnrichments.push({ edgeId: edge.id, pmid, enrichments });
      }
    }
  }

  console.log(`Verified OK:          ${verified}`);
  console.log(`Errors (mismatches):  ${errorCount}`);
  console.log(`Warnings:             ${warningCount}`);
  console.log(`Invalid PMIDs:        ${invalidPmids.length}`);
  if (doCrossref) {
    console.log(`DOIs resolved:        ${Object.keys(pmidToDoi).length}`);
    const crOk = Object.values(crossrefData).filter((d) => !d.error).length;
    console.log(`Crossref matched:     ${crOk}`);
  }
  console.log(`Enrichable edges:     ${allEnrichments.length}`);

  // ── Mismatches detail ─────────────────────────────────────

  if (allIssues.length > 0) {
    // Separate errors from warnings
    const errors = allIssues.filter((m) =>
      m.issues.some((i) => i.severity === 'error'),
    );
    const warnings = allIssues.filter(
      (m) => !m.issues.some((i) => i.severity === 'error'),
    );

    if (errors.length > 0) {
      console.log(`\n--- ERRORS (${errors.length}) ---\n`);
      for (const m of errors) {
        const doiStr = m.doi ? ` DOI:${m.doi}` : '';
        console.log(`${m.edgeId}  PMID:${m.pmid}${doiStr}`);
        for (const issue of m.issues) {
          if (issue.field === 'firstAuthor') {
            const agree = issue.crossrefAgrees
              ? ` (crossref agrees with ${issue.crossrefAgrees})`
              : '';
            console.log(
              `  author: edge="${issue.edge}" pubmed="${issue.pubmed}"` +
                (issue.crossref ? ` crossref="${issue.crossref}"` : '') +
                agree,
            );
          } else if (issue.field === 'year') {
            console.log(
              `  year: edge=${issue.edge} pubmed=${issue.pubmed}` +
                (issue.crossref != null ? ` crossref=${issue.crossref}` : ''),
            );
          }
        }
      }
    }

    if (warnings.length > 0) {
      console.log(`\n--- WARNINGS (${warnings.length}) ---\n`);
      for (const m of warnings) {
        const doiStr = m.doi ? ` DOI:${m.doi}` : '';
        console.log(`${m.edgeId}  PMID:${m.pmid}${doiStr}`);
        for (const issue of m.issues) {
          if (issue.field === 'title_divergence') {
            console.log(`  ${issue.detail}`);
            console.log(`    PubMed:   ${issue.pubmed}`);
            console.log(`    Crossref: ${issue.crossref}`);
          } else if (issue.field === 'year_pubmed_vs_crossref') {
            console.log(
              `  year differs: pubmed=${issue.pubmed} crossref=${issue.crossref}`,
            );
          }
        }
      }
    }
  }

  // ── Enrichment opportunities ──────────────────────────────

  if (allEnrichments.length > 0) {
    console.log(`\n--- ENRICHMENT OPPORTUNITIES (${allEnrichments.length} edges) ---\n`);
    const byField = {};
    for (const en of allEnrichments) {
      for (const e of en.enrichments) {
        byField[e.field] = (byField[e.field] || 0) + 1;
      }
    }
    for (const [field, count] of Object.entries(byField)) {
      console.log(`  Can fill "${field}" on ${count} edges`);
    }

    // Show first few
    console.log();
    for (const en of allEnrichments.slice(0, 15)) {
      const fields = en.enrichments.map((e) => `${e.field}="${e.value}"`).join(', ');
      console.log(`  ${en.edgeId} (PMID:${en.pmid}): ${fields}`);
    }
    if (allEnrichments.length > 15) {
      console.log(`  ... and ${allEnrichments.length - 15} more`);
    }
  }

  // ── 6. Auto-enrich (optional) ─────────────────────────────

  if (doEnrich && allEnrichments.length > 0) {
    console.log(`\n=== AUTO-ENRICHING ===\n`);

    const edgeMap = new Map(edges.map((e) => [e.id, e]));
    let fieldsWritten = 0;

    for (const { edgeId, enrichments } of allEnrichments) {
      const edge = edgeMap.get(edgeId);
      if (!edge) continue;
      for (const { field, value } of enrichments) {
        edge[field] = value;
        fieldsWritten++;
      }
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log(
      `Wrote ${fieldsWritten} fields across ${allEnrichments.length} edges → ${DATA_PATH}`,
    );
  }

  // ── 7. JSON report (optional) ─────────────────────────────

  if (outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      flags: { verify: doVerify, crossref: doCrossref, enrich: doEnrich },
      summary: {
        totalEdges: total,
        edgesWithPmid: withPmid,
        uniquePmids: uniquePmids.length,
        verified,
        errors: errorCount,
        warnings: warningCount,
        invalidPmids: invalidPmids.length,
        doisResolved: Object.keys(pmidToDoi).length,
        enrichable: allEnrichments.length,
      },
      invalidPmids: invalidPmids.map((p) => ({
        pmid: p,
        error: pubmedData[p]?.error,
        edges: pmidToEdges.get(p)?.map((e) => e.id),
      })),
      mismatches: allIssues,
      enrichments: allEnrichments,
      // Include PubMed metadata for all valid PMIDs for downstream use
      pubmedMetadata: Object.fromEntries(
        validPmids.map((p) => [
          p,
          {
            title: pubmedData[p]?.title,
            firstAuthor: pubmedData[p]?.firstAuthor,
            year: pubmedData[p]?.year,
            journal: pubmedData[p]?.journal,
            doi: pmidToDoi[p] || null,
          },
        ]),
      ),
    };
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`\nJSON report → ${outputPath}`);
  }

  // ── 8. Citation metrics (optional) ──────────────────────

  let metricsResults = null;
  if (doMetrics) {
    metricsResults = await runMetricsFetch(data, edges, doEnrich, limit, outputPath);
  }

  // ── 9. Claim verification (optional) ─────────────────────

  let claimResults = null;
  if (doClaims) {
    claimResults = await runClaimVerification(edges, limit);
  }

  // ── Exit code ─────────────────────────────────────────────

  console.log('\n=== SUMMARY ===\n');
  console.log(`Edges checked:   ${verified + errorCount + warningCount}`);
  console.log(`  OK:            ${verified}`);
  console.log(`  Errors:        ${errorCount}`);
  console.log(`  Warnings:      ${warningCount}`);
  console.log(`  Invalid PMIDs: ${invalidPmids.length}`);
  console.log(`  Enrichable:    ${allEnrichments.length}`);
  if (claimResults) {
    console.log(`  Claims checked:     ${claimResults.total}`);
    console.log(`  Claims supported:   ${claimResults.supported}`);
    console.log(`  Claims unsupported: ${claimResults.unsupported}`);
    console.log(`  Claims errors:      ${claimResults.errors}`);
  }

  // Include claim results in JSON report
  if (outputPath && claimResults) {
    const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    existing.claims = claimResults;
    fs.writeFileSync(outputPath, JSON.stringify(existing, null, 2) + '\n');
  }

  const totalErrors = errorCount + invalidPmids.length + (claimResults?.unsupported || 0);
  if (totalErrors > 0) {
    console.log('\nEXIT 1: Errors found.');
    process.exit(1);
  }
  if (warningCount > 0) {
    console.log('\nEXIT 0: Warnings only.');
  } else {
    console.log('\nAll sources verified.');
  }
}

// ── Citation Metrics Runner (iCite) ─────────────────────────────────

async function runMetricsFetch(data, edges, doEnrich, limit, outputPath) {
  console.log('\n=== CITATION METRICS (iCite) ===\n');

  // Collect unique PMIDs from edges
  const pmidSet = new Set();
  for (const e of edges) {
    const pmid = String(e.pmid || e.evidence?.pmid || '').trim();
    if (pmid && pmid !== 'undefined' && pmid !== 'null') pmidSet.add(pmid);
  }
  let uniquePmids = [...pmidSet];
  if (limit < uniquePmids.length) {
    uniquePmids = uniquePmids.slice(0, limit);
    console.log(`(Limited to first ${limit} PMIDs)\n`);
  }
  console.log(`Unique PMIDs: ${uniquePmids.length}\n`);

  // Batch fetch from iCite
  console.log('Fetching iCite metrics...');
  const iciteData = {};
  let fetchErrors = 0;

  for (let i = 0; i < uniquePmids.length; i += ICITE_BATCH_SIZE) {
    const batch = uniquePmids.slice(i, i + ICITE_BATCH_SIZE);
    const end = Math.min(i + ICITE_BATCH_SIZE, uniquePmids.length);
    process.stdout.write(`  ${i + 1}–${end} of ${uniquePmids.length}...\r`);

    try {
      const results = await fetchIciteBatch(batch);
      Object.assign(iciteData, results);
    } catch (err) {
      console.log(`\n  iCite batch error: ${err.message}`);
      fetchErrors++;
    }

    if (i + ICITE_BATCH_SIZE < uniquePmids.length) await sleep(ICITE_DELAY_MS);
  }

  const resolved = Object.keys(iciteData).length;
  const missing = uniquePmids.filter((p) => !iciteData[p]);
  console.log(`\niCite: ${resolved} resolved, ${missing.length} not found, ${fetchErrors} errors\n`);

  if (missing.length > 0 && missing.length <= 20) {
    console.log('PMIDs not in iCite:');
    for (const p of missing) console.log(`  ${p}`);
    console.log();
  }

  // ── Aggregate stats ──────────────────────────────────────────

  const metrics = Object.values(iciteData);
  const withCitations = metrics.filter((m) => m.citation_count > 0);
  const withRcr = metrics.filter((m) => m.rcr != null);

  const citeCounts = withCitations.map((m) => m.citation_count).sort((a, b) => a - b);
  const rcrValues = withRcr.map((m) => m.rcr).sort((a, b) => a - b);

  const median = (arr) => {
    if (arr.length === 0) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  };
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);

  console.log('Citation Metrics Summary:');
  console.log(`  Papers with citations: ${withCitations.length}/${resolved}`);
  if (citeCounts.length > 0) {
    console.log(`  Citation count:`);
    console.log(`    Median:  ${median(citeCounts)}`);
    console.log(`    Mean:    ${(sum(citeCounts) / citeCounts.length).toFixed(1)}`);
    console.log(`    Min:     ${citeCounts[0]}`);
    console.log(`    Max:     ${citeCounts[citeCounts.length - 1]}`);
    console.log(`    P25:     ${citeCounts[Math.floor(citeCounts.length * 0.25)]}`);
    console.log(`    P75:     ${citeCounts[Math.floor(citeCounts.length * 0.75)]}`);
  }

  if (rcrValues.length > 0) {
    console.log(`  Relative Citation Ratio (1.0 = field avg):`);
    console.log(`    Median:  ${median(rcrValues).toFixed(2)}`);
    console.log(`    Mean:    ${(sum(rcrValues) / rcrValues.length).toFixed(2)}`);
    console.log(`    P25:     ${rcrValues[Math.floor(rcrValues.length * 0.25)].toFixed(2)}`);
    console.log(`    P75:     ${rcrValues[Math.floor(rcrValues.length * 0.75)].toFixed(2)}`);
  }

  // ── Citation quality tiers ───────────────────────────────────

  const tiers = {
    landmark: [],    // RCR ≥ 10 or citations ≥ 500
    highImpact: [],  // RCR ≥ 3 or citations ≥ 100
    solid: [],       // RCR ≥ 1 or citations ≥ 20
    lowImpact: [],   // RCR < 1 and citations < 20
    uncited: [],     // 0 citations
  };

  for (const [pmid, m] of Object.entries(iciteData)) {
    const rcr = m.rcr ?? 0;
    const cc = m.citation_count ?? 0;
    if (rcr >= 10 || cc >= 500) tiers.landmark.push(pmid);
    else if (rcr >= 3 || cc >= 100) tiers.highImpact.push(pmid);
    else if (rcr >= 1 || cc >= 20) tiers.solid.push(pmid);
    else if (cc > 0) tiers.lowImpact.push(pmid);
    else tiers.uncited.push(pmid);
  }

  console.log(`\nCitation Quality Tiers:`);
  console.log(`  Landmark (RCR≥10 or ≥500 cites):  ${tiers.landmark.length}`);
  console.log(`  High-impact (RCR≥3 or ≥100):      ${tiers.highImpact.length}`);
  console.log(`  Solid (RCR≥1 or ≥20):             ${tiers.solid.length}`);
  console.log(`  Low-impact (RCR<1 and <20):        ${tiers.lowImpact.length}`);
  console.log(`  Uncited:                           ${tiers.uncited.length}`);

  // ── Top cited papers ─────────────────────────────────────────

  const topByRcr = Object.entries(iciteData)
    .filter(([, m]) => m.rcr != null)
    .sort(([, a], [, b]) => b.rcr - a.rcr)
    .slice(0, 10);

  const topByCites = Object.entries(iciteData)
    .sort(([, a], [, b]) => b.citation_count - a.citation_count)
    .slice(0, 10);

  console.log(`\n--- TOP 10 BY RELATIVE CITATION RATIO ---\n`);
  for (const [pmid, m] of topByRcr) {
    const title = (m.title || '').slice(0, 70);
    console.log(`  PMID:${pmid}  RCR:${m.rcr.toFixed(1)}  cites:${m.citation_count}  ${title}${m.title?.length > 70 ? '...' : ''}`);
  }

  console.log(`\n--- TOP 10 BY CITATION COUNT ---\n`);
  for (const [pmid, m] of topByCites) {
    const title = (m.title || '').slice(0, 70);
    console.log(`  PMID:${pmid}  cites:${m.citation_count}  RCR:${(m.rcr ?? 0).toFixed(1)}  ${title}${m.title?.length > 70 ? '...' : ''}`);
  }

  // ── Study type breakdown ─────────────────────────────────────

  const clinical = metrics.filter((m) => m.is_clinical).length;
  const research = metrics.filter((m) => m.is_research_article).length;
  const animalStudies = metrics.filter((m) => m.animal >= 0.5).length;
  const humanStudies = metrics.filter((m) => m.human >= 0.5).length;
  const translational = metrics.filter((m) => m.apt >= 0.75).length;

  console.log(`\nStudy Type Breakdown:`);
  console.log(`  Clinical:         ${clinical}`);
  console.log(`  Research article: ${research}`);
  console.log(`  Animal (≥0.5):    ${animalStudies}`);
  console.log(`  Human (≥0.5):     ${humanStudies}`);
  console.log(`  High APT (≥0.75): ${translational}`);

  // ── Enrich edges with metrics ─────────────────────────────────

  if (doEnrich) {
    console.log(`\n=== ENRICHING EDGES WITH METRICS ===\n`);

    let enriched = 0;
    for (const e of edges) {
      const pmid = String(e.pmid || e.evidence?.pmid || '').trim();
      if (!pmid || !iciteData[pmid]) continue;

      const m = iciteData[pmid];
      e.citationMetrics = {
        citationCount: m.citation_count,
        rcr: m.rcr != null ? Math.round(m.rcr * 100) / 100 : null,
        nihPercentile: m.nih_percentile != null ? Math.round(m.nih_percentile) : null,
        citationsPerYear: m.citations_per_year != null ? Math.round(m.citations_per_year * 10) / 10 : null,
        isClinical: m.is_clinical,
        apt: m.apt != null ? Math.round(m.apt * 100) / 100 : null,
        tier: m.rcr >= 10 || m.citation_count >= 500 ? 'landmark'
            : m.rcr >= 3 || m.citation_count >= 100 ? 'high-impact'
            : m.rcr >= 1 || m.citation_count >= 20 ? 'solid'
            : m.citation_count > 0 ? 'low-impact'
            : 'uncited',
      };
      enriched++;
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log(`Wrote citationMetrics to ${enriched} edges → ${DATA_PATH}`);
  }

  // ── JSON output ──────────────────────────────────────────────

  const metricsReport = {
    resolved,
    missing: missing.length,
    tiers,
    stats: {
      medianCites: citeCounts.length > 0 ? median(citeCounts) : null,
      medianRcr: rcrValues.length > 0 ? median(rcrValues) : null,
      meanCites: citeCounts.length > 0 ? sum(citeCounts) / citeCounts.length : null,
      meanRcr: rcrValues.length > 0 ? sum(rcrValues) / rcrValues.length : null,
    },
    studyTypes: { clinical, research, animalStudies, humanStudies, translational },
  };

  if (outputPath) {
    let report = {};
    if (fs.existsSync(outputPath)) {
      try { report = JSON.parse(fs.readFileSync(outputPath, 'utf8')); } catch {}
    }
    report.metrics = metricsReport;
    report.iciteData = iciteData;
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`\nMetrics report → ${outputPath}`);
  }

  return metricsReport;
}

// ── Claim Verification Runner ───────────────────────────────────────

async function runClaimVerification(edges, limit) {
  console.log('\n=== CLAIM VERIFICATION ===\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ERROR: ANTHROPIC_API_KEY required for --claims mode.');
    console.log('Set it in your environment or in alz-market-viz/.env');
    process.exit(1);
  }

  const Anthropic = require('@anthropic-ai/sdk').default;
  const client = new Anthropic();

  // Find edges with a PMID AND at least one claim (mechanismDescription or keyInsight)
  const claimEdges = edges.filter((e) => {
    const pmid = e.pmid || e.evidence?.pmid;
    if (!pmid) return false;
    return e.mechanismDescription || e.keyInsight;
  });

  let toCheck = claimEdges;
  if (limit < toCheck.length) {
    toCheck = toCheck.slice(0, limit);
    console.log(`(Limited to first ${limit} edges with claims)\n`);
  }

  console.log(`Edges with PMID + claims: ${claimEdges.length}`);
  console.log(`Checking: ${toCheck.length}\n`);

  // Load claim cache
  const crypto = require('crypto');
  let claimCache = {};
  const CLAIM_CACHE_PATH = path.join(__dirname, '..', 'output', '.claim-cache.json');
  if (fs.existsSync(CLAIM_CACHE_PATH)) {
    try { claimCache = JSON.parse(fs.readFileSync(CLAIM_CACHE_PATH, 'utf8')); } catch {}
  }

  // Step 1: Fetch abstracts AND metadata for all needed PMIDs
  const neededPmids = [...new Set(toCheck.map((e) => String(e.pmid || e.evidence?.pmid)))];
  console.log(`Fetching ${neededPmids.length} abstracts + metadata from PubMed...\n`);

  const abstracts = {};
  const pubmedMeta = {};  // { [pmid]: { title, ... } }
  for (let i = 0; i < neededPmids.length; i += PUBMED_BATCH_SIZE) {
    const batch = neededPmids.slice(i, i + PUBMED_BATCH_SIZE);
    const end = Math.min(i + PUBMED_BATCH_SIZE, neededPmids.length);
    process.stdout.write(`  ${i + 1}–${end} of ${neededPmids.length}...\r`);
    try {
      const [absResults, metaResults] = await Promise.all([
        fetchAbstractsBatch(batch),
        fetchPubMedBatch(batch),
      ]);
      Object.assign(abstracts, absResults);
      Object.assign(pubmedMeta, metaResults);
    } catch (err) {
      console.log(`\n  PubMed fetch error: ${err.message}`);
    }
    if (i + PUBMED_BATCH_SIZE < neededPmids.length) await sleep(PUBMED_DELAY_MS);
  }

  const withAbstract = neededPmids.filter((p) => abstracts[p]);
  const noAbstract = neededPmids.filter((p) => !abstracts[p]);
  console.log(`\nAbstracts: ${withAbstract.length} found, ${noAbstract.length} unavailable\n`);

  // Step 2: Build claims and verify via Claude
  let supported = 0;
  let unsupported = 0;
  let errorCount = 0;
  let cacheHits = 0;
  const unsupportedDetails = [];

  // Build node label lookup for edge context
  const nodeMap = new Map();
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  for (const n of data.nodes) nodeMap.set(n.id, n.label || n.id);

  for (let i = 0; i < toCheck.length; i++) {
    const edge = toCheck[i];
    const pmid = String(edge.pmid || edge.evidence?.pmid);
    const abstract = abstracts[pmid];
    const title = pubmedMeta[pmid]?.title || '';
    const sourceLabel = nodeMap.get(edge.source) || edge.source;
    const targetLabel = nodeMap.get(edge.target) || edge.target;

    if (!abstract) {
      // Can't verify without abstract
      continue;
    }

    // Build claim list
    const claims = [];
    if (edge.mechanismDescription) {
      claims.push({ field: 'mechanismDescription', text: edge.mechanismDescription });
    }
    if (edge.keyInsight) {
      claims.push({ field: 'keyInsight', text: edge.keyInsight });
    }
    if (claims.length === 0) continue;

    // Check cache
    const cacheKey = crypto
      .createHash('sha256')
      .update(claims.map((c) => c.text).join('\n---\n') + '\n===\n' + abstract)
      .digest('hex');

    if (claimCache[cacheKey]) {
      const cached = claimCache[cacheKey];
      for (const v of cached.verdicts) {
        if (v.verdict === 'SUPPORTED') supported++;
        else unsupported++;
      }
      cacheHits++;
      continue;
    }

    // Call Claude
    process.stdout.write(`  [${i + 1}/${toCheck.length}] ${edge.id}...\r`);

    try {
      const prompt = buildClaimPrompt(title, abstract, claims, sourceLabel, targetLabel);
      const verdicts = await callClaudeForClaims(client, prompt);

      // Process verdicts
      const processed = [];
      for (let j = 0; j < claims.length; j++) {
        const v = verdicts[j] || { verdict: 'ERROR', reason: 'No verdict returned' };
        processed.push(v);

        if (v.verdict === 'SUPPORTED') {
          supported++;
        } else {
          unsupported++;
          // Find the most relevant abstract sentence for the link
          const claimWords = claims[j].text.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
          let bestSentence = '';
          let bestScore = 0;
          for (const sentence of abstract.split(/\.\s+/)) {
            const sLower = sentence.toLowerCase();
            const score = claimWords.filter((w) => sLower.includes(w)).length;
            if (score > bestScore) {
              bestScore = score;
              bestSentence = sentence;
            }
          }
          const link = pubmedLink(pmid, bestSentence || null);

          unsupportedDetails.push({
            edgeId: edge.id,
            pmid,
            link,
            field: claims[j].field,
            claim: claims[j].text,
            verdict: v.verdict,
            reason: v.reason,
          });
        }
      }

      // Cache result
      claimCache[cacheKey] = { verdicts: processed, timestamp: Date.now() };
    } catch (err) {
      errorCount++;
      console.log(`\n  ERROR ${edge.id}: ${err.message}`);
    }

    // Rate limit between Claude calls
    if (i + 1 < toCheck.length) await sleep(500);
  }

  // Save cache
  const outDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(CLAIM_CACHE_PATH, JSON.stringify(claimCache, null, 2));

  // Report
  console.log(`\nClaim Verification Results:`);
  console.log(`  Total claims:   ${supported + unsupported}`);
  console.log(`  Supported:      ${supported}`);
  console.log(`  Unsupported:    ${unsupported}`);
  console.log(`  API errors:     ${errorCount}`);
  console.log(`  Cache hits:     ${cacheHits}`);

  if (unsupportedDetails.length > 0) {
    console.log(`\n--- UNSUPPORTED CLAIMS (${unsupportedDetails.length}) ---\n`);
    for (const d of unsupportedDetails) {
      console.log(`${d.edgeId}  PMID:${d.pmid}  [${d.field}]`);
      console.log(`  Claim:  "${d.claim.slice(0, 120)}${d.claim.length > 120 ? '...' : ''}"`);
      console.log(`  Reason: ${d.reason}`);
      console.log(`  Link:   ${d.link}`);
      console.log();
    }
  }

  return {
    total: supported + unsupported,
    supported,
    unsupported,
    errors: errorCount,
    cacheHits,
    unsupportedDetails,
  };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
