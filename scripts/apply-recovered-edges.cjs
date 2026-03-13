#!/usr/bin/env node
/**
 * Apply recovered edges to ad-framework-data.json.
 *
 * 1. Add new edges (type: 'new_edge') with citation data
 * 2. Update existing edges (type: 'citation_only') with PMID/author/year
 *
 * Run remap-old-edges.cjs first to generate recovered-edges-full.json.
 */
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'demo', 'src', 'data', 'ad-framework-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const recovered = require('./recovered-edges-full.json');

// Valid relation types that the WASM engine accepts
const validRelations = new Set([
  'increases', 'decreases', 'directlyIncreases', 'directlyDecreases',
  'regulates', 'modulates', 'produces', 'degrades', 'binds', 'transports',
  'causesNoChange', 'association', 'catalyzes', 'traps', 'protects',
  'disrupts', 'requires', 'amplifies', 'substrateof', 'inhibits',
]);

// Map old relation types to valid ones
const relationMap = {
  positiveCorrelation: 'association',
  negativeCorrelation: 'association',
  noCorrelation: 'causesNoChange',
  productof: 'produces',
};

const existingEdgeIds = new Set(data.edges.map(e => e.id));
const existingEdgeKeys = new Set(data.edges.map(e => `${e.source}→${e.target}`));

let newEdgesAdded = 0;
let citationsUpdated = 0;
let skipped = 0;

// Process citation-only updates first
for (const rec of recovered.filter(r => r.type === 'citation_only')) {
  const existing = data.edges.find(e => e.id === rec.existingEdgeId);
  if (!existing) continue;

  if (rec.pmids.length > 0 && !existing.pmid) {
    existing.pmid = rec.pmids[0];
    existing.firstAuthor = rec.authors[0] || undefined;
    existing.year = rec.years[0] || undefined;
    existing.methodType = rec.methods[0] || undefined;
    citationsUpdated++;
  }
}

// Process new edges
for (const rec of recovered.filter(r => r.type === 'new_edge')) {
  const key = `${rec.newSource}→${rec.newTarget}`;
  if (existingEdgeKeys.has(key)) {
    skipped++;
    continue;
  }

  // Map relation
  let relation = rec.relation;
  if (!validRelations.has(relation)) {
    relation = relationMap[relation] || 'association';
  }

  // Generate unique edge ID
  let edgeId = rec.id;
  if (existingEdgeIds.has(edgeId)) {
    edgeId = `REC.${String(newEdgesAdded + 1).padStart(3, '0')}`;
  }

  const newEdge = {
    id: edgeId,
    source: rec.newSource,
    target: rec.newTarget,
    relation,
    moduleId: rec.moduleId || 'M01',
    causalConfidence: rec.causalConfidence || 'L5',
  };

  // Add citation data
  if (rec.pmids.length > 0) newEdge.pmid = rec.pmids[0];
  if (rec.authors.length > 0) newEdge.firstAuthor = rec.authors[0];
  if (rec.years.length > 0) newEdge.year = rec.years[0];
  if (rec.methods.length > 0) newEdge.methodType = rec.methods[0];
  if (rec.mechanismDescription) newEdge.mechanismDescription = rec.mechanismDescription;
  if (rec.keyInsight) newEdge.keyInsight = rec.keyInsight;

  data.edges.push(newEdge);
  existingEdgeIds.add(edgeId);
  existingEdgeKeys.add(key);
  newEdgesAdded++;
}

console.log(`Citations updated on existing edges: ${citationsUpdated}`);
console.log(`New edges added: ${newEdgesAdded}`);
console.log(`Skipped (already exists): ${skipped}`);
console.log(`Total edges now: ${data.edges.length}`);

// Recheck connectivity
const connected = new Set();
for (const e of data.edges) { connected.add(e.source); connected.add(e.target); }
const orphans = data.nodes.filter(n => !connected.has(n.id));
console.log(`\nOrphan nodes: ${orphans.length}/${data.nodes.length} (${(100*orphans.length/data.nodes.length).toFixed(1)}%)`);

// Citation coverage
const withPmid = data.edges.filter(e => e.pmid).length;
console.log(`Edges with PMID: ${withPmid}/${data.edges.length} (${(100*withPmid/data.edges.length).toFixed(1)}%)`);

// Write updated data
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`\nWritten to: ${dataPath}`);
