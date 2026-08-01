/**
 * Ticket Waitlist Modal
 * Config-driven modal for sold-out ticket types. Explains the ticket type and,
 * when sold out, collects emails so users can be notified when tickets return.
 * Used for both student/unemployed (sponsor-funded waves) and VIP tickets.
 *
 * Thin wrapper over the generic `WaitlistModal` — it only pins the endpoint and
 * the `type` field the ticket waitlist API expects.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { TicketWaitlistType } from '@/lib/email';
import { WaitlistModal } from './WaitlistModal';

/**
 * Static content describing a single ticket waitlist type.
 */
export interface TicketWaitlistModalConfig {
  /** Waitlist type sent to the API / Resend audience */
  waitlistType: TicketWaitlistType;
  /** Header icon (lucide) */
  icon: LucideIcon;
  /** Modal title */
  title: string;
  /** Intro paragraph explaining the ticket type */
  description: string;
  /** Optional "how it works" section, always shown when provided */
  infoSection?: {
    heading: string;
    steps: string[];
  };
  /** Copy shown in the sold-out callout above the subscribe form */
  soldOut: {
    heading: string;
    body: string;
  };
  /** Label above the email input */
  notifyLabel: string;
  /** Confirmation message after a successful subscription */
  successMessage: string;
}

export interface TicketWaitlistModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Whether tickets are currently sold out */
  isSoldOut: boolean;
  /** Content + waitlist type for this ticket */
  config: TicketWaitlistModalConfig;
}

/**
 * TicketWaitlistModal component
 * Explains a ticket type and collects emails for notifications when sold out
 */
export const TicketWaitlistModal: React.FC<TicketWaitlistModalProps> = ({
  isOpen,
  onClose,
  isSoldOut,
  config,
}) => (
  <WaitlistModal
    isOpen={isOpen}
    onClose={onClose}
    isSoldOut={isSoldOut}
    config={{
      id: config.waitlistType,
      endpoint: '/api/tickets/waitlist',
      payload: { type: config.waitlistType },
      icon: config.icon,
      title: config.title,
      description: config.description,
      infoSection: config.infoSection,
      soldOut: config.soldOut,
      notifyLabel: config.notifyLabel,
      successMessage: config.successMessage,
    }}
  />
);
