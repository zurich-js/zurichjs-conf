/**
 * PostHog Analytics Events
 *
 * This module defines all analytics events used throughout the application.
 * All events are type-safe and centralized for easy management and evolution.
 *
 * Event Naming Convention:
 * - Use snake_case for event names
 * - Follow pattern: {noun}_{verb} (e.g., "ticket_purchased", "checkout_started")
 * - Be specific and descriptive
 */

// Base types
export type {
  BaseEventProperties,
  UserProperties,
  TicketProperties,
  WorkshopProperties,
  PaymentProperties,
  RevenueProperties,
  CartProperties,
  ErrorProperties,
  PageViewedEvent,
  UserIdentifiedEvent,
} from './base';

// Ticket events
export type {
  TicketViewedEvent,
  TicketAddedToCartEvent,
  TicketRemovedFromCartEvent,
  CartQuantityUpdatedEvent,
  CartReviewedEvent,
  CartStepViewedEvent,
  TicketPurchasedEvent,
  TicketTransferredEvent,
  TicketValidatedEvent,
  TicketCheckedInEvent,
  TicketButtonClickedEvent,
} from './ticket-events';

// Workshop events
export type {
  WorkshopViewedEvent,
  WorkshopVoucherPurchasedEvent,
  WorkshopRegisteredEvent,
  WorkshopCancelledEvent,
  WorkshopVoucherAddedToCartEvent,
  WorkshopVoucherRemovedFromCartEvent,
  WorkshopUpsellViewedEvent,
  WorkshopUpsellSkippedEvent,
} from './workshop-events';

// Checkout events
export type {
  CheckoutStartedEvent,
  CheckoutCompletedEvent,
  CheckoutAbandonedEvent,
  CheckoutFormFieldFocusedEvent,
  CheckoutFormFieldBlurredEvent,
  CheckoutFormFieldCompletedEvent,
  CheckoutEmailCapturedEvent,
  VoucherAppliedEvent,
  VoucherRemovedEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
} from './checkout-events';

// User engagement events
export type {
  ButtonClickedEvent,
  FormSubmittedEvent,
  FormErrorEvent,
  LinkClickedEvent,
  SearchPerformedEvent,
  FilterAppliedEvent,
  ShareClickedEvent,
  NewsletterSubscribedEvent,
} from './user-events';

// System events
export type { ErrorOccurredEvent, ApiErrorEvent, WebhookReceivedEvent } from './system-events';

// CFP events
export type {
  CfpLoginRequestedEvent,
  CfpSpeakerAuthenticatedEvent,
  CfpSubmissionCreatedEvent,
  CfpSubmissionSubmittedEvent,
  CfpSubmissionWithdrawnEvent,
  CfpSubmissionStatusChangedEvent,
  CfpReviewerAuthenticatedEvent,
  CfpReviewSubmittedEvent,
} from './cfp-events';

// Email events
export type { CartAbandonmentEmailScheduledEvent, CartRecoveryClickedEvent } from './email-events';

// VIP events
export type {
  VipUpgradeInitiatedEvent,
  VipUpgradeCompletedEvent,
  VipUpgradePaymentConfirmedEvent,
} from './vip-events';

// Platform notification events
export type {
  PlatformNotificationSentEvent,
  PlatformNotificationFailedEvent,
} from './platform-notification-events';

// Discount events
export type {
  DiscountPopupShownEvent,
  DiscountPopupDismissedEvent,
  DiscountCodeCopiedEvent,
  DiscountWidgetClickedEvent,
  DiscountExpiredEvent,
  DiscountEligibilityCheckedEvent,
} from './discount-events';

// Easter egg events
export type {
  EasterEggShownEvent,
  EasterEggRewardCalledEvent,
  EasterEggAlreadyClaimedEvent,
  EasterEggClaimedEvent,
  EasterEggClaimFailedEvent,
} from './easter-egg-events';

