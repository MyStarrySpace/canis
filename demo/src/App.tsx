import { useCallback, useMemo, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  convertToGraphData,
  type MechanisticNode,
  type MechanisticEdge,
  type MechanisticModule,
} from '../../src/index';
import { useGraph } from '../../src/react';
import { GraphInner } from './graph/GraphInner';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { NodeInspector } from './sidebar/NodeInspector';
import { ModuleFilters } from './sidebar/ModuleFilters';
import { FindSearch } from './sidebar/FindSearch';
import { PresetPicker } from './sidebar/PresetPicker';
import { DrugPathwayPanel } from './sidebar/DrugPathwayPanel';
import { calculateDrugPathway, type PathwayResult } from './data/pathway-calculation';
import type { TreatmentLibraryEntry } from './data/drug-library';
import type { ModuleFilterState } from './graph/flow-builder';
import frameworkData from './data/ad-framework-data.json';

// ── Worker + layout config ───────────────────────────────────────────────────

const workerUrl = new URL('../../src/worker.ts', import.meta.url);

const layoutOptions = {
  layerSpacing: 260,
  nodeSpacing: 40,
  direction: 'LeftToRight' as const,
  maxIterations: 24,
};

// ── Raw data ─────────────────────────────────────────────────────────────────

const rawNodes = frameworkData.nodes as MechanisticNode[];
const rawEdges = frameworkData.edges as MechanisticEdge[];
const rawModules = frameworkData.modules as MechanisticModule[];
const graphData = convertToGraphData(rawNodes, rawEdges, rawModules);

// ── Initial filter state: M01 on, rest off ───────────────────────────────────

function buildInitialFilters(): Record<string, ModuleFilterState> {
  const filters: Record<string, ModuleFilterState> = {};
  rawModules.forEach((m) => { filters[m.id] = 'on'; });
  return filters;
}

