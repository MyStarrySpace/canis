/**
 * Adapter: GraphML XML → SBSF GraphData.
 *
 * Parses GraphML format (used by yEd, Gephi, etc.) via DOMParser.
 * Maps node/edge attributes to SBSF fields.
 */

import type { GraphData, SbsfNode, SbsfEdge, ModuleDef } from '../types';

/**
 * Parse a GraphML XML string into SBSF GraphData.
 *
 * Attribute mapping:
 * - Node `label` attr or `<data key="label">` → SbsfNode.label
 * - Node `x`, `y` from `<data key="x">` / `<data key="y">` or yFiles geometry
 * - Edge `source`, `target` from GraphML attributes
 * - Additional attributes mapped by key name matching SBSF fields
 */
export function fromGraphML(xml: string): GraphData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  // Parse attribute key definitions
  const keyDefs = new Map<string, { name: string; for: string; default?: string }>();
  for (const key of Array.from(doc.querySelectorAll('key'))) {
    keyDefs.set(key.getAttribute('id') ?? '', {
      name: key.getAttribute('attr.name') ?? key.getAttribute('id') ?? '',
      for: key.getAttribute('for') ?? 'all',
      default: key.querySelector('default')?.textContent ?? undefined,
    });
  }

  // Helper: extract data attributes from a GraphML element
  function getData(el: Element): Record<string, string> {
    const result: Record<string, string> = {};
    for (const dataEl of Array.from(el.querySelectorAll(':scope > data'))) {
      const keyId = dataEl.getAttribute('key') ?? '';
      const keyDef = keyDefs.get(keyId);
      const name = keyDef?.name ?? keyId;
      result[name] = dataEl.textContent ?? '';
    }
    return result;
  }

  const graphEl = doc.querySelector('graph');
  if (!graphEl) {
    return { nodes: [], edges: [], modules: [] };
  }

  const defaultModule: ModuleDef = {
    id: 'default',
    name: 'Default',
    shortName: 'Def',
    description: '',
    color: '#6b7280',
  };

  // Parse nodes
  const nodes: SbsfNode[] = [];
  for (const nodeEl of Array.from(graphEl.querySelectorAll(':scope > node'))) {
    const id = nodeEl.getAttribute('id') ?? `node_${nodes.length}`;
    const data = getData(nodeEl);

    nodes.push({
      id,
      label: data['label'] ?? data['Label'] ?? id,
      category: (data['category'] as SbsfNode['category']) ?? 'STOCK',
      subtype: data['subtype'] ?? '',
      moduleId: data['moduleId'] ?? 'default',
      description: data['description'] ?? '',
      mechanism: data['mechanism'],
      roles: data['roles'] ? data['roles'].split(',').map((r) => r.trim()) : [],
      x: parseFloat(data['x'] ?? '0') || 0,
      y: parseFloat(data['y'] ?? '0') || 0,
    });
  }

  // Parse edges
  const edges: SbsfEdge[] = [];
  for (const edgeEl of Array.from(graphEl.querySelectorAll(':scope > edge'))) {
    const id = edgeEl.getAttribute('id') ?? `edge_${edges.length}`;
    const source = edgeEl.getAttribute('source') ?? '';
    const target = edgeEl.getAttribute('target') ?? '';
    const data = getData(edgeEl);

    edges.push({
      id,
      source,
      target,
      relation: (data['relation'] as SbsfEdge['relation']) ?? 'association',
      moduleId: data['moduleId'] ?? 'default',
      causalConfidence: (data['causalConfidence'] as SbsfEdge['causalConfidence']) ?? 'L7',
      mechanismDescription: data['mechanismDescription'],
      keyInsight: data['label'] ?? data['keyInsight'],
      weight: parseFloat(data['weight'] ?? '1') || 1.0,
    });
  }

  return { nodes, edges, modules: [defaultModule] };
}
