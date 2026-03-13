#!/usr/bin/env node
/**
 * Edge Annotation & Bibliography Verification Script for CANIS
 *
 * Two modes:
 *   1. Audit   — reports annotation coverage, missing PMIDs, missing fields
 *   2. Verify  — checks each PMID against PubMed API (slow, rate-limited)
 *
 * Run:
 *   node scripts/verify-edges.cjs              # audit only (fast)
 *   node scripts/verify-edges.cjs --verify     # audit + PubMed check
 *
 * Adapted from plig-framework/scripts/verify-bibliography.ts
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'demo', 'src', 'data', 'ad-framework-data.json');

// ── Helpers ─────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstAuthorLastName(authors) {
  const first = authors.split(',')[0].trim().replace(/\.$/, '').trim();
  const parts = first.split(/\s+/);
  const nonInitials = parts.filter((p) => {
    const stripped = p.replace(/[.\-]/g, '');
    if (stripped.length <= 3 && stripped === stripped.toUpperCase()) return false;
    return true;
  });
  if (nonInitials.length === 0) return (parts[0] || '').toLowerCase();
  return nonInitials[0].toLowerCase();
}

// ── PubMed API ──────────────────────────────────────────────────────────

async function fetchPubMed(pmid) {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    const doc = data?.result?.[pmid];
    if (!doc) return { error: 'No result for PMID' };
    const firstAuthor = doc.authors?.[0]?.name;
    const firstFamily = firstAuthor?.split(' ')[0]?.toLowerCase();
    return {
      title: doc.title,
      firstAuthorFamily: firstFamily,
      journal: doc.fulljournalname || doc.source,
      year: parseInt(doc.pubdate?.split(' ')[0], 10) || undefined,
    };
  } catch (e) {
    return { error: String(e) };
  }
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const doVerify = process.argv.includes('--verify');
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const edges = data.edges;
  const nodes = data.nodes;

  console.log('CANIS Edge Annotation Report');
  console.log('============================\n');

  // ── 1. Coverage stats ──────────────────────────────────────────────

  const total = edges.length;
  const withTopPmid = edges.filter((e) => e.pmid).length;
  const withEvidencePmid = edges.filter((e) => e.evidence?.pmid).length;
  const withAnyPmid = edges.filter((e) => e.pmid || e.evidence?.pmid).length;
  const withMechDesc = edges.filter((e) => e.mechanismDescription).length;
  const withKeyInsight = edges.filter((e) => e.keyInsight).length;
  const withConfidence = edges.filter((e) => e.causalConfidence).length;
  const withFirstAuthor = edges.filter((e) => e.firstAuthor).length;
  const withYear = edges.filter((e) => e.year).length;
  const withMethodType = edges.filter((e) => e.methodType).length;

  console.log('Coverage:');
  console.log(`  Total edges:           ${total}`);
  console.log(`  With PMID (any):       ${withAnyPmid} (${pct(withAnyPmid, total)})`);
  console.log(`    Top-level PMID:      ${withTopPmid}`);
  console.log(`    Evidence.pmid only:  ${withEvidencePmid - withTopPmid}`);
  console.log(`  With firstAuthor:      ${withFirstAuthor} (${pct(withFirstAuthor, total)})`);
  console.log(`  With year:             ${withYear} (${pct(withYear, total)})`);
  console.log(`  With methodType:       ${withMethodType} (${pct(withMethodType, total)})`);
  console.log(`  With mechanismDesc:    ${withMechDesc} (${pct(withMechDesc, total)})`);
  console.log(`  With keyInsight:       ${withKeyInsight} (${pct(withKeyInsight, total)})`);
  console.log(`  With causalConfidence: ${withConfidence} (${pct(withConfidence, total)})`);
  console.log();

  // ── 2. Edges missing PMIDs ────────────────────────────────────────

  const missingPmid = edges.filter((e) => !e.pmid && !e.evidence?.pmid);
  if (missingPmid.length > 0) {
    console.log(`Edges missing PMIDs (${missingPmid.length}):`);
    // Group by module
    const byModule = {};
    for (const e of missingPmid) {
      const mod = e.moduleId || 'unknown';
      if (!byModule[mod]) byModule[mod] = [];
      byModule[mod].push(e);
    }
    for (const [mod, group] of Object.entries(byModule).sort()) {
      console.log(`  [${mod}] (${group.length})`);
      for (const e of group) {
        console.log(`    ${e.id}  ${e.source} -> ${e.target}  (${e.relation})`);
      }
    }
    console.log();
  }

  // ── 3. Edges missing mechanism descriptions ───────────────────────

  const missingMech = edges.filter((e) => !e.mechanismDescription);
  if (missingMech.length > 0) {
    console.log(`Edges missing mechanismDescription (${missingMech.length}):`);
    for (const e of missingMech.slice(0, 30)) {
      console.log(`  ${e.id}  ${e.source} -> ${e.target}`);
    }
    if (missingMech.length > 30) {
      console.log(`  ... and ${missingMech.length - 30} more`);
    }
    console.log();
  }

  // ── 4. Dangling references (edge references non-existent node) ────

  const nodeIds = new Set(nodes.map((n) => n.id));
  const dangling = edges.filter((e) => !nodeIds.has(e.source) || !nodeIds.has(e.target));
  if (dangling.length > 0) {
    console.log(`Dangling edges (reference missing nodes): ${dangling.length}`);
    for (const e of dangling) {
      const badSource = !nodeIds.has(e.source) ? `[MISSING: ${e.source}]` : e.source;
      const badTarget = !nodeIds.has(e.target) ? `[MISSING: ${e.target}]` : e.target;
      console.log(`  ${e.id}  ${badSource} -> ${badTarget}`);
    }
    console.log();
  }

  // ── 5. Duplicate edge IDs ─────────────────────────────────────────

  const ids = edges.map((e) => e.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) {
    console.log(`DUPLICATE edge IDs: ${[...new Set(dupes)].join(', ')}`);
    console.log();
  }

  // ── 6. Confidence level distribution ──────────────────────────────

  const confDist = {};
  for (const e of edges) {
    const c = e.causalConfidence || 'none';
    confDist[c] = (confDist[c] || 0) + 1;
  }
  console.log('Confidence distribution:');
  for (const [level, count] of Object.entries(confDist).sort()) {
    console.log(`  ${level}: ${count} (${pct(count, total)})`);
  }
  console.log();

  // ── 7. PubMed verification (optional, slow) ──────────────────────

  if (doVerify) {
    console.log('PubMed Verification (rate-limited)');
    console.log('──────────────────────────────────\n');

    // Collect all unique PMIDs
    const pmidEdgeMap = new Map(); // pmid -> edges using it
    for (const e of edges) {
      const pmid = e.pmid || e.evidence?.pmid;
      if (!pmid) continue;
      if (!pmidEdgeMap.has(pmid)) pmidEdgeMap.set(pmid, []);
      pmidEdgeMap.get(pmid).push(e);
    }

    const uniquePmids = [...pmidEdgeMap.keys()];
    console.log(`Unique PMIDs to verify: ${uniquePmids.length}\n`);

    let verified = 0;
    let mismatches = 0;
    let apiErrors = 0;
    const mismatchDetails = [];

    for (let i = 0; i < uniquePmids.length; i++) {
      const pmid = uniquePmids[i];
      await sleep(340); // PubMed rate limit: 3/sec

      if (i % 20 === 0) {
        process.stdout.write(`  Checking ${i + 1}/${uniquePmids.length}...\r`);
      }

      const api = await fetchPubMed(pmid);
      if (api.error) {
        apiErrors++;
        console.log(`  API ERROR: PMID ${pmid} — ${api.error}`);
        continue;
      }

      // Compare with edge data
      const sampleEdge = pmidEdgeMap.get(pmid)[0];
      let hasMismatch = false;
      const details = [`MISMATCH: PMID ${pmid} (used by ${pmidEdgeMap.get(pmid).map((e) => e.id).join(', ')})`];

      if (sampleEdge.firstAuthor && api.firstAuthorFamily) {
        const ours = sampleEdge.firstAuthor.toLowerCase();
        if (ours !== api.firstAuthorFamily) {
          hasMismatch = true;
          details.push(`  firstAuthor: ours="${sampleEdge.firstAuthor}" api="${api.firstAuthorFamily}"`);
        }
      }

      if (sampleEdge.year && api.year != null) {
        if (sampleEdge.year !== api.year) {
          hasMismatch = true;
          details.push(`  year: ours=${sampleEdge.year} api=${api.year}`);
        }
      }

      if (hasMismatch) {
        mismatches++;
        mismatchDetails.push(details.join('\n'));
      } else {
        verified++;
      }
    }

    console.log(`\nPubMed Results:`);
    console.log(`  Verified:   ${verified}`);
    console.log(`  Mismatches: ${mismatches}`);
    console.log(`  API errors: ${apiErrors}`);

    if (mismatchDetails.length > 0) {
      console.log('\n--- MISMATCHES ---');
      for (const d of mismatchDetails) {
        console.log(d);
        console.log();
      }
    }

    if (mismatches > 0) process.exit(1);
  }

  // ── Summary ─────────────────────────────────────────────────────

  const issues =
    missingPmid.length + dangling.length + dupes.length + missingMech.length;
  if (issues > 0) {
    console.log(`Total issues: ${issues}`);
    console.log('  Run with --verify to also check PMIDs against PubMed API');
  } else {
    console.log('All edges fully annotated and valid.');
  }
}

function pct(n, total) {
  return `${((n / total) * 100).toFixed(1)}%`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
