'use client';

/**
 * Radial gradient background for CANIS graphs.
 * Renders behind the xyflow canvas as a positioned div.
 */
export function GradientBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.03) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}
