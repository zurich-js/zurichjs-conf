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
  CartCreatedEvent,
  CartReviewedEvent,
  CartStepViewedEvent,
  TicketPurchasedEvent,
  TicketTransferredEvent,
  TicketValidatedEvent,
  TicketCheckedInEvent,
  TicketButtonClickedEvent,
  TicketCtaIntent,
} from './ticket-events';

// Workshop events
export type {
  WorkshopViewedEvent,
  WorkshopRegisteredEvent,
  WorkshopCancelledEvent,
  WorkshopAddedToCartEvent,
  WorkshopRemovedFromCartEvent,
} from './workshop-events';

// Speaker events
export type { SpeakerViewedEvent } from './speaker-events';

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
  VoucherApplyFailedEvent,
  VoucherRemovedEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  PaymentStepViewedEvent,
  PaymentSubmittedEvent,
} from './checkout-events';

// User engagement events
export type {
  ButtonClickedEvent,
  FormSubmittedEvent,
  FormErrorEvent,
  NamespaceStudentSponsorshipEmailCapturedEvent,
  LinkClickedEvent,
  SearchPerformedEvent,
  FilterAppliedEvent,
  ScheduleTabChangedEvent,
  ShareClickedEvent,
  NewsletterSubscribedEvent,
  FaqOpenedEvent,
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
export type {
  CartAbandonmentEmailScheduledEvent,
  CartRecoveryClickedEvent,
  CartSaveOpenedEvent,
  CartSavedEvent,
  CartSaveFailedEvent,
} from './email-events';

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
  DiscountEmailCapturedEvent,
  DiscountEligibilityCheckedEvent,
  CorporateAccessLinkOpenedEvent,
} from './discount-events';

// Easter egg events
export type {
  EasterEggShownEvent,
  EasterEggRewardCalledEvent,
  EasterEggAlreadyClaimedEvent,
  EasterEggClaimedEvent,
  EasterEggClaimFailedEvent,
} from './easter-egg-events';

// Tech stack events
export type { TechStackDetectedEvent } from './tech-stack-events';

// Sponsorship events
export type { SponsorClickedEvent, CommunityPartnerClickedEvent } from './sponsorship-events';

// Speaker guide events
export type {
  SpeakerGuideChatBannerClickedEvent,
  SpeakerGuideQuicklinkClickedEvent,
  SpeakerGuideTocClickedEvent,
  SpeakerGuideQuestionAskedEvent,
  SpeakerGuideAnswerSourceClickedEvent,
  SpeakerGuideChatResetEvent,
  SpeakerGuideHowItWorksOpenedEvent,
} from './speaker-guide-events';

