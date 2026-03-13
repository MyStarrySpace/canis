/**
 * Convert MechanisticNode/Edge types (from alz-market-viz) to SBSF wire format for WASM.
 *
 * The existing types use camelCase with nested evidence objects.
 * The WASM engine expects a flat JSON structure.
 */

import type { GraphData, SbsfEdge, SbsfNode, ModuleDef, ConfidenceScheme, BoundaryVariant } from './types';

/**
 * Input types matching alz-market-viz/src/data/mechanisticFramework/types.ts
 */
export interface MechanisticNode {
  id: string;
  label: string;
  category: 'STOCK' | 'STATE' | 'BOUNDARY' | 'PROCESS';
  subtype: string;
  moduleId: string;
  description: string;
  mechanism?: string;
  references?: {
    protein?: string;
    gene?: string;
    process?: string;
    cellType?: string;
  };
  roles?: string[];
  pmid?: string;
  notes?: string;
  variants?: BoundaryVariant[];
  defaultVariant?: string;
}

export interface MechanisticEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  moduleId: string;
  causalConfidence?: string;
  mechanismDescription?: string;
  keyInsight?: string;
  /** Top-level method type (preferred) */
  methodType?: string;
  /** Top-level PMID (preferred) */
  pmid?: string;
  evidence?: {
    pmid?: string;
    firstAuthor?: string;
    year?: number;
    methodType?: string;
  };
  notes?: string;
}

export interface MechanisticModule {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
}

/**
 * Convert MechanisticNode to SBSF node format.
 */
function convertNode(node: MechanisticNode): SbsfNode {
  const sbsf: SbsfNode = {
    id: node.id,
    label: node.label,
    category: node.category,
    subtype: node.subtype,
    moduleId: node.moduleId,
    description: node.description,
    mechanism: node.mechanism,
    roles: node.roles ?? [],
    pmid: node.pmid,
    notes: node.notes,
    x: 0,
    y: 0,
  };
  if (node.variants && node.variants.length > 0) {
    sbsf.variants = node.variants;
    sbsf.defaultVariant = node.defaultVariant;
  }
  return sbsf;
}

/**
 * Convert MechanisticEdge to SBSF edge format.
 * Flattens the nested evidence object.
 */
function convertEdge(edge: MechanisticEdge): SbsfEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    relation: edge.relation as SbsfEdge['relation'],
    moduleId: edge.moduleId,
    causalConfidence: (edge.causalConfidence ?? 'L7') as SbsfEdge['causalConfidence'],
    mechanismDescription: edge.mechanismDescription,
    keyInsight: edge.keyInsight,
    pmid: edge.pmid ?? edge.evidence?.pmid,
    firstAuthor: edge.evidence?.firstAuthor,
    year: edge.evidence?.year,
    methodType: edge.methodType ?? edge.evidence?.methodType,
    notes: edge.notes,
    weight: 1.0, // Will be computed by Rust from causalConfidence
  };
}

/**
 * Convert module to SBSF module def.
 */
function convertModule(mod_: MechanisticModule): ModuleDef {
  return {
    id: mod_.id,
    name: mod_.name,
    shortName: mod_.shortName,
    description: mod_.description,
    color: mod_.color,
  };
}

/**
 * Convert a complete mechanistic framework to SBSF GraphData.
 */
export function convertToGraphData(
  nodes: MechanisticNode[],
  edges: MechanisticEdge[],
  modules: MechanisticModule[],
  options?: {
    confidenceScheme?: ConfidenceScheme;
    confidenceWeights?: Record<string, number>;
  },
): GraphData {
  return {
    nodes: nodes.map(convertNode),
    edges: edges.map(convertEdge),
    modules: modules.map(convertModule),
    ...(options?.confidenceScheme && { confidenceScheme: options.confidenceScheme }),
    ...(options?.confidenceWeights && { confidenceWeights: options.confidenceWeights }),
  };
}

/**
 * Convert to JSON string ready for WASM consumption.
 */
export function toWasmJson(
  nodes: MechanisticNode[],
  edges: MechanisticEdge[],
  modules: MechanisticModule[],
  options?: {
    confidenceScheme?: ConfidenceScheme;
    confidenceWeights?: Record<string, number>;
  },
): string {
  return JSON.stringify(convertToGraphData(nodes, edges, modules, options));
}
