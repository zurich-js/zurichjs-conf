/**
 * Volunteer Application Admin Notification Email
 * Sent to hello@zurichjs.com when a new volunteer application is submitted
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface VolunteerApplicationAdminEmailProps {
  applicationId: string;
  name: string;
  email: string;
  roleTitle: string;
  phone?: string | null;
  linkedinUrl: string;
  location: string;
  affiliation?: string | null;
  motivation: string;
  relevantExperience: string;
  availability: string;
  notes?: string | null;
  submittedAt: string;
}

export const VolunteerApplicationAdminEmail: React.FC<VolunteerApplicationAdminEmailProps> = ({
  applicationId,
  name,
  email,
  roleTitle,
  phone,
  linkedinUrl,
  location,
  affiliation,
  motivation,
  relevantExperience,
  availability,
  notes,
  submittedAt,
}) => {
  const preheader = `New volunteer application from ${name} — ${roleTitle}`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>New Volunteer Application</Text>
        <Text style={headerSubtitleStyle}>Review in the admin dashboard</Text>
      </Section>

      <Section style={cardStyle}>
        {/* Application ID */}
        <div style={idBoxStyle}>
          <Text style={idLabelStyle}>Application ID</Text>
          <Text style={idValueStyle}>{applicationId}</Text>
        </div>

        {/* Contact Information */}
        <Text style={sectionTitleStyle}>Contact Information</Text>

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
        {phone && (
          <div style={detailRowStyle}>
            <Text style={labelStyle}>Phone</Text>
            <Text style={valueStyle}>{phone}</Text>
          </div>
        )}
        <div style={detailRowStyle}>
          <Text style={labelStyle}>LinkedIn</Text>
          <Link href={linkedinUrl} style={linkValueStyle}>
            {linkedinUrl}
          </Link>
        </div>
        <div style={detailRowStyle}>
          <Text style={labelStyle}>Location</Text>
          <Text style={valueStyle}>{location}</Text>
        </div>
        <div style={detailRowStyle}>
          <Text style={labelStyle}>Role</Text>
          <Text style={valueStyle}>{roleTitle}</Text>
        </div>
        {affiliation && (
          <div style={detailRowStyle}>
            <Text style={labelStyle}>Affiliation</Text>
            <Text style={valueStyle}>{affiliation}</Text>
          </div>
        )}

        <Hr style={dividerStyle} />

        {/* Motivation */}
        <Text style={sectionTitleStyle}>Motivation</Text>
        <div style={messageBoxStyle}>
          <Text style={messageTextStyle}>{motivation}</Text>
        </div>

        {/* Experience */}
        <Text style={sectionTitleStyle}>Relevant Experience</Text>
        <div style={messageBoxStyle}>
          <Text style={messageTextStyle}>{relevantExperience}</Text>
        </div>

        {/* Availability */}
        <Text style={sectionTitleStyle}>Availability</Text>
        <div style={messageBoxStyle}>
          <Text style={messageTextStyle}>{availability}</Text>
        </div>

        {/* Notes */}
        {notes && (
          <>
            <Text style={sectionTitleStyle}>Additional Notes</Text>
            <div style={messageBoxStyle}>
              <Text style={messageTextStyle}>{notes}</Text>
            </div>
          </>
        )}

        <Hr style={dividerStyle} />

        <table style={metaTableStyle}>
          <tbody>
            <tr>
              <td style={metaLabelStyle}>Submitted</td>
              <td style={metaValueStyle}>{submittedAt}</td>
            </tr>
            <tr>
              <td style={metaLabelStyle}>Reply to</td>
              <td style={metaValueStyle}>
                <Link href={`mailto:${email}`} style={metaLinkStyle}>
                  {email}
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          This is an automated admin notification from ZurichJS Conference.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default VolunteerApplicationAdminEmail;

// Styles
const headerSectionStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  padding: spacing['2xl'],
  borderRadius: `${radii.card}px ${radii.card}px 0 0`,
  marginBottom: 0,
  textAlign: 'center' as const,
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

const idBoxStyle: React.CSSProperties = {
  backgroundColor: colors.text.primary,
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
  marginBottom: spacing.lg,
};

const idLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.02em',
  color: colors.text.muted,
  margin: `0 0 ${spacing.xs}px 0`,
};

const idValueStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  fontFamily: typography.family.mono,
  color: colors.surface.card,
  margin: 0,
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
  textTransform: 'uppercase' as const,
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
  wordBreak: 'break-all' as const,
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
  marginBottom: spacing.lg,
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
