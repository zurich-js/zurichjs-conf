/**
 * VIP Upgrade Analytics Events
 * Events related to VIP ticket upgrades
 */

import type { BaseEventProperties } from './base';

export interface VipUpgradeInitiatedEvent {
  event: 'vip_upgrade_initiated';
  properties: BaseEventProperties & {
    ticket_id: string;
    upgrade_id: string;
    from_tier: string;
    to_tier: string;
    upgrade_mode: 'complimentary' | 'bank_transfer' | 'stripe';
    upgrade_status: string;
    amount?: number;
    currency?: string;
    email_sent: boolean;
  };
}

export interface VipUpgradeCompletedEvent {
  event: 'vip_upgrade_completed';
  properties: BaseEventProperties & {
    ticket_id: string;
    upgrade_id: string;
    upgrade_mode: 'complimentary' | 'bank_transfer' | 'stripe';
    amount?: number | null;
    currency?: string | null;
    previous_tier: string;
  };
}

export interface VipUpgradePaymentConfirmedEvent {
  event: 'vip_upgrade_payment_confirmed';
  properties: BaseEventProperties & {
    ticket_id: string;
    upgrade_id: string;
    upgrade_mode: 'bank_transfer';
    amount?: number | null;
    currency?: string | null;
    payment_reference?: string | null;
  };
}
