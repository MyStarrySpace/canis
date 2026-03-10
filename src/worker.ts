/**
 * Web Worker: loads WASM graph engine, dispatches messages.
 *
 * Usage: new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
 */

import type { WorkerRequest, WorkerResponse } from './types';

// The WASM module will be loaded dynamically
let engine: any = null;
let wasmModule: any = null;

async function initWasm() {
  if (wasmModule) return;
  // Dynamic import of wasm-pack output
  const wasm = await import('../pkg/canis.js');
  await wasm.default();
  wasmModule = wasm;
}

function respond(requestId: string, payload: string) {
  const msg: WorkerResponse = { type: 'result', requestId, payload };
  self.postMessage(msg);
}

function respondError(requestId: string, error: string) {
  const msg: WorkerResponse = { type: 'error', requestId, payload: error };
  self.postMessage(msg);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  const { requestId } = msg;

  try {
    await initWasm();

    switch (msg.type) {
      case 'init': {
        engine = new wasmModule.GraphEngine(msg.payload);
        respond(requestId, engine.stats());
        break;
      }

      case 'layout': {
        if (!engine) throw new Error('Engine not initialized');
        const result = engine.layoutSugiyama(msg.payload);
        respond(requestId, result);
        break;
      }

      case 'layoutSubgraph': {
        if (!engine) throw new Error('Engine not initialized');
        const result = engine.layoutSubgraph(msg.payload.nodeIds, msg.payload.options);
        respond(requestId, result);
        break;
      }

      case 'degreeCentrality': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.degreeCentrality());
        break;
      }

      case 'betweennessCentrality': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.betweennessCentrality(msg.payload.weighted));
        break;
      }

      case 'closenessCentrality': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.closenessCentrality());
        break;
      }

      case 'pagerank': {
        if (!engine) throw new Error('Engine not initialized');
        respond(
          requestId,
          engine.pagerank(msg.payload.damping, msg.payload.maxIter, msg.payload.tolerance),
        );
        break;
      }

      case 'shortestPath': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.shortestPath(msg.payload.from, msg.payload.to));
        break;
      }

      case 'shortestPathWeighted': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.shortestPathWeighted(msg.payload.from, msg.payload.to));
        break;
      }

      case 'strongestPath': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.strongestPath(msg.payload.from, msg.payload.to));
        break;
      }

      case 'allSimplePaths': {
        if (!engine) throw new Error('Engine not initialized');
        respond(
          requestId,
          engine.allSimplePaths(msg.payload.from, msg.payload.to, msg.payload.maxDepth),
        );
        break;
      }

      case 'neighborhood': {
        if (!engine) throw new Error('Engine not initialized');
        respond(
          requestId,
          engine.neighborhood(msg.payload.nodeId, msg.payload.maxDepth),
        );
        break;
      }

      case 'feedbackLoops': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.feedbackLoops(msg.payload.maxLength));
        break;
      }

      case 'detectCommunities': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.detectCommunities(msg.payload.maxIter));
        break;
      }

      case 'moduleConnectivity': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.moduleConnectivity());
        break;
      }

      case 'rankedRemovalImpact': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.rankedRemovalImpact());
        break;
      }

      case 'transitiveRedundancies': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.transitiveRedundancies(msg.payload.maxDepth));
        break;
      }

      case 'exportNetworkxJson': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.exportNetworkxJson());
        break;
      }

      case 'exportGraphml': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.exportGraphml());
        break;
      }

      case 'exportGexf': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.exportGexf());
        break;
      }

      case 'exportCsv': {
        if (!engine) throw new Error('Engine not initialized');
        respond(requestId, engine.exportCsv());
        break;
      }

      default:
        respondError(requestId, `Unknown message type: ${(msg as any).type}`);
    }
  } catch (err) {
    respondError(requestId, err instanceof Error ? err.message : String(err));
  }
};
