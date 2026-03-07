'use client';

import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import type { CanisEdgeProps } from './types';

export function DefaultEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: CanisEdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
      />
      {data?.sbsfEdge.keyInsight && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: 10,
            fill: '#9ca3af',
            pointerEvents: 'none',
          }}
        >
          {data.sbsfEdge.keyInsight}
        </text>
      )}
    </>
  );
}
