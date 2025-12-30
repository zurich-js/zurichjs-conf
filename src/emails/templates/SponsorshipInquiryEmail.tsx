/**
 * Sponsorship Inquiry Email Template
 * Sent to hello@zurichjs.com when someone submits a sponsorship inquiry
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface SponsorshipInquiryEmailProps {
  name: string;
  company: string;
  email: string;
  message: string;
  inquiryId: string;
  submittedAt: string;
}

export const SponsorshipInquiryEmail: React.FC<SponsorshipInquiryEmailProps> = ({
  name,
  company,
  email,
  message,
  inquiryId,
  submittedAt,
}) => {
  const preheader = `New sponsorship inquiry from ${name} at ${company}`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>New Sponsorship Inquiry</Text>
        <Text style={headerSubtitleStyle}>
          Someone is interested in sponsoring ZurichJS Conference 2026
        </Text>
      </Section>

      {/* Inquiry Details Card */}
      <Section style={cardStyle}>
        <Text style={sectionTitleStyle}>Contact Information</Text>

        <div style={detailRowStyle}>
          <Text style={labelStyle}>Name</Text>
          <Text style={valueStyle}>{name}</Text>
        </div>

        <div style={detailRowStyle}>
          <Text style={labelStyle}>Company</Text>
          <Text style={valueStyle}>{company}</Text>
        </div>

        <div style={detailRowStyle}>
          <Text style={labelStyle}>Email</Text>
          <Link href={`mailto:${email}`} style={linkValueStyle}>{email}</Link>
        </div>

        <Hr style={dividerStyle} />

        <Text style={sectionTitleStyle}>Message</Text>
        <div style={messageBoxStyle}>
          <Text style={messageTextStyle}>{message}</Text>
        </div>

        <Hr style={dividerStyle} />

        <div style={metaRowStyle}>
          <Text style={metaTextStyle}>
            <strong>Inquiry ID:</strong> {inquiryId}
          </Text>
          <Text style={metaTextStyle}>
            <strong>Submitted:</strong> {submittedAt}
          </Text>
        </div>
      </Section>

      {/* Action Section */}
      <Section style={actionSectionStyle}>
        <Text style={actionTextStyle}>
          Reply directly to this email or contact{' '}
          <Link href={`mailto:${email}`} style={linkStyle}>{email}</Link>
          {' '}to follow up on this inquiry.
        </Text>
      </Section>

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          This is an automated notification from the ZurichJS Conference website.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default SponsorshipInquiryEmail;

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
  ...valueStyle,
  color: colors.brand.blue,
  textDecoration: 'underline',
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
  whiteSpace: 'pre-wrap' as const,
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: spacing.xs,
};

const metaTextStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.text.muted,
  margin: 0,
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
