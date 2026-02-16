/**
 * Platform Notifications - Send to Slack
 *
 * Simple notification system that sends formatted messages to Slack.
 * All functions are fire-and-forget and never throw.
 */

import { logger } from '@/lib/logger'
import { serverAnalytics } from '@/lib/analytics/server'
import type {
  CfpSpeakerProfileCreatedData,
  CfpSpeakerProfileCompletedData,
  CfpTalkSubmittedData,
  TicketPurchasedData,
  CartAbandonmentData,
  StatusVerificationData,
  SponsorInterestData,
  CfpReviewSubmittedData,
  CfpEmailScheduledData,
  CfpFeedbackRequestedData,
} from './types'

const log = logger.scope('PlatformNotifications')

const SLACK_CHANNEL = '#zurichjs-conf-platform-notifications'

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-CH', {
    style: 'currency',
    currency,
  }).format(amount / 100)
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 3) + '...' : str
}

// =============================================================================
// Slack Sender
// =============================================================================

async function sendToSlack(text: string, blocks?: unknown[]): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    log.debug('SLACK_BOT_TOKEN not configured, skipping notification')
    return
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text,
      blocks,
      unfurl_links: false,
    }),
  })

  const result = await response.json()
  if (!result.ok) {
    throw new Error(`Slack API: ${result.error}`)
  }
}

function buildBlocks(
  header: string,
  fields: Array<{ label: string; value: string }>,
  linkUrl?: string,
  linkText?: string
) {
  const blocks: unknown[] = [
    { type: 'section', text: { type: 'mrkdwn', text: header } },
    { type: 'divider' },
    {
      type: 'section',
      fields: fields.map((f) => ({
        type: 'mrkdwn',
        text: `*${f.label}:*\n${f.value}`,
      })),
    },
  ]

  if (linkUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: linkText || 'View', emoji: true },
          url: linkUrl,
          action_id: 'view_link',
        },
      ],
    })
  }

  return blocks
}

// Wrapper that never throws
async function safeSend(
  eventName: string,
  text: string,
  blocks?: unknown[]
): Promise<void> {
  try {
    await sendToSlack(text, blocks)
    log.info('Notification sent', { eventName })
    void serverAnalytics.track('platform_notification_sent', 'system', {
      eventName,
      destination: 'slack',
    })
  } catch (error) {
    log.error('Notification failed', error instanceof Error ? error : null, {
      eventName,
      severity: 'low',
      type: 'network',
    })
    void serverAnalytics.track('platform_notification_failed', 'system', {
      eventName,
      destination: 'slack',
      errorMessage: error instanceof Error ? error.message : 'Unknown',
    })
  }
}

// =============================================================================
// Event-Specific Helpers (Fire and Forget)
// =============================================================================

export function notifyCfpSpeakerProfileCreated(data: CfpSpeakerProfileCreatedData): void {
  const text = `New speaker profile: ${data.speakerName}`
  const blocks = buildBlocks(
    ':bust_in_silhouette: *New Speaker Profile*',
    [
      { label: 'Name', value: data.speakerName },
      { label: 'Email', value: data.speakerEmail },
    ],
    data.profileUrl,
    'View Profile'
  )
  void safeSend('cfp_speaker_profile_created', text, blocks)
}

export function notifyCfpSpeakerProfileCompleted(data: CfpSpeakerProfileCompletedData): void {
  const text = `Speaker profile completed: ${data.speakerName}`
  const fields = [
    { label: 'Name', value: data.speakerName },
    { label: 'Email', value: data.speakerEmail },
  ]
  if (data.fieldsCompleted !== undefined) {
    fields.push({ label: 'Fields', value: String(data.fieldsCompleted) })
  }
  const blocks = buildBlocks(':white_check_mark: *Profile Completed*', fields, data.profileUrl, 'View')
  void safeSend('cfp_speaker_profile_completed', text, blocks)
}

export function notifyCfpTalkSubmitted(data: CfpTalkSubmittedData): void {
  const title = truncate(data.talkTitle, 80)
  const text = `New talk: "${title}" by ${data.speakerName}`
  const fields = [
    { label: 'Talk', value: title },
    { label: 'Speaker', value: data.speakerName },
    { label: 'Email', value: data.speakerEmail },
  ]
  if (data.track) {
    fields.push({ label: 'Track', value: data.track })
  }
  const blocks = buildBlocks(':microphone: *New Talk Submitted*', fields, data.talkReviewUrl, 'Review')
  void safeSend('cfp_talk_submitted', text, blocks)
}

