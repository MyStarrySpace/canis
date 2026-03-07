// @untangling/canis/react — React renderer and hooks
// Requires @xyflow/react, react, react-dom as peer dependencies

// Main component
export { CanisGraph, type CanisGraphProps } from './components/CanisGraph';

// Default node/edge types
export { DefaultNode } from './components/nodes/DefaultNode';
export { DefaultEdge } from './components/edges/DefaultEdge';

// Biology node types
export { MoleculeNode } from './components/nodes/MoleculeNode';
export { ProteinNode } from './components/nodes/ProteinNode';
export { OrganelleNode } from './components/nodes/OrganelleNode';
export { ProcessNode } from './components/nodes/ProcessNode';
export { BoundaryNode } from './components/nodes/BoundaryNode';
export { CustomSvgNode } from './components/nodes/CustomSvgNode';
export { biologyNodeTypes, biologyNodeTypeMap } from './components/nodes/node-registry';

// Shared node utilities
export { ChemicalFormula } from './components/nodes/shared/ChemicalFormula';
export { NodeHandle } from './components/nodes/shared/NodeHandle';
export { ModuleBadge } from './components/nodes/shared/ModuleBadge';
export { getTheme, type ThemeColors } from './components/nodes/shared/theme';

// Presentation mode
export { PresentationProvider, usePresentationContext, usePresentationContextSafe } from './components/presentation/PresentationProvider';
export { usePresentationControls } from './components/presentation/usePresentationControls';
export { StepPanel } from './components/presentation/StepPanel';
export { FocusOverlay } from './components/presentation/FocusOverlay';

// Node/edge type definitions
export type { CanisNode, CanisNodeProps } from './components/nodes/types';
export type { CanisEdge, CanisEdgeProps } from './components/edges/types';

// Backgrounds
export { DotBackground } from './components/backgrounds/DotBackground';
export { GridBackground } from './components/backgrounds/GridBackground';
export { GradientBackground } from './components/backgrounds/GradientBackground';

// Data conversion
export { convertToXyflow, type CanisNodeData, type CanisEdgeData, type DrugRole, type ConvertOptions, type ConvertResult } from './lib/convert-to-xyflow';

// React hook
export { useGraph } from './hooks/useGraph';
