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
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'demo', 'src', 'data', 'ad-framework-data.json');

// ── Rate limits ─────────────────────────────────────────────────────
const PUBMED_DELAY_MS = 340;   // 3 req/sec without API key
const CROSSREF_DELAY_MS = 100; // polite pool: ~10 req/sec with mailto
const PUBMED_BATCH_SIZE = 50;
const IDCONV_BATCH_SIZE = 50;
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

  if (!doVerify) {
    console.log('Run with --verify for PubMed validation.');
    console.log('Run with --verify --crossref for PubMed + Crossref cross-referencing.');
    console.log('Run with --verify --enrich to auto-fill missing firstAuthor/year.\n');
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

  // ── Exit code ─────────────────────────────────────────────

  console.log('\n=== SUMMARY ===\n');
  console.log(`Edges checked:   ${verified + errorCount + warningCount}`);
  console.log(`  OK:            ${verified}`);
  console.log(`  Errors:        ${errorCount}`);
  console.log(`  Warnings:      ${warningCount}`);
  console.log(`  Invalid PMIDs: ${invalidPmids.length}`);
  console.log(`  Enrichable:    ${allEnrichments.length}`);

  if (errorCount > 0 || invalidPmids.length > 0) {
    console.log('\nEXIT 1: Errors found.');
    process.exit(1);
  }
  if (warningCount > 0) {
    console.log('\nEXIT 0: Warnings only.');
  } else {
    console.log('\nAll sources verified.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
