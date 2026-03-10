import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { GraphToolbar } from './graph/GraphToolbar';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { NodeInspector } from './sidebar/NodeInspector';
import { ModuleFilters } from './sidebar/ModuleFilters';
import { FindSearch } from './sidebar/FindSearch';
import { PresetPicker } from './sidebar/PresetPicker';
import { DrugPathwayPanel } from './sidebar/DrugPathwayPanel';
import { calculateDrugPathway, type PathwayResult } from './data/pathway-calculation';
import type { TreatmentLibraryEntry } from './data/drug-library';
import type { ModuleFilterState } from './graph/flow-builder';
import { AdvancedSettings, DEFAULT_WEIGHTS, defaultScheme } from './sidebar/AdvancedSettings';
import type { ConfidenceScheme } from '../../src/types';
import frameworkData from './data/ad-framework-data.json';
import { generateTestGraph } from './data/generate-test-graph';

// ── Worker + layout config ───────────────────────────────────────────────────

const workerUrl = new URL('../../src/worker.ts', import.meta.url);

const EVIDENCE_CUTOFFS: Record<string, string[]> = {
  strong: ['L1', 'L2', 'L3'],
  moderate: ['L1', 'L2', 'L3', 'L4', 'L5'],
  all: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'],
};

// ── Data sources ─────────────────────────────────────────────────────────────

type DataSourceId = 'alz' | 'test';

interface DataSource {
  nodes: MechanisticNode[];
  edges: MechanisticEdge[];
  modules: MechanisticModule[];
}

function stripOrphans(allNodes: MechanisticNode[], allEdges: MechanisticEdge[]): MechanisticNode[] {
  const connectedIds = new Set<string>();
  for (const e of allEdges) { connectedIds.add(e.source); connectedIds.add(e.target); }
  return allNodes.filter((n) => connectedIds.has(n.id));
}

function loadAlzData(): DataSource {
  const allNodes = frameworkData.nodes as MechanisticNode[];
  const allEdges = frameworkData.edges as MechanisticEdge[];
  const allModules = frameworkData.modules as MechanisticModule[];
  return { nodes: stripOrphans(allNodes, allEdges), edges: allEdges, modules: allModules };
}

const alzData = loadAlzData();

// ── Initial filter state ─────────────────────────────────────────────────────

function buildInitialFilters(mods: MechanisticModule[]): Record<string, ModuleFilterState> {
  const filters: Record<string, ModuleFilterState> = {};
  mods.forEach((m) => { filters[m.id] = 'on'; });
  return filters;
}

// ── App ──────────────────────────────────────────────────────────────────────

