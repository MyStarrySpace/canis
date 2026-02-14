// @untangling/mechanistic-graph
// Rust/WASM-powered graph analysis engine for mechanistic networks

// Types
export type {
  // Core data types
  NodeCategory,
  EdgeRelation,
  CausalConfidence,
  SbsfNode,
  SbsfEdge,
  ModuleDef,
  GraphData,

  // Layout types
  Direction,
  LayoutOptions,
  NodePosition,
  GhostNode,
  EdgeRoute,
  Bounds,
  LayoutStats,
  LayoutResult,

  // Analysis types
  CentralityResult,
  DegreeResult,
  PathResult,
  LoopPolarity,
  FeedbackLoop,
  NeighborhoodResult,
  CommunityResult,
  RemovalImpact,
  ModuleConnectivity,

  // Worker protocol
  WorkerRequest,
  WorkerResponse,
} from './types';

// Conversion utilities
export { convertToGraphData, toWasmJson } from './convert';
export type { MechanisticNode, MechanisticEdge, MechanisticModule } from './convert';

// React hook
export { useGraph } from './hooks/useGraph';

// Non-React engine wrapper
export { GraphEngine } from './lib/engine';
