import { useState } from 'react';
import { ArrowDownUp, ArrowRightLeft, BarChart3, Circle, Filter, Layers, RotateCcw, Scissors, X } from 'lucide-react';
import type { ClusterDiagnostics, ClusterInfo } from '../../../src/types';

interface GraphToolbarProps {
  evidenceFilter: 'strong' | 'moderate' | 'all';
  onEvidenceFilterChange: (filter: 'strong' | 'moderate' | 'all') => void;
  direction: 'TopToBottom' | 'LeftToRight';
  onDirectionChange: (dir: 'TopToBottom' | 'LeftToRight') => void;
  layoutMode: 'Flat' | 'Hierarchical';
  onLayoutModeChange: (mode: 'Flat' | 'Hierarchical') => void;
  clusterMode: 'Auto' | 'ModuleCount';
  onClusterModeChange: (mode: 'Auto' | 'ModuleCount') => void;
  showBackEdges: boolean;
  onShowBackEdgesChange: (show: boolean) => void;
  hideRedundantEdges: boolean;
  onHideRedundantEdgesChange: (hide: boolean) => void;
  redundantEdgeCount: number;
  hideOrphans: boolean;
  onHideOrphansChange: (hide: boolean) => void;
  nodeCount: number;
  edgeCount: number;
  layerCount: number;
  clusterCount?: number;
  clusterDiagnostics?: ClusterDiagnostics;
  clusters?: ClusterInfo[];
  focusLabel?: string | null;
  onExitFocus?: () => void;
}

const filterButtons: Array<{
  key: 'strong' | 'moderate' | 'all';
  label: string;
  activeColor: string;
  activeBg: string;
}> = [
  { key: 'strong', label: 'L1-3', activeColor: '#fff', activeBg: '#5a8a6e' },
  { key: 'moderate', label: 'L1-5', activeColor: '#fff', activeBg: '#486393' },
  { key: 'all', label: 'All', activeColor: '#fff', activeBg: '#c75146' },
];

