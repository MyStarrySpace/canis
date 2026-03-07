'use client';

import { useMemo, type CSSProperties, type ComponentType } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  type NodeTypes,
  type EdgeTypes,
  type NodeProps,
  type EdgeProps,
  type Node as XYNode,
  type Edge as XYEdge,
} from '@xyflow/react';
import type {
  GraphData,
  LayoutResult,
  CanisGraphConfig,
  PresentationStep,
  NodeDisplayOptions,
} from '../types';
import { convertToXyflow, type CanisNodeData, type CanisEdgeData } from '../lib/convert-to-xyflow';
import { DefaultNode } from './nodes/DefaultNode';
import { DefaultEdge } from './edges/DefaultEdge';
import { DotBackground } from './backgrounds/DotBackground';
import { GridBackground } from './backgrounds/GridBackground';
import { GradientBackground } from './backgrounds/GradientBackground';
import { PresentationProvider } from './presentation/PresentationProvider';
import { FocusOverlay } from './presentation/FocusOverlay';

export interface CanisGraphProps {
  /** SBSF graph data */
  data: GraphData;
  /** Layout result from WASM engine. Null = use SbsfNode x/y positions */
  layout?: LayoutResult | null;
  /** Renderer configuration */
  config?: CanisGraphConfig;
  /** Custom node type components (merged with built-in defaults) */
  nodeTypes?: Record<string, ComponentType<NodeProps<XYNode<CanisNodeData>>>>;
  /** Custom edge type components (merged with built-in defaults) */
  edgeTypes?: Record<string, ComponentType<EdgeProps<XYEdge<CanisEdgeData>>>>;
  /** Map of node subtype to xyflow node type name */
  nodeTypeMap?: Record<string, string>;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string, node: XYNode<CanisNodeData>) => void;
  /** Callback when an edge is clicked */
  onEdgeClick?: (edgeId: string, edge: XYEdge<CanisEdgeData>) => void;
  /** Presentation steps for walkthrough mode */
  steps?: PresentationStep[];
  /** CSS class name for the wrapper */
  className?: string;
  /** Inline styles for the wrapper */
  style?: CSSProperties;
}

const DEFAULT_CONFIG: Required<CanisGraphConfig> = {
  detailLevel: 'interactive',
  background: 'dots',
  nodeDisplay: {
    showDescription: false,
    showMechanism: false,
    showModule: true,
    showConfidence: false,
    showPmid: false,
  },
  animationDuration: 300,
  fitOnInit: true,
};

function CanisGraphInner({
  data,
  layout = null,
  config: userConfig,
  nodeTypes: userNodeTypes,
  edgeTypes: userEdgeTypes,
  nodeTypeMap,
  onNodeClick,
  onEdgeClick,
  steps,
  className,
  style,
}: CanisGraphProps) {
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...userConfig,
    nodeDisplay: { ...DEFAULT_CONFIG.nodeDisplay, ...userConfig?.nodeDisplay },
  }), [userConfig]);

  const isPresentation = config.detailLevel === 'presentation';
  const hasSteps = isPresentation && steps && steps.length > 0;

  // Merge node/edge types with defaults
  const resolvedNodeTypes = useMemo<NodeTypes>(() => ({
    default: DefaultNode as unknown as NodeTypes['default'],
    ...userNodeTypes,
  }), [userNodeTypes]);

  const resolvedEdgeTypes = useMemo<EdgeTypes>(() => ({
    default: DefaultEdge as unknown as EdgeTypes['default'],
    ...userEdgeTypes,
  }), [userEdgeTypes]);

  // Convert CANIS data → xyflow
  const { nodes, edges } = useMemo(
    () => convertToXyflow(data, layout, {
      displayOptions: config.nodeDisplay as NodeDisplayOptions,
      nodeTypeMap,
    }),
    [data, layout, config.nodeDisplay, nodeTypeMap],
  );

  // Background component
  const BackgroundComponent = useMemo(() => {
    switch (config.background) {
      case 'grid': return GridBackground;
      case 'gradient': return GradientBackground;
      case 'dots': return DotBackground;
      case 'none': return null;
    }
  }, [config.background]);

  const flowContent = (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        background: config.nodeDisplay?.theme === 'light' ? '#faf9f7' : '#1A0F0A',
        ...style,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={resolvedNodeTypes}
        edgeTypes={resolvedEdgeTypes}
        fitView={config.fitOnInit}
        panOnDrag={!isPresentation}
        zoomOnScroll={!isPresentation}
        zoomOnPinch={!isPresentation}
        nodesDraggable={!isPresentation}
        nodesConnectable={false}
        elementsSelectable={!isPresentation}
        proOptions={{ hideAttribution: true }}
        onNodeClick={onNodeClick ? (_e, node) => onNodeClick(node.id, node as XYNode<CanisNodeData>) : undefined}
        onEdgeClick={onEdgeClick ? (_e, edge) => onEdgeClick(edge.id, edge as XYEdge<CanisEdgeData>) : undefined}
      >
        {BackgroundComponent && <BackgroundComponent />}
        {!isPresentation && (
          <>
            <Controls
              showInteractive={false}
              style={{ background: 'rgba(26, 15, 10, 0.8)', borderColor: 'rgba(255,255,255,0.1)' }}
            />
            <MiniMap
              style={{ background: 'rgba(26, 15, 10, 0.8)', borderColor: 'rgba(255,255,255,0.1)' }}
              maskColor="rgba(26, 15, 10, 0.6)"
              nodeColor={(n) => (n.data as CanisNodeData)?.moduleColor ?? '#6b7280'}
            />
          </>
        )}
        {hasSteps && (
          <FocusOverlay
            fitPadding={0.3}
            dimOpacity={0.12}
            duration={config.animationDuration}
          />
        )}
      </ReactFlow>
    </div>
  );

  if (hasSteps) {
    return (
      <PresentationProvider steps={steps}>
        {flowContent}
      </PresentationProvider>
    );
  }

  return flowContent;
}

/**
 * Main CANIS graph renderer component.
 * Wraps @xyflow/react with CANIS data conversion, custom node/edge types, and dark theme.
 *
 * In presentation mode (config.detailLevel = 'presentation' + steps prop):
 * - Disables pan/zoom/drag
 * - Provides step-through navigation via PresentationProvider
 * - Dims non-focused nodes via FocusOverlay
 * - Use <StepPanel> alongside for navigation UI
 */
export function CanisGraph(props: CanisGraphProps) {
  return (
    <ReactFlowProvider>
      <CanisGraphInner {...props} />
    </ReactFlowProvider>
  );
}
