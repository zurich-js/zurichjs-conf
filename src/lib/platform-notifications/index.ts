/**
 * Platform Notifications
 *
 * Simple fire-and-forget Slack notifications for platform events.
 * All functions are safe to call anywhere - they never throw.
 *
 * @example
 * import { notifyCfpTalkSubmitted } from '@/lib/platform-notifications'
 *
 * notifyCfpTalkSubmitted({
 *   speakerId: 'speaker_123',
 *   speakerName: 'Jane Doe',
 *   speakerEmail: 'jane@example.com',
 *   talkId: 'talk_456',
 *   talkTitle: 'Building Scalable Systems',
 *   talkReviewUrl: 'https://admin.example.com/cfp/talks/456',
 * })
 */

export type {
  CfpSpeakerProfileCreatedData,
  CfpSpeakerProfileCompletedData,
  CfpTalkSubmittedData,
  TicketPurchasedData,
  CartAbandonmentData,
  StatusVerificationData,
  SponsorInterestData,
  CfpReviewSubmittedData,
  CfpEmailScheduledData,
} from './types'

export {
  notifyCfpSpeakerProfileCreated,
  notifyCfpSpeakerProfileCompleted,
  notifyCfpTalkSubmitted,
  notifyTicketPurchased,
  notifyCartAbandonment,
  notifyStatusVerification,
  notifySponsorInterest,
  notifyCfpReviewSubmitted,
  notifyCfpEmailScheduled,
} from './send'