// Import all event types for the union
import type { PageViewedEvent, UserIdentifiedEvent } from './base';
import type {
  TicketViewedEvent,
  TicketAddedToCartEvent,
  TicketRemovedFromCartEvent,
  CartQuantityUpdatedEvent,
  CartReviewedEvent,
  CartStepViewedEvent,
  TicketPurchasedEvent,
  TicketTransferredEvent,
  TicketValidatedEvent,
  TicketCheckedInEvent,
  TicketButtonClickedEvent,
} from './ticket-events';
import type {
  WorkshopViewedEvent,
  WorkshopVoucherPurchasedEvent,
  WorkshopRegisteredEvent,
  WorkshopCancelledEvent,
  WorkshopVoucherAddedToCartEvent,
  WorkshopVoucherRemovedFromCartEvent,
  WorkshopUpsellViewedEvent,
  WorkshopUpsellSkippedEvent,
} from './workshop-events';
import type {
  CheckoutStartedEvent,
  CheckoutCompletedEvent,
  CheckoutAbandonedEvent,
  CheckoutFormFieldFocusedEvent,
  CheckoutFormFieldBlurredEvent,
  CheckoutFormFieldCompletedEvent,
  CheckoutEmailCapturedEvent,
  VoucherAppliedEvent,
  VoucherRemovedEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
} from './checkout-events';
import type {
  ButtonClickedEvent,
  FormSubmittedEvent,
  FormErrorEvent,
  LinkClickedEvent,
  SearchPerformedEvent,
  FilterAppliedEvent,
  ShareClickedEvent,
  NewsletterSubscribedEvent,
} from './user-events';
import type { ErrorOccurredEvent, ApiErrorEvent, WebhookReceivedEvent } from './system-events';
import type {
  CfpLoginRequestedEvent,
  CfpSpeakerAuthenticatedEvent,
  CfpSubmissionCreatedEvent,
  CfpSubmissionSubmittedEvent,
  CfpSubmissionWithdrawnEvent,
  CfpSubmissionStatusChangedEvent,
  CfpReviewerAuthenticatedEvent,
  CfpReviewSubmittedEvent,
} from './cfp-events';
import type { CartAbandonmentEmailScheduledEvent, CartRecoveryClickedEvent } from './email-events';
import type {
  VipUpgradeInitiatedEvent,
  VipUpgradeCompletedEvent,
  VipUpgradePaymentConfirmedEvent,
} from './vip-events';
import type {
  PlatformNotificationSentEvent,
  PlatformNotificationFailedEvent,
} from './platform-notification-events';
import type {
  DiscountPopupShownEvent,
  DiscountPopupDismissedEvent,
  DiscountCodeCopiedEvent,
  DiscountWidgetClickedEvent,
  DiscountExpiredEvent,
  DiscountEligibilityCheckedEvent,
} from './discount-events';
import type {
  EasterEggShownEvent,
  EasterEggRewardCalledEvent,
  EasterEggAlreadyClaimedEvent,
  EasterEggClaimedEvent,
  EasterEggClaimFailedEvent,
} from './easter-egg-events';

/**
 * Union of all possible analytics events.
 * This provides full type safety when tracking events.
 */
export type AnalyticsEvent =
  | PageViewedEvent
  | UserIdentifiedEvent
  | TicketViewedEvent
  | TicketAddedToCartEvent
  | TicketRemovedFromCartEvent
  | TicketPurchasedEvent
  | TicketTransferredEvent
  | TicketValidatedEvent
  | TicketCheckedInEvent
  | TicketButtonClickedEvent
  | CartQuantityUpdatedEvent
  | CartReviewedEvent
  | CartStepViewedEvent
  | WorkshopViewedEvent
  | WorkshopVoucherPurchasedEvent
  | WorkshopRegisteredEvent
  | WorkshopCancelledEvent
  | WorkshopVoucherAddedToCartEvent
  | WorkshopVoucherRemovedFromCartEvent
  | WorkshopUpsellViewedEvent
  | WorkshopUpsellSkippedEvent
  | CheckoutStartedEvent
  | CheckoutCompletedEvent
  | CheckoutAbandonedEvent
  | CheckoutFormFieldFocusedEvent
  | CheckoutFormFieldBlurredEvent
  | CheckoutFormFieldCompletedEvent
  | CheckoutEmailCapturedEvent
  | VoucherAppliedEvent
  | VoucherRemovedEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | ButtonClickedEvent
  | FormSubmittedEvent
  | FormErrorEvent
  | LinkClickedEvent
  | SearchPerformedEvent
  | FilterAppliedEvent
  | ShareClickedEvent
  | NewsletterSubscribedEvent
  | ErrorOccurredEvent
  | ApiErrorEvent
  | WebhookReceivedEvent
  | CartAbandonmentEmailScheduledEvent
  | CartRecoveryClickedEvent
  | CfpLoginRequestedEvent
  | CfpSpeakerAuthenticatedEvent
  | CfpSubmissionCreatedEvent
  | CfpSubmissionSubmittedEvent
  | CfpSubmissionWithdrawnEvent
  | CfpSubmissionStatusChangedEvent
  | CfpReviewerAuthenticatedEvent
  | CfpReviewSubmittedEvent
  | VipUpgradeInitiatedEvent
  | VipUpgradeCompletedEvent
  | VipUpgradePaymentConfirmedEvent
  | PlatformNotificationSentEvent
  | PlatformNotificationFailedEvent
  | DiscountPopupShownEvent
  | DiscountPopupDismissedEvent
  | DiscountCodeCopiedEvent
  | DiscountWidgetClickedEvent
  | DiscountExpiredEvent
  | DiscountEligibilityCheckedEvent
  | EasterEggShownEvent
  | EasterEggRewardCalledEvent
  | EasterEggAlreadyClaimedEvent
  | EasterEggClaimedEvent
  | EasterEggClaimFailedEvent;

/**
 * Extract event name from AnalyticsEvent
 */
export type EventName = AnalyticsEvent['event'];

/**
 * Extract properties for a specific event
 */
export type EventProperties<T extends EventName> = Extract<AnalyticsEvent, { event: T }>['properties'];
