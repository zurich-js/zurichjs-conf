/**
 * Platform Notification Analytics Events
 */

import type { BaseEventProperties } from './base'

/**
 * A platform notification was sent successfully
 */
export interface PlatformNotificationSentEvent {
  event: 'platform_notification_sent'
  properties: BaseEventProperties & {
    eventName: string
    destination: 'slack' | 'pushover'
  }
}

/**
 * A platform notification failed to send
 */
export interface PlatformNotificationFailedEvent {
  event: 'platform_notification_failed'
  properties: BaseEventProperties & {
    eventName: string
    destination: 'slack' | 'pushover'
    errorMessage: string
  }
}
