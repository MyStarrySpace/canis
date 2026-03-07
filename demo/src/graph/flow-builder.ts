/**
 * Build ReactFlow nodes/edges from WASM layout + filter/highlight state.
 * Uses CANIS library CanisNodeData so the library's node components render them.
 */

import { MarkerType, type Node, type Edge } from '@xyflow/react';
import type { LayoutResult, SbsfNode } from '../../../src/types';
import type { MechanisticNode, MechanisticEdge } from '../../../src/index';
import type { CanisNodeData, DrugRole } from '../../../src/lib/convert-to-xyflow';
import { moduleColors, modules } from '../data/constants';

export type ModuleFilterState = 'on' | 'partial' | 'off';

export interface FlowBuildOptions {
  moduleFilters: Record<string, ModuleFilterState>;
  highlightedNodes?: Set<string>;
  pathwayTargets?: Set<string>;
  pathwayUpstream?: Set<string>;
  pathwayDownstream?: Set<string>;
  pathwayEdges?: Set<string>;
  focusMode?: boolean;
}

const INHIBITORY_RELATIONS = new Set([
  'decreases', 'directlyDecreases', 'degrades', 'disrupts', 'inhibits',
]);

/** Convert MechanisticNode to SbsfNode shape for library node components */
function toSbsfNode(n: MechanisticNode): SbsfNode {
  return {
    id: n.id,
    label: n.label ?? n.id,
    category: (n.category as SbsfNode['category']) ?? 'STATE',
    subtype: n.subtype ?? '',
    moduleId: n.moduleId ?? '',
    description: n.description ?? '',
    mechanism: n.mechanism,
    roles: (n.roles ?? []) as string[],
    pmid: n.pmid,
    notes: n.notes,
    x: 0,
    y: 0,
  };
}

export function buildFlowData(
  layout: LayoutResult,
  rawNodes: MechanisticNode[],
  rawEdges: MechanisticEdge[],
  options: FlowBuildOptions,
) {
  const {
    moduleFilters,
    highlightedNodes,
    pathwayTargets,
    pathwayUpstream,
    pathwayDownstream,
    pathwayEdges,
    focusMode,
  } = options;

  const nodeMap = new Map(rawNodes.map((n) => [n.id, n]));
  const hasPathway = pathwayTargets && pathwayTargets.size > 0;

  // Module name lookup
  const moduleNameMap = new Map(modules.map((m) => [m.id, m.shortName]));

  // Build visible node set
  const visibleNodeIds = new Set<string>();
  const partialNodeIds = new Set<string>();

  for (const node of rawNodes) {
    const filter = moduleFilters[node.moduleId];
    if (filter === 'on') visibleNodeIds.add(node.id);
    else if (filter === 'partial') {
      visibleNodeIds.add(node.id);
      partialNodeIds.add(node.id);
    }
  }

  // Build flow nodes using CanisNodeData
  const flowNodes: Node<CanisNodeData>[] = [];

  for (const pos of layout.nodes) {
    if (!visibleNodeIds.has(pos.id)) continue;

    const source = nodeMap.get(pos.id);
    if (!source) continue;

    const isHighlighted = highlightedNodes?.has(pos.id) ?? false;
    const isPwTarget = pathwayTargets?.has(pos.id) ?? false;
    const isPwUpstream = pathwayUpstream?.has(pos.id) ?? false;
    const isPwDownstream = pathwayDownstream?.has(pos.id) ?? false;
    const isInPathway = isPwTarget || isPwUpstream || isPwDownstream;

    // Dimming logic
    let dimmed = false;
    if (partialNodeIds.has(pos.id)) dimmed = true;
    if (hasPathway && focusMode && !isInPathway) dimmed = true;

    // Drug role
    let drugRole: DrugRole | undefined;
    if (isPwTarget) drugRole = 'target';
    else if (isPwUpstream) drugRole = 'upstream';
    else if (isPwDownstream) drugRole = 'downstream';

    flowNodes.push({
      id: pos.id,
      type: 'default',
      position: { x: pos.x, y: pos.y },
      data: {
        sbsfNode: toSbsfNode(source),
        moduleColor: moduleColors[source.moduleId ?? ''] ?? '#787473',
        moduleName: moduleNameMap.get(source.moduleId ?? '') ?? '',
        displayOptions: {
          showDescription: false,
          showMechanism: false,
          showModule: false,
          showConfidence: false,
          showPmid: false,
          theme: 'light',
          direction: 'LeftToRight',
        },
        highlighted: isHighlighted,
        dimmed,
        drugRole,
      },
    });
  }

  // Build flow edges
  const visibleFlowNodeIds = new Set(flowNodes.map((n) => n.id));

  // Group edge routes by original edge ID
  const edgeRoutesByOriginal = new Map<string, typeof layout.edges>();
  for (const route of layout.edges) {
    const existing = edgeRoutesByOriginal.get(route.originalEdgeId) ?? [];
    existing.push(route);
    edgeRoutesByOriginal.set(route.originalEdgeId, existing);
  }

  const edgeMap = new Map(rawEdges.map((e) => [e.id, e]));
  const flowEdges: Edge[] = [];

  for (const [edgeId, routes] of edgeRoutesByOriginal) {
    const sourceEdge = edgeMap.get(edgeId);
    const src = sourceEdge?.source ?? routes[0].from;
    const tgt = sourceEdge?.target ?? routes[routes.length - 1].to;

    // Skip edges where either endpoint is hidden
    if (!visibleFlowNodeIds.has(src) || !visibleFlowNodeIds.has(tgt)) continue;

    const isInhibitory = INHIBITORY_RELATIONS.has(sourceEdge?.relation ?? '');
    const isInPw = pathwayEdges?.has(edgeId) ?? false;

    // Evidence-based stroke width
    const confidence = sourceEdge?.causalConfidence;
    const baseWidth = confidence === 'L1' ? 2.5 :
      confidence === 'L2' ? 2 :
      confidence === 'L3' ? 1.5 : 1;

    let strokeColor = isInhibitory ? '#c75146' : '#007385';
    let strokeWidth = baseWidth;
    let opacity = 1;

    if (hasPathway && focusMode) {
      if (isInPw) {
        strokeWidth = baseWidth + 0.5;
        strokeColor = isInhibitory ? '#c75146' : '#e36216';
      } else {
        opacity = 0.1;
      }
    }

    flowEdges.push({
      id: edgeId,
      source: src,
      target: tgt,
      type: 'default',
      style: {
        stroke: strokeColor,
        strokeWidth,
        strokeDasharray: isInhibitory ? '4 2' : undefined,
        opacity,
        transition: 'opacity 0.15s ease',
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: strokeColor,
      },
      animated: false,
    });
  }

  return { flowNodes, flowEdges };
}
