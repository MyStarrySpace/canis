'use client';

import type { CanisNodeProps } from './types';
import { NodeHandle } from './shared/NodeHandle';
import { ModuleBadge } from './shared/ModuleBadge';
import { getTheme } from './shared/theme';

/** Rounded rectangle / pill for enzymes, receptors, transporters */
export function ProteinNode({ data, selected }: CanisNodeProps) {
  const { sbsfNode, moduleColor, moduleName, displayOptions } = data;
  const t = getTheme(displayOptions.theme);

  return (
    <div
      style={{
        borderRadius: 20,
        border: `2px solid ${selected ? t.selectionColor : moduleColor}`,
        background: t.bgTint(moduleColor),
        padding: '6px 14px',
        width: 160,
        textAlign: 'center',
      }}
    >
      <NodeHandle type="target" color={moduleColor} direction={displayOptions.direction} />

      <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
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
