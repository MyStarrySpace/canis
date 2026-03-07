import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ModuleFilterState } from '../graph/flow-builder';
import {
  modules,
  moduleCategoryMap,
  categoryOrder,
  categoryLabels,
  nodeCountsByModule,
  type ModuleCategory,
} from '../data/constants';

interface ModuleFiltersProps {
  filters: Record<string, ModuleFilterState>;
  onToggle: (moduleId: string) => void;
  onSetAll: (state: ModuleFilterState) => void;
}

export function ModuleFilters({ filters, onToggle, onSetAll }: ModuleFiltersProps) {
  const [collapsed, setCollapsed] = useState<Record<ModuleCategory, boolean>>({
    upstream: false,
    core: false,
    downstream: false,
    therapeutic: false,
    boundary: true,
  });

  // Group modules by category
  const grouped = new Map<ModuleCategory, typeof modules>();
  for (const mod of modules) {
    const cat = moduleCategoryMap[mod.id] ?? 'boundary';
    const list = grouped.get(cat) ?? [];
    list.push(mod);
    grouped.set(cat, list);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={styles.title}>Module Filters</h2>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={styles.quickBtn} onClick={() => onSetAll('on')}>All</button>
          <button style={styles.quickBtn} onClick={() => onSetAll('off')}>Clear</button>
        </div>
      </div>

      {categoryOrder.map((cat) => {
        const mods = grouped.get(cat);
        if (!mods?.length) return null;
        const isCollapsed = collapsed[cat];

        return (
          <div key={cat} style={{ marginBottom: 8 }}>
            <button
              style={styles.categoryHeader}
              onClick={() => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))}
            >
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {categoryLabels[cat]}
              </span>
              <span style={{ color: '#7a7a7a', fontSize: 10, marginLeft: 'auto' }}>
                {mods.length}
              </span>
            </button>

            {!isCollapsed && (
              <div style={{ paddingLeft: 8 }}>
                {mods.map((mod) => {
                  const state = filters[mod.id] ?? 'off';
                  return (
                    <ModuleCheckbox
                      key={mod.id}
                      label={mod.shortName}
                      color={mod.color}
                      state={state}
                      count={nodeCountsByModule[mod.id] ?? 0}
                      onClick={() => onToggle(mod.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ModuleCheckbox({
  label,
  color,
  state,
  count,
  onClick,
}: {
  label: string;
  color: string;
  state: ModuleFilterState;
  count: number;
  onClick: () => void;
}) {
  return (
    <button style={styles.checkboxRow} onClick={onClick}>
      <div style={{
        width: 14, height: 14, borderRadius: 2,
        border: `2px solid ${state === 'off' ? '#ccc' : color}`,
        background: state === 'on' ? color : state === 'partial' ? `${color}40` : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {state === 'on' && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {state === 'partial' && (
          <div style={{ width: 6, height: 2, background: color, borderRadius: 1 }} />
        )}
      </div>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{
        color: state === 'off' ? '#aaa' : '#2d2d2d', fontSize: 11, flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <span style={{ color: '#aaa', fontSize: 9 }}>{count}</span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: 1, color: '#7a7a7a', marginBottom: 0, marginTop: 0,
  },
  quickBtn: {
    padding: '2px 8px', fontSize: 10, border: '1px solid #e5e2dd',
    borderRadius: 2, background: '#fff', cursor: 'pointer', color: '#4a4a4a',
  },
  categoryHeader: {
    display: 'flex', alignItems: 'center', gap: 4, width: '100%',
    padding: '4px 0', border: 'none', background: 'transparent',
    cursor: 'pointer', color: '#4a4a4a',
  },
  checkboxRow: {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
    padding: '3px 2px', border: 'none', background: 'transparent',
    cursor: 'pointer', textAlign: 'left',
  },
};
