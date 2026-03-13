#!/usr/bin/env node
/**
 * Generate synthetic test graphs for stress testing.
 *
 * Usage:
 *   node scripts/generate-test-graph.cjs [nodeCount] [edgeDensity] [moduleCount]
 *
 * Examples:
 *   node scripts/generate-test-graph.cjs 100        # 100 nodes, default density
 *   node scripts/generate-test-graph.cjs 500 2.0    # 500 nodes, 2 edges per node
 *   node scripts/generate-test-graph.cjs 1000 1.5 8 # 1000 nodes, 1.5 density, 8 modules
 *
 * Output: demo/src/data/test-graph-data.json
 */
const fs = require('fs');
const path = require('path');

const NODE_COUNT = parseInt(process.argv[2]) || 200;
const EDGE_DENSITY = parseFloat(process.argv[3]) || 1.8;  // edges per node
const MODULE_COUNT = parseInt(process.argv[4]) || 6;

const EDGE_COUNT = Math.round(NODE_COUNT * EDGE_DENSITY);

// Deterministic pseudo-random (xorshift32)
let seed = 42;
function rand() {
  seed ^= seed << 13;
  seed ^= seed >> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

// Module palette
const moduleColors = [
  '#486393', '#007385', '#60a5fa', '#C9461D', '#f472b6', '#8ecae6',
  '#a78bfa', '#34d399', '#fbbf24', '#C3577F', '#7ED3FF', '#FFA380',
];

const moduleNames = [
  'Alpha Pathway', 'Beta Cascade', 'Gamma Loop', 'Delta Hub',
  'Epsilon Chain', 'Zeta Network', 'Eta Cluster', 'Theta Ring',
  'Iota Branch', 'Kappa Axis', 'Lambda Core', 'Mu Bridge',
];

const categories = ['STOCK', 'STATE', 'BOUNDARY'];
const subtypes = {
  STOCK: ['ProteinPool', 'MetabolitePool', 'CellPopulation', 'OrganellePool', 'Aggregate'],
  STATE: ['MetabolicState', 'Homeostatic', 'BiologicalProcess', 'Phosphorylated'],
  BOUNDARY: ['GeneticVariant', 'SmallMolecule', 'Lifestyle', 'CognitiveScore'],
};
const relations = [
  'increases', 'decreases', 'directlyIncreases', 'directlyDecreases',
  'regulates', 'modulates', 'produces', 'degrades', 'catalyzes', 'protects',
];
const confidences = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

// ── Generate modules ─────────────────────────────────────────────────

const modules = [];
for (let i = 0; i < MODULE_COUNT; i++) {
  modules.push({
    id: `T${String(i + 1).padStart(2, '0')}`,
    name: moduleNames[i] || `Module ${i + 1}`,
    shortName: moduleNames[i]?.split(' ')[0] || `Mod${i + 1}`,
    description: `Synthetic test module ${i + 1}`,
    color: moduleColors[i % moduleColors.length],
  });
}

// ── Generate nodes ───────────────────────────────────────────────────

const nodes = [];
const nodeIds = [];

// Create a small number of "hub" nodes (high connectivity)
const hubCount = Math.max(3, Math.round(NODE_COUNT * 0.05));

for (let i = 0; i < NODE_COUNT; i++) {
  const moduleIdx = Math.floor(i / (NODE_COUNT / MODULE_COUNT));
  const mod = modules[Math.min(moduleIdx, MODULE_COUNT - 1)];
  const cat = i < 5 ? 'BOUNDARY' : pick(categories);
  const sub = pick(subtypes[cat]);
  const isHub = i < hubCount;

  const id = `node_${String(i).padStart(4, '0')}`;
  nodeIds.push(id);

  nodes.push({
    id,
    label: isHub ? `Hub ${i}` : `Node ${i}`,
    category: cat,
    subtype: sub,
    moduleId: mod.id,
    description: `Synthetic node ${i} in ${mod.shortName}`,
    mechanism: isHub ? 'Central hub node with high connectivity' : undefined,
    roles: isHub ? ['LEVERAGE_POINT'] : undefined,
  });
}

// ── Generate edges ───────────────────────────────────────────────────

const edges = [];
const edgeSet = new Set();

function addEdge(source, target) {
  const key = `${source}→${target}`;
  if (edgeSet.has(key) || source === target) return false;
  edgeSet.add(key);

  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  const crossModule = sourceNode?.moduleId !== targetNode?.moduleId;

  edges.push({
    id: `TE${String(edges.length + 1).padStart(4, '0')}`,
    source,
    target,
    relation: pick(relations),
    moduleId: sourceNode?.moduleId || modules[0].id,
    causalConfidence: pick(confidences),
    mechanismDescription: `Synthetic edge: ${source} affects ${target}`,
    pmid: rand() > 0.4 ? String(10000000 + randInt(0, 29999999)) : undefined,
    firstAuthor: rand() > 0.4 ? pick(['Smith', 'Zhang', 'Patel', 'Kim', 'Garcia', 'Mueller']) : undefined,
    year: rand() > 0.4 ? randInt(2000, 2025) : undefined,
  });
  return true;
}

// 1. Chain edges: ensure every node (except boundary inputs) has at least one incoming edge
//    This creates a DAG-like backbone with minimal orphans
for (let i = 1; i < NODE_COUNT; i++) {
  // Connect to a node earlier in the sequence (creates forward flow)
  const sourceIdx = randInt(Math.max(0, i - 20), i - 1);
  addEdge(nodeIds[sourceIdx], nodeIds[i]);
}

// 2. Hub edges: connect hub nodes more densely
for (let h = 0; h < hubCount; h++) {
  const hubId = nodeIds[h];
  const hubEdges = randInt(5, Math.min(15, NODE_COUNT / 10));
  for (let j = 0; j < hubEdges; j++) {
    const targetIdx = randInt(0, NODE_COUNT - 1);
    if (rand() > 0.5) {
      addEdge(hubId, nodeIds[targetIdx]);
    } else {
      addEdge(nodeIds[targetIdx], hubId);
    }
  }
}

// 3. Cross-module edges (~20% of remaining budget)
const remaining = EDGE_COUNT - edges.length;
const crossCount = Math.round(remaining * 0.2);
for (let i = 0; i < crossCount && edges.length < EDGE_COUNT; i++) {
  const srcIdx = randInt(0, NODE_COUNT - 1);
  // Pick a target in a different module
  let tgtIdx;
  let attempts = 0;
  do {
    tgtIdx = randInt(0, NODE_COUNT - 1);
    attempts++;
  } while (nodes[srcIdx].moduleId === nodes[tgtIdx].moduleId && attempts < 10);
  addEdge(nodeIds[srcIdx], nodeIds[tgtIdx]);
}

// 4. Fill remaining budget with random same-module edges
while (edges.length < EDGE_COUNT) {
  const srcIdx = randInt(0, NODE_COUNT - 1);
  // Prefer nearby nodes (within ~30 of each other) for more layered structure
  const range = Math.min(30, NODE_COUNT - 1);
  const tgtIdx = Math.min(NODE_COUNT - 1, srcIdx + randInt(1, range));
  addEdge(nodeIds[srcIdx], nodeIds[tgtIdx]);
}

// ── Summary ──────────────────────────────────────────────────────────

const connected = new Set();
for (const e of edges) { connected.add(e.source); connected.add(e.target); }
const orphans = nodes.filter(n => !connected.has(n.id));

console.log(`=== SYNTHETIC TEST GRAPH ===`);
console.log(`Nodes:    ${nodes.length}`);
console.log(`Edges:    ${edges.length}`);
console.log(`Modules:  ${modules.length}`);
console.log(`Hubs:     ${hubCount}`);
console.log(`Orphans:  ${orphans.length}`);
console.log(`Density:  ${(edges.length / nodes.length).toFixed(2)} edges/node`);

const output = JSON.stringify({ nodes, edges, modules }, null, 2);
const outPath = path.join(__dirname, '..', 'demo', 'src', 'data', 'test-graph-data.json');
fs.writeFileSync(outPath, output);
console.log(`Written to: ${outPath}`);
console.log(`\nTo use: change App.tsx import from 'ad-framework-data.json' to 'test-graph-data.json'`);
