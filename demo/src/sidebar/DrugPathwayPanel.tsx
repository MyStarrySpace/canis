import { X, Focus, Eye } from 'lucide-react';
import type { TreatmentLibraryEntry } from '../data/drug-library';
import type { PathwayResult } from '../data/pathway-calculation';

interface DrugPathwayPanelProps {
  drug: TreatmentLibraryEntry;
  pathway: PathwayResult;
  focusMode: boolean;
  onToggleFocus: () => void;
  onClose: () => void;
}

export function DrugPathwayPanel({
  drug,
  pathway,
  focusMode,
  onToggleFocus,
  onClose,
}: DrugPathwayPanelProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#2d2d2d', fontSize: 13, fontWeight: 600 }}>{drug.name}</div>
          <div style={{ color: '#7a7a7a', fontSize: 10 }}>
            {drug.type} &middot; {drug.fdaStatus}
            {drug.annualCost != null && ` · $${drug.annualCost.toLocaleString()}/yr`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            style={{
              ...styles.iconBtn,
              color: focusMode ? '#e36216' : '#7a7a7a',
              background: focusMode ? '#f8e8de' : 'transparent',
            }}
            onClick={onToggleFocus}
            title={focusMode ? 'Show all nodes' : 'Focus on pathway'}
          >
            {focusMode ? <Eye size={14} /> : <Focus size={14} />}
          </button>
          <button style={styles.iconBtn} onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      <div style={styles.body}>
        <div style={{ color: '#4a4a4a', fontSize: 11, lineHeight: '16px', marginBottom: 8 }}>
          {drug.mechanismSummary}
        </div>

        <div style={styles.statsRow}>
          <StatPill label="Targets" value={pathway.targetNodes.size} color="#e36216" />
          <StatPill label="Upstream" value={pathway.upstreamNodes.size} color="#486393" />
          <StatPill label="Downstream" value={pathway.downstreamNodes.size} color="#007385" />
          <StatPill label="Modules" value={pathway.affectedModules.size} color="#787473" />
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={styles.label}>Targets</div>
          {drug.primaryTargets.map((t) => (
            <div key={t.nodeId} style={styles.targetItem}>
              <span style={{
                fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                color: t.effect === 'inhibits' ? '#c75146' : t.effect === 'activates' ? '#5a8a6e' : '#E5AF19',
              }}>
                {t.effect}
              </span>
              <span style={{ color: '#2d2d2d', fontSize: 11 }}>{t.nodeId}</span>
              <span style={{
                fontSize: 9, padding: '1px 4px', borderRadius: 2,
                background: t.strength === 'strong' ? '#e8f3ec' : t.strength === 'moderate' ? '#f8e8de' : '#f5f3f0',
                color: t.strength === 'strong' ? '#5a8a6e' : t.strength === 'moderate' ? '#e36216' : '#7a7a7a',
              }}>
                {t.strength}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={styles.label}>Evidence</div>
          <div style={{ fontSize: 11, color: '#4a4a4a' }}>
            <span style={{
              display: 'inline-block', padding: '1px 6px', borderRadius: 2,
              background: '#f5f3f0', fontWeight: 600, fontSize: 10, marginRight: 4,
            }}>
              {drug.adEvidence.level}
            </span>
            {drug.adEvidence.summary}
          </div>
        </div>

        {drug.notes && (
          <div style={{ marginTop: 8 }}>
            <div style={styles.label}>Notes</div>
            <div style={{ fontSize: 10, color: '#7a7a7a', lineHeight: '14px' }}>{drug.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '3px 8px', borderRadius: 4, background: `${color}10`,
      border: `1px solid ${color}30`, minWidth: 50,
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 8, color: '#7a7a7a', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    border: '1px solid #e5e2dd', borderRadius: 4, overflow: 'hidden',
    background: '#fff',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '8px 10px', background: '#f5f3f0',
    borderBottom: '1px solid #e5e2dd',
  },
  body: { padding: '8px 10px' },
  iconBtn: {
    padding: 4, border: 'none', borderRadius: 2,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
  },
  statsRow: {
    display: 'flex', gap: 4, flexWrap: 'wrap',
  },
  label: {
    fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: 0.5, color: '#7a7a7a', marginBottom: 4,
  },
  targetItem: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginBottom: 3, padding: '2px 0',
  },
};
