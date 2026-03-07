'use client';

import type { CanisNodeProps } from './types';
import { ChemicalFormula } from './shared/ChemicalFormula';
import { NodeHandle } from './shared/NodeHandle';
import { ModuleBadge } from './shared/ModuleBadge';
import { getTheme } from './shared/theme';

/** Color by charge state for ions and small molecules */
function moleculeColor(label: string, isLight: boolean): string {
  if (/Fe2\+|Fe²⁺/.test(label)) return '#fb923c'; // orange-400
  if (/Fe3\+|Fe³⁺/.test(label)) return '#60a5fa'; // blue-400
  if (/OH[·•]|radical/i.test(label)) return '#f87171'; // red-400
  if (/H[₂2]O[₂2]/i.test(label)) return '#fbbf24'; // amber-400
  if (/O[₂2][⁻\-]/i.test(label)) return '#a78bfa'; // violet-400
  if (/GSH/i.test(label)) return '#34d399'; // emerald-400
  return isLight ? '#4a4a4a' : '#e5e7eb';
}

/** Circular node for ions, small molecules, ROS */
export function MoleculeNode({ data, selected }: CanisNodeProps) {
  const { sbsfNode, moduleColor, moduleName, displayOptions } = data;
  const t = getTheme(displayOptions.theme);
  const isLight = displayOptions.theme === 'light';
  const color = moleculeColor(sbsfNode.label, isLight);

  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        border: `2px solid ${selected ? t.selectionColor : color}`,
        background: isLight ? '#ffffff' : `${color}10`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
      }}
    >
      <NodeHandle type="target" color={moduleColor} direction={displayOptions.direction} />

      <ChemicalFormula
        text={sbsfNode.label}
        style={{ fontSize: 13, fontWeight: 700, color, textAlign: 'center', lineHeight: 1.2 }}
      />

      {displayOptions.showModule && moduleName && (
        <div style={{ marginTop: 2 }}>
          <ModuleBadge name={moduleName} color={moduleColor} theme={displayOptions.theme} />
        </div>
      )}

      <NodeHandle type="source" color={moduleColor} direction={displayOptions.direction} />
    </div>
  );
}
