'use client';

import type { NodeTheme } from '../../../types';

/** Small colored badge showing module membership */
export function ModuleBadge({ name, color, theme }: { name: string; color: string; theme?: NodeTheme }) {
  if (!name) return null;

  const isLight = theme === 'light';

  return (
    <div
      style={{
        display: 'inline-block',
        fontSize: 9,
        fontWeight: 600,
        color: isLight ? color : color,
        background: `${color}${isLight ? '12' : '15'}`,
        border: `1px solid ${color}30`,
        borderRadius: 4,
        padding: '1px 5px',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}
    >
      {name}
    </div>
  );
}
