// @untangling/canis — Causal Analysis Network for Interactive Systems
// Rust/WASM-powered graph analysis engine

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

  // Renderer config types
  NodeTheme,
  DetailLevel,
  BackgroundVariant,
  NodeDisplayOptions,
  CanisGraphConfig,
  PresentationStep,

  // Worker protocol
  WorkerRequest,
  WorkerResponse,
} from './types';

// Conversion utilities
export { convertToGraphData, toWasmJson } from './convert';
export type { MechanisticNode, MechanisticEdge, MechanisticModule } from './convert';

// Non-React engine wrapper
export { GraphEngine } from './lib/engine';

// Data format adapters
export { fromSimpleJson, type SimpleJsonData, type SimpleNode, type SimpleEdge, type SimpleModule } from './adapters/simple-json';
export { fromGraphML } from './adapters/graphml';
export { extractSvgPositions, type SvgNodePosition } from './adapters/svg-positions';
