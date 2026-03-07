'use client';

import { useEffect, useRef } from 'react';
import { usePresentationContext } from './PresentationProvider';

interface PresentationControlsOptions {
  /** Enable keyboard navigation (default: true) */
  keyboard?: boolean;
  /** Enable touch swipe navigation (default: true) */
  swipe?: boolean;
  /** Minimum swipe distance in px to trigger navigation (default: 50) */
  swipeThreshold?: number;
}

/**
 * Hook for keyboard (arrows, space, escape) and touch swipe navigation
 * in presentation mode.
 */
export function usePresentationControls(options: PresentationControlsOptions = {}) {
  const { keyboard = true, swipe = true, swipeThreshold = 50 } = options;
  const { goNext, goPrev, goTo, totalSteps } = usePresentationContext();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Keyboard navigation
  useEffect(() => {
    if (!keyboard) return;

    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goPrev();
          break;
        case 'Home':
          e.preventDefault();
          goTo(0);
          break;
        case 'End':
          e.preventDefault();
          goTo(totalSteps - 1);
          break;
        case 'Escape':
          e.preventDefault();
          goTo(0);
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [keyboard, goNext, goPrev, goTo, totalSteps]);

  // Touch swipe navigation
  useEffect(() => {
    if (!swipe) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;

      // Only trigger on horizontal swipes
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > swipeThreshold) {
        if (dx < 0) goNext();
        else goPrev();
      }

      touchStart.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [swipe, swipeThreshold, goNext, goPrev]);
}
