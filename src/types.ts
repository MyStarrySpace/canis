/**
 * Shared TypeScript types for @untangling/mechanistic-graph.
 *
 * These mirror the Rust types and bridge the existing MechanisticNode/Edge
 * types from alz-market-viz.
 */

// ── Node/Edge types (matching Rust SBSF types) ────────────────────────────

export type NodeCategory = 'STOCK' | 'STATE' | 'BOUNDARY' | 'PROCESS';

export type EdgeRelation =
  | 'increases'
  | 'decreases'
  | 'directlyIncreases'
  | 'directlyDecreases'
  | 'regulates'
  | 'modulates'
  | 'produces'
  | 'degrades'
  | 'binds'
  | 'transports'
  | 'causesNoChange'
  | 'association'
  | 'catalyzes'
  | 'traps'
  | 'protects'
  | 'disrupts'
  | 'requires'
  | 'amplifies';

export type CausalConfidence = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';

export interface SbsfNode {
  id: string;
  label: string;
  category: NodeCategory;
  subtype: string;
  moduleId: string;
  description: string;
  mechanism?: string;
  roles: string[];
  pmid?: string;
  notes?: string;
  x: number;
  y: number;
}

export interface SbsfEdge {
  id: string;
  source: string;
  target: string;
  relation: EdgeRelation;
  moduleId: string;
  causalConfidence: CausalConfidence;
  mechanismDescription?: string;
  keyInsight?: string;
  pmid?: string;
  firstAuthor?: string;
  year?: number;
  methodType?: string;
  notes?: string;
  weight: number;
}

export interface ModuleDef {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
}

export interface GraphData {
  nodes: SbsfNode[];
  edges: SbsfEdge[];
  modules: ModuleDef[];
}

// ── Layout types ──────────────────────────────────────────────────────────

export type Direction = 'TopToBottom' | 'LeftToRight';

export interface LayoutOptions {
  layerSpacing?: number;
  nodeSpacing?: number;
  direction?: Direction;
  maxIterations?: number;
  moduleGrouping?: boolean;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  layer: number;
  position: number;
}

export interface GhostNode {
  id: string;
  x: number;
  y: number;
  layer: number;
  originalEdgeId: string;
}

export interface EdgeRoute {
  from: string;
  to: string;
  originalEdgeId: string;
  isFirst: boolean;
  isLast: boolean;
}

export interface Bounds {
  width: number;
  height: number;
}

export interface LayoutStats {
  crossingCount: number;
  layerCount: number;
  ghostCount: number;
}

export interface LayoutResult {
  nodes: NodePosition[];
  ghostNodes: GhostNode[];
  edges: EdgeRoute[];
  bounds: Bounds;
  stats: LayoutStats;
}

// ── Analysis types ────────────────────────────────────────────────────────

export interface CentralityResult {
  nodeId: string;
  score: number;
}

export interface DegreeResult {
  nodeId: string;
  inDegree: number;
  outDegree: number;
  total: number;
  normalized: number;
}

export interface PathResult {
  path: string[];
  edges: string[];
  totalWeight: number;
  weakestLink: string | null;
}

export type LoopPolarity = 'Reinforcing' | 'Balancing';

export interface FeedbackLoop {
  nodes: string[];
  edges: string[];
  polarity: LoopPolarity;
  minConfidence: CausalConfidence;
}

export interface NeighborhoodResult {
  upstream: string[];
  downstream: string[];
  bidirectional: string[];
}

export interface CommunityResult {
  communities: string[][];
  modularity: number;
}

export interface RemovalImpact {
  removed: string;
  componentsBefore: number;
  componentsAfter: number;
  disconnectedNodes: string[];
  largestComponentSize: number;
}

export interface ModuleConnectivity {
  matrix: number[][];
  avgConfidence: string[][];
  modules: string[];
}

// ── Worker message types ──────────────────────────────────────────────────

export type WorkerRequest =
  | { type: 'init'; payload: string; requestId: string }
  | { type: 'layout'; payload: string; requestId: string }
  | { type: 'layoutSubgraph'; payload: { nodeIds: string; options: string }; requestId: string }
  | { type: 'degreeCentrality'; requestId: string }
  | { type: 'betweennessCentrality'; payload: { weighted: boolean }; requestId: string }
  | { type: 'closenessCentrality'; requestId: string }
  | { type: 'pagerank'; payload: { damping: number; maxIter: number; tolerance: number }; requestId: string }
  | { type: 'shortestPath'; payload: { from: string; to: string }; requestId: string }
  | { type: 'shortestPathWeighted'; payload: { from: string; to: string }; requestId: string }
  | { type: 'strongestPath'; payload: { from: string; to: string }; requestId: string }
  | { type: 'allSimplePaths'; payload: { from: string; to: string; maxDepth: number }; requestId: string }
  | { type: 'neighborhood'; payload: { nodeId: string; maxDepth: number }; requestId: string }
  | { type: 'feedbackLoops'; payload: { maxLength: number }; requestId: string }
  | { type: 'detectCommunities'; payload: { maxIter: number }; requestId: string }
  | { type: 'moduleConnectivity'; requestId: string }
  | { type: 'rankedRemovalImpact'; requestId: string }
  | { type: 'exportNetworkxJson'; requestId: string }
  | { type: 'exportGraphml'; requestId: string }
  | { type: 'exportGexf'; requestId: string }
  | { type: 'exportCsv'; requestId: string };

export interface WorkerResponse {
  type: 'result' | 'error';
  requestId: string;
  payload: string;
}
