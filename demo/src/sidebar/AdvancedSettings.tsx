import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical, RotateCcw } from 'lucide-react';
import type { ConfidenceScheme, ConfidenceRule, CausalConfidence } from '../../../src/types';

const CONFIDENCE_LEVELS: CausalConfidence[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];

const CONFIDENCE_LABELS: Record<CausalConfidence, string> = {
  L1: 'L1 — RCT / Clinical trial',
  L2: 'L2 — Mendelian randomization',
  L3: 'L3 — GWAS / Knockout',
  L4: 'L4 — Animal / Imaging',
  L5: 'L5 — In vitro / Transcriptomics',
  L6: 'L6 — Observational / Cohort',
  L7: 'L7 — Review / Expert opinion',
};

const DEFAULT_WEIGHTS: Record<string, number> = {
  L1: 1.0, L2: 0.85, L3: 0.7, L4: 0.55, L5: 0.4, L6: 0.3, L7: 0.2,
};

function defaultScheme(): ConfidenceScheme {
  return {
    name: 'Default Biomedical Evidence Hierarchy',
    rules: [
      { methodTypes: ['rct'], confidence: 'L1' },
      { methodTypes: ['mendelian_randomization'], confidence: 'L2' },
      { methodTypes: ['knockout', 'gwas', 'transgenic'], confidence: 'L3' },
      { methodTypes: ['intervention_animal', 'imaging'], confidence: 'L4' },
      { methodTypes: ['in_vitro', 'transcriptomics'], confidence: 'L5' },
      { methodTypes: ['cohort', 'observational', 'meta_analysis'], confidence: 'L6' },
      { methodTypes: ['review'], confidence: 'L7' },
    ],
    defaultConfidence: 'L7',
  };
}

interface AdvancedSettingsProps {
  scheme: ConfidenceScheme;
  weights: Record<string, number>;
  onSchemeChange: (scheme: ConfidenceScheme) => void;
  onWeightsChange: (weights: Record<string, number>) => void;
}

