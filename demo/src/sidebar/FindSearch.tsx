import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { MechanisticNode } from '../../../src/index';
import type { ModuleFilterState } from '../graph/flow-builder';
import { moduleColors } from '../data/constants';

interface FindSearchProps {
  rawNodes: MechanisticNode[];
  moduleFilters: Record<string, ModuleFilterState>;
  onNavigate: (nodeId: string, enableModule: boolean) => void;
}

export function FindSearch({ rawNodes, moduleFilters, onNavigate }: FindSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keyboard shortcut: Ctrl+F
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return rawNodes
      .filter((n) => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
      .slice(0, 20);
  }, [rawNodes, query]);

  if (!open) {
    return (
      <button style={styles.searchBtn} onClick={() => setOpen(true)} title="Find node (Ctrl+F)">
        <Search size={14} />
        <span style={{ fontSize: 11 }}>Find node...</span>
      </button>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.inputRow}>
        <Search size={14} color="#7a7a7a" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nodes..."
          style={styles.input}
        />
        <button
          style={styles.closeBtn}
          onClick={() => { setOpen(false); setQuery(''); }}
        >
          <X size={14} />
        </button>
      </div>

      {results.length > 0 && (
        <div style={styles.results}>
          {results.map((node) => {
            const filter = moduleFilters[node.moduleId];
            const willShow = filter === 'off';
            return (
              <button
                key={node.id}
                style={styles.resultItem}
                onClick={() => {
                  onNavigate(node.id, willShow);
                  setOpen(false);
                  setQuery('');
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f3f0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: moduleColors[node.moduleId] ?? '#787473',
                }} />
                <span style={{ color: '#2d2d2d', fontSize: 12, flex: 1 }}>{node.label}</span>
                <span style={{ color: '#aaa', fontSize: 9 }}>{node.moduleId}</span>
                {willShow && (
                  <span style={styles.badge}>will show</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && (
        <div style={{ padding: '8px 12px', color: '#7a7a7a', fontSize: 11 }}>
          No nodes match "{query}"
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  searchBtn: {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
    padding: '6px 8px', border: '1px solid #e5e2dd', borderRadius: 4,
    background: '#fff', cursor: 'pointer', color: '#7a7a7a',
  },
  container: {
    border: '1px solid #e5e2dd', borderRadius: 4, background: '#fff',
    overflow: 'hidden',
  },
  inputRow: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
    borderBottom: '1px solid #e5e2dd',
  },
  input: {
    flex: 1, border: 'none', outline: 'none', fontSize: 12,
    background: 'transparent', color: '#2d2d2d',
  },
  closeBtn: {
    padding: 2, background: 'transparent', border: 'none',
    cursor: 'pointer', color: '#7a7a7a', display: 'flex',
  },
  results: {
    maxHeight: 200, overflowY: 'auto',
  },
  resultItem: {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
    padding: '4px 8px', border: 'none', background: 'transparent',
    cursor: 'pointer', textAlign: 'left',
  },
  badge: {
    fontSize: 8, color: '#e36216', background: '#f8e8de',
    padding: '1px 4px', borderRadius: 2, whiteSpace: 'nowrap',
  },
};
