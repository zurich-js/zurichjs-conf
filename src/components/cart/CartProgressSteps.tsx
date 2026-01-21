/**
 * Cart Progress Steps Component
 * Shows the multi-step checkout progress indicator
 */

import type { CartStep } from './types';

interface CartProgressStepsProps {
  currentStep: CartStep;
  needsAttendeeInfo: boolean;
  showWorkshopUpsells: boolean;
  isPricingLoading: boolean;
  onStepClick: (step: CartStep) => void;
}

interface StepConfig {
  step: CartStep;
  label: string;
  show: boolean;
}

export function CartProgressSteps({
  currentStep,
  needsAttendeeInfo,
  showWorkshopUpsells,
  isPricingLoading,
  onStepClick,
}: CartProgressStepsProps) {
  if (isPricingLoading) {
    return (
      <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-2xl mx-auto animate-pulse">
        {Array(3).fill(null).map((_, index) => (
          <div key={index} className="flex items-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-gray-dark" />
            <div className="ml-2 sm:ml-3 w-16 h-4 bg-brand-gray-dark rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Build steps array dynamically
  const steps: StepConfig[] = [
    { step: 'review' as const, label: 'Tickets', show: true },
    { step: 'attendees' as const, label: 'Attendees', show: needsAttendeeInfo },
    { step: 'upsells' as const, label: 'Workshops', show: showWorkshopUpsells },
    { step: 'checkout' as const, label: 'Payment', show: true },
  ].filter(s => s.show);

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-3 max-w-2xl mx-auto">
      {steps.map((stepConfig, index) => (
        <div key={stepConfig.step} className="flex items-center">
          <button
            onClick={() => onStepClick(stepConfig.step)}
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            aria-label={`Go to ${stepConfig.label} step`}
          >
            <div className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm md:text-base font-bold transition-colors ${
              currentStep === stepConfig.step ? 'bg-brand-primary text-black' : 'bg-brand-gray-dark text-brand-gray-light'
            }`}>
              {index + 1}
            </div>
            <span className={`ml-1 sm:ml-2 md:ml-3 text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              currentStep === stepConfig.step ? 'text-brand-white' : 'text-brand-gray-light'
            }`}>
              {stepConfig.label}
            </span>
          </button>

          {/* Connector (except after last step) */}
          {index < steps.length - 1 && (
            <div className="w-3 sm:w-6 md:w-10 lg:w-14 h-0.5 bg-brand-gray-dark shrink-0 ml-1 sm:ml-2 md:ml-3" />
          )}
        </div>
      ))}
    </div>
  );
}
