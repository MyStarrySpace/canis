'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PresentationStep } from '../../types';

interface PresentationContextValue {
  steps: PresentationStep[];
  activeStep: number;
  activeStepData: PresentationStep | null;
  isPresenting: boolean;
  totalSteps: number;
  goNext: () => void;
  goPrev: () => void;
  goTo: (index: number) => void;
}

const PresentationContext = createContext<PresentationContextValue | null>(null);

export function usePresentationContext() {
  const ctx = useContext(PresentationContext);
  if (!ctx) {
    throw new Error('usePresentationContext must be used within a PresentationProvider');
  }
  return ctx;
}

/** Safe hook that returns null outside of presentation context */
export function usePresentationContextSafe(): PresentationContextValue | null {
  return useContext(PresentationContext);
}

interface PresentationProviderProps {
  steps: PresentationStep[];
  children: ReactNode;
}

export function PresentationProvider({ steps, children }: PresentationProviderProps) {
  const [activeStep, setActiveStep] = useState(0);

  const goNext = useCallback(() => {
    setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  }, [steps.length]);

  const goPrev = useCallback(() => {
    setActiveStep((s) => Math.max(s - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    setActiveStep(Math.max(0, Math.min(index, steps.length - 1)));
  }, [steps.length]);

  const value = useMemo<PresentationContextValue>(() => ({
    steps,
    activeStep,
    activeStepData: steps[activeStep] ?? null,
    isPresenting: true,
    totalSteps: steps.length,
    goNext,
    goPrev,
    goTo,
  }), [steps, activeStep, goNext, goPrev, goTo]);

  return (
    <PresentationContext.Provider value={value}>
      {children}
    </PresentationContext.Provider>
  );
}
