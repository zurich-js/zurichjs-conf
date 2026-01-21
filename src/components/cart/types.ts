/**
 * Cart Component Types
 * Shared types for cart step components
 */

import type { CartItem, Cart, OrderSummary, CheckoutFormData } from '@/types/cart';
import type { AttendeeInfo } from '@/lib/validations/checkout';
import type { TicketPlan } from '@/hooks/useTicketPricing';
import type { WorkshopVoucher } from '@/lib/queries/workshops';

export type CartStep = 'review' | 'attendees' | 'upsells' | 'checkout';

export interface CartStepProps {
  onNext: () => void;
  onBack?: () => void;
}

export interface ReviewStepProps extends CartStepProps {
  cart: Cart;
  orderSummary: OrderSummary;
  ticketItems: CartItem[];
  ticketPlans: TicketPlan[];
  isPartialDiscount: boolean;
  showVipUpsell: boolean;
  showTeamUpsell: boolean;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onApplyVoucher: (code: string) => Promise<{ success: boolean; error?: string }>;
  onRemoveVoucher: () => void;
  onUpgradeToVip: () => void;
  onTeamRequest: () => void;
}

export interface AttendeesStepProps extends CartStepProps {
  ticketItems: CartItem[];
  initialAttendees: AttendeeInfo[];
  onSubmit: (attendees: AttendeeInfo[]) => void;
}

export interface UpsellsStepProps extends CartStepProps {
  workshopVouchers: WorkshopVoucher[];
  bonusPercent: number;
  needsAttendeeInfo: boolean;
  onAddVoucher: (voucherId: string) => void;
  onSkip: () => void;
}

export interface CheckoutStepProps extends CartStepProps {
  cart: Cart;
  orderSummary: OrderSummary;
  attendees: AttendeeInfo[];
  isPartialDiscount: boolean;
  showWorkshopUpsells: boolean;
  needsAttendeeInfo: boolean;
  isSubmitting: boolean;
  error: Error | null;
  onRemove: (id: string) => void;
  onRemoveVoucher: () => void;
  onSubmit: (data: CheckoutFormData) => void;
  onEmailCaptured: (email: string) => void;
}

// Re-export for convenience
export type { CheckoutFormData } from '@/types/cart';
export type { AttendeeInfo } from '@/lib/validations/checkout';
export type { CartItem, Cart, OrderSummary };
