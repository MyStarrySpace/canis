'use client';

import { Handle, Position } from '@xyflow/react';
import type { Direction } from '../../../types';

interface NodeHandleProps {
  type: 'source' | 'target';
  position?: Position;
  color?: string;
  id?: string;
  direction?: Direction;
  /** If false, handle is invisible but still functional for edge connections */
  visible?: boolean;
}

/** Styled handle that adapts to layout direction */
export function NodeHandle({ type, position, color = '#6b7280', id, direction, visible = true }: NodeHandleProps) {
  let pos: Position;
  if (position) {
    pos = position;
  } else if (direction === 'TopToBottom') {
    pos = type === 'target' ? Position.Top : Position.Bottom;
  } else {
    // Default: LeftToRight (horizontal)
    pos = type === 'target' ? Position.Left : Position.Right;
  }

  if (!visible) {
    return (
      <Handle
        type={type}
        position={pos}
        id={id}
        style={{ opacity: 0, width: 1, height: 1 }}
      />
    );
  }

  return (
    <Handle
      type={type}
      position={pos}
      id={id}
      style={{
        background: color,
        border: 'none',
        width: 6,
        height: 6,
      }}
    />
  );
}
