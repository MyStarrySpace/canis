'use client';

import type { CanisNodeProps } from './types';
import { NodeHandle } from './shared/NodeHandle';
import { getTheme } from './shared/theme';

/**
 * Generic node that renders user-provided SVG content.
 * Set `data.sbsfNode.mechanism` to an SVG string, or override via nodeTypes.
 */
export function CustomSvgNode({ data, selected }: CanisNodeProps) {
  const { sbsfNode, moduleColor, displayOptions } = data;
  const t = getTheme(displayOptions.theme);
  const svgContent = sbsfNode.mechanism; // Overloaded: mechanism field holds SVG string

  return (
    <div
      style={{
        border: `1px solid ${selected ? t.selectionColor : moduleColor}`,
        borderRadius: 8,
        background: t.bg,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <NodeHandle type="target" color={moduleColor} direction={displayOptions.direction} />

      {svgContent ? (
        <div
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{ width: 60, height: 60 }}
        />
      ) : (
        <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: t.textMuted }}>{sbsfNode.label}</span>
        </div>
      )}

      {sbsfNode.label && (
        <div style={{ fontSize: 10, color: t.textSecondary, marginTop: 4, textAlign: 'center' }}>
          {sbsfNode.label}
        </div>
      )}

      <NodeHandle type="source" color={moduleColor} direction={displayOptions.direction} />
    </div>
  );
}
