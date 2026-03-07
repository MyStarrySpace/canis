/**
 * Post-process WASM Sugiyama layout for LeftToRight direction.
 * Splits large layers into multiple sub-columns so no single layer
 * creates an excessively tall vertical stack.
 *
 * Preserves the WASM layout's within-layer ordering (which minimizes
 * edge crossings) while redistributing nodes spatially.
 */

import type { LayoutResult } from '../../../src/types';

/** Max nodes in a single vertical column before splitting */
const MAX_PER_COL = 10;
/** Vertical spacing between nodes within a column */
const NODE_V_SPACING = 70;
/** Horizontal gap between sub-columns within the same layer */
const SUB_COL_GAP = 200;
/** Horizontal gap between different layers */
const LAYER_GAP = 280;

export function postProcessLayout(
  layout: LayoutResult,
  maxPerCol: number = MAX_PER_COL,
): LayoutResult {
  if (!layout.nodes.length) return layout;

  // 1. Group nodes by layer
  const layerMap = new Map<number, typeof layout.nodes>();
  for (const node of layout.nodes) {
    const layer = node.layer ?? 0;
    const group = layerMap.get(layer) ?? [];
    group.push(node);
    layerMap.set(layer, group);
  }

  // 2. Sort layers
  const sortedLayers = [...layerMap.keys()].sort((a, b) => a - b);

  // 3. Recalculate positions for LeftToRight layout
  const nodePositions = new Map<string, { x: number; y: number }>();
  let currentX = 0;

  for (const layerNum of sortedLayers) {
    const nodes = layerMap.get(layerNum)!;

    // Preserve WASM y-ordering (crossing minimization)
    nodes.sort((a, b) => a.y - b.y);

    if (nodes.length <= maxPerCol) {
      // Small layer: single column, center vertically
      const totalH = (nodes.length - 1) * NODE_V_SPACING;
      const startY = -totalH / 2;
      for (let i = 0; i < nodes.length; i++) {
        nodePositions.set(nodes[i].id, { x: currentX, y: startY + i * NODE_V_SPACING });
      }
      currentX += LAYER_GAP;
    } else {
      // Large layer: split into sub-columns
      const subCols: (typeof nodes)[] = [];
      for (let i = 0; i < nodes.length; i += maxPerCol) {
        subCols.push(nodes.slice(i, i + maxPerCol));
      }

      for (let colIdx = 0; colIdx < subCols.length; colIdx++) {
        const col = subCols[colIdx];
        const totalH = (col.length - 1) * NODE_V_SPACING;
        const startY = -totalH / 2;
        for (let i = 0; i < col.length; i++) {
          nodePositions.set(col[i].id, {
            x: currentX + colIdx * SUB_COL_GAP,
            y: startY + i * NODE_V_SPACING,
          });
        }
      }

      currentX += (subCols.length - 1) * SUB_COL_GAP + LAYER_GAP;
    }
  }

  // 4. Build updated layout
  const updatedNodes = layout.nodes.map((node) => {
    const pos = nodePositions.get(node.id);
    if (!pos) return node;
    return { ...node, x: pos.x, y: pos.y };
  });

  return { ...layout, nodes: updatedNodes };
}