export function App() {
  const [dataSourceId, setDataSourceId] = useState<DataSourceId>('alz');
  const [testGraphData, setTestGraphData] = useState<DataSource | null>(null);
  const [testNodeCount, setTestNodeCount] = useState('200');

  const activeData: DataSource = dataSourceId === 'test' && testGraphData ? testGraphData : alzData;
  const { nodes: rawNodes, edges: rawEdges, modules: rawModules } = activeData;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [moduleFilters, setModuleFilters] = useState<Record<string, ModuleFilterState>>(() => buildInitialFilters(rawModules));
  const [zoomToNodeId, setZoomToNodeId] = useState<string | null>(null);
  const [evidenceFilter, setEvidenceFilter] = useState<'strong' | 'moderate' | 'all'>('strong');
  const [direction, setDirection] = useState<'LeftToRight' | 'TopToBottom'>('LeftToRight');
  const [layoutMode, setLayoutMode] = useState<'Flat' | 'Hierarchical'>('Flat');
  const [clusterMode, setClusterMode] = useState<'Auto' | 'ModuleCount'>('Auto');
  const [showBackEdges, setShowBackEdges] = useState(true);

  // Advanced settings: confidence scheme + weights
  const [confidenceScheme, setConfidenceScheme] = useState<ConfidenceScheme>(() =>
    (frameworkData as { confidenceScheme?: ConfidenceScheme }).confidenceScheme ?? defaultScheme()
  );
  const [confidenceWeights, setConfidenceWeights] = useState<Record<string, number>>(() => ({ ...DEFAULT_WEIGHTS }));

  // Transitive redundancy: hide edges reachable via stronger paths
  const [hideRedundantEdges, setHideRedundantEdges] = useState(false);
  const [redundantEdgeIds, setRedundantEdgeIds] = useState<Set<string>>(new Set());

  // Hide orphan nodes (nodes with no edges after filters)
  const [hideOrphans, setHideOrphans] = useState(true);

  const layoutOptions = useMemo(() => ({
    layerSpacing: 250,
    nodeSpacing: 100,
    direction,
    maxIterations: 50,
    strengthOrdering: false,
    moduleGrouping: true,
    layoutMode,
    ...(layoutMode === 'Hierarchical' ? {
      clusterOptions: {
        countMode: clusterMode,
        hybridModules: clusterMode === 'ModuleCount',
        clusterPadding: 50,
        minClusterSize: 3,
        pinnedModules: ['M14', 'M15', 'M16', 'THER'],
      },
    } : {}),
  }), [direction, layoutMode, clusterMode]);

  // Generate a test graph and switch to it
  const generateAndSwitch = useCallback((count: number) => {
    const t0 = performance.now();
    const { nodes, edges, modules } = generateTestGraph(count);
    const connected = stripOrphans(nodes, edges);
    const data: DataSource = { nodes: connected, edges, modules };
    console.log(`Generated test graph: ${connected.length} nodes, ${edges.length} edges in ${(performance.now() - t0).toFixed(0)}ms`);
    setTestGraphData(data);
    setDataSourceId('test');
    setModuleFilters(buildInitialFilters(data.modules));
    setSelectedNode(null);
    setHighlightedNodes(new Set());
    setActiveDrug(null);
    setActivePathway(null);
    setPathwayFocusMode(false);
    setActivePresetId(null);
  }, []);

  // Reset filters when data source changes
  const switchDataSource = useCallback((id: DataSourceId) => {
    if (id === 'test') {
      generateAndSwitch(parseInt(testNodeCount) || 200);
      return;
    }
    setDataSourceId(id);
    setModuleFilters(buildInitialFilters(alzData.modules));
    setSelectedNode(null);
    setHighlightedNodes(new Set());
    setActiveDrug(null);
    setActivePathway(null);
    setPathwayFocusMode(false);
    setActivePresetId(null);
  }, [testNodeCount, generateAndSwitch]);

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

  // Build a quick lookup: methodType → confidence level from scheme rules
  const schemeClassify = useMemo(() => {
    const map = new Map<string, string>();
    for (const rule of confidenceScheme.rules) {
      for (const mt of rule.methodTypes ?? []) {
        map.set(mt.toLowerCase(), rule.confidence);
      }
    }
    return (edge: MechanisticEdge): string => {
      if (edge.causalConfidence) return edge.causalConfidence;
      const mt = (edge.methodType ?? edge.evidence?.methodType ?? '').toLowerCase();
      if (mt && map.has(mt)) return map.get(mt)!;
      return confidenceScheme.defaultConfidence ?? 'L7';
    };
  }, [confidenceScheme]);

  // Pre-filter nodes/edges BEFORE sending to WASM layout engine
  // Only 'on' and 'partial' nodes go into the layout; 'off' nodes are excluded entirely
  const { filteredNodes, filteredEdges } = useMemo(() => {
    const enabledModules = new Set(
      Object.entries(moduleFilters)
        .filter(([, state]) => state === 'on' || state === 'partial')
        .map(([id]) => id)
    );
    const fNodes = rawNodes.filter((n) => enabledModules.has(n.moduleId));
    const nodeIdSet = new Set(fNodes.map((n) => n.id));
    const allowedEvidence = new Set(EVIDENCE_CUTOFFS[evidenceFilter]);
    const fEdges = rawEdges.filter((e) =>
      nodeIdSet.has(e.source) && nodeIdSet.has(e.target) &&
      allowedEvidence.has(schemeClassify(e))
    );

    // Remove orphan nodes (no edges after filtering)
    let finalNodes = fNodes;
    if (hideOrphans) {
      const connectedIds = new Set<string>();
      for (const e of fEdges) { connectedIds.add(e.source); connectedIds.add(e.target); }
      finalNodes = fNodes.filter((n) => connectedIds.has(n.id));
    }

    return { filteredNodes: finalNodes, filteredEdges: fEdges };
  }, [moduleFilters, evidenceFilter, schemeClassify, hideOrphans]);

  const graphData = useMemo(
    () => convertToGraphData(filteredNodes, filteredEdges, rawModules, {
      confidenceScheme,
      confidenceWeights,
    }),
    [filteredNodes, filteredEdges, confidenceScheme, confidenceWeights],
  );

  // Graph hook
  const { ready, loading, error, layout, transitiveRedundancies: computeRedundancies, exportGraphml, exportGexf, exportNetworkxJson, exportCsv } = useGraph({
    graphData,
    autoLayout: true,
    workerUrl,
    layoutOptions,
  });

  // Compute transitive redundancies when toggle is on
  useEffect(() => {
    if (!hideRedundantEdges || !ready) {
      setRedundantEdgeIds(new Set());
      return;
    }
    computeRedundancies(4).then((ids) => {
      setRedundantEdgeIds(new Set(ids));
    }).catch(() => {
      setRedundantEdgeIds(new Set());
    });
  }, [hideRedundantEdges, ready, computeRedundancies]);

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
      case 'json': {
        const fullData = convertToGraphData(rawNodes, rawEdges, rawModules, {
          confidenceScheme,
          confidenceWeights,
        });
        return downloadFile(JSON.stringify(fullData, null, 2), 'network.json', 'application/json');
      }
    }
  }, [downloadFile, exportGraphml, exportGexf, exportNetworkxJson, exportCsv]);

  // ── Pane click (deselect) ────────────────────────────────────────────────

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    if (!activePresetId && !activeDrug) {
      setHighlightedNodes(new Set());
    }
  }, [activePresetId, activeDrug]);

  // ── Escape key hierarchy ───────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Layered dismiss — first match wins
        if (pathwayFocusMode) { setPathwayFocusMode(false); return; }
        if (activeDrug) { handleCloseDrug(); return; }
        if (focusSavedFilters) { exitFocusMode(); return; }
        if (activePresetId) { handleClearPreset(); return; }
        if (selectedNode) { setSelectedNode(null); return; }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pathwayFocusMode, activeDrug, focusSavedFilters, activePresetId, selectedNode, handleCloseDrug, exitFocusMode, handleClearPreset]);

  // ── Build flow options ───────────────────────────────────────────────────

  const flowOptions = useMemo(() => ({
    moduleFilters,
    highlightedNodes: highlightedNodes.size > 0 ? highlightedNodes : undefined,
    pathwayTargets: activePathway?.targetNodes,
    pathwayUpstream: activePathway?.upstreamNodes,
    pathwayDownstream: activePathway?.downstreamNodes,
    pathwayEdges: activePathway?.pathwayEdges,
    focusMode: pathwayFocusMode,
    showBackEdges,
    hiddenEdgeIds: hideRedundantEdges ? redundantEdgeIds : undefined,
  }), [moduleFilters, highlightedNodes, activePathway, pathwayFocusMode, showBackEdges, hideRedundantEdges, redundantEdgeIds]);

  // ── Render ───────────────────────────────────────────────────────────────

  const isLoading = loading || !ready || !layout;

  // Toolbar props (always rendered)
  const toolbarProps = {
    evidenceFilter,
    onEvidenceFilterChange: setEvidenceFilter,
    direction,
    onDirectionChange: setDirection,
    layoutMode,
    onLayoutModeChange: setLayoutMode,
    clusterMode,
    onClusterModeChange: setClusterMode,
    showBackEdges,
    onShowBackEdgesChange: setShowBackEdges,
    hideRedundantEdges,
    onHideRedundantEdgesChange: setHideRedundantEdges,
    redundantEdgeCount: redundantEdgeIds.size,
    hideOrphans,
    onHideOrphansChange: setHideOrphans,
    nodeCount: filteredNodes.length,
    edgeCount: filteredEdges.length,
    layerCount: layout?.stats.layerCount ?? 0,
    clusterCount: layout?.clusters?.length,
    focusLabel,
    onExitFocus: focusSavedFilters ? exitFocusMode : undefined,
  };

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
        {/* Toolbar — always visible */}
        <div style={styles.toolbarFloat}>
          <GraphToolbar {...toolbarProps} />
        </div>

        {/* Loading overlay */}
        {(isLoading || error) && (
          <div style={styles.loadingOverlay}>
            {error ? (
              <>
                <p style={{ color: '#c75146', fontWeight: 500 }}>Failed to load graph engine</p>
                <p style={{ color: '#7a7a7a', fontSize: 12, marginTop: 8 }}>{error}</p>
              </>
            ) : (
              <>
                <div style={styles.progressContainer}>
                  <div style={styles.progressBar}>
                    <div style={styles.progressFill} />
                  </div>
                </div>
                <p style={{ color: '#7a7a7a', fontSize: 12, marginTop: 8 }}>
                  Laying out {filteredNodes.length} nodes and {filteredEdges.length} edges...
                </p>
              </>
            )}
          </div>
        )}

        {/* Graph — rendered even while loading (shows previous state) */}
        {layout && (
          <ReactFlowProvider>
            <GraphInner
              layout={layout}
              rawNodes={filteredNodes}
              rawEdges={filteredEdges}
              flowOptions={flowOptions}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              zoomToNodeId={zoomToNodeId}
              showToolbar={false}
              focusLabel={focusLabel}
              onExitFocus={focusSavedFilters ? exitFocusMode : undefined}
            />
          </ReactFlowProvider>
        )}
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
                {/* Data source switcher */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  <button
                    onClick={() => switchDataSource('alz')}
                    style={{
                      flex: 1, padding: '4px 8px', fontSize: 10, fontWeight: 500,
                      border: '1px solid #e5e2dd', borderRadius: 2, cursor: 'pointer',
                      background: dataSourceId === 'alz' ? '#e36216' : '#fff',
                      color: dataSourceId === 'alz' ? '#fff' : '#4a4a4a',
                    }}
                  >
                    AD Framework
                  </button>
                  <button
                    onClick={() => switchDataSource('test')}
                    style={{
                      flex: 1, padding: '4px 8px', fontSize: 10, fontWeight: 500,
                      border: '1px solid #e5e2dd', borderRadius: 2, cursor: 'pointer',
                      background: dataSourceId === 'test' ? '#e36216' : '#fff',
                      color: dataSourceId === 'test' ? '#fff' : '#4a4a4a',
                    }}
                  >
                    Test Graph
                  </button>
                </div>
                {/* Test graph node count control */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 12, alignItems: 'center' }}>
                  <label style={{ fontSize: 10, color: '#7a7a7a', whiteSpace: 'nowrap' }}>Nodes:</label>
                  <input
                    type="number"
                    min={10}
                    max={500000}
                    step={100}
                    value={testNodeCount}
                    onChange={(e) => setTestNodeCount(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') generateAndSwitch(parseInt(testNodeCount) || 200); }}
                    style={{
                      flex: 1, padding: '3px 6px', fontSize: 11, border: '1px solid #e5e2dd',
                      borderRadius: 2, outline: 'none', fontFamily: 'monospace',
                    }}
                  />
                  <button
                    onClick={() => generateAndSwitch(parseInt(testNodeCount) || 200)}
                    style={{
                      padding: '3px 8px', fontSize: 10, fontWeight: 500,
                      border: '1px solid #007385', borderRadius: 2, cursor: 'pointer',
                      background: '#007385', color: '#fff',
                    }}
                  >
                    Generate
                  </button>
                </div>

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

                {/* Advanced Settings */}
                <AdvancedSettings
                  scheme={confidenceScheme}
                  weights={confidenceWeights}
                  onSchemeChange={setConfidenceScheme}
                  onWeightsChange={setConfidenceWeights}
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
    overflow: 'hidden',
  },
  toolbarFloat: {
    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
    zIndex: 20, pointerEvents: 'auto',
  },
  loadingOverlay: {
    position: 'absolute', inset: 0, zIndex: 10,
    display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(250, 249, 247, 0.85)',
    backdropFilter: 'blur(2px)',
  },
  progressContainer: {
    width: 200,
  },
  progressBar: {
    width: '100%', height: 3, background: '#e5e2dd', borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%', height: '100%', background: '#e36216', borderRadius: 2,
    animation: 'progress-indeterminate 1.5s ease-in-out infinite',
    transformOrigin: 'left',
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
