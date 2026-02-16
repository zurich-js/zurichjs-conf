/**
 * CFP Acceptance Email Template
 * Sent to speakers when their submission is accepted
 */

import { Button, Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';
import type { CfpAcceptanceEmailData } from '@/lib/types/cfp/decisions';

const submissionTypeLabels: Record<string, string> = {
  lightning: 'Lightning Talk (10 min)',
  standard: 'Standard Talk (30 min)',
  workshop: 'Workshop (90 min)',
};

export const CfpAcceptanceEmail: React.FC<CfpAcceptanceEmailData> = ({
  speaker_name,
  first_name,
  talk_title,
  submission_type,
  conference_name,
  personal_message,
  confirmation_url,
}) => {
  // Use first_name if provided, otherwise extract from speaker_name
  const displayFirstName = first_name || speaker_name.split(' ')[0];
  const preheader = `Your talk "${talk_title}" has been accepted to ${conference_name}!`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>Congratulations!</Text>
        <Text style={headerSubtitleStyle}>
          Your submission has been accepted to speak at {conference_name}
        </Text>
      </Section>

      {/* Talk Details Card */}
      <Section style={cardStyle}>
        <Text style={greetingStyle}>Hi {displayFirstName},</Text>

        <Text style={bodyStyle}>
          We are thrilled to inform you that your submission has been selected
          for {conference_name}!
        </Text>

        {/* Talk Info Box */}
        <div style={talkBoxStyle}>
          <Text style={sectionTitleStyle}>Your Session</Text>
          <Text style={talkTitleStyle}>{talk_title}</Text>
          <div style={badgeContainerStyle}>
            <span style={badgeStyle}>
              {submissionTypeLabels[submission_type] || submission_type}
            </span>
          </div>
        </div>

        {/* Personal Message (if provided) */}
        {personal_message && (
          <>
            <Hr style={dividerStyle} />
            <Text style={sectionTitleStyle}>A Note from the Committee</Text>
            <div style={messageBoxStyle}>
              <Text style={messageTextStyle}>{personal_message}</Text>
            </div>
          </>
        )}

        <Hr style={dividerStyle} />

        {/* Next Steps */}
        <Text style={sectionTitleStyle}>What Happens Next</Text>
        <Text style={bodyStyle}>
          Please confirm your attendance by clicking the button below.
          <strong> We need to hear from you within the next 7 days</strong> so we can
          plan accordingly.
        </Text>

        <Text style={bodyStyle}>
          We&apos;ll reach out in the next few days regarding travel and accommodation
          arrangements. If you&apos;re attending other conferences around those dates
          or have specific travel needs (different inbound/outbound dates, etc.),
          please let us know so we can coordinate your flights accordingly.
        </Text>

        {/* CTA Button */}
        <Section style={ctaContainerStyle}>
          <Button href={confirmation_url} style={buttonStyle}>
            Confirm Your Attendance
          </Button>
        </Section>
      </Section>

      {/* Questions Section */}
      <Section style={questionsSectionStyle}>
        <Text style={questionsTextStyle}>
          Questions? Reply to this email or reach out to us at{' '}
          <Link href="mailto:hello@zurichjs.com" style={linkStyle}>
            hello@zurichjs.com
          </Link>
        </Text>
      </Section>

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          We can&apos;t wait to see you on stage!
        </Text>
        <Text style={footerSignatureStyle}>
          The {conference_name} Team
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default CfpAcceptanceEmail;

// Styles
const headerSectionStyle: React.CSSProperties = {
  backgroundColor: colors.brand.green,
  padding: spacing['2xl'],
  borderRadius: `${radii.card}px ${radii.card}px 0 0`,
  marginBottom: 0,
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  lineHeight: '36px',
  fontWeight: 700,
  color: '#FFFFFF',
  margin: 0,
};

const headerSubtitleStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: 'rgba(255, 255, 255, 0.9)',
  margin: `${spacing.sm}px 0 0 0`,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderTop: 'none',
  borderRadius: `0 0 ${radii.card}px ${radii.card}px`,
  padding: spacing['2xl'],
  marginBottom: spacing['2xl'],
};

const greetingStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const bodyStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: `0 0 ${spacing.base}px 0`,
};

const talkBoxStyle: React.CSSProperties = {
  backgroundColor: '#F0FDF4',
  border: '1px solid #BBF7D0',
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
  marginBottom: spacing.lg,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const talkTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  lineHeight: '26px',
  fontWeight: 600,
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const badgeContainerStyle: React.CSSProperties = {
  marginTop: spacing.sm,
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: colors.brand.green,
  color: '#FFFFFF',
  fontSize: '12px',
  fontWeight: 600,
  padding: `${spacing.xs}px ${spacing.md}px`,
  borderRadius: `${radii.badge}px`,
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing.lg}px 0`,
};

const messageBoxStyle: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
};

const messageTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: 0,
  fontStyle: 'italic',
  whiteSpace: 'pre-wrap' as const,
};

const ctaContainerStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  padding: `${spacing.lg}px 0`,
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: colors.brand.green,
  color: '#FFFFFF',
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  padding: `${spacing.md}px ${spacing.xl}px`,
  borderRadius: `${radii.button}px`,
  textDecoration: 'none',
  display: 'inline-block',
};

const questionsSectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
};

const questionsTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: 0,
};

const linkStyle: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'underline',
};

const footerSectionStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  paddingTop: spacing.lg,
  borderTop: `1px solid ${colors.border.subtle}`,
};

const footerTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const footerSignatureStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.muted,
  margin: 0,
  fontStyle: 'italic',
};
