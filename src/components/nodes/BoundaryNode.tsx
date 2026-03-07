'use client';

import type { CanisNodeProps } from './types';
import { NodeHandle } from './shared/NodeHandle';
import { getTheme } from './shared/theme';

/** Dashed-border rectangular node for boundaries (membranes, BBB, conditions) */
export function BoundaryNode({ data, selected }: CanisNodeProps) {
  const { sbsfNode, moduleColor, displayOptions } = data;
  const t = getTheme(displayOptions.theme);

  return (
    <div
      style={{
        width: 180,
        borderRadius: 4,
        border: `2px dashed ${selected ? t.selectionColor : moduleColor}`,
        background: t.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        textAlign: 'center',
      }}
    >
      <NodeHandle type="target" color={moduleColor} direction={displayOptions.direction} />

      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: t.textSecondary,
        lineHeight: '14px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {sbsfNode.label}
      </div>

      <NodeHandle type="source" color={moduleColor} direction={displayOptions.direction} />
    </div>
  );
}
