/**
 * useFormFieldTracking Hook
 * 
 * Tracks user interactions with form fields for analytics.
 * Monitors focus, blur, completion, and provides comprehensive field-level insights.
 */

import { useRef, useCallback, useState } from 'react';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';

type CartStep = 'review' | 'attendees' | 'upsells' | 'checkout';

interface FieldTracking {
  name: string;
  type: string;
  focusTime?: number;
  touched: boolean;
  completed: boolean;
}

interface UseFormFieldTrackingOptions {
  currentStep: CartStep;
  cartData?: {
    cart_item_count: number;
    cart_total_amount: number;
    cart_currency: string;
    cart_items: Array<{
      type: 'ticket' | 'workshop_voucher';
      category?: string;
      stage?: string;
      quantity: number;
      price: number;
    }>;
  };
  onEmailCaptured?: (email: string) => void;
}

export const useFormFieldTracking = (options: UseFormFieldTrackingOptions) => {
  const { currentStep, cartData, onEmailCaptured } = options;
  const [fieldsState, setFieldsState] = useState<Map<string, FieldTracking>>(new Map());
  const [emailCaptured, setEmailCaptured] = useState(false);
  const sessionStartTime = useRef<number>(Date.now());

  /**
   * Capture email for cart abandonment recovery
   */
  const captureEmail = useCallback((email: string) => {
    if (!emailCaptured && email.includes('@')) {
      setEmailCaptured(true);

      const timeToEmail = (Date.now() - sessionStartTime.current) / 1000;

      // Identify the user in PostHog
      analytics.identify(email, {
        email: email,
      });

      // Track the email capture event
      if (cartData) {
        analytics.track('checkout_email_captured', {
          email: email,
          step: currentStep,
          time_to_email_seconds: timeToEmail,
          cart_item_count: cartData.cart_item_count,
          cart_total_amount: cartData.cart_total_amount,
          cart_currency: cartData.cart_currency,
          cart_items: cartData.cart_items,
        } as EventProperties<'checkout_email_captured'>);
      }

      // Call optional callback
      if (onEmailCaptured) {
        onEmailCaptured(email);
      }
    }
  }, [emailCaptured, currentStep, cartData, onEmailCaptured]);

  /**
   * Track field focus event
   */
  const trackFieldFocus = useCallback((fieldName: string, fieldType: string) => {
    const now = Date.now();

    setFieldsState(prev => {
      const newState = new Map(prev);
      newState.set(fieldName, {
        name: fieldName,
        type: fieldType,
        focusTime: now,
        touched: true,
        completed: prev.get(fieldName)?.completed || false,
      });
      return newState;
    });

    analytics.track('checkout_form_field_focused', {
      field_name: fieldName,
      field_type: fieldType,
      step: currentStep,
    } as EventProperties<'checkout_form_field_focused'>);
  }, [currentStep]);

  /**
   * Track field blur event
   */
  const trackFieldBlur = useCallback((fieldName: string, fieldType: string, value: string) => {
    const now = Date.now();
    const fieldState = fieldsState.get(fieldName);
    const focusTime = fieldState?.focusTime;
    const timeSpent = focusTime ? (now - focusTime) / 1000 : undefined;
    const isFilled = value.trim().length > 0;

    setFieldsState(prev => {
      const newState = new Map(prev);
      const existing = newState.get(fieldName);
      if (existing) {
        existing.completed = isFilled;
      }
      return newState;
    });

    analytics.track('checkout_form_field_blurred', {
      field_name: fieldName,
      field_type: fieldType,
      field_filled: isFilled,
      time_spent_seconds: timeSpent,
      step: currentStep,
    } as EventProperties<'checkout_form_field_blurred'>);

    // If this is the email field and it's filled, capture it
    if (fieldName === 'email' && isFilled && !emailCaptured && value.includes('@')) {
      captureEmail(value);
    }
  }, [currentStep, fieldsState, emailCaptured, captureEmail]);

  /**
   * Track field completion (when field is successfully filled)
   */
  const trackFieldCompleted = useCallback((fieldName: string, fieldType: string) => {
    analytics.track('checkout_form_field_completed', {
      field_name: fieldName,
      field_type: fieldType,
      step: currentStep,
    } as EventProperties<'checkout_form_field_completed'>);
  }, [currentStep]);

  /**
   * Get tracking stats for abandonment event
   */
  const getTrackingStats = useCallback(() => {
    const fields = Array.from(fieldsState.values());
    const touchedFields = fields.filter(f => f.touched).map(f => f.name);
    const completedFields = fields.filter(f => f.completed).map(f => f.name);
    const lastInteracted = fields.length > 0 ? fields[fields.length - 1].name : undefined;
    const completionPercent = fields.length > 0 
      ? Math.round((completedFields.length / fields.length) * 100)
      : 0;

    return {
      fields_touched: touchedFields,
      fields_completed: completedFields,
      last_field_interacted: lastInteracted,
      form_completion_percent: completionPercent,
      time_spent_seconds: (Date.now() - sessionStartTime.current) / 1000,
    };
  }, [fieldsState]);

  return {
    trackFieldFocus,
    trackFieldBlur,
    trackFieldCompleted,
    captureEmail,
    getTrackingStats,
    emailCaptured,
  };
};

