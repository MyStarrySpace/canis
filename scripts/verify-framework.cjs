#!/usr/bin/env node
/**
 * Framework Integrity Verification
 *
 * Checks structural integrity and citation coverage of the mechanistic framework.
 * Modeled after plig-framework/scripts/verify-bibliography.ts and
 * alz-market-viz/scripts/verify-framework.ts.
 *
 * Usage:
 *   node scripts/verify-framework.cjs                # structural + citation report
 *   node scripts/verify-framework.cjs --verify-pmids # also validate PMIDs against PubMed
 */
const path = require('path');
const data = require('../demo/src/data/ad-framework-data.json');

const nodes = data.nodes;
const edges = data.edges;
const modules = data.modules;
const verifyPmids = process.argv.includes('--verify-pmids');

// ── Helpers ──────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── 1. Structural Checks ────────────────────────────────────────────

function checkStructure() {
  console.log('=== STRUCTURAL INTEGRITY ===\n');

  const nodeIds = new Set(nodes.map(n => n.id));

  // Nodes by module
  const byModule = {};
  for (const n of nodes) {
    byModule[n.moduleId] = (byModule[n.moduleId] || 0) + 1;
  }
  console.log('Nodes by module:');
  for (const m of modules) {
    console.log(`  ${m.id} (${m.shortName}): ${byModule[m.id] || 0}`);
  }
  // Nodes in unknown modules
  const moduleIds = new Set(modules.map(m => m.id));
  const unknownModule = nodes.filter(n => !moduleIds.has(n.moduleId));
  if (unknownModule.length > 0) {
    console.log(`\n  WARNING: ${unknownModule.length} nodes in unknown modules:`);
    for (const n of unknownModule) {
      console.log(`    ${n.id} → ${n.moduleId}`);
    }
  }

  // Duplicate node IDs
  const seenNodeIds = new Set();
  const dupeNodes = [];
  for (const n of nodes) {
    if (seenNodeIds.has(n.id)) dupeNodes.push(n.id);
    seenNodeIds.add(n.id);
  }
  if (dupeNodes.length > 0) {
    console.log(`\n  ERROR: Duplicate node IDs: ${dupeNodes.join(', ')}`);
  }

  // Duplicate edge IDs
  const seenEdgeIds = new Set();
  const dupeEdges = [];
  for (const e of edges) {
    if (seenEdgeIds.has(e.id)) dupeEdges.push(e.id);
    seenEdgeIds.add(e.id);
  }
  if (dupeEdges.length > 0) {
    console.log(`\n  ERROR: Duplicate edge IDs: ${dupeEdges.join(', ')}`);
  }

  // Broken edges (referencing nonexistent nodes)
  const brokenEdges = [];
  for (const e of edges) {
    if (!nodeIds.has(e.source)) brokenEdges.push({ id: e.id, field: 'source', value: e.source });
    if (!nodeIds.has(e.target)) brokenEdges.push({ id: e.id, field: 'target', value: e.target });
  }
  console.log(`\nBroken edges: ${brokenEdges.length}`);
  for (const b of brokenEdges) {
    console.log(`  ${b.id}: ${b.field} "${b.value}" does not exist`);
  }

  // Orphan nodes
  const connected = new Set();
  for (const e of edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  const orphans = nodes.filter(n => !connected.has(n.id));
  const orphansByModule = {};
  for (const n of orphans) {
    orphansByModule[n.moduleId] = orphansByModule[n.moduleId] || [];
    orphansByModule[n.moduleId].push(n.id);
  }
  console.log(`\nOrphan nodes (no edges): ${orphans.length} / ${nodes.length} (${(100 * orphans.length / nodes.length).toFixed(1)}%)`);
  for (const [mod, ids] of Object.entries(orphansByModule).sort((a, b) => b[1].length - a[1].length)) {
    const modName = modules.find(m => m.id === mod)?.shortName || mod;
    console.log(`  ${mod} (${modName}): ${ids.length} — ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? `, ... (+${ids.length - 5} more)` : ''}`);
  }

  // Self-loops
  const selfLoops = edges.filter(e => e.source === e.target);
  if (selfLoops.length > 0) {
    console.log(`\nSelf-loops: ${selfLoops.length}`);
    for (const e of selfLoops) {
      console.log(`  ${e.id}: ${e.source} → ${e.target}`);
    }
  }

  return { brokenEdges, dupeNodes, dupeEdges, orphans, connected };
}

// ── 2. Throughline Paths ─────────────────────────────────────────────

function checkPaths(connected) {
  console.log('\n=== THROUGHLINE PATHS ===\n');

  // Build adjacency from connected nodes only
  const adj = {};
  for (const e of edges) {
    if (!adj[e.source]) adj[e.source] = [];
    adj[e.source].push(e.target);
  }

  function bfs(start, end) {
    if (!adj[start]) return null;
    const visited = new Set();
    const queue = [[start]];
    while (queue.length > 0) {
      const path = queue.shift();
      const node = path[path.length - 1];
      if (node === end) return path;
      if (visited.has(node)) continue;
      visited.add(node);
      for (const next of (adj[node] || [])) {
        if (!visited.has(next)) queue.push([...path, next]);
      }
    }
    return null;
  }

  const pathTests = [
    ['aging', 'mortality'],
    ['labile_iron_pool', 'mortality'],
    ['lipid_peroxides', 'mortality'],
    ['lysosomal_dysfunction', 'mortality'],
    ['insulin_resistance', 'mortality'],
    ['NLRP3', 'mortality'],
    ['damaged_mito_pool', 'mortality'],
    ['Abeta_oligomers', 'mortality'],
    ['tau_seeding', 'mortality'],
    ['mito_ROS', 'NLRP3'],
    ['metabolic_syndrome', 'tau_hyperphosphorylated'],
    ['CBS_enzyme', 'GSK3beta_active'],
  ];

  let passed = 0;
  let failed = 0;
  for (const [start, end] of pathTests) {
    const path = bfs(start, end);
    if (path) {
      console.log(`  OK  ${start} → ${end} (${path.length} steps)`);
      passed++;
    } else {
      console.log(`  FAIL  ${start} → ${end}: NO PATH FOUND`);
      failed++;
    }
  }
  console.log(`\nPaths: ${passed} passed, ${failed} failed`);
  return failed;
}

// ── 3. Citation Coverage ─────────────────────────────────────────────

function checkCitations() {
  console.log('\n=== CITATION COVERAGE ===\n');

  let withPmid = 0, withAuthor = 0, withYear = 0, withMech = 0, withMethod = 0;
  const missingPmid = [];

  for (const e of edges) {
    if (e.pmid) withPmid++;
    else missingPmid.push(e);
    if (e.firstAuthor) withAuthor++;
    if (e.year) withYear++;
    if (e.mechanismDescription) withMech++;
    if (e.methodType) withMethod++;
  }

  const total = edges.length;
  const pct = (n) => `${n}/${total} (${(100 * n / total).toFixed(1)}%)`;

  console.log(`PMID:                ${pct(withPmid)}`);
  console.log(`First author:        ${pct(withAuthor)}`);
  console.log(`Year:                ${pct(withYear)}`);
  console.log(`Mechanism desc:      ${pct(withMech)}`);
  console.log(`Method type:         ${pct(withMethod)}`);

  // Citation completeness (has PMID + author + year)
  const complete = edges.filter(e => e.pmid && e.firstAuthor && e.year).length;
  console.log(`\nFully cited (PMID+author+year): ${pct(complete)}`);

  // Breakdown of missing PMIDs by confidence level
  const missingByConf = {};
  for (const e of missingPmid) {
    const conf = e.causalConfidence || 'unknown';
    missingByConf[conf] = (missingByConf[conf] || 0) + 1;
  }
  console.log(`\nEdges missing PMID by confidence level:`);
  for (const [conf, count] of Object.entries(missingByConf).sort()) {
    console.log(`  ${conf}: ${count}`);
  }

  return { withPmid, missingPmid };
}

// ── 4. PMID Verification (optional) ─────────────────────────────────

async function verifyPmidsAgainstPubMed() {
  const edgesWithPmid = edges.filter(e => e.pmid);
  if (edgesWithPmid.length === 0) {
    console.log('\n=== PMID VERIFICATION ===\n');
    console.log('No edges have PMIDs — skipping verification.');
    return;
  }

  console.log('\n=== PMID VERIFICATION ===\n');
  console.log(`Checking ${edgesWithPmid.length} PMIDs against PubMed...\n`);

  let verified = 0, apiErrors = 0;
  const mismatches = [];

  // Batch PMIDs (PubMed allows up to 200 per request)
  const pmids = [...new Set(edgesWithPmid.map(e => e.pmid))];

  for (let i = 0; i < pmids.length; i += 50) {
    const batch = pmids.slice(i, i + 50);
    await sleep(340); // rate limit

    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${batch.join(',')}&retmode=json`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        apiErrors += batch.length;
        console.log(`  API ERROR: HTTP ${res.status} for batch ${i / 50 + 1}`);
        continue;
      }
      const data = await res.json();
      const results = data?.result;
      if (!results) {
        apiErrors += batch.length;
        continue;
      }

      for (const pmid of batch) {
        const doc = results[pmid];
        if (!doc || doc.error) {
          apiErrors++;
          console.log(`  INVALID PMID: ${pmid}`);
          continue;
        }

        // Cross-reference with edges that use this PMID
        const edgesForPmid = edgesWithPmid.filter(e => e.pmid === pmid);
        for (const edge of edgesForPmid) {
          const issues = [];

          if (edge.firstAuthor) {
            const apiFirst = doc.authors?.[0]?.name?.split(' ')[0]?.toLowerCase();
            const ourFirst = edge.firstAuthor.toLowerCase().split(/\s+/)[0];
            if (apiFirst && ourFirst !== apiFirst) {
              issues.push(`author: ours="${edge.firstAuthor}" api="${doc.authors[0].name}"`);
            }
          }

          if (edge.year) {
            const apiYear = parseInt(doc.pubdate?.split(' ')[0], 10);
            if (apiYear && edge.year !== apiYear) {
              issues.push(`year: ours=${edge.year} api=${apiYear}`);
            }
          }

          if (issues.length > 0) {
            mismatches.push({ edgeId: edge.id, pmid, issues });
          } else {
            verified++;
          }
        }
      }
    } catch (err) {
      apiErrors += batch.length;
      console.log(`  API ERROR: ${err.message}`);
    }
  }

  console.log(`Verified:   ${verified}`);
  console.log(`Mismatches: ${mismatches.length}`);
  console.log(`API errors: ${apiErrors}`);

  if (mismatches.length > 0) {
    console.log('\nMismatches:');
    for (const m of mismatches) {
      console.log(`  ${m.edgeId} (PMID: ${m.pmid}): ${m.issues.join('; ')}`);
    }
  }
}

// ── 5. Summary ───────────────────────────────────────────────────────

async function main() {
  console.log('Framework Integrity Report');
  console.log('=========================');
  console.log(`Data: ${path.resolve(__dirname, '../demo/src/data/ad-framework-data.json')}`);
  console.log();

  const { brokenEdges, dupeNodes, dupeEdges, orphans, connected } = checkStructure();
  const pathFailures = checkPaths(connected);
  const { withPmid } = checkCitations();

  if (verifyPmids) {
    await verifyPmidsAgainstPubMed();
  }

  // Final summary
  console.log('\n=== FINAL SUMMARY ===\n');
  console.log(`Nodes:              ${nodes.length}`);
  console.log(`Edges:              ${edges.length}`);
  console.log(`Modules:            ${modules.length}`);
  console.log(`Connected nodes:    ${connected.size}`);
  console.log(`Orphan nodes:       ${orphans.length} (${(100 * orphans.length / nodes.length).toFixed(1)}%)`);
  console.log(`Broken edges:       ${brokenEdges.length}`);
  console.log(`Duplicate nodes:    ${dupeNodes.length}`);
  console.log(`Duplicate edges:    ${dupeEdges.length}`);
  console.log(`Path tests failed:  ${pathFailures}`);
  console.log(`Citation coverage:  ${withPmid}/${edges.length} (${(100 * withPmid / edges.length).toFixed(1)}%)`);

  // Exit code
  const hardFailures = brokenEdges.length + dupeNodes.length + dupeEdges.length;
  if (hardFailures > 0) {
    console.log('\nEXIT 1: Hard failures found (broken edges or duplicates).');
    process.exit(1);
  }

  if (pathFailures > 0 || orphans.length > 0 || withPmid < edges.length) {
    console.log('\nEXIT 0: Warnings present (orphans, missing citations, or broken paths).');
  } else {
    console.log('\nAll checks passed.');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
