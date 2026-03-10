import { ArrowDownUp, ArrowRightLeft, Circle, Filter, Layers, RotateCcw, Scissors, X } from 'lucide-react';

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
  focusLabel,
  onExitFocus,
}: GraphToolbarProps) {
  return (
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
  );
}

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
