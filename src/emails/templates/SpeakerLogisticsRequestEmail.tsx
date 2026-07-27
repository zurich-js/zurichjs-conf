/**
 * Speaker Logistics Request Email Template
 * Asks speakers to confirm which conference-week events they will attend and
 * share dietary needs, plus-one details, t-shirt size, and talk accommodations
 * via their unique logistics link
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface SpeakerLogisticsRequestEmailProps {
  firstName: string;
  logisticsUrl: string;
  /** Whether the speaker already submitted once (reminder wording) */
  hasSubmitted?: boolean;
  customMessage?: string;
  supportEmail?: string;
}

const EVENTS: Array<{ title: string; date: string; detail?: string }> = [
  { title: 'Warm-Up Meetup', date: 'Wed, September 9' },
  { title: 'Speakers Dinner', date: 'Thu, September 10', detail: '18:30 – 22:00 · plus ones welcome' },
  { title: 'VIP After Party', date: 'Fri, September 11', detail: 'plus ones welcome' },
  { title: 'Speaker Hangout Activities', date: 'Sat, September 12' },
];

export const SpeakerLogisticsRequestEmail: React.FC<SpeakerLogisticsRequestEmailProps> = ({
  firstName,
  logisticsUrl,
  hasSubmitted = false,
  customMessage,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = hasSubmitted
    ? 'Please review your ZurichJS speaker week plans — you can update them any time'
    : 'Tell us which ZurichJS speaker week events you will join';

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>Your Speaker Week Plans</Text>
        <Text style={headerSubtitleStyle}>
          Help us plan food, seats, and surprises for ZurichJS Conference 2026
        </Text>
      </Section>

      {/* Message */}
      <Section style={cardStyle}>
        <Text style={welcomeTextStyle}>Hi {firstName},</Text>
        <Text style={bodyTextStyle}>
          {hasSubmitted
            ? 'Thanks for sharing your speaker week plans! Could you take a quick look and make sure everything is still accurate? You can update your answers any time using your personal link below.'
            : 'We have a full week of speaker events planned around the conference, and we need a few details from you to get the logistics right — from restaurant bookings to catering orders.'}
        </Text>
        <Text style={bodyTextStyle}>Here is what&apos;s happening during speaker week:</Text>

        {EVENTS.map((event) => (
          <Text key={event.title} style={eventLineStyle}>
            <strong>{event.title}</strong> — {event.date}
            {event.detail ? ` · ${event.detail}` : ''}
          </Text>
        ))}

        <Hr style={dividerStyle} />

        <Text style={bodyTextStyle}>On your personal form we&apos;ll ask about:</Text>
        <Text style={listLineStyle}>• Which of the events above you&apos;ll attend</Text>
        <Text style={listLineStyle}>
          • Dietary restrictions or allergies for the dinner and after party
        </Text>
        <Text style={listLineStyle}>
          • Whether you&apos;re bringing a plus one to the dinner or the after party — after-party
          plus ones get a complimentary VIP ticket and 20% off workshops
        </Text>
        <Text style={listLineStyle}>• Your t-shirt size (if we don&apos;t have it yet)</Text>
        <Text style={listLineStyle}>
          • Any special accommodations you need for your talk or workshop
        </Text>

        {customMessage && (
          <>
            <Hr style={dividerStyle} />
            <div style={customMessageBoxStyle}>
              <Text style={customMessageTextStyle}>{customMessage}</Text>
            </div>
          </>
        )}

        <Link href={logisticsUrl} style={buttonStyle}>
          {hasSubmitted ? 'Review My Plans' : 'Share My Plans'}
        </Link>
      </Section>

      {/* Heads-up on changes */}
      <Section style={cardStyle}>
        <Text style={sectionTitleStyle}>Plans Changed?</Text>
        <Text style={bodyTextStyle}>
          We order food and book capacity based on your answers, so if anything changes — especially
          last minute — please update the form or drop us a line as soon as you can. It makes a real
          difference.
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

export default SpeakerLogisticsRequestEmail;

// Styles
const headerSectionStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  padding: spacing['2xl'],
  borderRadius: `${radii.card}px ${radii.card}px 0 0`,
  marginBottom: 0,
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

const welcomeTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
  fontWeight: 600,
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: `0 0 ${spacing.base}px 0`,
};

const eventLineStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.primary,
  margin: `0 0 ${spacing.xs}px 0`,
};

const listLineStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: `0 0 ${spacing.xs}px 0`,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing.lg}px 0`,
};

const customMessageBoxStyle: React.CSSProperties = {
  backgroundColor: '#F0F9FF',
  border: '1px solid #BAE6FD',
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
  marginBottom: spacing.base,
};

const customMessageTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: colors.brand.yellow,
  color: colors.text.primary,
  fontSize: '14px',
  fontWeight: 600,
  padding: `${spacing.sm}px ${spacing.lg}px`,
  borderRadius: `${radii.button}px`,
  textDecoration: 'none',
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
