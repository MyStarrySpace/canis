---
planStatus:
  planId: plan-rendering-optimizations
  title: Graph Rendering Performance Optimizations
  status: draft
  planType: refactor
  priority: medium
  owner: developer
  stakeholders:
    - developer
  tags:
    - performance
    - rendering
    - reactflow
    - optimization
  created: "2026-03-09"
  updated: "2026-03-09T15:09:02.141Z"
  progress: 0
---

# Graph Rendering Performance Optimizations

## Goals
- Achieve smooth 60fps pan/zoom with 200-400 visible nodes
- Reduce initial render time below 500ms
- Enable graceful degradation at higher node counts (1000+)

## Problem Description

The CANIS demo renders a mechanistic network graph using ReactFlow (SVG-based). With 200+ connected nodes and 400+ edges, the graph becomes sluggish during pan/zoom interactions. The current rendering pipeline has no performance-specific optimizations beyond basic React memoization.

ReactFlow uses SVG rendering internally — each node and edge is a separate DOM element. At 200-400 nodes this is manageable but becomes a bottleneck as the graph grows. Gamedev techniques (quadtrees, frustum culling, LOD) have direct analogs here.

## Current Architecture

- **ReactFlow** (`@xyflow/react` v12): SVG-based graph renderer
- **DefaultNode**: Custom React component (NOT memoized)
- **WASM Sugiyama layout**: Runs in a Web Worker (already async)
- **Pre-filtering**: Module-based filtering before layout (good pattern)
- **No viewport culling**: All nodes render regardless of visibility

## Optimization Tiers

### Tier 1: Quick Wins (implement first)

**1a. Memoize DefaultNode with React.memo**
- DefaultNode re-renders on every parent update even when its data hasn't changed
- Wrapping with `React.memo` prevents unnecessary re-renders
- Files: `src/components/nodes/DefaultNode.tsx`

**1b. Enable `onlyRenderVisibleElements`**
- ReactFlow's built-in viewport culling — only renders nodes/edges in the current viewport
- Equivalent to frustum culling in gamedev
- Files: `demo/src/graph/GraphInner.tsx`

**1c. Disable unused features**
- `elementsSelectable={false}` if not needed (reduces event listener overhead)
- Set `zIndexMode="basic"` to skip z-index recalculation
- Files: `demo/src/graph/GraphInner.tsx`

### Tier 2: Structural Improvements

**2a. Level-of-Detail (LOD) rendering**
- At low zoom (<0.3): render nodes as simple colored rectangles (no text/icons)
- At medium zoom (0.3-0.8): show label only
- At high zoom (>0.8): show full node with description, module badge, etc.
- Use `useViewport()` hook to detect zoom level
- Files: `src/components/nodes/DefaultNode.tsx`, new `MinimalNode.tsx`

**2b. Edge simplification at low zoom**
- Remove arrowheads and dashes when zoomed out
- Reduce stroke width
- Consider hiding edges entirely below a threshold zoom
- Files: `demo/src/graph/flow-builder.ts`

**2c. Quadtree-based spatial indexing**
- Build a quadtree from node positions after layout
- Use for fast viewport queries (which nodes are visible)
- Use for fast nearest-neighbor lookups (hover, click)
- Useful if `onlyRenderVisibleElements` performance is insufficient
- Files: new `src/lib/quadtree.ts`

### Tier 3: Architecture Changes (if Tier 1-2 insufficient)

**3a. Canvas-based edge rendering**
- Keep nodes as SVG/DOM (interactive)
- Render edges on a single HTML5 Canvas layer underneath
- 400 edges as canvas paths = 1 DOM element vs 400 SVG elements
- Files: new `demo/src/graph/CanvasEdgeLayer.tsx`

**3b. Virtual node list with intersection observer**
- Only mount React components for nodes near the viewport
- Use a pool of recycled DOM elements for off-screen nodes
- Similar to react-window/react-virtuoso for lists
- Files: custom ReactFlow nodeTypes implementation

**3c. WebGL rendering (Sigma.js migration)**
- For 1000+ nodes, SVG becomes untenable
- Sigma.js renders via WebGL — handles 50k+ nodes at 60fps
- Trade-off: lose DOM-level interactivity, harder custom styling
- Only consider if the graph exceeds 1000 visible nodes
- Files: would require significant rewrite

### Tier 4: Layout Performance

**4a. Incremental layout updates**
- When toggling a single module, re-layout only affected subgraph
- WASM engine already runs in a worker — extend it with incremental API
- Files: `crates/canis/src/layout/`, `src/worker.ts`

**4b. Layout caching**
- Cache layout results keyed by enabled module set
- Restore cached layout instantly when returning to a previous filter state
- Files: `src/hooks/useGraph.ts`

## Decision Framework

| Node Count | Recommended Approach |
|-----------|---------------------|
| <200 | Tier 1 only (memo, viewport culling) |
| 200-500 | Tier 1 + Tier 2 (LOD, edge simplification) |
| 500-1000 | Tier 2 + Tier 3a (canvas edges) |
| 1000+ | Consider Tier 3c (WebGL/Sigma.js) |

## Performance Benchmarks (establish before optimizing)

- [ ] Measure initial render time (DOMContentLoaded → first meaningful paint)
- [ ] Measure FPS during continuous pan/zoom (use `requestAnimationFrame` counter)
- [ ] Measure memory usage at various node counts
- [ ] Profile React re-renders using React DevTools Profiler
- [ ] Measure WASM layout computation time per filter change

## Acceptance Criteria

- [ ] DefaultNode is wrapped with React.memo
- [ ] `onlyRenderVisibleElements` is enabled
- [ ] FPS stays above 30 during pan/zoom with all modules enabled
- [ ] LOD kicks in at low zoom, reducing DOM element count
- [ ] Performance benchmarks are documented for baseline comparison

## Open Questions

- At what node count does ReactFlow's SVG rendering actually become the bottleneck vs React reconciliation?
- Would React 19's concurrent features (useTransition for layout changes) help?
- Should LOD be continuous (interpolated) or discrete (2-3 levels)?
- Is canvas-based edge rendering worth the implementation complexity for 400 edges?
