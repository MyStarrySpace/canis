'use client';

import type { CanisNodeProps } from './types';
import { NodeHandle } from './shared/NodeHandle';
import { ModuleBadge } from './shared/ModuleBadge';
import { getTheme } from './shared/theme';

/** Double-bordered rounded rect for organelles (mitochondria, lysosomes, endosomes) */
export function OrganelleNode({ data, selected }: CanisNodeProps) {
  const { sbsfNode, moduleColor, moduleName, displayOptions } = data;
  const t = getTheme(displayOptions.theme);

  return (
    <div
      style={{
        borderRadius: 12,
        border: `3px double ${selected ? t.selectionColor : moduleColor}`,
        background: t.bgTint(moduleColor),
        padding: '10px 16px',
        width: 180,
        textAlign: 'center',
      }}
    >
      <NodeHandle type="target" color={moduleColor} direction={displayOptions.direction} />

      <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
        {sbsfNode.label}
      </div>

      {displayOptions.showModule && moduleName && (
        <div style={{ marginTop: 3 }}>
          <ModuleBadge name={moduleName} color={moduleColor} theme={displayOptions.theme} />
        </div>
      )}

      {displayOptions.showDescription && sbsfNode.description && (
        <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, lineHeight: 1.3 }}>
          {sbsfNode.description}
        </div>
      )}

      <NodeHandle type="source" color={moduleColor} direction={displayOptions.direction} />
    </div>
  );
}
