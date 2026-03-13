#!/usr/bin/env node
/**
 * Compare old (pre-CANIS) framework data with current ad-framework-data.json.
 *
 * Old data lives in _reference/old-graph/src/data/mechanisticFramework/
 * Current data lives in demo/src/data/ad-framework-data.json
 *
 * This script extracts old nodes/edges from the TS source files using regex,
 * then compares against the current JSON.
 */
const fs = require('fs');
const path = require('path');

const current = require('../demo/src/data/ad-framework-data.json');

// ── Extract old data from TS files ──────────────────────────────────────

const oldBase = path.join(__dirname, '..', '_reference', 'old-graph', 'src', 'data', 'mechanisticFramework');

// Read all node files
const nodesDir = path.join(oldBase, 'nodes');
const nodeFiles = fs.readdirSync(nodesDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

const oldNodes = [];
for (const f of nodeFiles) {
  const src = fs.readFileSync(path.join(nodesDir, f), 'utf8');
  // Extract node objects — look for id: '...' patterns
  const idMatches = [...src.matchAll(/id:\s*['"]([^'"]+)['"]/g)];
  const labelMatches = [...src.matchAll(/label:\s*['"]([^'"]+)['"]/g)];
  const moduleMatches = [...src.matchAll(/moduleId:\s*['"]([^'"]+)['"]/g)];
  const categoryMatches = [...src.matchAll(/category:\s*['"]([^'"]+)['"]/g)];

  for (let i = 0; i < idMatches.length; i++) {
    oldNodes.push({
      id: idMatches[i][1],
      label: labelMatches[i]?.[1] || idMatches[i][1],
      moduleId: moduleMatches[i]?.[1] || '??',
      category: categoryMatches[i]?.[1] || '??',
      file: f,
    });
  }
}

// Read boundary nodes
const boundaryFile = path.join(nodesDir, 'boundary.ts');
if (fs.existsSync(boundaryFile)) {
  // Already handled above
}

// Read edges
const edgesFile = path.join(oldBase, 'edges.ts');
const edgesSrc = fs.readFileSync(edgesFile, 'utf8');

const oldEdges = [];
const edgeIdMatches = [...edgesSrc.matchAll(/id:\s*['"]([^'"]+)['"]/g)];
const edgeSourceMatches = [...edgesSrc.matchAll(/source:\s*['"]([^'"]+)['"]/g)];
const edgeTargetMatches = [...edgesSrc.matchAll(/target:\s*['"]([^'"]+)['"]/g)];
const edgeRelationMatches = [...edgesSrc.matchAll(/relation:\s*['"]([^'"]+)['"]/g)];

// Extract PMIDs from evidence arrays
const edgeBlocks = edgesSrc.split(/(?=\{\s*\n\s*id:)/);
for (let i = 0; i < edgeIdMatches.length; i++) {
  // Find PMID in the corresponding edge block
  const blockIdx = edgeBlocks.findIndex(b => b.includes(`id: '${edgeIdMatches[i][1]}'`));
  const block = blockIdx >= 0 ? edgeBlocks[blockIdx] : '';
  const pmids = [...block.matchAll(/pmid:\s*['"](\d+)['"]/g)].map(m => m[1]);
  const authors = [...block.matchAll(/firstAuthor:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  const years = [...block.matchAll(/year:\s*(\d{4})/g)].map(m => parseInt(m[1]));

  oldEdges.push({
    id: edgeIdMatches[i][1],
    source: edgeSourceMatches[i]?.[1] || '??',
    target: edgeTargetMatches[i]?.[1] || '??',
    relation: edgeRelationMatches[i]?.[1] || '??',
    pmids,
    authors,
    years,
  });
}

// ── Current data ────────────────────────────────────────────────────────

const curNodes = current.nodes;
const curEdges = current.edges;

const oldNodeIds = new Set(oldNodes.map(n => n.id));
const curNodeIds = new Set(curNodes.map(n => n.id));
const oldEdgeIds = new Set(oldEdges.map(e => e.id));
const curEdgeIds = new Set(curEdges.map(e => e.id));

// ── Comparison ──────────────────────────────────────────────────────────

console.log('=== DATA COMPARISON: OLD vs CURRENT ===\n');
console.log(`Old (pre-CANIS):  ${oldNodes.length} nodes, ${oldEdges.length} edges`);
console.log(`Current (CANIS):  ${curNodes.length} nodes, ${curEdges.length} edges`);

// Connectivity
const oldConnected = new Set();
for (const e of oldEdges) { oldConnected.add(e.source); oldConnected.add(e.target); }
const oldOrphans = oldNodes.filter(n => !oldConnected.has(n.id));

const curConnected = new Set();
for (const e of curEdges) { curConnected.add(e.source); curConnected.add(e.target); }
const curOrphans = curNodes.filter(n => !curConnected.has(n.id));

console.log(`\nOld orphans:      ${oldOrphans.length}/${oldNodes.length} (${(100*oldOrphans.length/oldNodes.length).toFixed(1)}%)`);
console.log(`Current orphans:  ${curOrphans.length}/${curNodes.length} (${(100*curOrphans.length/curNodes.length).toFixed(1)}%)`);

// Edge density
console.log(`\nOld edge/node:    ${(oldEdges.length/oldNodes.length).toFixed(2)}`);
console.log(`Current edge/node: ${(curEdges.length/curNodes.length).toFixed(2)}`);

// Citation coverage
const oldWithPmid = oldEdges.filter(e => e.pmids.length > 0);
const curWithPmid = curEdges.filter(e => e.pmid);
console.log(`\nOld edges w/ PMID:  ${oldWithPmid.length}/${oldEdges.length} (${(100*oldWithPmid.length/oldEdges.length).toFixed(1)}%)`);
console.log(`Cur edges w/ PMID:  ${curWithPmid.length}/${curEdges.length} (${(100*curWithPmid.length/curEdges.length).toFixed(1)}%)`);

// Node overlap
const onlyOld = oldNodes.filter(n => !curNodeIds.has(n.id));
const onlyNew = curNodes.filter(n => !oldNodeIds.has(n.id));
const shared = oldNodes.filter(n => curNodeIds.has(n.id));
console.log(`\n=== NODE OVERLAP ===`);
console.log(`Shared:           ${shared.length}`);
console.log(`Only in old:      ${onlyOld.length}`);
console.log(`Only in current:  ${onlyNew.length}`);

// Edge overlap
const onlyOldEdges = oldEdges.filter(e => !curEdgeIds.has(e.id));
const onlyNewEdges = curEdges.filter(e => !oldEdgeIds.has(e.id));
const sharedEdges = oldEdges.filter(e => curEdgeIds.has(e.id));
console.log(`\n=== EDGE OVERLAP ===`);
console.log(`Shared:           ${sharedEdges.length}`);
console.log(`Only in old:      ${onlyOldEdges.length}`);
console.log(`Only in current:  ${onlyNewEdges.length}`);

// Edges that exist in old but are missing in current — these had citations
console.log(`\n=== OLD CITED EDGES NOT IN CURRENT (${onlyOldEdges.filter(e => e.pmids.length > 0).length}) ===`);
for (const e of onlyOldEdges.filter(e => e.pmids.length > 0).slice(0, 30)) {
  console.log(`  ${e.id}: ${e.source} -[${e.relation}]-> ${e.target} (PMID: ${e.pmids.join(',')})`);
}
if (onlyOldEdges.filter(e => e.pmids.length > 0).length > 30) {
  console.log(`  ... and ${onlyOldEdges.filter(e => e.pmids.length > 0).length - 30} more`);
}

// Module comparison
console.log(`\n=== MODULE NODE COUNTS ===`);
const oldByMod = {};
for (const n of oldNodes) { oldByMod[n.moduleId] = (oldByMod[n.moduleId] || 0) + 1; }
const curByMod = {};
for (const n of curNodes) { curByMod[n.moduleId] = (curByMod[n.moduleId] || 0) + 1; }
const allMods = [...new Set([...Object.keys(oldByMod), ...Object.keys(curByMod)])].sort();
console.log(`${'Module'.padEnd(6)} ${'Old'.padStart(5)} ${'Cur'.padStart(5)} ${'Diff'.padStart(5)}`);
for (const m of allMods) {
  const o = oldByMod[m] || 0;
  const c = curByMod[m] || 0;
  const diff = c - o;
  console.log(`${m.padEnd(6)} ${String(o).padStart(5)} ${String(c).padStart(5)} ${(diff >= 0 ? '+' : '') + diff}`);
}

// Summary
console.log(`\n=== KEY FINDINGS ===`);
console.log(`1. Old data had ${oldWithPmid.length}/${oldEdges.length} edges with PMIDs — current has ${curWithPmid.length}/${curEdges.length}`);
console.log(`2. ${onlyOldEdges.length} old edges are missing from current data`);
console.log(`3. ${onlyOldEdges.filter(e => e.pmids.length > 0).length} of those missing edges had PMIDs (recoverable citations)`);
console.log(`4. Old had ${oldOrphans.length} orphans (${(100*oldOrphans.length/oldNodes.length).toFixed(1)}%) vs current ${curOrphans.length} (${(100*curOrphans.length/curNodes.length).toFixed(1)}%)`);
console.log(`5. Edge density: old ${(oldEdges.length/oldNodes.length).toFixed(2)} vs current ${(curEdges.length/curNodes.length).toFixed(2)}`);
