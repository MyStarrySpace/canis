/**
 * Pathway Calculation - BFS-based algorithm for drug pathways
 * Adapted from alz-market-viz aac70c8, simplified (no feedback loop analysis).
 */

import type { MechanisticNode, MechanisticEdge } from '../../../src/index';
import type { TreatmentTarget, TreatmentLibraryEntry } from './drug-library';

export interface PathwayResult {
  allNodes: Set<string>;
  upstreamNodes: Set<string>;
  targetNodes: Set<string>;
  downstreamNodes: Set<string>;
  pathwayEdges: Set<string>;
  affectedModules: Set<string>;
}

interface AdjacencyLists {
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
  edgeMap: Map<string, MechanisticEdge>;
}

function buildAdjacencyLists(
  nodes: MechanisticNode[],
  edges: MechanisticEdge[],
): AdjacencyLists {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const edgeMap = new Map<string, MechanisticEdge>();

  nodes.forEach((node) => {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  });

  edges.forEach((edge) => {
    const outList = outgoing.get(edge.source);
    if (outList) outList.push(edge.target);
    const inList = incoming.get(edge.target);
    if (inList) inList.push(edge.source);
    edgeMap.set(`${edge.source}->${edge.target}`, edge);
  });

  return { outgoing, incoming, edgeMap };
}

function bfsBackward(
  startNodes: string[],
  incoming: Map<string, string[]>,
  maxDepth: number,
): Set<string> {
  const visited = new Set<string>();
  const queue: { nodeId: string; depth: number }[] = startNodes.map((id) => ({ nodeId: id, depth: 0 }));

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (visited.has(nodeId) || depth > maxDepth) continue;
    visited.add(nodeId);
    for (const predId of incoming.get(nodeId) || []) {
      if (!visited.has(predId)) queue.push({ nodeId: predId, depth: depth + 1 });
    }
  }
  return visited;
}

function bfsForward(
  startNodes: string[],
  outgoing: Map<string, string[]>,
  maxDepth: number,
): Set<string> {
  const visited = new Set<string>();
  const queue: { nodeId: string; depth: number }[] = startNodes.map((id) => ({ nodeId: id, depth: 0 }));

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (visited.has(nodeId) || depth > maxDepth) continue;
    visited.add(nodeId);
    for (const succId of outgoing.get(nodeId) || []) {
      if (!visited.has(succId)) queue.push({ nodeId: succId, depth: depth + 1 });
    }
  }
  return visited;
}

export function computePathway(
  targets: TreatmentTarget[],
  nodes: MechanisticNode[],
  edges: MechanisticEdge[],
  maxDepth: number = 3,
): PathwayResult {
  const adjacency = buildAdjacencyLists(nodes, edges);
  const targetNodeIds = targets.map((t) => t.nodeId).filter((id) => adjacency.outgoing.has(id));
  const targetNodes = new Set(targetNodeIds);

  const upstreamWithTargets = bfsBackward(targetNodeIds, adjacency.incoming, maxDepth);
  const downstreamWithTargets = bfsForward(targetNodeIds, adjacency.outgoing, maxDepth);

  const upstreamNodes = new Set<string>();
  upstreamWithTargets.forEach((id) => { if (!targetNodes.has(id)) upstreamNodes.add(id); });

  const downstreamNodes = new Set<string>();
  downstreamWithTargets.forEach((id) => { if (!targetNodes.has(id)) downstreamNodes.add(id); });

  const allNodes = new Set([...upstreamNodes, ...targetNodes, ...downstreamNodes]);

  const pathwayEdges = new Set<string>();
  adjacency.edgeMap.forEach((edge) => {
    if (allNodes.has(edge.source) && allNodes.has(edge.target)) {
      pathwayEdges.add(edge.id);
    }
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const affectedModules = new Set<string>();
  allNodes.forEach((id) => {
    const node = nodeMap.get(id);
    if (node) affectedModules.add(node.moduleId);
  });

  return { allNodes, upstreamNodes, targetNodes, downstreamNodes, pathwayEdges, affectedModules };
}

export function calculateDrugPathway(
  drug: TreatmentLibraryEntry,
  nodes: MechanisticNode[],
  edges: MechanisticEdge[],
  maxDepth: number = 3,
): PathwayResult {
  return computePathway(drug.primaryTargets, nodes, edges, maxDepth);
}
