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
  showBackEdges?: boolean;
  hiddenEdgeIds?: Set<string>;
  /** Currently selected variant per boundary node (nodeId → variantId) */
  selectedVariants?: Record<string, string>;
}

const INHIBITORY_RELATIONS = new Set([
  'decreases', 'directlyDecreases', 'degrades', 'disrupts', 'inhibits',
]);

/** Convert MechanisticNode to SbsfNode shape for library node components */
function toSbsfNode(n: MechanisticNode): SbsfNode {
  const sbsf: SbsfNode = {
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
  // Pass through variant data if present
  if (n.variants && (n.variants as unknown[]).length > 0) {
    sbsf.variants = n.variants as SbsfNode['variants'];
    sbsf.defaultVariant = n.defaultVariant as string | undefined;
  }
  return sbsf;
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
    showBackEdges = true,
    hiddenEdgeIds,
    selectedVariants = {},
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

    const sbsfNode = toSbsfNode(source);
    // Resolve selected variant for this node
    const selectedVariantId = selectedVariants[pos.id] ?? sbsfNode.defaultVariant;

    flowNodes.push({
      id: pos.id,
      type: 'default',
      position: { x: pos.x, y: pos.y },
      data: {
        sbsfNode,
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
        selectedVariantId,
      },
    });
  }

  // Build variant magnitude lookup: for each node with a selected variant,
  // store the effectMagnitude so outgoing edges can be scaled
  const variantMagnitude = new Map<string, number>();
  for (const node of rawNodes) {
    const variants = node.variants as Array<{ id: string; effectMagnitude: number }> | undefined;
    if (!variants || variants.length === 0) continue;
    const selId = selectedVariants[node.id] ?? (node.defaultVariant as string | undefined);
    if (!selId) continue;
    const variant = variants.find((v) => v.id === selId);
    if (variant) variantMagnitude.set(node.id, variant.effectMagnitude);
  }

  // Build flow edges
  const visibleFlowNodeIds = new Set(flowNodes.map((n) => n.id));

  // Build layer map for back-edge detection
  const layerMap = new Map<string, number>();
  for (const pos of layout.nodes) {
    layerMap.set(pos.id, pos.layer);
  }

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

    // Skip back-edges (source layer >= target layer) when toggle is off
    if (!showBackEdges) {
      const srcLayer = layerMap.get(src);
      const tgtLayer = layerMap.get(tgt);
      if (srcLayer != null && tgtLayer != null && srcLayer >= tgtLayer) continue;
    }

    // Skip transitive-redundant edges when hidden
    if (hiddenEdgeIds?.has(edgeId)) continue;

    const isInhibitory = INHIBITORY_RELATIONS.has(sourceEdge?.relation ?? '');
    const isInPw = pathwayEdges?.has(edgeId) ?? false;

    // Evidence-based stroke width
    const confidence = sourceEdge?.causalConfidence;
    const baseWidth = confidence === 'L1' ? 2.5 :
      confidence === 'L2' ? 2 :
      confidence === 'L3' ? 1.5 : 1;

    // Scale by variant effectMagnitude if the source node has a selected variant
    const magnitude = variantMagnitude.get(src);
    // Clamp visual scaling to 0.3x–4x to keep edges visible but distinct
    const magnitudeScale = magnitude != null ? Math.max(0.3, Math.min(4, Math.sqrt(magnitude))) : 1;

    let strokeColor = isInhibitory ? '#c75146' : '#007385';
    let strokeWidth = baseWidth * magnitudeScale;
    let opacity = 1;

    if (hasPathway && focusMode) {
      if (isInPw) {
        strokeWidth = baseWidth + 0.5;
        strokeColor = isInhibitory ? '#c75146' : '#e36216';
      } else {
        opacity = 0.1;
      }
    }

    // Resolve node labels for tooltip
    const srcNode = nodeMap.get(src);
    const tgtNode = nodeMap.get(tgt);

    flowEdges.push({
      id: edgeId,
      source: src,
      target: tgt,
      type: 'tooltip',
      data: {
        relation: sourceEdge?.relation,
        sourceLabel: srcNode?.label ?? src,
        targetLabel: tgtNode?.label ?? tgt,
        mechanismDescription: sourceEdge?.mechanismDescription,
        keyInsight: sourceEdge?.keyInsight,
        methodType: sourceEdge?.methodType ?? sourceEdge?.evidence?.methodType,
        pmid: sourceEdge?.pmid ?? sourceEdge?.evidence?.pmid,
        confidence: sourceEdge?.causalConfidence,
        strokeColor,
        strokeWidth,
        strokeDasharray: isInhibitory ? '4 2' : undefined,
        opacity,
      },
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
