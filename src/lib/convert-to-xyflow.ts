/**
 * Convert CANIS GraphData + optional LayoutResult to @xyflow/react Node[]/Edge[].
 *
 * When a LayoutResult is provided, node positions come from it.
 * Otherwise, falls back to SbsfNode x/y (for fixed-position graphs like SVG-seeded data).
 */

import type { Node as XYNode, Edge as XYEdge } from '@xyflow/react';
import type {
  GraphData,
  LayoutResult,
  SbsfNode,
  SbsfEdge,
  ModuleDef,
  EdgeRoute,
  GhostNode,
  NodeDisplayOptions,
} from '../types';

/** Interactive state for node highlighting/dimming */
export type DrugRole = 'target' | 'upstream' | 'downstream';

/** Data payload attached to each xyflow node */
export interface CanisNodeData extends Record<string, unknown> {
  sbsfNode: SbsfNode;
  moduleColor: string;
  moduleName: string;
  displayOptions: NodeDisplayOptions;
  /** Node is part of a highlighted set (preset, pathway, etc.) */
  highlighted?: boolean;
  /** Node should be visually dimmed (not in highlighted set) */
  dimmed?: boolean;
  /** Drug pathway role for coloring */
  drugRole?: DrugRole;
  /** Currently selected variant ID (for boundary nodes with variants) */
  selectedVariantId?: string;
}

/** Data payload attached to each xyflow edge */
export interface CanisEdgeData extends Record<string, unknown> {
  sbsfEdge: SbsfEdge;
}

/** Edge color by relation type */
function edgeColor(relation: string): string {
  if (relation.toLowerCase().includes('increase') || relation === 'produces' || relation === 'catalyzes' || relation === 'amplifies') {
    return '#4ade80'; // green-400
  }
  if (relation.toLowerCase().includes('decrease') || relation === 'degrades' || relation === 'disrupts') {
    return '#f87171'; // red-400
  }
  if (relation === 'protects') {
    return '#60a5fa'; // blue-400
  }
  return '#9ca3af'; // gray-400
}

/** Map CausalConfidence to opacity (L1=lowest, L7=highest) */
function confidenceOpacity(confidence: string): number {
  const level = parseInt(confidence.replace('L', ''), 10);
  if (isNaN(level)) return 0.6;
  return 0.3 + (level / 7) * 0.7; // 0.3 to 1.0
}

/** Build a module lookup map */
function moduleMap(modules: ModuleDef[]): Map<string, ModuleDef> {
  const map = new Map<string, ModuleDef>();
  for (const m of modules) {
    map.set(m.id, m);
  }
  return map;
}

export interface ConvertOptions {
  displayOptions?: NodeDisplayOptions;
  /** Map of node subtype to xyflow node type name (e.g., 'Molecule' → 'molecule') */
  nodeTypeMap?: Record<string, string>;
}

export interface ConvertResult {
  nodes: XYNode<CanisNodeData>[];
  edges: XYEdge<CanisEdgeData>[];
}

export function convertToXyflow(
  data: GraphData,
  layout: LayoutResult | null,
  options: ConvertOptions = {},
): ConvertResult {
  const { displayOptions = {}, nodeTypeMap = {} } = options;
  const modules = moduleMap(data.modules);

  // Build position lookup from layout
  const positionMap = new Map<string, { x: number; y: number }>();
  if (layout) {
    for (const np of layout.nodes) {
      positionMap.set(np.id, { x: np.x, y: np.y });
    }
    for (const gn of layout.ghostNodes) {
      positionMap.set(gn.id, { x: gn.x, y: gn.y });
    }
  }

  // Convert nodes
  const nodes: XYNode<CanisNodeData>[] = data.nodes.map((sbsfNode) => {
    const pos = positionMap.get(sbsfNode.id) ?? { x: sbsfNode.x, y: sbsfNode.y };
    const mod = modules.get(sbsfNode.moduleId);
    const subtypeLower = sbsfNode.subtype?.toLowerCase() ?? '';
    const nodeType = nodeTypeMap[subtypeLower] ?? nodeTypeMap[sbsfNode.subtype] ?? 'default';

    return {
      id: sbsfNode.id,
      type: nodeType,
      position: pos,
      data: {
        sbsfNode,
        moduleColor: mod?.color ?? '#6b7280',
        moduleName: mod?.shortName ?? mod?.name ?? '',
        displayOptions,
      },
    };
  });

  // Convert edges
  let edges: XYEdge<CanisEdgeData>[];

  if (layout && layout.edges.length > 0) {
    // Use layout edge routes (may pass through ghost nodes)
    edges = buildRoutedEdges(data.edges, layout.edges, layout.ghostNodes);
  } else {
    // Direct edges from SBSF data
    edges = data.edges.map((sbsfEdge) => ({
      id: sbsfEdge.id,
      source: sbsfEdge.source,
      target: sbsfEdge.target,
      type: 'default',
      animated: false,
      style: {
        stroke: edgeColor(sbsfEdge.relation),
        strokeWidth: 2,
        opacity: confidenceOpacity(sbsfEdge.causalConfidence),
      },
      markerEnd: {
        type: 'arrowclosed' as const,
        color: edgeColor(sbsfEdge.relation),
      },
      label: sbsfEdge.keyInsight,
      data: { sbsfEdge },
    }));
  }

  return { nodes, edges };
}

/** Build edges that route through ghost nodes for Sugiyama layout */
function buildRoutedEdges(
  sbsfEdges: SbsfEdge[],
  routes: EdgeRoute[],
  _ghostNodes: GhostNode[],
): XYEdge<CanisEdgeData>[] {
  const edgeMap = new Map<string, SbsfEdge>();
  for (const e of sbsfEdges) {
    edgeMap.set(e.id, e);
  }

  const edges: XYEdge<CanisEdgeData>[] = [];

  for (const route of routes) {
    const sbsfEdge = edgeMap.get(route.originalEdgeId);
    if (!sbsfEdge) continue;

    const segmentId = `${route.originalEdgeId}__${route.from}__${route.to}`;

    edges.push({
      id: segmentId,
      source: route.from,
      target: route.to,
      type: 'default',
      animated: false,
      style: {
        stroke: edgeColor(sbsfEdge.relation),
        strokeWidth: 2,
        opacity: confidenceOpacity(sbsfEdge.causalConfidence),
      },
      markerEnd: route.isLast
        ? { type: 'arrowclosed' as const, color: edgeColor(sbsfEdge.relation) }
        : undefined,
      label: route.isFirst ? sbsfEdge.keyInsight : undefined,
      data: { sbsfEdge },
    });
  }

  return edges;
}