// ── App ──────────────────────────────────────────────────────────────────────

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [moduleFilters, setModuleFilters] = useState<Record<string, ModuleFilterState>>(buildInitialFilters);
  const [zoomToNodeId, setZoomToNodeId] = useState<string | null>(null);

  // Focus mode state (saved filters to restore)
  const [focusSavedFilters, setFocusSavedFilters] = useState<Record<string, ModuleFilterState> | null>(null);
  const [focusLabel, setFocusLabel] = useState<string | null>(null);

  // Preset state
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());

  // Drug/pathway state
  const [activeDrug, setActiveDrug] = useState<TreatmentLibraryEntry | null>(null);
  const [activePathway, setActivePathway] = useState<PathwayResult | null>(null);
  const [pathwayFocusMode, setPathwayFocusMode] = useState(false);

  // Graph hook
  const { ready, loading, error, layout, exportGraphml, exportGexf, exportNetworkxJson, exportCsv } = useGraph({
    graphData,
    autoLayout: true,
    workerUrl,
    layoutOptions,
  });

  // ── Filter handlers ──────────────────────────────────────────────────────

  const handleToggleModule = useCallback((moduleId: string) => {
    setModuleFilters((prev) => {
      const current = prev[moduleId] ?? 'off';
      const next: ModuleFilterState = current === 'off' ? 'on' : current === 'on' ? 'partial' : 'off';
      return { ...prev, [moduleId]: next };
    });
  }, []);

  const handleSetAllModules = useCallback((state: ModuleFilterState) => {
    setModuleFilters((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { next[k] = state; });
      return next;
    });
  }, []);

  // ── Node click handler (with Ctrl+click focus mode) ──────────────────────

  const handleNodeClick = useCallback((nodeId: string, ctrlKey: boolean) => {
    setSelectedNode(nodeId);

    if (ctrlKey) {
      // Enter focus mode: show only this node's module + connected modules
      const node = rawNodes.find((n) => n.id === nodeId);
      if (!node) return;

      const connectedModules = new Set<string>([node.moduleId]);
      rawEdges.forEach((e) => {
        if (e.source === nodeId) {
          const target = rawNodes.find((n) => n.id === e.target);
          if (target) connectedModules.add(target.moduleId);
        }
        if (e.target === nodeId) {
          const source = rawNodes.find((n) => n.id === e.source);
          if (source) connectedModules.add(source.moduleId);
        }
      });

      setFocusSavedFilters({ ...moduleFilters });
      setFocusLabel(node.label);
      const newFilters: Record<string, ModuleFilterState> = {};
      rawModules.forEach((m) => {
        newFilters[m.id] = connectedModules.has(m.id) ? 'on' : 'off';
      });
      setModuleFilters(newFilters);
      setZoomToNodeId(nodeId);
    }
  }, [moduleFilters]);

  const exitFocusMode = useCallback(() => {
    if (focusSavedFilters) {
      setModuleFilters(focusSavedFilters);
      setFocusSavedFilters(null);
      setFocusLabel(null);
    }
  }, [focusSavedFilters]);

  // ── Find/Navigate handler ────────────────────────────────────────────────

  const handleNavigateToNode = useCallback((nodeId: string, enableModule: boolean) => {
    setSelectedNode(nodeId);
    if (enableModule) {
      const node = rawNodes.find((n) => n.id === nodeId);
      if (node) {
        setModuleFilters((prev) => ({ ...prev, [node.moduleId]: 'on' }));
      }
    }
    // Delay zoom to allow layout to update if module was just enabled
    setTimeout(() => setZoomToNodeId(nodeId), enableModule ? 200 : 0);
  }, []);

  // ── Preset handlers ──────────────────────────────────────────────────────

  const handleSelectHypothesis = useCallback((nodeIds: string[], _color: string, _label: string) => {
    setHighlightedNodes(new Set(nodeIds));
    setActivePresetId(_label);
    setActiveDrug(null);
    setActivePathway(null);
    setPathwayFocusMode(false);

    // Auto-enable modules that contain highlighted nodes
    const neededModules = new Set<string>();
    nodeIds.forEach((id) => {
      const node = rawNodes.find((n) => n.id === id);
      if (node) neededModules.add(node.moduleId);
    });
    setModuleFilters((prev) => {
      const next = { ...prev };
      neededModules.forEach((mid) => { next[mid] = 'on'; });
      return next;
    });
  }, []);

  const handleSelectDrug = useCallback((drug: TreatmentLibraryEntry) => {
    setActiveDrug(drug);
    setActivePresetId(drug.id);
    setHighlightedNodes(new Set());

    const pathway = calculateDrugPathway(drug, rawNodes, rawEdges);
    setActivePathway(pathway);

    // Auto-enable affected modules
    setModuleFilters((prev) => {
      const next = { ...prev };
      pathway.affectedModules.forEach((mid) => { next[mid] = 'on'; });
      return next;
    });
  }, []);

  const handleClearPreset = useCallback(() => {
    setActivePresetId(null);
    setHighlightedNodes(new Set());
    setActiveDrug(null);
    setActivePathway(null);
    setPathwayFocusMode(false);
  }, []);

  const handleCloseDrug = useCallback(() => {
    setActiveDrug(null);
    setActivePathway(null);
    setPathwayFocusMode(false);
  }, []);

  // ── Export handler ───────────────────────────────────────────────────────

  const downloadFile = useCallback((content: string, filename: string, mime = 'text/plain') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExport = useCallback(async (format: string) => {
    switch (format) {
      case 'graphml': return downloadFile(await exportGraphml(), 'network.graphml', 'application/xml');
      case 'gexf': return downloadFile(await exportGexf(), 'network.gexf', 'application/xml');
      case 'networkx': return downloadFile(await exportNetworkxJson(), 'network-networkx.json', 'application/json');
      case 'tsv_nodes': {
        const { nodesCsv } = await exportCsv();
        return downloadFile(nodesCsv, 'nodes.tsv', 'text/tab-separated-values');
      }
      case 'tsv_edges': {
        const { edgesCsv } = await exportCsv();
        return downloadFile(edgesCsv, 'edges.tsv', 'text/tab-separated-values');
      }
      case 'json': return downloadFile(JSON.stringify(graphData, null, 2), 'network.json', 'application/json');
    }
  }, [downloadFile, exportGraphml, exportGexf, exportNetworkxJson, exportCsv]);

  // ── Build flow options ───────────────────────────────────────────────────

  const flowOptions = useMemo(() => ({
    moduleFilters,
    highlightedNodes: highlightedNodes.size > 0 ? highlightedNodes : undefined,
    pathwayTargets: activePathway?.targetNodes,
    pathwayUpstream: activePathway?.upstreamNodes,
    pathwayDownstream: activePathway?.downstreamNodes,
    pathwayEdges: activePathway?.pathwayEdges,
    focusMode: pathwayFocusMode,
  }), [moduleFilters, highlightedNodes, activePathway, pathwayFocusMode]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div style={{ ...styles.center, background: '#faf9f7' }}>
        <p style={{ color: '#c75146', fontWeight: 500 }}>Failed to load graph engine</p>
        <p style={{ color: '#7a7a7a', fontSize: 12, marginTop: 8 }}>{error}</p>
      </div>
    );
  }

  if (loading || !ready || !layout) {
    return (
      <div style={{ ...styles.center, background: '#faf9f7' }}>
        <div style={styles.spinner} />
        <p style={{ color: '#7a7a7a', fontSize: 13, marginTop: 12 }}>Loading WASM graph engine...</p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Toggle button */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        style={styles.toggleBtn}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <ChevronRight size={16} color="#7a7a7a" /> : <ChevronLeft size={16} color="#7a7a7a" />}
      </button>

      {/* Focus mode bar */}
      {focusLabel && (
        <div style={styles.focusBar}>
          <span style={{ fontSize: 12 }}>Focus: <strong>{focusLabel}</strong></span>
          <button style={styles.focusExitBtn} onClick={exitFocusMode}>Exit Focus</button>
        </div>
      )}

      {/* Graph area */}
      <div style={styles.graphContainer}>
        <ReactFlowProvider>
          <GraphInner
            layout={layout}
            rawNodes={rawNodes}
            rawEdges={rawEdges}
            flowOptions={flowOptions}
            onNodeClick={handleNodeClick}
            zoomToNodeId={zoomToNodeId}
          />
        </ReactFlowProvider>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={styles.sidebarAside}
          >
            <div style={styles.sidebarInner}>
              <SidebarHeader onCollapse={() => setSidebarOpen(false)} onExport={handleExport} />

              <div style={styles.sidebarBody}>
                {/* Find Node */}
                <FindSearch
                  rawNodes={rawNodes}
                  moduleFilters={moduleFilters}
                  onNavigate={handleNavigateToNode}
                />

                <div style={styles.divider} />

                {/* Presets */}
                <PresetPicker
                  onSelectHypothesis={handleSelectHypothesis}
                  onSelectDrug={handleSelectDrug}
                  activePresetId={activePresetId}
                  onClear={handleClearPreset}
                />

                {/* Drug Pathway Panel */}
                {activeDrug && activePathway && (
                  <>
                    <div style={{ marginTop: 12 }} />
                    <DrugPathwayPanel
                      drug={activeDrug}
                      pathway={activePathway}
                      focusMode={pathwayFocusMode}
                      onToggleFocus={() => setPathwayFocusMode((v) => !v)}
                      onClose={handleCloseDrug}
                    />
                  </>
                )}

                <div style={styles.divider} />

                {/* Module Filters */}
                <ModuleFilters
                  filters={moduleFilters}
                  onToggle={handleToggleModule}
                  onSetAll={handleSetAllModules}
                />

                <div style={styles.divider} />

                {/* Node Inspector */}
                <h2 style={styles.sectionTitle}>Node Inspector</h2>
                <NodeInspector
                  selectedNode={selectedNode}
                  rawNodes={rawNodes}
                  rawEdges={rawEdges}
                  rawModules={rawModules}
                  onSelectNode={(id) => {
                    setSelectedNode(id);
                    setZoomToNodeId(id);
                  }}
                  onSelectDrug={handleSelectDrug}
                />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: '100vh', display: 'flex',
    background: '#faf9f7', color: '#2d2d2d',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  center: {
    height: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  },
  spinner: {
    width: 24, height: 24,
    border: '2px solid #e5e2dd', borderTopColor: '#e36216',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  graphContainer: {
    flex: 1, position: 'relative', background: '#faf9f7',
    fontFamily: 'var(--font-sans, sans-serif)',
  },
  toggleBtn: {
    position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
    zIndex: 40, background: '#ffffff',
    border: '1px solid #e5e2dd', borderRight: 'none',
    borderRadius: '4px 0 0 4px', padding: '16px 4px',
    cursor: 'pointer', boxShadow: '-2px 0 4px rgba(0,0,0,0.05)',
    display: 'flex', alignItems: 'center',
  },
  focusBar: {
    position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)',
    zIndex: 40, background: '#fff', border: '1px solid #e5e2dd',
    borderRadius: 4, padding: '4px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex', alignItems: 'center', gap: 12, color: '#2d2d2d',
  },
  focusExitBtn: {
    padding: '2px 8px', fontSize: 11, border: '1px solid #c75146',
    borderRadius: 2, background: '#fff', cursor: 'pointer', color: '#c75146',
    fontWeight: 500,
  },
  sidebarAside: {
    position: 'relative', background: '#ffffff',
    borderLeft: '1px solid #e5e2dd', overflow: 'hidden',
    flexShrink: 0, height: '100%',
  },
  sidebarInner: {
    width: 400, minWidth: 400, height: '100%',
    display: 'flex', flexDirection: 'column' as const,
  },
  sidebarBody: {
    flex: 1, padding: 16, overflowY: 'auto' as const,
  },
  divider: { border: 'none', borderTop: '1px solid #e5e2dd', margin: '16px 0' },
  sectionTitle: {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
    letterSpacing: 1, color: '#7a7a7a', marginBottom: 8, marginTop: 0,
  },
};
