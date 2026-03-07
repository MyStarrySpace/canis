/**
 * Adapter: Simple JSON → SBSF GraphData.
 *
 * Minimal format for quick graph creation:
 * {
 *   nodes: [{ id, label, x?, y?, category?, subtype?, moduleId?, ... }],
 *   edges: [{ source, target, label?, relation?, ... }],
 *   modules?: [{ id, name, color, ... }]
 * }
 */

import type { GraphData, SbsfNode, SbsfEdge, ModuleDef } from '../types';

export interface SimpleNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  category?: string;
  subtype?: string;
  moduleId?: string;
  description?: string;
  mechanism?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface SimpleEdge {
  source: string;
  target: string;
  id?: string;
  label?: string;
  relation?: string;
  weight?: number;
  moduleId?: string;
  [key: string]: unknown;
}

export interface SimpleModule {
  id: string;
  name: string;
  color: string;
  shortName?: string;
  description?: string;
}

export interface SimpleJsonData {
  nodes: SimpleNode[];
  edges: SimpleEdge[];
  modules?: SimpleModule[];
}

/**
 * Convert a simple JSON graph to SBSF GraphData.
 * Missing fields are filled with sensible defaults.
 */
export function fromSimpleJson(data: SimpleJsonData): GraphData {
  const defaultModule: ModuleDef = {
    id: 'default',
    name: 'Default',
    shortName: 'Def',
    description: '',
    color: '#6b7280',
  };

  const modules: ModuleDef[] = data.modules?.map((m) => ({
    id: m.id,
    name: m.name,
    shortName: m.shortName ?? m.name.slice(0, 4),
    description: m.description ?? '',
    color: m.color,
  })) ?? [defaultModule];

  const nodes: SbsfNode[] = data.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    category: (n.category as SbsfNode['category']) ?? 'STOCK',
    subtype: n.subtype ?? '',
    moduleId: n.moduleId ?? 'default',
    description: n.description ?? '',
    mechanism: n.mechanism,
    roles: n.roles ?? [],
    x: n.x ?? 0,
    y: n.y ?? 0,
  }));

  const edges: SbsfEdge[] = data.edges.map((e, i) => ({
    id: e.id ?? `e_${e.source}_${e.target}_${i}`,
    source: e.source,
    target: e.target,
    relation: (e.relation as SbsfEdge['relation']) ?? 'association',
    moduleId: e.moduleId ?? 'default',
    causalConfidence: 'L7' as const,
    keyInsight: e.label,
    weight: e.weight ?? 1.0,
  }));

  return { nodes, edges, modules };
}
