import type { MechanisticNode, MechanisticEdge, MechanisticModule } from '../../../src/index';
import type { BoundaryVariant } from '../../../src/types';
import { getTreatmentsTargetingNode, type TreatmentLibraryEntry } from '../data/drug-library';

interface NodeInspectorProps {
  selectedNode: string | null;
  rawNodes: MechanisticNode[];
  rawEdges: MechanisticEdge[];
  rawModules: MechanisticModule[];
  selectedVariants: Record<string, string>;
  onSelectVariant: (nodeId: string, variantId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onSelectDrug: (drug: TreatmentLibraryEntry) => void;
}

const DIRECTION_COLORS: Record<string, string> = {
  protective: '#34d399',
  neutral: '#787473',
  risk: '#c75146',
};

const DIRECTION_LABELS: Record<string, string> = {
  protective: 'Protective',
  neutral: 'Neutral',
  risk: 'Risk',
};

export function NodeInspector({
  selectedNode,
  rawNodes,
  rawEdges,
  rawModules,
  selectedVariants,
  onSelectVariant,
  onSelectNode,
  onSelectDrug,
}: NodeInspectorProps) {
  if (!selectedNode) {
    return <p style={{ color: '#7a7a7a', fontSize: 13 }}>Click a node to inspect it</p>;
  }

  const nodeData = rawNodes.find((n) => n.id === selectedNode);
  if (!nodeData) {
    return <p style={{ color: '#7a7a7a', fontSize: 13 }}>Node not found: {selectedNode}</p>;
  }

  const module = rawModules.find((m) => m.id === nodeData.moduleId);
  const edges = rawEdges.filter((e) => e.source === selectedNode || e.target === selectedNode);
  const drugs = getTreatmentsTargetingNode(selectedNode);
  const variants = (nodeData.variants ?? []) as BoundaryVariant[];
  const activeVariantId = selectedVariants[selectedNode] ?? (nodeData.defaultVariant as string | undefined);

  // Find max magnitude for bar chart scaling
  const maxMagnitude = variants.length > 0
    ? Math.max(...variants.map((v) => v.effectMagnitude))
    : 1;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: module?.color ?? '#787473',
        }} />
        <span style={{ color: '#2d2d2d', fontWeight: 600, fontSize: 14 }}>
          {nodeData.label}
        </span>
      </div>

      <InfoRow label="ID" value={nodeData.id} />
      <InfoRow label="Category" value={nodeData.category} />
      <InfoRow label="Subtype" value={nodeData.subtype} />
      <InfoRow label="Module" value={module?.name ?? nodeData.moduleId} />
      <InfoRow label="Description" value={nodeData.description} />
      {nodeData.mechanism && <InfoRow label="Mechanism" value={nodeData.mechanism} />}
      {(nodeData.roles as string[] | undefined)?.length ? (
        <InfoRow label="Roles" value={(nodeData.roles as string[]).join(', ')} />
      ) : null}

      {/* ── Variant Selector ── */}
      {variants.length > 0 && (
        <>
          <div style={styles.divider} />
          <h2 style={styles.title}>Variants ({variants.length})</h2>

          {/* Bar chart view */}
          <div style={{ marginBottom: 12 }}>
            {variants.map((v) => {
              const isActive = v.id === activeVariantId;
              const barWidth = maxMagnitude > 0
                ? Math.max(4, (v.effectMagnitude / maxMagnitude) * 100)
                : 4;
              const dirColor = v.color ?? DIRECTION_COLORS[v.effectDirection] ?? '#787473';

              return (
                <div
                  key={v.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 6px',
                    marginBottom: 2,
                    borderRadius: 3,
                    cursor: 'pointer',
                    background: isActive ? '#f5f3f0' : 'transparent',
                    border: isActive ? '1px solid #e5e2dd' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => onSelectVariant(selectedNode, v.id)}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#faf9f7'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Radio dot */}
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${isActive ? dirColor : '#ccc'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isActive && (
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: dirColor,
                      }} />
                    )}
                  </div>

                  {/* Label + bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: 2,
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: isActive ? 600 : 400,
                        color: '#2d2d2d',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {v.label}
                      </span>
                      <span style={{
                        fontSize: 10, color: dirColor, fontWeight: 600,
                        flexShrink: 0, marginLeft: 4,
                      }}>
                        {v.effectMagnitude}x
                      </span>
                    </div>

                    {/* Magnitude bar */}
                    <div style={{
                      height: 4, borderRadius: 2, background: '#f0efed',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        borderRadius: 2,
                        background: dirColor,
                        opacity: isActive ? 1 : 0.4,
                        transition: 'opacity 0.15s ease',
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active variant details */}
          {activeVariantId && (() => {
            const av = variants.find((v) => v.id === activeVariantId);
            if (!av) return null;
            return (
              <div style={{
                padding: '8px 10px', borderRadius: 3,
                background: '#faf9f7', border: '1px solid #e5e2dd',
                fontSize: 12, lineHeight: '18px',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: av.color ?? DIRECTION_COLORS[av.effectDirection] ?? '#787473',
                  }} />
                  <span style={{ fontWeight: 600, color: '#2d2d2d' }}>{av.label}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 5px', borderRadius: 2,
                    background: `${DIRECTION_COLORS[av.effectDirection] ?? '#787473'}20`,
                    color: DIRECTION_COLORS[av.effectDirection] ?? '#787473',
                    fontWeight: 600,
                  }}>
                    {DIRECTION_LABELS[av.effectDirection] ?? av.effectDirection}
                  </span>
                </div>

                {av.effectDescription && (
                  <div style={{ color: '#4a4a4a', marginBottom: 4 }}>{av.effectDescription}</div>
                )}

                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 8,
                  fontSize: 10, color: '#7a7a7a', marginTop: 4,
                }}>
                  {av.oddsRatio != null && (
                    <span>
                      <strong>OR</strong> {av.oddsRatio}
                      {av.ciLow != null && av.ciHigh != null && (
                        <> ({av.ciLow}–{av.ciHigh})</>
                      )}
                    </span>
                  )}
                  {av.frequency != null && (
                    <span><strong>Freq</strong> {(av.frequency * 100).toFixed(1)}%</span>
                  )}
                  {av.population && (
                    <span><strong>Pop</strong> {av.population}</span>
                  )}
                  {av.pmid && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${av.pmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#486393', textDecoration: 'none' }}
                    >
                      PMID:{av.pmid}
                    </a>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {edges.length > 0 && (
        <>
          <div style={styles.divider} />
          <h2 style={styles.title}>Connections ({edges.length})</h2>
          {edges.map((e) => {
            const isOutgoing = e.source === selectedNode;
            const otherId = isOutgoing ? e.target : e.source;
            const otherNode = rawNodes.find((n) => n.id === otherId);
            return (
              <div
                key={e.id}
                style={{ ...styles.edgeItem, cursor: 'pointer' }}
                onClick={() => onSelectNode(otherId)}
                onMouseEnter={(el) => { el.currentTarget.style.background = '#f5f3f0'; }}
                onMouseLeave={(el) => { el.currentTarget.style.background = 'transparent'; }}
              >
                <span style={styles.edgeDir}>{isOutgoing ? '\u2192' : '\u2190'}</span>
                <span style={{ color: '#4a4a4a', fontSize: 12, flex: 1 }}>
                  {otherNode?.label ?? otherId}
                </span>
                <span style={styles.edgeRelation}>{e.relation}</span>
              </div>
            );
          })}
        </>
      )}

      {drugs.length > 0 && (
        <>
          <div style={styles.divider} />
          <h2 style={styles.title}>Treatments targeting this node ({drugs.length})</h2>
          {drugs.map((drug) => (
            <div
              key={drug.id}
              style={{ ...styles.drugItem, cursor: 'pointer' }}
              onClick={() => onSelectDrug(drug)}
              onMouseEnter={(el) => { el.currentTarget.style.background = '#f5f3f0'; }}
              onMouseLeave={(el) => { el.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ color: '#2d2d2d', fontSize: 12, fontWeight: 500 }}>{drug.name}</span>
              <span style={{ color: '#7a7a7a', fontSize: 10 }}>
                {drug.fdaStatus} &middot; {drug.adEvidence.level}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{
        color: '#7a7a7a', fontSize: 10, textTransform: 'uppercase',
        letterSpacing: 0.5, fontWeight: 500,
      }}>
        {label}
      </span>
      <div style={{ color: '#4a4a4a', fontSize: 13, lineHeight: '18px' }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: 1, color: '#7a7a7a', marginBottom: 8, marginTop: 0,
  },
  divider: { border: 'none', borderTop: '1px solid #e5e2dd', margin: '16px 0' },
  edgeItem: {
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
    padding: '3px 4px', borderRadius: 2,
  },
  edgeDir: { fontSize: 12, color: '#7a7a7a', width: 16, textAlign: 'center' },
  edgeRelation: {
    fontSize: 10, color: '#7a7a7a', background: '#f5f3f0',
    padding: '1px 4px', borderRadius: 2,
  },
  drugItem: {
    display: 'flex', flexDirection: 'column', gap: 2,
    padding: '4px 6px', borderRadius: 2, marginBottom: 2,
  },
};
