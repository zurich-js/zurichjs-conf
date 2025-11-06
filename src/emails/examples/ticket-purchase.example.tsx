/**
 * Example: Ticket Purchase Email
 * Sample data for development and testing
 */

import * as React from 'react';
import { TicketPurchaseEmail } from '../templates/TicketPurchaseEmail';
import type { TicketPurchaseEmailProps } from '../templates/TicketPurchaseEmail';

/**
 * Sample payload matching production data structure
 */
export const sampleTicketData: TicketPurchaseEmailProps = {
  // Personal info
  firstName: 'Max',
  fullName: 'Max Mustermann',
  email: 'email@domain.com',

  // Event info
  eventName: 'Zurich JS Conf 2026',
  edition: 'ZJS2026',
  tierLabel: 'Standard Ticket',
  badgeLabel: 'Early bird',

  // Venue info
  venueName: 'Technopark Zürich',
  venueAddress: 'Technoparkstrasse 1,\n8005 Zürich',

  // Date/time info
  dateLabel: 'September 11, 2026',
  timeLabel: '09:00 – 17:00',
  tz: 'CEST',

  // Ticket details
  ticketId: 'ZJS2026-12345',

  // Assets (use placeholder URLs for development)
  qrSrc: 'https://placehold.co/288x288/F1E271/19191B?text=QR',
  qrAlt: 'QR code for ticket ZJS2026-12345',
  logoSrc: 'https://placehold.co/96x96/258BCC/FFFFFF?text=ZJS',
  logoAlt: 'ZurichJS Conference',

  // Wallet integration
  appleWalletUrl: 'https://conf.zurichjs.com/wallet/apple/ZJS2026-12345',
  googleWalletUrl: 'https://conf.zurichjs.com/wallet/google/ZJS2026-12345',

  // Additional links
  orderUrl: 'https://conf.zurichjs.com/orders/ZJS2026-12345',
  calendarUrl: 'https://conf.zurichjs.com/calendar/add',
  venueMapUrl: 'https://maps.google.com/?q=Technoparkstrasse+1+8005+Zurich',
  refundPolicyUrl: 'https://conf.zurichjs.com/refund-policy',
  supportEmail: 'tickets@zurichjs.com',

  // Optional notes
  notes: undefined,
};

/**
 * Example with VIP ticket and notes
 */
export const sampleVIPTicketData: TicketPurchaseEmailProps = {
  ...sampleTicketData,
  firstName: 'Sarah',
  fullName: 'Sarah Johnson',
  email: 'sarah.johnson@example.com',
  tierLabel: 'VIP Ticket',
  badgeLabel: undefined,
  ticketId: 'ZJS2026-VIP-789',
  notes: 'Your VIP ticket includes access to select speaker activities and the exclusive after-party. Check your email for details closer to the event.',
};

/**
 * Example with Student ticket
 */
export const sampleStudentTicketData: TicketPurchaseEmailProps = {
  ...sampleTicketData,
  firstName: 'Alex',
  fullName: 'Alex Chen',
  email: 'alex.chen@student.edu',
  tierLabel: 'Student Ticket',
  ticketId: 'ZJS2026-STU-456',
  notes: 'Please bring your valid student ID to the event for verification.',
};

/**
 * Default export for email preview tools
 */
export default function TicketPurchaseEmailExample() {
  return <TicketPurchaseEmail {...sampleTicketData} />;
}

/**
 * Named exports for different variations
 */
export function VIPTicketExample() {
  return <TicketPurchaseEmail {...sampleVIPTicketData} />;
}

export function StudentTicketExample() {
  return <TicketPurchaseEmail {...sampleStudentTicketData} />;
}
