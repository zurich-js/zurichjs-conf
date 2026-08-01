/**
 * Workshop Waitlist Confirmation Email Template
 * Sent when someone joins the waitlist for a sold-out workshop to confirm
 * they're on the list.
 */

import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface WorkshopWaitlistConfirmationEmailProps {
  /** Workshop title, e.g. "Building AI Agents with TypeScript" */
  workshopTitle: string;
  /** Absolute URL to the workshops catalog */
  workshopsUrl: string;
  supportEmail?: string;
}

export const WorkshopWaitlistConfirmationEmail: React.FC<WorkshopWaitlistConfirmationEmailProps> = ({
  workshopTitle,
  workshopsUrl,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = `You're on the waitlist for ${workshopTitle} at ZurichJS Conference 2026`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>You&#39;re on the waitlist! &#127881;</Text>
        <Text style={headerSubtitleStyle}>
          {workshopTitle}{' '}&bull; ZurichJS Conference 2026
        </Text>
      </Section>

      {/* Body */}
      <Section style={cardStyle}>
        <Text style={bodyTextStyle}>
          Thanks for your interest in <strong>{workshopTitle}</strong>. Every seat is currently
          taken, but you&#39;ve been added to the waitlist.
        </Text>
        <Text style={bodyTextStyle}>
          Workshop seats do free up &mdash; plans change and refunds happen. We&#39;ll email you as
          soon as one opens, so keep an eye on your inbox. There&#39;s nothing else you need to do
          right now.
        </Text>
      </Section>

      {/* Questions */}
      <Section style={cardStyle}>
        <Text style={sectionTitleStyle}>Got questions?</Text>
        <Text style={bodyTextStyle}>
          Just reply directly to this email to reach out to us &mdash; we&#39;re happy to help.
        </Text>

        <Text style={subheadingStyle}>Wanna join a different workshop?</Text>
        <Text style={bodyTextStyle}>
          Our other workshops may still have seats available &mdash; take a look at the full
          line-up:{' '}
          <Link href={workshopsUrl} style={linkStyle}>
            /workshops
          </Link>
        </Text>

        <Text style={bodyTextStyle}>
          We&#39;re here to support you every step of the way.
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

export default WorkshopWaitlistConfirmationEmail;

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

const subheadingStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  fontWeight: 700,
  color: colors.text.primary,
  margin: `${spacing.base}px 0 ${spacing.xs}px 0`,
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
