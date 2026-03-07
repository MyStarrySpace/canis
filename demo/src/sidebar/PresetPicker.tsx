import { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { presetGroups, isHypothesisPreset, getTreatmentsForPreset, type PresetOption } from '../data/presets';
import type { TreatmentLibraryEntry } from '../data/drug-library';

interface PresetPickerProps {
  onSelectHypothesis: (nodeIds: string[], color: string, label: string) => void;
  onSelectDrug: (drug: TreatmentLibraryEntry) => void;
  activePresetId?: string | null;
  onClear: () => void;
}

export function PresetPicker({ onSelectHypothesis, onSelectDrug, activePresetId, onClear }: PresetPickerProps) {
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const handleSelect = (preset: PresetOption) => {
    if (isHypothesisPreset(preset)) {
      onSelectHypothesis(preset.nodeIds!, preset.color, preset.label);
    } else if (preset.treatmentIds?.length) {
      const treatments = getTreatmentsForPreset(preset.id);
      if (treatments.length === 1) {
        onSelectDrug(treatments[0]);
      } else if (treatments.length > 1) {
        // For multi-drug presets, highlight all their target nodes
        const allNodeIds = treatments.flatMap((t) => t.primaryTargets.map((p) => p.nodeId));
        onSelectHypothesis([...new Set(allNodeIds)], preset.color, preset.label);
      }
    }
    setOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={styles.title}>Presets</h2>
        {activePresetId && (
          <button style={styles.clearBtn} onClick={onClear}>Clear</button>
        )}
      </div>

      <button style={styles.pickerBtn} onClick={() => setOpen(!open)}>
        <Sparkles size={14} color="#e36216" />
        <span style={{ flex: 1, textAlign: 'left' }}>
          {activePresetId ? 'Change preset...' : 'Select a preset...'}
        </span>
        <ChevronDown size={14} color="#7a7a7a" />
      </button>

      {open && (
        <div style={styles.dropdown}>
          {presetGroups.map((group) => (
            <div key={group.category}>
              <button
                style={styles.groupHeader}
                onClick={() => setExpandedGroup(
                  expandedGroup === group.category ? null : group.category,
                )}
              >
                {expandedGroup === group.category
                  ? <ChevronDown size={12} />
                  : <ChevronRight size={12} />}
                <span style={{ fontWeight: 600, fontSize: 11 }}>{group.label}</span>
                <span style={{ color: '#aaa', fontSize: 10, marginLeft: 'auto' }}>
                  {group.options.length}
                </span>
              </button>

              {expandedGroup === group.category && (
                <div style={{ paddingLeft: 12 }}>
                  {group.options.map((preset) => (
                    <button
                      key={preset.id}
                      style={{
                        ...styles.presetItem,
                        background: activePresetId === preset.id ? '#f8e8de' : 'transparent',
                      }}
                      onClick={() => handleSelect(preset)}
                      onMouseEnter={(e) => {
                        if (activePresetId !== preset.id) e.currentTarget.style.background = '#f5f3f0';
                      }}
                      onMouseLeave={(e) => {
                        if (activePresetId !== preset.id) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: preset.color, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#2d2d2d', fontSize: 11, fontWeight: 500 }}>
                          {preset.label}
                        </div>
                        <div style={{
                          color: '#7a7a7a', fontSize: 9,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {preset.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: 1, color: '#7a7a7a', marginBottom: 0, marginTop: 0,
  },
  clearBtn: {
    padding: '2px 8px', fontSize: 10, border: '1px solid #e5e2dd',
    borderRadius: 2, background: '#fff', cursor: 'pointer', color: '#c75146',
  },
  pickerBtn: {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
    padding: '6px 8px', border: '1px solid #e5e2dd', borderRadius: 4,
    background: '#fff', cursor: 'pointer', color: '#4a4a4a', fontSize: 12,
  },
  dropdown: {
    marginTop: 4, border: '1px solid #e5e2dd', borderRadius: 4,
    background: '#fff', maxHeight: 300, overflowY: 'auto',
  },
  groupHeader: {
    display: 'flex', alignItems: 'center', gap: 4, width: '100%',
    padding: '6px 8px', border: 'none', background: '#f5f3f0',
    cursor: 'pointer', color: '#4a4a4a', borderBottom: '1px solid #e5e2dd',
  },
  presetItem: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '5px 8px', border: 'none', cursor: 'pointer',
    textAlign: 'left',
  },
};
