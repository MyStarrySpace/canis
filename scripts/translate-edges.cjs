/**
 * translate-edges.cjs
 *
 * Translates old edges to use current node IDs, deduplicates against
 * current edges, and writes restorable edges to restored-edges.json.
 */

const fs = require('fs');
const path = require('path');

const oldEdges = require('./old-edges.json');
const idMap = require('./node-id-map.json');
const currentData = require('../demo/src/data/ad-framework-data.json');

const mapped = idMap.mapped;
const currentNodeIds = new Set(currentData.nodes.map(n => n.id));
const currentEdges = currentData.edges;

// Build set of current source+target pairs for dedup
const currentPairs = new Set(
  currentEdges.map(e => `${e.source}::${e.target}`)
);

const restored = [];
const lost = [];
const mappedButDuplicate = [];

for (const edge of oldEdges) {
  // Map source
  let newSource = null;
  if (mapped[edge.source] !== undefined) {
    newSource = mapped[edge.source];
  } else if (currentNodeIds.has(edge.source)) {
    newSource = edge.source;
  }

  // Map target
  let newTarget = null;
  if (mapped[edge.target] !== undefined) {
    newTarget = mapped[edge.target];
  } else if (currentNodeIds.has(edge.target)) {
    newTarget = edge.target;
  }

  if (newSource === null || newTarget === null) {
    lost.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceMapped: newSource !== null,
      targetMapped: newTarget !== null,
    });
    continue;
  }

  // Check for self-edges after mapping
  if (newSource === newTarget) {
    lost.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceMapped: true,
      targetMapped: true,
      reason: 'self-edge after mapping',
    });
    continue;
  }

  const pairKey = `${newSource}::${newTarget}`;

  if (currentPairs.has(pairKey)) {
    mappedButDuplicate.push({
      id: edge.id,
      source: newSource,
      target: newTarget,
    });
    continue;
  }

  // Prevent duplicates within restored set too
  if (restored.some(r => r.source === newSource && r.target === newTarget)) {
    mappedButDuplicate.push({
      id: edge.id,
      source: newSource,
      target: newTarget,
      reason: 'duplicate within restored set',
    });
    continue;
  }

  restored.push({
    id: edge.id,
    source: newSource,
    target: newTarget,
    relation: edge.relation,
    moduleId: edge.moduleId,
    causalConfidence: edge.causalConfidence,
    mechanismDescription: edge.mechanismDescription || '',
    pmid: edge.pmid || '',
    firstAuthor: edge.firstAuthor || '',
    year: edge.year || null,
    methodType: edge.methodType || '',
    notes: 'Restored from pre-Excel edges.ts',
  });
}

// Write output
const outPath = path.join(__dirname, 'restored-edges.json');
fs.writeFileSync(outPath, JSON.stringify(restored, null, 2));

// Summary
const bothMapped = restored.length + mappedButDuplicate.length;
console.log('=== Edge Translation Summary ===');
console.log(`Total old edges considered:       ${oldEdges.length}`);
console.log(`Edges where both endpoints mapped: ${bothMapped}`);
console.log(`  - Already in current (deduped):  ${mappedButDuplicate.length}`);
console.log(`  - NEW restorable edges:          ${restored.length}`);
console.log(`Edges lost (unmapped endpoint):    ${lost.length}`);
console.log(`\nOutput written to: ${outPath}`);

// Show breakdown of lost edges
const lostSourceOnly = lost.filter(l => !l.sourceMapped && l.targetMapped);
const lostTargetOnly = lost.filter(l => l.sourceMapped && !l.targetMapped);
const lostBoth = lost.filter(l => !l.sourceMapped && !l.targetMapped);
const lostSelfEdge = lost.filter(l => l.reason === 'self-edge after mapping');

console.log(`\n--- Lost edge breakdown ---`);
console.log(`  Source unmapped only:  ${lostSourceOnly.length}`);
console.log(`  Target unmapped only:  ${lostTargetOnly.length}`);
console.log(`  Both unmapped:         ${lostBoth.length}`);
console.log(`  Self-edge after map:   ${lostSelfEdge.length}`);

// Show the unmapped node IDs that caused losses
const unmappedNodes = new Set();
for (const l of lost) {
  if (!l.sourceMapped) unmappedNodes.add(l.source);
  if (!l.targetMapped) unmappedNodes.add(l.target);
}
console.log(`\nUnique unmapped node IDs causing loss (${unmappedNodes.size}):`);
const sorted = [...unmappedNodes].sort();
for (const id of sorted) {
  const asSource = lost.filter(l => l.source === id && !l.sourceMapped).length;
  const asTarget = lost.filter(l => l.target === id && !l.targetMapped).length;
  console.log(`  ${id}  (source: ${asSource}, target: ${asTarget})`);
}