export function notifyTicketPurchased(data: TicketPurchasedData): void {
  const amount = formatCurrency(data.amount, data.currency)
  const text = `Ticket: ${data.quantity}x ${data.ticketType} (${amount})`
  const blocks = buildBlocks(
    ':ticket: *Ticket Purchased*',
    [
      { label: 'Buyer', value: data.buyerName },
      { label: 'Email', value: data.buyerEmail },
      { label: 'Type', value: data.ticketType },
      { label: 'Qty', value: String(data.quantity) },
      { label: 'Amount', value: amount },
    ],
    data.orderAdminUrl,
    'View Order'
  )
  void safeSend('ticket_purchased', text, blocks)
}

export function notifyCartAbandonment(data: CartAbandonmentData): void {
  const amount = formatCurrency(data.amount, data.currency)
  const text = `Cart abandonment email sent: ${amount}`
  const fields = [
    { label: 'Items', value: truncate(data.itemsSummary, 60) },
    { label: 'Value', value: amount },
  ]
  if (data.buyerEmail) {
    fields.push({ label: 'Email', value: data.buyerEmail })
  }
  const blocks = buildBlocks(':shopping_cart: *Cart Abandonment Email Sent*', fields)
  void safeSend('cart_abandonment_notification_sent', text, blocks)
}

export function notifyStatusVerification(data: StatusVerificationData): void {
  const type = data.statusType === 'student' ? 'Student' : 'Unemployed'
  const text = `${type} verification: ${data.name}`
  const blocks = buildBlocks(
    `:mortar_board: *${type} Verification Request*`,
    [
      { label: 'Name', value: data.name },
      { label: 'Email', value: data.email },
      { label: 'Type', value: type },
    ],
    data.adminReviewUrl,
    'Review'
  )
  void safeSend('status_verification_submitted', text, blocks)
}

export function notifySponsorInterest(data: SponsorInterestData): void {
  const text = `Sponsor interest: ${data.companyName}`
  const fields = [
    { label: 'Company', value: data.companyName },
    { label: 'Contact', value: data.contactName },
    { label: 'Email', value: data.email },
  ]
  if (data.budgetRange) {
    fields.push({ label: 'Budget', value: data.budgetRange })
  }
  const blocks = buildBlocks(':moneybag: *Sponsor Interest*', fields, data.adminCrmUrl, 'View in CRM')
  void safeSend('sponsor_interest_submitted', text, blocks)
}

export function notifyCfpReviewSubmitted(data: CfpReviewSubmittedData): void {
  const title = truncate(data.talkTitle, 60)
  const text = `Review: "${title}" by ${data.reviewerName}`
  const fields = [
    { label: 'Reviewer', value: data.reviewerName },
    { label: 'Talk', value: title },
  ]
  if (data.score !== undefined) {
    fields.push({ label: 'Score', value: String(data.score) })
  }
  const blocks = buildBlocks(':memo: *CFP Review Submitted*', fields, data.talkReviewUrl, 'View')
  void safeSend('cfp_review_submitted', text, blocks)
}

export function notifyCfpEmailScheduled(data: CfpEmailScheduledData): void {
  const title = truncate(data.talkTitle, 60)
  const isAcceptance = data.emailType === 'acceptance'
  const emoji = isAcceptance ? ':white_check_mark:' : ':x:'
  const emailTypeLabel = isAcceptance ? 'Acceptance' : 'Rejection'

  const sendTime = new Date(data.scheduledFor).toLocaleString('en-CH', {
    timeZone: 'Europe/Zurich',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const text = `${emailTypeLabel} email scheduled for "${title}"`
  const fields = [
    { label: 'Speaker', value: data.speakerName },
    { label: 'Email', value: data.speakerEmail },
    { label: 'Talk', value: title },
    { label: 'Will send at', value: sendTime },
  ]

  if (data.hasCoupon && data.couponDiscountPercent) {
    fields.push({ label: 'Coupon', value: `${data.couponDiscountPercent}% off` })
  }

  const blocks = buildBlocks(`${emoji} *${emailTypeLabel} Email Scheduled*`, fields)
  void safeSend('cfp_email_scheduled', text, blocks)
}

export function notifyCfpFeedbackRequested(data: CfpFeedbackRequestedData): void {
  const title = truncate(data.talkTitle, 80)
  const text = `Feedback requested: "${title}" by ${data.speakerName}`
  const blocks = buildBlocks(
    ':speech_balloon: *Speaker Feedback Requested*',
    [
      { label: 'Speaker', value: data.speakerName },
      { label: 'Email', value: data.speakerEmail },
      { label: 'Talk', value: title },
    ]
  )
  void safeSend('cfp_feedback_requested', text, blocks)
}
