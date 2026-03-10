/**
 * Quadtree-based frustum culling hook for large graphs.
 *
 * Subscribes to React Flow's viewport transform (via useStore) and returns
 * only the node IDs visible within the current viewport + margin.
 * For small graphs (below threshold), returns null to skip culling entirely.
 *
 * Must be used inside a <ReactFlowProvider>.
 */

import { useCallback, useMemo } from 'react';
import { useStore } from '@xyflow/react';
import { QuadTree } from '../lib/quadtree';
import type { LayoutResult } from '../types';

export interface ViewportCullingOptions {
  /** Extra margin in world-space pixels beyond the viewport. Default: 500 */
  margin?: number;
  /** Culling disabled below this node count. Default: 200 */
  threshold?: number;
  /**
   * Quantization cell size (world-space px). The viewport is snapped to a
   * grid of this size so small pans/zooms don't trigger re-renders.
   * Default: 150
   */
  cellSize?: number;
}

export function useViewportCulling(
  layout: LayoutResult | null,
  options: ViewportCullingOptions = {},
): Set<string> | null {
  const { margin = 500, threshold = 200, cellSize = 150 } = options;

  // Build quadtree when layout changes
  const quadtree = useMemo(() => {
    if (!layout || layout.nodes.length < threshold) return null;
    return QuadTree.fromPoints(layout.nodes);
  }, [layout, threshold]);

  // Quantize viewport to grid cells → string key.
  // Returning a primitive ensures useStore only re-renders when the key changes.
  const viewportKey = useStore(
    useCallback(
      (s: { transform: [number, number, number]; width: number; height: number }) => {
        if (!quadtree) return '';
        const [tx, ty, zoom] = s.transform;
        const invZ = 1 / zoom;
        const l = Math.floor((-tx * invZ) / cellSize);
        const t = Math.floor((-ty * invZ) / cellSize);
        const r = Math.ceil((-tx * invZ + s.width * invZ) / cellSize);
        const b = Math.ceil((-ty * invZ + s.height * invZ) / cellSize);
        return `${l},${t},${r},${b}`;
      },
      [quadtree, cellSize],
    ),
  );

  // Query quadtree whenever the quantized viewport changes
  return useMemo(() => {
    if (!quadtree || !viewportKey) return null;
    const [l, t, r, b] = viewportKey.split(',').map(Number);
    const rect = {
      x: l * cellSize - margin,
      y: t * cellSize - margin,
      width: (r - l) * cellSize + 2 * margin,
      height: (b - t) * cellSize + 2 * margin,
    };
    return new Set(quadtree.query(rect));
  }, [quadtree, viewportKey, cellSize, margin]);
}
