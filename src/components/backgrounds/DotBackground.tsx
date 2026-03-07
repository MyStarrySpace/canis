'use client';

import { Background, BackgroundVariant } from '@xyflow/react';

export function DotBackground() {
  return (
    <Background
      variant={BackgroundVariant.Dots}
      gap={20}
      size={1}
      color="rgba(255, 255, 255, 0.06)"
    />
  );
}
