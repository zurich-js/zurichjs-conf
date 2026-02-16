/**
 * CFP Feedback Request Email Template
 * Sent to organizers when a rejected speaker requests feedback.
 * Reply-to is set to the speaker's email so organizers can reply directly.
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface CfpFeedbackRequestEmailProps {
  speakerName: string;
  speakerEmail: string;
  talkTitle: string;
  submissionType: string;
  submittedAt?: string;
}

export const CfpFeedbackRequestEmail: React.FC<CfpFeedbackRequestEmailProps> = ({
  speakerName,
  speakerEmail,
  talkTitle,
  submissionType,
  submittedAt,
}) => {
  const preheader = `${speakerName} is requesting feedback on their rejected submission`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>Feedback Requested</Text>
        <Text style={headerSubtitleStyle}>
          A speaker would like feedback on their rejected submission
        </Text>
      </Section>

      {/* Details Card */}
      <Section style={cardStyle}>
        {/* Speaker Info */}
        <Text style={sectionTitleStyle}>Speaker</Text>

        <div style={detailRowStyle}>
          <Text style={labelStyle}>Name</Text>
          <Text style={valueStyle}>{speakerName}</Text>
        </div>

        <div style={detailRowStyle}>
          <Text style={labelStyle}>Email</Text>
          <Link href={`mailto:${speakerEmail}`} style={linkValueStyle}>
            {speakerEmail}
          </Link>
        </div>

        <Hr style={dividerStyle} />

        {/* Submission Info */}
        <Text style={sectionTitleStyle}>Submission</Text>

        <div style={detailRowStyle}>
          <Text style={labelStyle}>Title</Text>
          <Text style={valueStyle}>{talkTitle}</Text>
        </div>

        <div style={detailRowStyle}>
          <Text style={labelStyle}>Type</Text>
          <Text style={valueStyle}>{submissionType}</Text>
        </div>

        {submittedAt && (
          <div style={detailRowStyle}>
            <Text style={labelStyle}>Submitted</Text>
            <Text style={valueStyle}>{submittedAt}</Text>
          </div>
        )}
      </Section>

      {/* Action Section */}
      <Section style={actionSectionStyle}>
        <Text style={actionTextStyle}>
          Reply to this email to send feedback directly to{' '}
          <Link href={`mailto:${speakerEmail}`} style={linkStyle}>{speakerName}</Link>.
        </Text>
      </Section>

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          This is an automated notification from the ZurichJS Conference CFP system.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default CfpFeedbackRequestEmail;

// Styles
const headerSectionStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  padding: spacing['2xl'],
  borderRadius: `${radii.card}px ${radii.card}px 0 0`,
  marginBottom: 0,
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
  color: colors.text.secondary,
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

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const detailRowStyle: React.CSSProperties = {
  marginBottom: spacing.base,
};

const labelStyle: React.CSSProperties = {
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  fontWeight: typography.label.fontWeight,
  textTransform: 'uppercase',
  letterSpacing: typography.label.letterSpacing,
  color: colors.text.muted,
  margin: `0 0 ${spacing.xs}px 0`,
};

const valueStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.primary,
  margin: 0,
  fontWeight: 500,
};

const linkValueStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.brand.blue,
  textDecoration: 'underline',
  fontWeight: 500,
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing.lg}px 0`,
};

const actionSectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
};

const actionTextStyle: React.CSSProperties = {
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
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.text.muted,
  margin: 0,
};
