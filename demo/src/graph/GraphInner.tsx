import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import type { LayoutResult } from '../../../src/types';
import type { MechanisticNode, MechanisticEdge } from '../../../src/index';
import { DefaultNode } from '../../../src/components/nodes/DefaultNode';
import { buildFlowData, type FlowBuildOptions } from './flow-builder';
import { postProcessLayout } from './layout-postprocess';
import { modules } from '../data/constants';

const nodeTypes: NodeTypes = { default: DefaultNode as unknown as NodeTypes['default'] };

interface GraphInnerProps {
  layout: LayoutResult;
  rawNodes: MechanisticNode[];
  rawEdges: MechanisticEdge[];
  flowOptions: FlowBuildOptions;
  onNodeClick: (nodeId: string, ctrlKey: boolean) => void;
  zoomToNodeId?: string | null;
}

export function GraphInner({
  layout,
  rawNodes,
  rawEdges,
  flowOptions,
  onNodeClick,
  zoomToNodeId,
}: GraphInnerProps) {
  const { fitView } = useReactFlow();

  const processed = useMemo(() => postProcessLayout(layout), [layout]);

  const { flowNodes, flowEdges } = useMemo(
    () => buildFlowData(processed, rawNodes, rawEdges, flowOptions),
    [processed, rawNodes, rawEdges, flowOptions],
  );

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(flowNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setRfNodes(flowNodes);
    setRfEdges(flowEdges);
  }, [flowNodes, flowEdges, setRfNodes, setRfEdges]);

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
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.05}
      maxZoom={3}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={true}
    >
      <Background color="#e5e2dd" gap={20} size={1} />
      <Controls showInteractive={false} style={{ bottom: 8, left: 8 }} />

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

      <Panel position="bottom-right">
        <div style={{
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)',
          border: '1px solid #e5e2dd', borderRadius: 4, padding: '4px 8px',
          fontSize: 9, color: '#7a7a7a',
        }}>
          {rawNodes.length} nodes &middot; {rawEdges.length} edges
        </div>
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
