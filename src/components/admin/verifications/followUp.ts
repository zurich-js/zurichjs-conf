/**
 * Follow-up email helper for approved verifications without a ticket purchase
 */

import type { VerificationWithTicket } from './types';

export function buildFollowUpMailto(verification: VerificationWithTicket): string {
  const firstName = verification.name.split(' ')[0] || verification.name;
  const discountLabel = verification.verification_type === 'student' ? 'student' : 'unemployed';

  const subject = 'Your ZurichJS Conference 2026 discounted ticket is waiting';
  const bodyLines = [
    `Hi ${firstName},`,
    '',
    `Great news — your ${discountLabel} discount for ZurichJS Conference 2026 was approved, but it looks like you haven't completed your ticket purchase yet.`,
    '',
    ...(verification.stripe_payment_link_url
      ? ['You can grab your discounted ticket here:', verification.stripe_payment_link_url, '']
      : []),
    'Discounted tickets are limited, so don\'t wait too long!',
    '',
    'If anything isn\'t working or you have questions, just reply to this email.',
    '',
    'Best,',
    'The ZurichJS Team',
  ];

  const params = new URLSearchParams({
    subject,
    body: bodyLines.join('\n'),
  });

  // URLSearchParams encodes spaces as '+', which mail clients render literally
  return `mailto:${encodeURIComponent(verification.email)}?${params.toString().replace(/\+/g, '%20')}`;
}
