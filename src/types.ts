/**
 * Shared TypeScript types for @untangling/canis.
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
  | 'amplifies'
  | 'substrateof'
  | 'inhibits';

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

/** A single rule in a confidence classification scheme. */
export interface ConfidenceRule {
  /** Method types that trigger this rule (case-insensitive, OR within list). */
  methodTypes?: string[];
  /** If true, edge must have a PMID to match. */
  requiresPmid?: boolean;
  /** Edge's existing confidence must be at or above this level. */
  minExistingConfidence?: CausalConfidence;
  /** The confidence level to assign when this rule matches. */
  confidence: CausalConfidence;
}

/**
 * A confidence classification scheme.
 * Rules are evaluated in order — first match wins.
 * When provided on GraphData, edges are reclassified based on their methodType
 * and other metadata.
 */
export interface ConfidenceScheme {
  name: string;
  description?: string;
  /** Ordered rules. First matching rule determines the confidence level. */
  rules: ConfidenceRule[];
  /** Default confidence when no rule matches. Defaults to "L7". */
  defaultConfidence?: CausalConfidence;
}

export interface GraphData {
  nodes: SbsfNode[];
  edges: SbsfEdge[];
  modules: ModuleDef[];
  /**
   * Custom confidence → strength weight mapping.
   * Keys are confidence levels (e.g. "L1", "L2", ..., "L7").
   * Values are numeric weights (higher = stronger evidence).
   * When provided, overrides the built-in defaults for all weight computations.
   *
   * Built-in defaults: L1=1.0, L2=0.85, L3=0.7, L4=0.55, L5=0.4, L6=0.3, L7=0.2
   */
  confidenceWeights?: Record<string, number>;
  /**
   * Confidence classification scheme. When provided, edges are reclassified
   * based on their methodType and other metadata using these rules.
   * If not provided, each edge's existing causalConfidence is used as-is.
   */
  confidenceScheme?: ConfidenceScheme;
}

// ── Layout types ──────────────────────────────────────────────────────────

export type Direction = 'TopToBottom' | 'LeftToRight';

export type LayoutMode = 'Flat' | 'Hierarchical';

export type ClusterCountMode = 'Auto' | 'Fixed' | 'ModuleCount';

export interface ClusterOptions {
  countMode?: ClusterCountMode;
  /** Number of clusters when countMode = 'Fixed' */
  clusterCount?: number;
  /** Use modules as base clusters instead of spectral analysis */
  hybridModules?: boolean;
  /** Padding between cluster bounding boxes (px). Default: 100 */
  clusterPadding?: number;
  /** Minimum nodes per cluster; smaller clusters get merged. Default: 3 */
  minClusterSize?: number;
  /** Module IDs that always get their own dedicated cluster (e.g. boundary modules) */
  pinnedModules?: string[];
}

export interface LayoutOptions {
  layerSpacing?: number;
  nodeSpacing?: number;
  direction?: Direction;
  maxIterations?: number;
  moduleGrouping?: boolean;
  /** Reorder children by edge weight (strongest first). Default: true */
  strengthOrdering?: boolean;
  /** Flat (default) or Hierarchical (spectral clustering + two-level Sugiyama) */
  layoutMode?: LayoutMode;
  /** Clustering options for hierarchical layout mode */
  clusterOptions?: ClusterOptions;
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

export interface ClusterInfo {
  id: number;
  nodeIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  nodes: NodePosition[];
  ghostNodes: GhostNode[];
  edges: EdgeRoute[];
  bounds: Bounds;
  stats: LayoutStats;
  clusters?: ClusterInfo[];
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

// ── Renderer config types ─────────────────────────────────────────────────

export type DetailLevel = 'presentation' | 'interactive';

export type BackgroundVariant = 'dots' | 'grid' | 'gradient' | 'none';

export type NodeTheme = 'light' | 'dark';

export interface NodeDisplayOptions {
  showDescription?: boolean;
  showMechanism?: boolean;
  showModule?: boolean;
  showConfidence?: boolean;
  showPmid?: boolean;
  theme?: NodeTheme;
  direction?: Direction;
}

export interface CanisGraphConfig {
  detailLevel?: DetailLevel;
  background?: BackgroundVariant;
  nodeDisplay?: NodeDisplayOptions;
  animationDuration?: number;
  fitOnInit?: boolean;
}

export interface PresentationStep {
  id: string;
  label: string;
  description: string;
  focusNodeIds: string[];
  focusEdgeIds?: string[];
  fitView?: boolean;
  viewBox?: { x: number; y: number; width: number; height: number };
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
  | { type: 'transitiveRedundancies'; payload: { maxDepth: number }; requestId: string }
  | { type: 'exportNetworkxJson'; requestId: string }
  | { type: 'exportGraphml'; requestId: string }
  | { type: 'exportGexf'; requestId: string }
  | { type: 'exportCsv'; requestId: string };

export interface WorkerResponse {
  type: 'result' | 'error';
  requestId: string;
  payload: string;
}
