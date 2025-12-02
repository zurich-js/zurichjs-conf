/**
 * Cart Steps Hook
 * Manages multi-step cart flow navigation
 * Handles step transitions based on cart state
 */

import { useState, useCallback, useMemo } from 'react';

export type CartStep = 'review' | 'attendees' | 'upsells' | 'checkout';

interface StepConfig {
  id: CartStep;
  label: string;
  isVisible: boolean;
}

interface UseCartStepsOptions {
  /** Whether attendee info collection is needed (multiple tickets) */
  needsAttendeeInfo: boolean;
  /** Whether workshop upsells should be shown */
  showWorkshopUpsells: boolean;
  /** Callback when step changes */
  onStepChange?: (step: CartStep) => void;
}

export interface UseCartStepsReturn {
  /** Current active step */
  currentStep: CartStep;
  /** Navigate to a specific step */
  goToStep: (step: CartStep) => void;
  /** Go to the next logical step from review */
  continueFromReview: () => void;
  /** Go to the next logical step from attendees */
  continueFromAttendees: () => void;
  /** Go to the next logical step from upsells */
  continueFromUpsells: () => void;
  /** Go back one step from checkout */
  goBackFromCheckout: () => void;
  /** Go back one step from upsells */
  goBackFromUpsells: () => void;
  /** List of visible steps for progress indicator */
  visibleSteps: StepConfig[];
  /** Get the step number for display */
  getStepNumber: (step: CartStep) => number;
}

/**
 * Hook for managing cart checkout flow steps
 * Centralizes navigation logic and determines step visibility
 */
export function useCartSteps(options: UseCartStepsOptions): UseCartStepsReturn {
  const { needsAttendeeInfo, showWorkshopUpsells, onStepChange } = options;

  const [currentStep, setCurrentStep] = useState<CartStep>('review');

  // Determine which steps are visible based on cart state
  const visibleSteps = useMemo<StepConfig[]>(() => {
    const steps: StepConfig[] = [
      { id: 'review', label: 'Tickets', isVisible: true },
      { id: 'attendees', label: 'Attendees', isVisible: needsAttendeeInfo },
      { id: 'upsells', label: 'Workshops', isVisible: showWorkshopUpsells },
      { id: 'checkout', label: 'Payment', isVisible: true },
    ];

    return steps.filter((step) => step.isVisible);
  }, [needsAttendeeInfo, showWorkshopUpsells]);

  // Get the display number for a step
  const getStepNumber = useCallback(
    (step: CartStep): number => {
      const index = visibleSteps.findIndex((s) => s.id === step);
      return index + 1;
    },
    [visibleSteps]
  );

  // Navigate to a specific step
  const goToStep = useCallback(
    (step: CartStep) => {
      setCurrentStep(step);
      onStepChange?.(step);
    },
    [onStepChange]
  );

  // Continue from review step
  const continueFromReview = useCallback(() => {
    if (needsAttendeeInfo) {
      goToStep('attendees');
    } else if (showWorkshopUpsells) {
      goToStep('upsells');
    } else {
      goToStep('checkout');
    }
  }, [needsAttendeeInfo, showWorkshopUpsells, goToStep]);

  // Continue from attendees step
  const continueFromAttendees = useCallback(() => {
    if (showWorkshopUpsells) {
      goToStep('upsells');
    } else {
      goToStep('checkout');
    }
  }, [showWorkshopUpsells, goToStep]);

  // Continue from upsells step
  const continueFromUpsells = useCallback(() => {
    goToStep('checkout');
  }, [goToStep]);

  // Go back from checkout
  const goBackFromCheckout = useCallback(() => {
    if (showWorkshopUpsells) {
      goToStep('upsells');
    } else if (needsAttendeeInfo) {
      goToStep('attendees');
    } else {
      goToStep('review');
    }
  }, [showWorkshopUpsells, needsAttendeeInfo, goToStep]);

  // Go back from upsells
  const goBackFromUpsells = useCallback(() => {
    if (needsAttendeeInfo) {
      goToStep('attendees');
    } else {
      goToStep('review');
    }
  }, [needsAttendeeInfo, goToStep]);

  return {
    currentStep,
    goToStep,
    continueFromReview,
    continueFromAttendees,
    continueFromUpsells,
    goBackFromCheckout,
    goBackFromUpsells,
    visibleSteps,
    getStepNumber,
  };
}

