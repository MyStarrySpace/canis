import { useCallback, useEffect, useRef, useState } from 'react';
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
  WorkerRequest,
  WorkerResponse,
} from '../types';

interface UseGraphOptions {
  graphData: GraphData;
  autoLayout?: boolean;
  layoutOptions?: LayoutOptions;
}

interface UseGraphReturn {
  ready: boolean;
  loading: boolean;
  error: string | null;
  layout: LayoutResult | null;

  // Layout
  computeLayout(opts?: LayoutOptions): Promise<LayoutResult>;
  computeSubgraphLayout(nodeIds: string[], opts?: LayoutOptions): Promise<LayoutResult>;

  // Centrality
  degreeCentrality(): Promise<DegreeResult[]>;
  betweennessCentrality(weighted?: boolean): Promise<CentralityResult[]>;
  closenessCentrality(): Promise<CentralityResult[]>;
  pagerank(damping?: number, maxIter?: number, tolerance?: number): Promise<CentralityResult[]>;

  // Paths
  shortestPath(from: string, to: string): Promise<PathResult | null>;
  shortestPathWeighted(from: string, to: string): Promise<PathResult | null>;
  strongestPath(from: string, to: string): Promise<PathResult | null>;
  allSimplePaths(from: string, to: string, maxDepth?: number): Promise<PathResult[]>;
  neighborhood(nodeId: string, maxDepth?: number): Promise<NeighborhoodResult>;

  // Loops & Communities
  feedbackLoops(maxLength?: number): Promise<FeedbackLoop[]>;
  detectCommunities(maxIter?: number): Promise<CommunityResult>;
  moduleConnectivity(): Promise<ModuleConnectivity>;

  // Robustness
  rankedRemovalImpact(): Promise<RemovalImpact[]>;

  // Export
  exportNetworkxJson(): Promise<string>;
  exportGraphml(): Promise<string>;
  exportGexf(): Promise<string>;
  exportCsv(): Promise<{ nodesCsv: string; edgesCsv: string }>;
}

type PendingRequest = {
  resolve: (value: string) => void;
  reject: (reason: string) => void;
};

let requestCounter = 0;

export function useGraph({
  graphData,
  autoLayout = false,
  layoutOptions,
}: UseGraphOptions): UseGraphReturn {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutResult | null>(null);

  // Send a message to the worker and return a promise for the response
  const send = useCallback(
    (msg: Record<string, unknown>): Promise<string> => {
      return new Promise((resolve, reject) => {
        const requestId = `req_${++requestCounter}`;
        pendingRef.current.set(requestId, { resolve, reject });
        workerRef.current?.postMessage({ ...msg, requestId });
      });
    },
    [],
  );

  // Initialize worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { requestId, type, payload } = event.data;
      const pending = pendingRef.current.get(requestId);
      if (pending) {
        pendingRef.current.delete(requestId);
        if (type === 'error') {
          pending.reject(payload);
        } else {
          pending.resolve(payload);
        }
      }
    };

    worker.onerror = (err) => {
      setError(err.message);
      setLoading(false);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Init engine when graphData changes
  useEffect(() => {
    if (!workerRef.current) return;

    setLoading(true);
    setError(null);

    const json = JSON.stringify(graphData);

    send({ type: 'init', payload: json })
      .then(() => {
        setReady(true);
        setLoading(false);

        if (autoLayout) {
          const opts = JSON.stringify(layoutOptions ?? {});
          send({ type: 'layout', payload: opts }).then((r: string) => {
            setLayout(JSON.parse(r));
          });
        }
      })
      .catch((e: unknown) => {
        setError(String(e));
        setLoading(false);
      });
  }, [graphData, send, autoLayout, layoutOptions]);

  // API methods
  const computeLayout = useCallback(
    async (opts?: LayoutOptions): Promise<LayoutResult> => {
      const result = await send({
        type: 'layout',
        payload: JSON.stringify(opts ?? {}),
      });
      const parsed = JSON.parse(result);
      setLayout(parsed);
      return parsed;
    },
    [send],
  );

  const computeSubgraphLayout = useCallback(
    async (nodeIds: string[], opts?: LayoutOptions): Promise<LayoutResult> => {
      const result = await send({
        type: 'layoutSubgraph',
        payload: {
          nodeIds: JSON.stringify(nodeIds),
          options: JSON.stringify(opts ?? {}),
        },
      });
      const parsed = JSON.parse(result);
      setLayout(parsed);
      return parsed;
    },
    [send],
  );

  return {
    ready,
    loading,
    error,
    layout,

    computeLayout,
    computeSubgraphLayout,

    degreeCentrality: useCallback(
      async () => JSON.parse(await send({ type: 'degreeCentrality' })),
      [send],
    ),
    betweennessCentrality: useCallback(
      async (weighted = false) =>
        JSON.parse(
          await send({ type: 'betweennessCentrality', payload: { weighted } }),
        ),
      [send],
    ),
    closenessCentrality: useCallback(
      async () => JSON.parse(await send({ type: 'closenessCentrality' })),
      [send],
    ),
    pagerank: useCallback(
      async (damping = 0.85, maxIter = 100, tolerance = 1e-6) =>
        JSON.parse(
          await send({ type: 'pagerank', payload: { damping, maxIter, tolerance } }),
        ),
      [send],
    ),

    shortestPath: useCallback(
      async (from: string, to: string) => {
        const r = await send({ type: 'shortestPath', payload: { from, to } });
        return r === 'null' ? null : JSON.parse(r);
      },
      [send],
    ),
    shortestPathWeighted: useCallback(
      async (from: string, to: string) => {
        const r = await send({ type: 'shortestPathWeighted', payload: { from, to } });
        return r === 'null' ? null : JSON.parse(r);
      },
      [send],
    ),
    strongestPath: useCallback(
      async (from: string, to: string) => {
        const r = await send({ type: 'strongestPath', payload: { from, to } });
        return r === 'null' ? null : JSON.parse(r);
      },
      [send],
    ),
    allSimplePaths: useCallback(
      async (from: string, to: string, maxDepth = 8) =>
        JSON.parse(
          await send({ type: 'allSimplePaths', payload: { from, to, maxDepth } }),
        ),
      [send],
    ),
    neighborhood: useCallback(
      async (nodeId: string, maxDepth = 3) =>
        JSON.parse(
          await send({ type: 'neighborhood', payload: { nodeId, maxDepth } }),
        ),
      [send],
    ),

    feedbackLoops: useCallback(
      async (maxLength = 6) =>
        JSON.parse(await send({ type: 'feedbackLoops', payload: { maxLength } })),
      [send],
    ),
    detectCommunities: useCallback(
      async (maxIter = 100) =>
        JSON.parse(await send({ type: 'detectCommunities', payload: { maxIter } })),
      [send],
    ),
    moduleConnectivity: useCallback(
      async () => JSON.parse(await send({ type: 'moduleConnectivity' })),
      [send],
    ),

    rankedRemovalImpact: useCallback(
      async () => JSON.parse(await send({ type: 'rankedRemovalImpact' })),
      [send],
    ),

    exportNetworkxJson: useCallback(
      async () => send({ type: 'exportNetworkxJson' }),
      [send],
    ),
    exportGraphml: useCallback(
      async () => send({ type: 'exportGraphml' }),
      [send],
    ),
    exportGexf: useCallback(
      async () => send({ type: 'exportGexf' }),
      [send],
    ),
    exportCsv: useCallback(
      async () => JSON.parse(await send({ type: 'exportCsv' })),
      [send],
    ),
  };
}
