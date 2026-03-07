'use client';

import { Background, BackgroundVariant } from '@xyflow/react';

export function GridBackground() {
  return (
    <Background
      variant={BackgroundVariant.Lines}
      gap={24}
      size={1}
      color="rgba(255, 255, 255, 0.03)"
    />
  );
}
