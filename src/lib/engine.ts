/**
 * Non-React wrapper for the WASM graph engine.
 * For use in Node.js scripts or non-React contexts.
 *
 * Note: This requires a WASM runtime that supports wasm-pack's web target.
 * In Node.js, use with a polyfill or the bundled WASM file directly.
 */

import type {
  CentralityResult,
  CommunityResult,
  DegreeResult,
  FeedbackLoop,
  GraphData,
  LayoutOptions,
  LayoutResult,
  ModuleConnectivity,
  NeighborhoodResult,
  PathResult,
  RemovalImpact,
} from '../types';

export class GraphEngine {
  private engine: any;

  private constructor(engine: any) {
    this.engine = engine;
  }

  /**
   * Create a new engine instance from graph data.
   * Must be called with the WASM module already initialized.
   */
  static fromWasmEngine(wasmEngine: any): GraphEngine {
    return new GraphEngine(wasmEngine);
  }

  // ── Layout ──────────────────────────────────────────────────────────────

  layoutSugiyama(opts?: LayoutOptions): LayoutResult {
    return JSON.parse(this.engine.layoutSugiyama(JSON.stringify(opts ?? {})));
  }

  layoutSubgraph(nodeIds: string[], opts?: LayoutOptions): LayoutResult {
    return JSON.parse(
      this.engine.layoutSubgraph(
        JSON.stringify(nodeIds),
        JSON.stringify(opts ?? {}),
      ),
    );
  }

  // ── Centrality ──────────────────────────────────────────────────────────

  degreeCentrality(): DegreeResult[] {
    return JSON.parse(this.engine.degreeCentrality());
  }

  betweennessCentrality(weighted = false): CentralityResult[] {
    return JSON.parse(this.engine.betweennessCentrality(weighted));
  }

  closenessCentrality(): CentralityResult[] {
    return JSON.parse(this.engine.closenessCentrality());
  }

  pagerank(damping = 0.85, maxIter = 100, tolerance = 1e-6): CentralityResult[] {
    return JSON.parse(this.engine.pagerank(damping, maxIter, tolerance));
  }

  // ── Paths ───────────────────────────────────────────────────────────────

  shortestPath(from: string, to: string): PathResult | null {
    const r = this.engine.shortestPath(from, to);
    return r === 'null' ? null : JSON.parse(r);
  }

  shortestPathWeighted(from: string, to: string): PathResult | null {
    const r = this.engine.shortestPathWeighted(from, to);
    return r === 'null' ? null : JSON.parse(r);
  }

  strongestPath(from: string, to: string): PathResult | null {
    const r = this.engine.strongestPath(from, to);
    return r === 'null' ? null : JSON.parse(r);
  }

  allSimplePaths(from: string, to: string, maxDepth = 8): PathResult[] {
    return JSON.parse(this.engine.allSimplePaths(from, to, maxDepth));
  }

  neighborhood(nodeId: string, maxDepth = 3): NeighborhoodResult {
    return JSON.parse(this.engine.neighborhood(nodeId, maxDepth));
  }

  // ── Loops & Communities ─────────────────────────────────────────────────

  feedbackLoops(maxLength = 6): FeedbackLoop[] {
    return JSON.parse(this.engine.feedbackLoops(maxLength));
  }

  detectCommunities(maxIter = 100): CommunityResult {
    return JSON.parse(this.engine.detectCommunities(maxIter));
  }

  moduleConnectivity(): ModuleConnectivity {
    return JSON.parse(this.engine.moduleConnectivity());
  }

  // ── Robustness ──────────────────────────────────────────────────────────

  rankedRemovalImpact(): RemovalImpact[] {
    return JSON.parse(this.engine.rankedRemovalImpact());
  }

  // ── Transitive redundancy ──────────────────────────────────────────────

  transitiveRedundancies(maxDepth = 4): string[] {
    return JSON.parse(this.engine.transitiveRedundancies(maxDepth));
  }

  // ── Export ──────────────────────────────────────────────────────────────

  exportNetworkxJson(): string {
    return this.engine.exportNetworkxJson();
  }

  exportGraphml(): string {
    return this.engine.exportGraphml();
  }

  exportGexf(): string {
    return this.engine.exportGexf();
  }

  exportCsv(): { nodesCsv: string; edgesCsv: string } {
    return JSON.parse(this.engine.exportCsv());
  }
}
