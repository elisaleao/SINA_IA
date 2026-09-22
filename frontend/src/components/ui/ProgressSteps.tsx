'use client';

import React from 'react';

export interface StepItem {
  number: number;
  label: string;
}

export interface ProgressStepsProps {
  steps: StepItem[];
  currentStep: number;
}

export function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  return (
    <nav
      aria-label="Etapas do progresso"
      className="my-6 w-full overflow-x-auto py-2"
    >
      <ol className="flex items-center justify-between gap-2 min-w-[300px]">
        {steps.map((step, idx) => {
          const isCurrent = step.number === currentStep;
          const isCompleted = step.number < currentStep;

          return (
            <li
              key={step.number}
              className="flex flex-1 items-center gap-2"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {isCompleted ? '✓' : step.number}
                </span>
                <span
                  className={`text-xs sm:text-sm font-medium ${
                    isCurrent
                      ? 'font-bold text-blue-900'
                      : isCompleted
                        ? 'text-emerald-900'
                        : 'text-stone-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-all ${
                    isCompleted ? 'bg-emerald-500' : 'bg-stone-200'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default ProgressSteps;

