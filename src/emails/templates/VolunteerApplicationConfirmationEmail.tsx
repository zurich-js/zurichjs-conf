/**
 * Volunteer Application Confirmation Email
 * Sent to the applicant after submitting a volunteer application
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface VolunteerApplicationConfirmationEmailProps {
  name: string;
  roleTitle: string;
  applicationId: string;
  supportEmail: string;
}

export const VolunteerApplicationConfirmationEmail: React.FC<
  VolunteerApplicationConfirmationEmailProps
> = ({ name, roleTitle, applicationId, supportEmail }) => {
  const preheader = `We received your volunteer application — ${applicationId}`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>Volunteer Application Received</Text>
      </Section>

      {/* Body */}
      <Section style={cardStyle}>
        <Text style={paragraphStyle}>Hi {name},</Text>
        <Text style={paragraphStyle}>
          Thanks for applying to volunteer as <strong>{roleTitle}</strong> at ZurichJS Conf
          2026. We&apos;ve received your application and will review it soon.
        </Text>

        <div style={referenceBoxStyle}>
          <Text style={referenceLabelStyle}>Application Reference</Text>
          <Text style={referenceValueStyle}>{applicationId}</Text>
        </div>

        <Text style={sectionTitleStyle}>What happens next?</Text>
        <Text style={paragraphStyle}>
          Our team will review your application and be in touch via email once a decision has
          been made. If selected, we&apos;ll confirm your role details and next steps.
        </Text>

        <Hr style={dividerStyle} />

        <Text style={paragraphStyle}>
          If you have any questions, reply to this email or reach out at{' '}
          <Link href={`mailto:${supportEmail}`} style={linkStyle}>
            {supportEmail}
          </Link>{' '}
          and include your application reference.
        </Text>

        <Text style={paragraphStyle}>
          Best regards,
          <br />
          <strong>The ZurichJS Conference Team</strong>
        </Text>
      </Section>

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>ZurichJS Conference 2026</Text>
        <Text style={footerTextStyle}>September 11, 2026 · Zurich, Switzerland</Text>
      </Section>
    </EmailLayout>
  );
};

export default VolunteerApplicationConfirmationEmail;

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

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderTop: 'none',
  borderRadius: `0 0 ${radii.card}px ${radii.card}px`,
  padding: spacing['2xl'],
  marginBottom: spacing['2xl'],
};

const paragraphStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: `0 0 ${spacing.base}px 0`,
};

const referenceBoxStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  borderLeft: `4px solid ${colors.text.primary}`,
  padding: spacing.base,
  margin: `${spacing.lg}px 0`,
};

const referenceLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: colors.text.primary,
  margin: `0 0 ${spacing.xs}px 0`,
};

const referenceValueStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  fontFamily: typography.family.mono,
  color: colors.text.primary,
  margin: 0,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing.lg}px 0`,
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
  lineHeight: '18px',
  color: colors.text.muted,
  margin: 0,
};
