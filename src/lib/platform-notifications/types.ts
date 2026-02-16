/**
 * Platform Notifications - Types
 */

// Event metadata types
export interface CfpSpeakerProfileCreatedData {
  speakerId: string
  speakerName: string
  speakerEmail: string
  profileUrl?: string
}

export interface CfpSpeakerProfileCompletedData {
  speakerId: string
  speakerName: string
  speakerEmail: string
  fieldsCompleted?: number
  profileUrl?: string
}

export interface CfpTalkSubmittedData {
  speakerId: string
  speakerName: string
  speakerEmail: string
  talkId: string
  talkTitle: string
  track?: string
  talkReviewUrl?: string
}

export interface TicketPurchasedData {
  orderId: string
  ticketType: string
  quantity: number
  currency: string
  amount: number
  buyerName: string
  buyerEmail: string
  orderAdminUrl?: string
}

export interface CartAbandonmentData {
  cartId?: string
  buyerEmail?: string
  itemsSummary: string
  currency: string
  amount: number
}

export interface StatusVerificationData {
  submissionId: string
  name: string
  email: string
  statusType: 'student' | 'unemployed'
  adminReviewUrl?: string
}

export interface SponsorInterestData {
  submissionId: string
  companyName: string
  contactName: string
  email: string
  budgetRange?: string
  adminCrmUrl?: string
}

export interface CfpReviewSubmittedData {
  reviewId: string
  reviewerId: string
  reviewerName: string
  talkId: string
  talkTitle: string
  score?: number
  talkReviewUrl?: string
}

export interface CfpEmailScheduledData {
  submissionId: string
  emailType: 'acceptance' | 'rejection'
  speakerName: string
  speakerEmail: string
  talkTitle: string
  scheduledFor: string
  hasCoupon?: boolean
  couponDiscountPercent?: number
}

export interface CfpFeedbackRequestedData {
  submissionId: string
  speakerName: string
  speakerEmail: string
  talkTitle: string
}
