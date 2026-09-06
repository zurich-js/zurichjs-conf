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
  couponCode?: string | null
  discountAmount?: number
}

export interface WorkshopRegisteredData {
  workshopTitle: string
  quantity: number
  currency: string
  amount: number
  buyerName: string
  buyerEmail: string
  instructorName?: string | null
  couponCode?: string | null
  discountAmount?: number
}

export interface WorkshopOversoldData {
  workshopTitle: string
  workshopId: string
  sessionId: string
  seatIndex: number
  currency: string
  amount: number
  buyerName: string
  buyerEmail: string
  attendeeName: string
  attendeeEmail: string
  instructorName?: string | null
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

export interface TicketReassignedData {
  ticketId: string
  ticketType: string
  fromName: string
  fromEmail: string
  toName: string
  toEmail: string
  reassignedBy: 'admin' | 'owner'
}

export interface TicketCreationErrorData {
  sessionId: string
  buyerEmail: string
  ticketType: string
  failedCount: number
  totalCount: number
  errorMessage: string
}

export interface TicketWaitlistData {
  email: string
  /** Which sold-out ticket type the user joined the waitlist for */
  ticketType: 'student' | 'vip'
}

export interface WorkshopWaitlistData {
  email: string
  /** Which sold-out workshop the user joined the waitlist for */
  workshopTitle: string
  workshopId: string
}

export interface SpeakerLogisticsSubmittedData {
  speakerId: string
  speakerName: string
  speakerEmail: string
  /** Human-readable RSVP summary, e.g. "Warm-Up: yes · Dinner: yes (+1) · ..." */
  attendanceSummary: string
  dietaryRestrictions?: string | null
  adminUrl?: string
}

/** A door volunteer tapped Help. Everything the core team needs to walk over prepared. */
export interface DoorHelpRequestedData {
  staffName: string
  staffEmail: string
  staffRole: string
  /** Human label of the day being worked, e.g. "Conference day" */
  occasionLabel: string
  station?: string | null
  /**
   * Null when the code matched nobody. Then `scannedId` / `rawCode` are the
   * only leads and the message says so.
   */
  attendee: {
    name: string
    email: string | null
    company: string | null
    /** e.g. "VIP · conference · confirmed" */
    ticketSummary: string
    admissible: boolean
    refusalReason: string | null
    checkedInSummary: string
    badgeSummary: string
    goodieSummary: string
    workshops: string[]
    doorNote: string | null
    fromLookup: boolean
  } | null
  scannedId: string | null
  rawCode: string | null
  note?: string | null
}
