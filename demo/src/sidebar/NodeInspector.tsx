import type { MechanisticNode, MechanisticEdge, MechanisticModule } from '../../../src/index';
import { getTreatmentsTargetingNode, type TreatmentLibraryEntry } from '../data/drug-library';

interface NodeInspectorProps {
  selectedNode: string | null;
  rawNodes: MechanisticNode[];
  rawEdges: MechanisticEdge[];
  rawModules: MechanisticModule[];
  onSelectNode: (nodeId: string) => void;
  onSelectDrug: (drug: TreatmentLibraryEntry) => void;
}

export function NodeInspector({
  selectedNode,
  rawNodes,
  rawEdges,
  rawModules,
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
      {nodeData.roles && nodeData.roles.length > 0 && (
        <InfoRow label="Roles" value={(nodeData.roles as string[]).join(', ')} />
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
