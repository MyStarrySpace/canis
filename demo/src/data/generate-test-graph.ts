/**
 * Browser-compatible synthetic test graph generator.
 * Produces deterministic graphs with configurable node count for stress testing.
 */
import type { MechanisticNode, MechanisticEdge, MechanisticModule } from '../../../src/index';

interface TestGraphResult {
  nodes: MechanisticNode[];
  edges: MechanisticEdge[];
  modules: MechanisticModule[];
}

// Deterministic xorshift32 PRNG
function createRng(initialSeed = 42) {
  let seed = initialSeed;
  return {
    rand() {
      seed ^= seed << 13;
      seed ^= seed >> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    },
    randInt(min: number, max: number) {
      return Math.floor(this.rand() * (max - min + 1)) + min;
    },
    pick<T>(arr: T[]): T {
      return arr[this.randInt(0, arr.length - 1)];
    },
  };
}

const MODULE_COLORS = [
  '#486393', '#007385', '#60a5fa', '#C9461D', '#f472b6', '#8ecae6',
  '#a78bfa', '#34d399', '#fbbf24', '#C3577F', '#7ED3FF', '#FFA380',
];

const MODULE_NAMES = [
  'Alpha Pathway', 'Beta Cascade', 'Gamma Loop', 'Delta Hub',
  'Epsilon Chain', 'Zeta Network', 'Eta Cluster', 'Theta Ring',
  'Iota Branch', 'Kappa Axis', 'Lambda Core', 'Mu Bridge',
];

const CATEGORIES: MechanisticNode['category'][] = ['STOCK', 'STATE', 'BOUNDARY'];
const SUBTYPES: Record<string, string[]> = {
  STOCK: ['ProteinPool', 'MetabolitePool', 'CellPopulation', 'OrganellePool', 'Aggregate'],
  STATE: ['MetabolicState', 'Homeostatic', 'BiologicalProcess', 'Phosphorylated'],
  BOUNDARY: ['GeneticVariant', 'SmallMolecule', 'Lifestyle', 'CognitiveScore'],
};
const RELATIONS: MechanisticEdge['relation'][] = [
  'increases', 'decreases', 'directlyIncreases', 'directlyDecreases',
  'regulates', 'modulates', 'produces', 'degrades', 'catalyzes', 'protects',
];
const CONFIDENCES = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

export function generateTestGraph(
  nodeCount: number,
  edgeDensity = 1.8,
  moduleCount = 6,
): TestGraphResult {
  const rng = createRng(42);
  const edgeCount = Math.round(nodeCount * edgeDensity);

  // Modules
  const modules: MechanisticModule[] = [];
  for (let i = 0; i < moduleCount; i++) {
    modules.push({
      id: `T${String(i + 1).padStart(2, '0')}`,
      name: MODULE_NAMES[i] || `Module ${i + 1}`,
      shortName: MODULE_NAMES[i]?.split(' ')[0] || `Mod${i + 1}`,
      description: `Synthetic test module ${i + 1}`,
      color: MODULE_COLORS[i % MODULE_COLORS.length],
    });
  }

  // Nodes
  const nodes: MechanisticNode[] = [];
  const nodeIds: string[] = [];
  const hubCount = Math.max(3, Math.round(nodeCount * 0.05));

  for (let i = 0; i < nodeCount; i++) {
    const moduleIdx = Math.min(Math.floor(i / (nodeCount / moduleCount)), moduleCount - 1);
    const mod = modules[moduleIdx];
    const cat = i < 5 ? 'BOUNDARY' : rng.pick(CATEGORIES);
    const sub = rng.pick(SUBTYPES[cat]);
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
    } as MechanisticNode);
  }

  // Edges
  const edges: MechanisticEdge[] = [];
  const edgeSet = new Set<string>();

  function addEdge(source: string, target: string): boolean {
    const key = `${source}→${target}`;
    if (edgeSet.has(key) || source === target) return false;
    edgeSet.add(key);

    const sourceNode = nodes.find(n => n.id === source);

    edges.push({
      id: `TE${String(edges.length + 1).padStart(4, '0')}`,
      source,
      target,
      relation: rng.pick(RELATIONS),
      moduleId: sourceNode?.moduleId || modules[0].id,
      causalConfidence: rng.pick(CONFIDENCES),
    } as MechanisticEdge);
    return true;
  }

  // Chain edges: DAG backbone
  for (let i = 1; i < nodeCount; i++) {
    const sourceIdx = rng.randInt(Math.max(0, i - 20), i - 1);
    addEdge(nodeIds[sourceIdx], nodeIds[i]);
  }

  // Hub edges
  for (let h = 0; h < hubCount; h++) {
    const hubId = nodeIds[h];
    const hubEdges = rng.randInt(5, Math.min(15, Math.max(5, Math.floor(nodeCount / 10))));
    for (let j = 0; j < hubEdges; j++) {
      const targetIdx = rng.randInt(0, nodeCount - 1);
      if (rng.rand() > 0.5) {
        addEdge(hubId, nodeIds[targetIdx]);
      } else {
        addEdge(nodeIds[targetIdx], hubId);
      }
    }
  }

  // Cross-module edges
  const remaining = edgeCount - edges.length;
  const crossCount = Math.round(remaining * 0.2);
  for (let i = 0; i < crossCount && edges.length < edgeCount; i++) {
    const srcIdx = rng.randInt(0, nodeCount - 1);
    let tgtIdx: number;
    let attempts = 0;
    do {
      tgtIdx = rng.randInt(0, nodeCount - 1);
      attempts++;
    } while (nodes[srcIdx].moduleId === nodes[tgtIdx].moduleId && attempts < 10);
    addEdge(nodeIds[srcIdx], nodeIds[tgtIdx]);
  }

  // Fill remaining with random same-module edges
  while (edges.length < edgeCount) {
    const srcIdx = rng.randInt(0, nodeCount - 1);
    const range = Math.min(30, nodeCount - 1);
    const tgtIdx = Math.min(nodeCount - 1, srcIdx + rng.randInt(1, range));
    addEdge(nodeIds[srcIdx], nodeIds[tgtIdx]);
  }

  return { nodes, edges, modules };
}
