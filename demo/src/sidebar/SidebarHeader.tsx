import { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronRight, Download } from 'lucide-react';

const EXPORT_OPTIONS = [
  { format: 'graphml', label: 'GraphML', desc: 'Cytoscape, Gephi, igraph' },
  { format: 'gexf', label: 'GEXF', desc: 'Gephi' },
  { format: 'networkx', label: 'NetworkX JSON', desc: 'Python NetworkX' },
  { format: 'tsv_nodes', label: 'TSV Nodes', desc: 'Node attributes table' },
  { format: 'tsv_edges', label: 'TSV Edges', desc: 'Edge attributes table' },
  { format: 'json', label: 'Combined JSON', desc: 'Full graph data' },
] as const;

interface SidebarHeaderProps {
  onCollapse: () => void;
  onExport: (format: string) => void;
}

export function SidebarHeader({ onCollapse, onExport }: SidebarHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as globalThis.Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportOpen]);

  const handleExport = useCallback((format: string) => {
    setExportOpen(false);
    onExport(format);
  }, [onExport]);

  return (
    <div style={styles.header}>
      <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0, color: '#2d2d2d' }}>
        Mechanistic Graph
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button onClick={() => setExportOpen((v) => !v)} style={styles.iconBtn} title="Export network">
            <Download size={16} />
          </button>
          {exportOpen && (
            <div style={styles.dropdown}>
              {EXPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.format}
                  onClick={() => handleExport(opt.format)}
                  style={styles.dropdownItem}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f3f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ color: '#2d2d2d', fontSize: 12, fontWeight: 500 }}>{opt.label}</span>
                  <span style={{ color: '#7a7a7a', fontSize: 10 }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onCollapse} style={styles.iconBtn} title="Collapse sidebar">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', borderBottom: '1px solid #e5e2dd',
    background: '#f5f3f0', flexShrink: 0,
  },
  iconBtn: {
    padding: 4, background: 'transparent', border: 'none',
    cursor: 'pointer', color: '#7a7a7a',
    display: 'flex', alignItems: 'center',
  },
  dropdown: {
    position: 'absolute', right: 0, top: '100%', marginTop: 4,
    width: 224, background: '#ffffff', border: '1px solid #e5e2dd',
    borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 50, overflow: 'hidden',
  },
  dropdownItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    width: '100%', padding: '6px 10px', border: 'none', background: 'transparent',
    cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
  },
};
