import { useState, useCallback } from 'react';
import {
  BaseEdge,
  getStraightPath,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

export interface TooltipEdgeData {
  relation?: string;
  sourceLabel?: string;
  targetLabel?: string;
  mechanismDescription?: string;
  keyInsight?: string;
  methodType?: string;
  pmid?: string;
  confidence?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
}

export function TooltipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const d = (data ?? {}) as TooltipEdgeData;
  const hasTooltipContent = d.mechanismDescription || d.keyInsight || d.pmid || d.methodType;

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setHovered(true);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {/* Invisible wider hit area for hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: hasTooltipContent ? 'pointer' : 'default' }}
      />
      {hovered && hasTooltipContent && (
        <foreignObject
          x={0}
          y={0}
          width={1}
          height={1}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div
            style={{
              position: 'fixed',
              left: tooltipPos.x + 12,
              top: tooltipPos.y - 10,
              background: '#fff',
              border: '1px solid #e5e2dd',
              borderRadius: 4,
              padding: '8px 10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              maxWidth: 320,
              fontSize: 11,
              lineHeight: 1.4,
              color: '#2d2d2d',
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            {/* Header: source → target */}
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 10, color: '#4a4a4a' }}>
              {d.sourceLabel}
              <span style={{ color: '#7a7a7a', margin: '0 4px' }}>
                {d.relation ?? '→'}
              </span>
              {d.targetLabel}
            </div>

            {/* Key insight */}
            {d.keyInsight && (
              <div style={{ marginBottom: 4, fontStyle: 'italic', color: '#486393' }}>
                {d.keyInsight}
              </div>
            )}

            {/* Mechanism */}
            {d.mechanismDescription && (
              <div style={{ marginBottom: 4, color: '#4a4a4a' }}>
                {d.mechanismDescription}
              </div>
            )}

            {/* Metadata row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
              {d.confidence && (
                <span style={tagStyle}>{d.confidence}</span>
              )}
              {d.methodType && (
                <span style={tagStyle}>{d.methodType}</span>
              )}
              {d.pmid && (
                <span style={{ ...tagStyle, color: '#007385' }}>
                  PMID: {d.pmid}
                </span>
              )}
            </div>
          </div>
        </foreignObject>
      )}
    </>
  );
}

const tagStyle: React.CSSProperties = {
  fontSize: 9,
  padding: '1px 4px',
  background: '#f5f3f0',
  borderRadius: 2,
  color: '#7a7a7a',
  fontFamily: 'monospace',
};