// Import all event types for the union
import type { PageViewedEvent, UserIdentifiedEvent } from './base';
import type {
  TicketViewedEvent,
  TicketAddedToCartEvent,
  TicketRemovedFromCartEvent,
  CartQuantityUpdatedEvent,
  CartCreatedEvent,
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
  WorkshopRegisteredEvent,
  WorkshopCancelledEvent,
  WorkshopAddedToCartEvent,
  WorkshopRemovedFromCartEvent,
} from './workshop-events';
import type { SpeakerViewedEvent } from './speaker-events';
import type {
  CheckoutStartedEvent,
  CheckoutCompletedEvent,
  CheckoutAbandonedEvent,
  CheckoutFormFieldFocusedEvent,
  CheckoutFormFieldBlurredEvent,
  CheckoutFormFieldCompletedEvent,
  CheckoutEmailCapturedEvent,
  VoucherAppliedEvent,
  VoucherApplyFailedEvent,
  VoucherRemovedEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  PaymentStepViewedEvent,
  PaymentSubmittedEvent,
} from './checkout-events';
import type {
  ButtonClickedEvent,
  FormSubmittedEvent,
  FormErrorEvent,
  NamespaceStudentSponsorshipEmailCapturedEvent,
  LinkClickedEvent,
  SearchPerformedEvent,
  FilterAppliedEvent,
  ScheduleTabChangedEvent,
  ShareClickedEvent,
  NewsletterSubscribedEvent,
  FaqOpenedEvent,
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
import type {
  CartAbandonmentEmailScheduledEvent,
  CartRecoveryClickedEvent,
  CartSaveOpenedEvent,
  CartSavedEvent,
  CartSaveFailedEvent,
} from './email-events';
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
  DiscountEmailCapturedEvent,
  DiscountEligibilityCheckedEvent,
  CorporateAccessLinkOpenedEvent,
} from './discount-events';
import type {
  EasterEggShownEvent,
  EasterEggRewardCalledEvent,
  EasterEggAlreadyClaimedEvent,
  EasterEggClaimedEvent,
  EasterEggClaimFailedEvent,
} from './easter-egg-events';
import type { TechStackDetectedEvent } from './tech-stack-events';
import type { SponsorClickedEvent, CommunityPartnerClickedEvent, SponsorQuoteViewedEvent } from './sponsorship-events';
import type {
  SpeakerGuideChatBannerClickedEvent,
  SpeakerGuideQuicklinkClickedEvent,
  SpeakerGuideTocClickedEvent,
  SpeakerGuideQuestionAskedEvent,
  SpeakerGuideAnswerSourceClickedEvent,
  SpeakerGuideChatResetEvent,
  SpeakerGuideHowItWorksOpenedEvent,
} from './speaker-guide-events';

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
  | CartCreatedEvent
  | CartReviewedEvent
  | CartStepViewedEvent
  | WorkshopViewedEvent
  | WorkshopRegisteredEvent
  | WorkshopCancelledEvent
  | WorkshopAddedToCartEvent
  | WorkshopRemovedFromCartEvent
  | SpeakerViewedEvent
  | CheckoutStartedEvent
  | CheckoutCompletedEvent
  | CheckoutAbandonedEvent
  | CheckoutFormFieldFocusedEvent
  | CheckoutFormFieldBlurredEvent
  | CheckoutFormFieldCompletedEvent
  | CheckoutEmailCapturedEvent
  | VoucherAppliedEvent
  | VoucherApplyFailedEvent
  | VoucherRemovedEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentStepViewedEvent
  | PaymentSubmittedEvent
  | ButtonClickedEvent
  | FormSubmittedEvent
  | FormErrorEvent
  | NamespaceStudentSponsorshipEmailCapturedEvent
  | LinkClickedEvent
  | SearchPerformedEvent
  | FilterAppliedEvent
  | ScheduleTabChangedEvent
  | ShareClickedEvent
  | NewsletterSubscribedEvent
  | FaqOpenedEvent
  | ErrorOccurredEvent
  | ApiErrorEvent
  | WebhookReceivedEvent
  | CartAbandonmentEmailScheduledEvent
  | CartRecoveryClickedEvent
  | CartSaveOpenedEvent
  | CartSavedEvent
  | CartSaveFailedEvent
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
  | DiscountEmailCapturedEvent
  | DiscountEligibilityCheckedEvent
  | CorporateAccessLinkOpenedEvent
  | EasterEggShownEvent
  | EasterEggRewardCalledEvent
  | EasterEggAlreadyClaimedEvent
  | EasterEggClaimedEvent
  | EasterEggClaimFailedEvent
  | TechStackDetectedEvent
  | SponsorClickedEvent
  | CommunityPartnerClickedEvent
  | SponsorQuoteViewedEvent
  | SpeakerGuideChatBannerClickedEvent
  | SpeakerGuideQuicklinkClickedEvent
  | SpeakerGuideTocClickedEvent
  | SpeakerGuideQuestionAskedEvent
  | SpeakerGuideAnswerSourceClickedEvent
  | SpeakerGuideChatResetEvent
  | SpeakerGuideHowItWorksOpenedEvent;

/**
 * Extract event name from AnalyticsEvent
 */
export type EventName = AnalyticsEvent['event'];

/**
 * Extract properties for a specific event
 */
export type EventProperties<T extends EventName> = Extract<AnalyticsEvent, { event: T }>['properties'];