export function AdvancedSettings({
  scheme,
  weights,
  onSchemeChange,
  onWeightsChange,
}: AdvancedSettingsProps) {
  const [expanded, setExpanded] = useState(false);
  const [schemeExpanded, setSchemeExpanded] = useState(true);
  const [weightsExpanded, setWeightsExpanded] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // ── Scheme rule handlers ──────────────────────────────────────────────

  const updateRule = useCallback((idx: number, patch: Partial<ConfidenceRule>) => {
    const rules = [...scheme.rules];
    rules[idx] = { ...rules[idx], ...patch };
    onSchemeChange({ ...scheme, rules });
  }, [scheme, onSchemeChange]);

  const removeRule = useCallback((idx: number) => {
    const rules = scheme.rules.filter((_, i) => i !== idx);
    onSchemeChange({ ...scheme, rules });
  }, [scheme, onSchemeChange]);

  const addRule = useCallback(() => {
    const rules = [...scheme.rules, { methodTypes: [''], confidence: 'L7' as CausalConfidence }];
    onSchemeChange({ ...scheme, rules });
  }, [scheme, onSchemeChange]);

  const handleMethodTypesChange = useCallback((idx: number, value: string) => {
    const types = value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    updateRule(idx, { methodTypes: types });
  }, [updateRule]);

  // ── Drag & drop reordering ────────────────────────────────────────────

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const rules = [...scheme.rules];
    const [moved] = rules.splice(dragIdx, 1);
    rules.splice(idx, 0, moved);
    onSchemeChange({ ...scheme, rules });
    setDragIdx(idx);
  }, [dragIdx, scheme, onSchemeChange]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  // ── Reset handlers ────────────────────────────────────────────────────

  const resetScheme = useCallback(() => {
    onSchemeChange(defaultScheme());
  }, [onSchemeChange]);

  const resetWeights = useCallback(() => {
    onWeightsChange({ ...DEFAULT_WEIGHTS });
  }, [onWeightsChange]);

  // ── Weight handler ────────────────────────────────────────────────────

  const handleWeightChange = useCallback((level: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 2) {
      onWeightsChange({ ...weights, [level]: num });
    }
  }, [weights, onWeightsChange]);

  if (!expanded) {
    return (
      <button style={styles.collapsedHeader} onClick={() => setExpanded(true)}>
        <ChevronRight size={12} />
        <span style={styles.title}>Advanced Settings</span>
      </button>
    );
  }

  return (
    <div>
      <button style={styles.expandedHeader} onClick={() => setExpanded(false)}>
        <ChevronDown size={12} />
        <span style={styles.title}>Advanced Settings</span>
      </button>

      {/* ── Confidence Classification Scheme ────────────────────────────── */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            style={styles.subHeader}
            onClick={() => setSchemeExpanded((v) => !v)}
          >
            {schemeExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <span style={styles.subTitle}>Evidence → Confidence Rules</span>
          </button>
          <button style={styles.resetBtn} onClick={resetScheme} title="Reset to defaults">
            <RotateCcw size={10} />
          </button>
        </div>

        <p style={styles.helpText}>
          First matching rule wins. Drag to reorder priority.
        </p>

        {schemeExpanded && (
          <div style={{ marginTop: 4 }}>
            {scheme.rules.map((rule, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  ...styles.ruleRow,
                  opacity: dragIdx === idx ? 0.5 : 1,
                  borderColor: dragIdx === idx ? '#e36216' : '#e5e2dd',
                }}
              >
                <div style={styles.gripHandle}>
                  <GripVertical size={10} color="#aaa" />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={(rule.methodTypes ?? []).join(', ')}
                      onChange={(e) => handleMethodTypesChange(idx, e.target.value)}
                      placeholder="method types (comma-separated)"
                      style={styles.methodInput}
                    />
                    <span style={{ fontSize: 10, color: '#7a7a7a', flexShrink: 0 }}>→</span>
                    <select
                      value={rule.confidence}
                      onChange={(e) => updateRule(idx, { confidence: e.target.value as CausalConfidence })}
                      style={styles.confidenceSelect}
                    >
                      {CONFIDENCE_LEVELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={rule.requiresPmid ?? false}
                        onChange={(e) => updateRule(idx, { requiresPmid: e.target.checked || undefined })}
                        style={{ margin: 0 }}
                      />
                      Requires PMID
                    </label>
                    {rule.minExistingConfidence && (
                      <span style={{ fontSize: 9, color: '#7a7a7a' }}>
                        min: {rule.minExistingConfidence}
                      </span>
                    )}
                  </div>
                </div>
                <button style={styles.deleteBtn} onClick={() => removeRule(idx)} title="Remove rule">
                  <Trash2 size={10} />
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
              <button style={styles.addBtn} onClick={addRule}>
                <Plus size={10} /> Add rule
              </button>
              <span style={{ fontSize: 9, color: '#7a7a7a' }}>Default:</span>
              <select
                value={scheme.defaultConfidence ?? 'L7'}
                onChange={(e) => onSchemeChange({ ...scheme, defaultConfidence: e.target.value as CausalConfidence })}
                style={styles.confidenceSelect}
              >
                {CONFIDENCE_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Confidence Weights ──────────────────────────────────────────── */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            style={styles.subHeader}
            onClick={() => setWeightsExpanded((v) => !v)}
          >
            {weightsExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <span style={styles.subTitle}>Confidence → Strength Weights</span>
          </button>
          <button style={styles.resetBtn} onClick={resetWeights} title="Reset to defaults">
            <RotateCcw size={10} />
          </button>
        </div>

        <p style={styles.helpText}>
          Numeric weight per confidence level, used for path analysis and layout.
        </p>

        {weightsExpanded && (
          <div style={{ marginTop: 4 }}>
            {CONFIDENCE_LEVELS.map((level) => (
              <div key={level} style={styles.weightRow}>
                <span style={styles.weightLabel}>{CONFIDENCE_LABELS[level]}</span>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.05}
                  value={weights[level] ?? DEFAULT_WEIGHTS[level]}
                  onChange={(e) => handleWeightChange(level, e.target.value)}
                  style={styles.weightInput}
                />
                <div style={{
                  height: 4,
                  width: `${(weights[level] ?? DEFAULT_WEIGHTS[level]) * 60}px`,
                  background: '#e36216',
                  borderRadius: 2,
                  flexShrink: 0,
                  opacity: 0.6,
                }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { DEFAULT_WEIGHTS, defaultScheme };

const styles: Record<string, React.CSSProperties> = {
  collapsedHeader: {
    display: 'flex', alignItems: 'center', gap: 4, width: '100%',
    padding: '4px 0', border: 'none', background: 'transparent',
    cursor: 'pointer', color: '#7a7a7a',
  },
  expandedHeader: {
    display: 'flex', alignItems: 'center', gap: 4, width: '100%',
    padding: '4px 0', border: 'none', background: 'transparent',
    cursor: 'pointer', color: '#4a4a4a',
  },
  title: {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  subHeader: {
    display: 'flex', alignItems: 'center', gap: 4,
    border: 'none', background: 'transparent',
    cursor: 'pointer', color: '#4a4a4a', padding: 0,
  },
  subTitle: {
    fontSize: 10, fontWeight: 600, color: '#4a4a4a',
  },
  helpText: {
    fontSize: 9, color: '#7a7a7a', margin: '2px 0 0 0',
  },
  resetBtn: {
    padding: '2px 4px', border: '1px solid #e5e2dd', borderRadius: 2,
    background: '#fff', cursor: 'pointer', color: '#7a7a7a',
    display: 'flex', alignItems: 'center',
  },
  ruleRow: {
    display: 'flex', alignItems: 'flex-start', gap: 4,
    padding: '4px 4px', marginBottom: 2,
    border: '1px solid #e5e2dd', borderRadius: 2,
    background: '#faf9f7',
  },
  gripHandle: {
    cursor: 'grab', padding: '4px 0', display: 'flex', alignItems: 'center',
    flexShrink: 0,
  },
  methodInput: {
    flex: 1, padding: '2px 4px', fontSize: 10, border: '1px solid #e5e2dd',
    borderRadius: 2, outline: 'none', fontFamily: 'monospace',
    minWidth: 0,
  },
  confidenceSelect: {
    padding: '2px 4px', fontSize: 10, border: '1px solid #e5e2dd',
    borderRadius: 2, background: '#fff', cursor: 'pointer',
    fontFamily: 'monospace', flexShrink: 0,
  },
  checkboxLabel: {
    display: 'flex', alignItems: 'center', gap: 3,
    fontSize: 9, color: '#7a7a7a', cursor: 'pointer',
  },
  deleteBtn: {
    padding: 2, border: 'none', background: 'transparent',
    cursor: 'pointer', color: '#c75146', flexShrink: 0,
    display: 'flex', alignItems: 'center',
  },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', fontSize: 10, border: '1px solid #e5e2dd',
    borderRadius: 2, background: '#fff', cursor: 'pointer', color: '#4a4a4a',
  },
  weightRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '2px 0',
  },
  weightLabel: {
    fontSize: 9, color: '#4a4a4a', width: 175, flexShrink: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  weightInput: {
    width: 48, padding: '2px 4px', fontSize: 10, border: '1px solid #e5e2dd',
    borderRadius: 2, outline: 'none', fontFamily: 'monospace',
    textAlign: 'right' as const,
  },
};
