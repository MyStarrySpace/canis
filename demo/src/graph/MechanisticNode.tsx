import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

export interface MechNodeData {
  label: string;
  category: string;
  moduleId: string;
  moduleColor: string;
  description: string;
  mechanism?: string;
  subtype: string;
  roles: string[];
  highlighted: boolean;
  dimmed: boolean;
  isPathwayTarget?: boolean;
  isPathwayUpstream?: boolean;
  isPathwayDownstream?: boolean;
  [key: string]: unknown;
}

export function MechanisticNodeComponent({ data }: NodeProps<Node<MechNodeData>>) {
  const {
    label, category, moduleColor, roles, highlighted, dimmed,
    isPathwayTarget, isPathwayUpstream, isPathwayDownstream,
  } = data;

  const isTarget = roles?.includes('THERAPEUTIC_TARGET');
  const isBiomarker = roles?.includes('BIOMARKER');

  const borderRadius =
    category === 'BOUNDARY' ? '2px' :
    category === 'PROCESS' ? '50%' :
    category === 'STATE' ? '6px' : '4px';
  const size = category === 'PROCESS' ? 36 : category === 'BOUNDARY' ? 40 : 32;

  // Pathway styling
  let borderWidth = 1;
  let bgColor = `${moduleColor}20`;
  let borderColor = moduleColor;
  let glowShadow = 'none';

  if (isPathwayTarget) {
    borderWidth = 3;
    bgColor = moduleColor;
    glowShadow = `0 0 8px ${moduleColor}80`;
  } else if (isPathwayUpstream || isPathwayDownstream) {
    borderWidth = 2;
    bgColor = `${moduleColor}50`;
  } else if (highlighted) {
    borderWidth = 2;
    bgColor = moduleColor;
  }

  const opacity = dimmed ? 0.2 : 1;

  return (
    <div
      style={{
        opacity,
        width: size,
        height: size,
        borderRadius,
        border: `${borderWidth}px solid ${borderColor}`,
        backgroundColor: bgColor,
        boxShadow: glowShadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      title={label}
    >
      {isTarget && (
        <div style={{
          position: 'absolute', top: -3, right: -3, width: 8, height: 8,
          borderRadius: '50%', backgroundColor: '#e36216', border: '1px solid white',
        }} />
      )}
      {isBiomarker && (
        <div style={{
          position: 'absolute', bottom: -3, right: -3, width: 8, height: 8,
          borderRadius: '50%', backgroundColor: '#486393', border: '1px solid white',
        }} />
      )}
      <div style={{
        position: 'absolute',
        top: size + 2,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 8,
        lineHeight: '10px',
        color: dimmed ? '#ccc' : '#4a4a4a',
        whiteSpace: 'nowrap',
        maxWidth: 80,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'center',
        fontFamily: 'var(--font-sans, sans-serif)',
      }}>
        {label}
      </div>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
    </div>
  );
}