function DiagnosticsPanel({ diag, clusters }: { diag: ClusterDiagnostics; clusters?: ClusterInfo[] }) {
  const agreementPct = Math.round(diag.moduleAgreement * 100);
  const crossPct = Math.round(diag.crossClusterEdgeRatio * 100);

  // Quality assessment
  let quality: string;
  let qualityColor: string;
  if (diag.method === 'module_passthrough') {
    quality = 'Module grouping (no spectral analysis)';
    qualityColor = '#7a7a7a';
  } else if (agreementPct > 85 && crossPct < 15) {
    quality = 'Spectral clusters closely match modules';
    qualityColor = '#5a8a6e';
  } else if (agreementPct > 60) {
    quality = 'Spectral found meaningful cross-module structure';
    qualityColor = '#486393';
  } else {
    quality = 'Spectral clusters differ significantly from modules';
    qualityColor = '#e36216';
  }

  // Eigenvalue gap visualization
  const eigenGaps: number[] = [];
  for (let i = 1; i < diag.eigenvalues.length; i++) {
    eigenGaps.push(diag.eigenvalues[i] - diag.eigenvalues[i - 1]);
  }
  const maxGap = Math.max(...eigenGaps, 0.001);

  return (
    <div style={diagStyles.panel}>
      <div style={diagStyles.header}>
        <BarChart3 size={10} color="#486393" />
        <span style={diagStyles.title}>Cluster Diagnostics</span>
      </div>

      {/* Summary metrics */}
      <div style={diagStyles.metricsRow}>
        <div style={diagStyles.metric}>
          <span style={diagStyles.metricValue}>{diag.k}</span>
          <span style={diagStyles.metricLabel}>clusters</span>
        </div>
        <div style={diagStyles.metric}>
          <span style={{ ...diagStyles.metricValue, color: agreementPct > 70 ? '#5a8a6e' : '#e36216' }}>
            {agreementPct}%
          </span>
          <span style={diagStyles.metricLabel}>module purity</span>
        </div>
        <div style={diagStyles.metric}>
          <span style={{ ...diagStyles.metricValue, color: crossPct < 30 ? '#5a8a6e' : '#c75146' }}>
            {crossPct}%
          </span>
          <span style={diagStyles.metricLabel}>cross-edges</span>
        </div>
        <div style={diagStyles.metric}>
          <span style={diagStyles.metricValue}>{diag.modulesSplit}</span>
          <span style={diagStyles.metricLabel}>split modules</span>
        </div>
        <div style={diagStyles.metric}>
          <span style={diagStyles.metricValue}>{diag.mixedClusters}</span>
          <span style={diagStyles.metricLabel}>mixed clusters</span>
        </div>
      </div>

      {/* Method + quality */}
      <div style={{ fontSize: 9, color: qualityColor, fontWeight: 500, marginTop: 4 }}>
        {quality}
      </div>
      <div style={{ fontSize: 8, color: '#7a7a7a', marginTop: 2 }}>
        Method: {diag.method} | k={diag.k}
      </div>

      {/* Eigenvalue gaps */}
      {eigenGaps.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 8, color: '#7a7a7a', marginBottom: 2 }}>
            Eigengaps (larger = stronger cluster boundary):
          </div>
          <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 24 }}>
            {eigenGaps.slice(0, 15).map((gap, i) => {
              const h = Math.max(2, (gap / maxGap) * 22);
              const isChosen = i + 1 === diag.k - 1; // eigengap at k-1 determines k clusters
              return (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: h,
                    background: isChosen ? '#e36216' : '#c8d6e5',
                    borderRadius: 1,
                    position: 'relative',
                  }}
                  title={`Gap ${i + 1}→${i + 2}: ${gap.toFixed(4)}${isChosen ? ' (chosen k)' : ''}`}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 1 }}>
            {eigenGaps.slice(0, 15).map((_, i) => (
              <div key={i} style={{ width: 8, fontSize: 6, color: '#aaa', textAlign: 'center' }}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cluster composition */}
      {clusters && clusters.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 8, color: '#7a7a7a', marginBottom: 2 }}>
            Cluster composition (module : count):
          </div>
          <div style={{ maxHeight: 80, overflowY: 'auto' }}>
            {clusters.map((c) => (
              <div key={c.id} style={{ fontSize: 8, color: '#4a4a4a', display: 'flex', gap: 4, lineHeight: '14px' }}>
                <span style={{ fontWeight: 600, minWidth: 12, color: '#486393' }}>C{c.id}</span>
                <span style={{ color: '#7a7a7a' }}>({c.nodeIds.length})</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.moduleComposition
                    ?.map((m) => `${m.moduleId}:${m.count}`)
                    .join(' ') || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function GraphToolbar({
  evidenceFilter,
  onEvidenceFilterChange,
  direction,
  onDirectionChange,
  layoutMode,
  onLayoutModeChange,
  clusterMode,
  onClusterModeChange,
  showBackEdges,
  onShowBackEdgesChange,
  hideRedundantEdges,
  onHideRedundantEdgesChange,
  redundantEdgeCount,
  hideOrphans,
  onHideOrphansChange,
  nodeCount,
  edgeCount,
  layerCount,
  clusterCount,
  clusterDiagnostics,
  clusters,
  focusLabel,
  onExitFocus,
}: GraphToolbarProps) {
  const [showDiag, setShowDiag] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <div style={styles.bar}>
        {/* Evidence filter */}
        <div style={styles.group}>
          <Filter size={10} color="#7a7a7a" />
          <span style={styles.groupLabel}>Evidence:</span>
          <div style={styles.btnGroup}>
            {filterButtons.map((btn) => {
              const active = evidenceFilter === btn.key;
              return (
                <button
                  key={btn.key}
                  onClick={() => onEvidenceFilterChange(btn.key)}
                  style={{
                    ...styles.filterBtn,
                    background: active ? btn.activeBg : 'transparent',
                    color: active ? btn.activeColor : '#7a7a7a',
                    borderColor: active ? btn.activeBg : '#e5e2dd',
                  }}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.sep} />

        {/* Direction toggle */}
        <button
          onClick={() =>
            onDirectionChange(direction === 'TopToBottom' ? 'LeftToRight' : 'TopToBottom')
          }
          style={styles.dirBtn}
          title={`Switch to ${direction === 'TopToBottom' ? 'horizontal' : 'vertical'} layout`}
        >
          {direction === 'TopToBottom' ? (
            <ArrowDownUp size={10} color="#4a4a4a" />
          ) : (
            <ArrowRightLeft size={10} color="#4a4a4a" />
          )}
          <span style={{ fontSize: 9, color: '#4a4a4a' }}>
            {direction === 'TopToBottom' ? 'Vertical' : 'Horizontal'}
          </span>
        </button>

        <div style={styles.sep} />

        {/* Layout mode toggle */}
        <div style={styles.group}>
          <Layers size={10} color="#7a7a7a" />
          <div style={styles.btnGroup}>
            <button
              onClick={() => onLayoutModeChange('Flat')}
              style={{
                ...styles.filterBtn,
                background: layoutMode === 'Flat' ? '#486393' : 'transparent',
                color: layoutMode === 'Flat' ? '#fff' : '#7a7a7a',
                borderColor: layoutMode === 'Flat' ? '#486393' : '#e5e2dd',
              }}
            >
              Flat
            </button>
            <button
              onClick={() => onLayoutModeChange('Hierarchical')}
              style={{
                ...styles.filterBtn,
                background: layoutMode === 'Hierarchical' ? '#486393' : 'transparent',
                color: layoutMode === 'Hierarchical' ? '#fff' : '#7a7a7a',
                borderColor: layoutMode === 'Hierarchical' ? '#486393' : '#e5e2dd',
              }}
            >
              Clustered
            </button>
          </div>
          {layoutMode === 'Hierarchical' && (
            <div style={styles.btnGroup}>
              <button
                onClick={() => onClusterModeChange('Auto')}
                style={{
                  ...styles.filterBtn,
                  background: clusterMode === 'Auto' ? '#5a8a6e' : 'transparent',
                  color: clusterMode === 'Auto' ? '#fff' : '#7a7a7a',
                  borderColor: clusterMode === 'Auto' ? '#5a8a6e' : '#e5e2dd',
                }}
                title="Spectral clustering (auto-detect communities)"
              >
                Spectral
              </button>
              <button
                onClick={() => onClusterModeChange('ModuleCount')}
                style={{
                  ...styles.filterBtn,
                  background: clusterMode === 'ModuleCount' ? '#5a8a6e' : 'transparent',
                  color: clusterMode === 'ModuleCount' ? '#fff' : '#7a7a7a',
                  borderColor: clusterMode === 'ModuleCount' ? '#5a8a6e' : '#e5e2dd',
                }}
                title="Group by module"
              >
                Modules
              </button>
            </div>
          )}
        </div>

        <div style={styles.sep} />

        {/* Back-edge toggle */}
        <button
          onClick={() => onShowBackEdgesChange(!showBackEdges)}
          style={{
            ...styles.dirBtn,
            background: showBackEdges ? 'transparent' : '#f5f3f0',
          }}
          title={showBackEdges ? 'Hide back-edges (feedback loops)' : 'Show back-edges (feedback loops)'}
        >
          <RotateCcw size={10} color={showBackEdges ? '#4a4a4a' : '#c75146'} />
          <span style={{ fontSize: 9, color: showBackEdges ? '#4a4a4a' : '#c75146' }}>
            {showBackEdges ? 'Cycles' : 'Cycles off'}
          </span>
        </button>

        {/* Transitive redundancy toggle */}
        <button
          onClick={() => onHideRedundantEdgesChange(!hideRedundantEdges)}
          style={{
            ...styles.dirBtn,
            background: hideRedundantEdges ? '#f5f3f0' : 'transparent',
          }}
          title={
            hideRedundantEdges
              ? `Showing ${redundantEdgeCount} redundant edges hidden`
              : 'Hide edges reachable via stronger paths'
          }
        >
          <Scissors size={10} color={hideRedundantEdges ? '#5a8a6e' : '#4a4a4a'} />
          <span style={{ fontSize: 9, color: hideRedundantEdges ? '#5a8a6e' : '#4a4a4a' }}>
            {hideRedundantEdges ? `−${redundantEdgeCount}` : 'Prune'}
          </span>
        </button>

        {/* Orphan node toggle */}
        <button
          onClick={() => onHideOrphansChange(!hideOrphans)}
          style={{
            ...styles.dirBtn,
            background: hideOrphans ? '#f5f3f0' : 'transparent',
          }}
          title={hideOrphans ? 'Show disconnected nodes' : 'Hide nodes with no edges'}
        >
          <Circle size={10} color={hideOrphans ? '#5a8a6e' : '#4a4a4a'} />
          <span style={{ fontSize: 9, color: hideOrphans ? '#5a8a6e' : '#4a4a4a' }}>
            {hideOrphans ? 'Orphans off' : 'Orphans'}
          </span>
        </button>

        <div style={styles.sep} />

        {/* Stats */}
        <span style={styles.stats}>
          {nodeCount} nodes &middot; {edgeCount} edges &middot; {layerCount} layers
          {clusterCount != null && clusterCount > 0 && ` \u00b7 ${clusterCount} clusters`}
        </span>

        {/* Diagnostics toggle */}
        {clusterDiagnostics && (
          <button
            onClick={() => setShowDiag((v) => !v)}
            style={{
              ...styles.dirBtn,
              background: showDiag ? '#486393' : 'transparent',
            }}
            title="Toggle cluster diagnostics"
          >
            <BarChart3 size={10} color={showDiag ? '#fff' : '#486393'} />
          </button>
        )}

        {/* Focus mode indicator */}
        {focusLabel && onExitFocus && (
          <>
            <div style={styles.sep} />
            <div style={styles.focusTag}>
              <span style={{ fontSize: 9, color: '#e36216', fontWeight: 600 }}>
                Focus: {focusLabel}
              </span>
              <button onClick={onExitFocus} style={styles.focusClose} title="Exit focus mode">
                <X size={8} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Diagnostics dropdown */}
      {showDiag && clusterDiagnostics && (
        <DiagnosticsPanel diag={clusterDiagnostics} clusters={clusters} />
      )}
    </div>
  );
}

const diagStyles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: 4,
    background: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(6px)',
    border: '1px solid #e5e2dd',
    borderRadius: 4,
    padding: '8px 12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    minWidth: 320,
    maxWidth: 460,
    zIndex: 30,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: 600,
    color: '#486393',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  metricsRow: {
    display: 'flex',
    gap: 12,
  },
  metric: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'monospace',
    color: '#2d2d2d',
    lineHeight: '16px',
  },
  metricLabel: {
    fontSize: 7,
    color: '#7a7a7a',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
};

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(250, 249, 247, 0.92)',
    backdropFilter: 'blur(6px)',
    border: '1px solid #e5e2dd',
    borderRadius: 4,
    padding: '3px 10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    userSelect: 'none',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  groupLabel: {
    fontSize: 9,
    color: '#7a7a7a',
    fontWeight: 500,
  },
  btnGroup: {
    display: 'flex',
    gap: 2,
  },
  filterBtn: {
    padding: '1px 6px',
    fontSize: 9,
    fontWeight: 600,
    border: '1px solid #e5e2dd',
    borderRadius: 2,
    cursor: 'pointer',
    lineHeight: '16px',
    transition: 'background 0.15s, color 0.15s',
  },
  sep: {
    width: 1,
    height: 14,
    background: '#e5e2dd',
    flexShrink: 0,
  },
  dirBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '1px 6px',
    border: '1px solid #e5e2dd',
    borderRadius: 2,
    background: 'transparent',
    cursor: 'pointer',
    lineHeight: '16px',
  },
  stats: {
    fontSize: 9,
    color: '#7a7a7a',
    whiteSpace: 'nowrap',
  },
  focusTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: '#f8e8de',
    borderRadius: 2,
    padding: '1px 6px',
  },
  focusClose: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 12,
    height: 12,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#e36216',
  },
};
