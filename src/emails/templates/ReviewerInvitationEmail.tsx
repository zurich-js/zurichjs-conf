/**
 * CFP Reviewer Invitation Email Template
 * Sent to reviewers when they are invited to review CFP submissions
 */

import { Button, Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface ReviewerInvitationEmailProps {
  reviewerName?: string;
  reviewerEmail: string;
  accessLevel: 'full_access' | 'anonymous' | 'readonly';
  loginUrl: string;
  supportEmail?: string;
}

const ACCESS_LEVEL_DESCRIPTIONS = {
  full_access: 'You have full access to view speaker names, emails, and all submission details. You can score submissions and leave feedback.',
  anonymous: 'You will review submissions anonymously - speaker names and personal details are hidden. You can score submissions and leave feedback.',
  readonly: 'You have read-only access to view submissions but cannot score or leave feedback. This is an observer role.',
};

const ACCESS_LEVEL_LABELS = {
  full_access: 'Full Access Reviewer',
  anonymous: 'Anonymous Reviewer',
  readonly: 'Read-Only Observer',
};

export const ReviewerInvitationEmail: React.FC<ReviewerInvitationEmailProps> = ({
  reviewerName,
  reviewerEmail,
  accessLevel,
  loginUrl,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = `You've been invited to review CFP submissions for ZurichJS Conference 2026`;
  const greeting = reviewerName ? `Hi ${reviewerName}` : 'Hello';

  return (
    <EmailLayout preheader={preheader}>
      {/* Header Banner */}
      <Section style={headerBannerStyle}>
        <Text style={headerTitleStyle}>ZurichJS Conference 2026</Text>
        <Text style={headerSubtitleStyle}>Call for Papers Review Committee</Text>
      </Section>

      {/* Greeting */}
      <Section style={greetingSectionStyle}>
        <Text style={greetingStyle}>{greeting},</Text>
        <Text style={bodyTextStyle}>
          You&apos;ve been invited to join the review committee for the ZurichJS Conference 2026 Call for Papers!
        </Text>
        <Text style={bodyTextStyle}>
          We&apos;re excited to have you help us select the best talks and workshops for our conference.
        </Text>
      </Section>

      {/* Access Level Card */}
      <Section style={accessCardStyle}>
        <Text style={accessLabelStyle}>YOUR ACCESS LEVEL</Text>
        <Text style={accessTitleStyle}>{ACCESS_LEVEL_LABELS[accessLevel]}</Text>
        <Text style={accessDescriptionStyle}>
          {ACCESS_LEVEL_DESCRIPTIONS[accessLevel]}
        </Text>
      </Section>

      {/* CTA Button */}
      <Section style={ctaSectionStyle}>
        <Button href={loginUrl} style={ctaButtonStyle}>
          Accept Invitation & Start Reviewing
        </Button>
        <Text style={ctaHintStyle}>
          Click the button above to access the reviewer dashboard
        </Text>
      </Section>

      {/* What to Expect Section */}
      <Section style={infoSectionStyle}>
        <Text style={sectionTitleStyle}>What to Expect</Text>
        <ul style={listStyle}>
          <li style={listItemStyle}>
            <Text style={listItemTextStyle}>
              <strong>Review Submissions:</strong> Browse through talk and workshop proposals submitted by speakers from around the world.
            </Text>
          </li>
          <li style={listItemStyle}>
            <Text style={listItemTextStyle}>
              <strong>Score & Feedback:</strong> Rate submissions on relevance, technical depth, clarity, and diversity.
            </Text>
          </li>
          <li style={listItemStyle}>
            <Text style={listItemTextStyle}>
              <strong>Help Shape the Conference:</strong> Your reviews directly influence which sessions make it to the final program.
            </Text>
          </li>
        </ul>
      </Section>

      <Hr style={dividerStyle} />

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          This invitation was sent to <strong>{reviewerEmail}</strong>
        </Text>
        <Text style={footerTextStyle}>
          Questions? Contact us at{' '}
          <Link href={`mailto:${supportEmail}`} style={linkStyle}>
            {supportEmail}
          </Link>
        </Text>
        <Text style={footerTextStyle}>
          <Link href="https://conf.zurichjs.com" style={linkStyle}>
            conf.zurichjs.com
          </Link>
        </Text>
        <Text style={footerSignatureStyle}>
          Thank you for being part of ZurichJS!
          <br />
          <strong>The ZurichJS Team</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default ReviewerInvitationEmail;

// Styles
const headerBannerStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  padding: `${spacing['2xl']}px ${spacing.xl}px`,
  borderRadius: `${radii.card}px`,
  textAlign: 'center' as const,
  marginBottom: spacing['3xl'],
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  lineHeight: '32px',
  fontWeight: 700,
  color: colors.text.primary,
  margin: 0,
};

const headerSubtitleStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.primary,
  margin: `${spacing.xs}px 0 0 0`,
};

const greetingSectionStyle: React.CSSProperties = {
  marginBottom: spacing['3xl'],
};

const greetingStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `0 0 ${spacing.base}px 0`,
};

const accessCardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `2px solid ${colors.brand.yellow}`,
  borderRadius: `${radii.card}px`,
  padding: spacing.xl,
  marginBottom: spacing['3xl'],
};

const accessLabelStyle: React.CSSProperties = {
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  fontWeight: typography.label.fontWeight,
  textTransform: typography.label.textTransform,
  letterSpacing: typography.label.letterSpacing,
  color: colors.text.muted,
  margin: `0 0 ${spacing.xs}px 0`,
};

const accessTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  lineHeight: '24px',
  fontWeight: 700,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const accessDescriptionStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: 0,
};

const ctaSectionStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  marginBottom: spacing['3xl'],
};

const ctaButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: `${spacing.base}px ${spacing['2xl']}px`,
  backgroundColor: colors.brand.yellow,
  borderRadius: `${radii.button}px`,
  color: colors.text.primary,
  fontSize: '16px',
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const ctaHintStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.muted,
  margin: `${spacing.base}px 0 0 0`,
};

const infoSectionStyle: React.CSSProperties = {
  marginBottom: spacing['3xl'],
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const listStyle: React.CSSProperties = {
  margin: 0,
  padding: `0 0 0 ${spacing.lg}px`,
  color: colors.text.primary,
};

const listItemStyle: React.CSSProperties = {
  marginBottom: spacing.base,
};

const listItemTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: 0,
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing['3xl']}px 0`,
};

const footerSectionStyle: React.CSSProperties = {
  textAlign: 'center' as const,
};

const footerTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `0 0 ${spacing.md}px 0`,
  textAlign: 'center' as const,
};

const footerSignatureStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `${spacing.xl}px 0 0 0`,
  textAlign: 'center' as const,
};

const linkStyle: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'underline',
};
