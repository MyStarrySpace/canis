import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import type { CanisNodeData } from '../../../src/lib/convert-to-xyflow';
import type { LayoutResult } from '../../../src/types';
import type { MechanisticNode, MechanisticEdge } from '../../../src/index';
import { DefaultNode } from '../../../src/components/nodes/DefaultNode';
import { buildFlowData, type FlowBuildOptions } from './flow-builder';
// postProcessLayout disabled — pre-filtering keeps layers small enough
import { modules } from '../data/constants';
import { GraphToolbar } from './GraphToolbar';

const nodeTypes: NodeTypes = { default: DefaultNode as unknown as NodeTypes['default'] };

interface GraphInnerProps {
  layout: LayoutResult;
  rawNodes: MechanisticNode[];
  rawEdges: MechanisticEdge[];
  flowOptions: FlowBuildOptions;
  onNodeClick: (nodeId: string, ctrlKey: boolean) => void;
  onPaneClick?: () => void;
  zoomToNodeId?: string | null;
  // Toolbar props
  evidenceFilter: 'strong' | 'moderate' | 'all';
  onEvidenceFilterChange: (filter: 'strong' | 'moderate' | 'all') => void;
  direction: 'TopToBottom' | 'LeftToRight';
  onDirectionChange: (dir: 'TopToBottom' | 'LeftToRight') => void;
  layoutMode: 'Flat' | 'Hierarchical';
  onLayoutModeChange: (mode: 'Flat' | 'Hierarchical') => void;
  clusterMode: 'Auto' | 'ModuleCount';
  onClusterModeChange: (mode: 'Auto' | 'ModuleCount') => void;
  showBackEdges: boolean;
  onShowBackEdgesChange: (show: boolean) => void;
  hideRedundantEdges: boolean;
  onHideRedundantEdgesChange: (hide: boolean) => void;
  redundantEdgeCount: number;
  focusLabel?: string | null;
  onExitFocus?: () => void;
}

export function GraphInner({
  layout,
  rawNodes,
  rawEdges,
  flowOptions,
  onNodeClick,
  onPaneClick,
  zoomToNodeId,
  evidenceFilter,
  onEvidenceFilterChange,
  direction,
  onDirectionChange,
  layoutMode,
  onLayoutModeChange,
  clusterMode,
  onClusterModeChange,
  showBackEdges,
  onShowBackEdgesChange,
  hideRedundantEdges,
  onHideRedundantEdgesChange,
  redundantEdgeCount,
  focusLabel,
  onExitFocus,
}: GraphInnerProps) {
  const { fitView } = useReactFlow();

  const { flowNodes, flowEdges } = useMemo(
    () => buildFlowData(layout, rawNodes, rawEdges, flowOptions),
    [layout, rawNodes, rawEdges, flowOptions],
  );

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(flowNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setRfNodes(flowNodes);
    setRfEdges(flowEdges);
    // Re-fit the view after layout data changes (direction, mode, filter, etc.)
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 50);
    return () => clearTimeout(timer);
  }, [flowNodes, flowEdges, setRfNodes, setRfEdges, fitView]);

  // Zoom to node when requested
  useEffect(() => {
    if (!zoomToNodeId) return;
    const timer = setTimeout(() => {
      fitView({ nodes: [{ id: zoomToNodeId }], padding: 0.5, duration: 500 });
    }, 100);
    return () => clearTimeout(timer);
  }, [zoomToNodeId, fitView]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick(node.id, _.ctrlKey || _.metaKey);
    },
    [onNodeClick],
  );

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.05}
      maxZoom={3}
      proOptions={{ hideAttribution: true }}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable={true}
      onlyRenderVisibleElements
    >
      <Background color="#e5e2dd" gap={20} size={1} />
      <Controls showInteractive={false} style={{ bottom: 8, left: 8 }} />
      <MiniMap
        nodeStrokeWidth={1}
        nodeColor={(node) => {
          const data = node.data as CanisNodeData;
          return data?.moduleColor ?? '#787473';
        }}
        style={{ bottom: 8, right: 8, width: 100, height: 70 }}
        pannable
        zoomable
      />

      <Panel position="top-left">
        <div style={legendStyle}>
          {modules.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: m.color }} />
              <span style={{
                color: '#7a7a7a', fontSize: 10, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120,
              }}>
                {m.shortName}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel position="top-center">
        <GraphToolbar
          evidenceFilter={evidenceFilter}
          onEvidenceFilterChange={onEvidenceFilterChange}
          direction={direction}
          onDirectionChange={onDirectionChange}
          layoutMode={layoutMode}
          onLayoutModeChange={onLayoutModeChange}
          clusterMode={clusterMode}
          onClusterModeChange={onClusterModeChange}
          showBackEdges={showBackEdges}
          onShowBackEdgesChange={onShowBackEdgesChange}
          hideRedundantEdges={hideRedundantEdges}
          onHideRedundantEdgesChange={onHideRedundantEdgesChange}
          redundantEdgeCount={redundantEdgeCount}
          nodeCount={rawNodes.length}
          edgeCount={rawEdges.length}
          layerCount={layout.stats.layerCount}
          clusterCount={layout.clusters?.length}
          focusLabel={focusLabel}
          onExitFocus={onExitFocus}
        />
      </Panel>
    </ReactFlow>
  );
}

const legendStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(4px)',
  border: '1px solid #e5e2dd',
  borderRadius: 4,
  padding: 8,
  fontSize: 10,
  maxHeight: 200,
  overflowY: 'auto',
};
