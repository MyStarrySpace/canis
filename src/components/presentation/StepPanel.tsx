'use client';

import { usePresentationContext } from './PresentationProvider';

interface StepPanelProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Side panel for presentation step-through: step pills, title, description, nav buttons */
export function StepPanel({ className, style }: StepPanelProps) {
  const { steps, activeStep, activeStepData, totalSteps, goNext, goPrev, goTo } = usePresentationContext();

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: 320,
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Step pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {steps.map((step, i) => (
          <button
            key={step.id}
            onClick={() => goTo(i)}
            style={{
              borderRadius: 9999,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms',
              border: i === activeStep
                ? '1px solid rgba(251, 191, 36, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              background: i === activeStep
                ? 'rgba(251, 191, 36, 0.1)'
                : 'rgba(255, 255, 255, 0.03)',
              color: i === activeStep ? '#fbbf24' : '#9ca3af',
            }}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Active step info */}
      {activeStepData && (
        <div
          style={{
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 8,
            padding: 20,
            flex: 1,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fbbf24', marginBottom: 8 }}>
            Step {activeStep + 1} of {totalSteps}
          </p>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f9fafb', marginBottom: 12 }}>
            {activeStepData.label}
          </h3>
          <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.6 }}>
            {activeStepData.description}
          </p>
        </div>
      )}

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={goPrev}
          disabled={activeStep === 0}
          style={{
            flex: 1,
            borderRadius: 6,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 500,
            color: '#9ca3af',
            background: 'transparent',
            cursor: activeStep === 0 ? 'not-allowed' : 'pointer',
            opacity: activeStep === 0 ? 0.3 : 1,
          }}
        >
          &larr; Previous
        </button>
        <button
          onClick={goNext}
          disabled={activeStep === totalSteps - 1}
          style={{
            flex: 1,
            borderRadius: 6,
            border: '1px solid rgba(251, 191, 36, 0.4)',
            background: 'rgba(251, 191, 36, 0.08)',
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 500,
            color: '#fbbf24',
            cursor: activeStep === totalSteps - 1 ? 'not-allowed' : 'pointer',
            opacity: activeStep === totalSteps - 1 ? 0.3 : 1,
          }}
        >
          Next &rarr;
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#4b5563', textAlign: 'center' }}>
        Use arrow keys to navigate
      </p>
    </div>
  );
}
