/**
 * Ticket Waitlist Confirmation Email Template
 * Sent when someone joins the waitlist for a sold-out ticket type (VIP or
 * student/unemployed) to confirm they're on the list.
 */

import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface TicketWaitlistConfirmationEmailProps {
  /** Human-readable ticket type, e.g. "VIP" or "Student/Unemployed" */
  ticketTypeLabel: string;
  supportEmail?: string;
}

export const TicketWaitlistConfirmationEmail: React.FC<TicketWaitlistConfirmationEmailProps> = ({
  ticketTypeLabel,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = `You're on the ${ticketTypeLabel} ticket waitlist for ZurichJS Conference 2026`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>You&#39;re on the waitlist! &#127881;</Text>
        <Text style={headerSubtitleStyle}>
          {ticketTypeLabel}{' '}tickets &bull; ZurichJS Conference 2026
        </Text>
      </Section>

      {/* Body */}
      <Section style={cardStyle}>
        <Text style={bodyTextStyle}>
          Thanks for your interest in <strong>{ticketTypeLabel}</strong>{' '}tickets for ZurichJS
          Conference 2026. They&#39;re currently sold out, but you&#39;ve been added to the
          waitlist.
        </Text>
        <Text style={bodyTextStyle}>
          We&#39;ll email you as soon as a spot opens up &mdash; so keep an eye on your inbox.
          There&#39;s nothing else you need to do right now.
        </Text>
      </Section>

      {/* Questions */}
      <Section style={cardStyle}>
        <Text style={sectionTitleStyle}>Got questions?</Text>
        <Text style={bodyTextStyle}>
          If you have any questions, just reach out to us at{' '}
          <Link href={`mailto:${supportEmail}`} style={linkStyle}>
            {supportEmail}
          </Link>{' '}
          and we&#39;ll be happy to help.
        </Text>
      </Section>

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          Questions? Reply to this email or reach out to us at{' '}
          <Link href={`mailto:${supportEmail}`} style={linkStyle}>
            {supportEmail}
          </Link>
        </Text>
        <Text style={footerTextStyle}>
          ZurichJS Conference 2026 &bull; September 11, 2026 &bull; Technopark Z&uuml;rich
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default TicketWaitlistConfirmationEmail;

// Styles
const headerSectionStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  padding: spacing['2xl'],
  borderRadius: `${radii.card}px`,
  marginBottom: spacing.lg,
  textAlign: 'center',
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  lineHeight: '36px',
  fontWeight: 700,
  color: colors.text.primary,
  margin: 0,
};

const headerSubtitleStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `${spacing.sm}px 0 0 0`,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.card}px`,
  padding: spacing['2xl'],
  marginBottom: spacing.lg,
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: `0 0 ${spacing.base}px 0`,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const footerSectionStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  paddingTop: spacing.lg,
  borderTop: `1px solid ${colors.border.subtle}`,
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: colors.text.muted,
  margin: `0 0 ${spacing.xs}px 0`,
};

const linkStyle: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'underline',
};
