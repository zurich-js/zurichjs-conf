/**
 * Contact Message Email Template
 * Sent to hello@zurichjs.com when someone submits the contact form
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';
import { getContactTypeLabel, type ContactType } from '@/lib/validations/contact';

export interface ContactMessageEmailProps {
  messageId: string;
  name: string;
  email: string;
  contactType: ContactType;
  message: string;
  userAgent?: string;
  submittedAt: string;
  posthogSessionId?: string;
  posthogDistinctId?: string;
}

export const ContactMessageEmail: React.FC<ContactMessageEmailProps> = ({
  messageId,
  name,
  email,
  contactType,
  message,
  userAgent,
  submittedAt,
  posthogSessionId,
  posthogDistinctId,
}) => {
  const contactTypeLabel = getContactTypeLabel(contactType);
  const preheader = `New ${contactTypeLabel.toLowerCase()} from ${name}`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>New {contactTypeLabel}</Text>
        <Text style={headerSubtitleStyle}>
          Someone reached out through the ZurichJS Conference website
        </Text>
      </Section>

      {/* Message Details Card */}
      <Section style={cardStyle}>
        {/* Type Badge */}
        <div style={badgeContainerStyle}>
          <span style={badgeStyle}>{contactTypeLabel}</span>
        </div>

        {/* Sender Information */}
        <Text style={sectionTitleStyle}>Sender Information</Text>

        <div style={detailRowStyle}>
          <Text style={labelStyle}>Name</Text>
          <Text style={valueStyle}>{name}</Text>
        </div>

        <div style={detailRowStyle}>
          <Text style={labelStyle}>Email</Text>
          <Link href={`mailto:${email}`} style={linkValueStyle}>
            {email}
          </Link>
        </div>

        <Hr style={dividerStyle} />

        {/* Message */}
        <Text style={sectionTitleStyle}>Message</Text>
        <div style={messageBoxStyle}>
          <Text style={messageTextStyle}>{message}</Text>
        </div>

        <Hr style={dividerStyle} />

        {/* Metadata */}
        <table style={metaTableStyle}>
          <tbody>
            <tr>
              <td style={metaLabelStyle}>Message ID</td>
              <td style={metaValueStyle}>{messageId}</td>
            </tr>
            <tr>
              <td style={metaLabelStyle}>Submitted</td>
              <td style={metaValueStyle}>{submittedAt}</td>
            </tr>
            {(posthogSessionId || posthogDistinctId) && (
              <tr>
                <td style={metaLabelStyle}>PostHog</td>
                <td style={metaValueStyle}>
                  {posthogSessionId && (
                    <Link
                      href={`https://eu.posthog.com/replay/${posthogSessionId}`}
                      style={metaLinkStyle}
                    >
                      Session Replay
                    </Link>
                  )}
                  {posthogSessionId && posthogDistinctId && ' | '}
                  {posthogDistinctId && (
                    <Link
                      href={`https://eu.posthog.com/persons?search=${posthogDistinctId}`}
                      style={metaLinkStyle}
                    >
                      Person & Events
                    </Link>
                  )}
                </td>
              </tr>
            )}
            {userAgent && (
              <tr>
                <td style={metaLabelStyle}>User Agent</td>
                <td style={metaValueStyle}>{userAgent}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {/* Action Section */}
      <Section style={actionSectionStyle}>
        <Text style={actionTextStyle}>
          Reply directly to this email, or reach out to{' '}
          <Link href={`mailto:${email}`} style={linkStyle}>{email}</Link>.
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

export default ContactMessageEmail;

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

const badgeContainerStyle: React.CSSProperties = {
  marginBottom: spacing.lg,
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: colors.badge.bg,
  color: colors.badge.fg,
  fontSize: '12px',
  fontWeight: 600,
  padding: `${spacing.xs}px ${spacing.md}px`,
  borderRadius: `${radii.badge}px`,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
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

const metaTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const metaLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '20px',
  color: colors.text.muted,
  fontWeight: 600,
  padding: `${spacing.xs}px 0`,
  paddingRight: spacing.base,
  whiteSpace: 'nowrap' as const,
  verticalAlign: 'top' as const,
  width: '100px',
};

const metaValueStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '20px',
  color: colors.text.muted,
  padding: `${spacing.xs}px 0`,
  wordBreak: 'break-word' as const,
  verticalAlign: 'top' as const,
};

const metaLinkStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '20px',
  color: colors.brand.blue,
  textDecoration: 'underline',
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
