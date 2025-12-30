/**
 * Sponsorship Inquiry Confirmation Email Template
 * Sent to the person who submitted a sponsorship inquiry
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface SponsorshipConfirmationEmailProps {
  name: string;
  company: string;
  inquiryId: string;
  supportEmail?: string;
}

export const SponsorshipConfirmationEmail: React.FC<SponsorshipConfirmationEmailProps> = ({
  name,
  company,
  inquiryId,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = `Thank you for your interest in sponsoring ZurichJS Conference 2026`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Greeting */}
      <Section style={greetingSectionStyle}>
        <Text style={greetingStyle}>Hi {name},</Text>
        <Text style={bodyTextStyle}>
          Thank you for your interest in sponsoring ZurichJS Conference 2026!
          We&apos;ve received your inquiry and will get back to you within 24-48 hours.
        </Text>
      </Section>

      {/* Confirmation Card */}
      <Section style={cardStyle}>
        <Text style={cardTitleStyle}>Inquiry Received</Text>

        <div style={infoBoxStyle}>
          <Text style={infoBoxTextStyle}>
            <strong>Reference ID:</strong> {inquiryId}
          </Text>
          <Text style={infoBoxTextStyle}>
            <strong>Company:</strong> {company}
          </Text>
        </div>

        <Text style={cardBodyStyle}>
          Our sponsorship team will review your inquiry and reach out to discuss
          how we can work together to make ZurichJS Conference 2026 a success.
        </Text>
      </Section>

      {/* What to Expect */}
      <Section style={sectionStyle}>
        <Text style={sectionTitleStyle}>What Happens Next?</Text>
        <ol style={listStyle}>
          <li style={listItemStyle}>
            <Text style={listItemTextStyle}>
              <strong>Review:</strong> Our team will review your inquiry within 24-48 hours
            </Text>
          </li>
          <li style={listItemStyle}>
            <Text style={listItemTextStyle}>
              <strong>Follow-up:</strong> We&apos;ll reach out to discuss sponsorship options
            </Text>
          </li>
          <li style={listItemStyle}>
            <Text style={listItemTextStyle}>
              <strong>Customize:</strong> We&apos;ll work with you to create a package that fits your goals
            </Text>
          </li>
        </ol>
      </Section>

      <Hr style={dividerStyle} />

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          <strong>Questions?</strong> Reply to this email or contact us at{' '}
          <Link href={`mailto:${supportEmail}`} style={linkStyle}>
            {supportEmail}
          </Link>
        </Text>
        <Text style={footerTextStyle}>
          <Link href="https://conf.zurichjs.com/sponsorship" style={linkStyle}>
            View Sponsorship Tiers
          </Link>
        </Text>
        <Text style={signoffStyle}>
          Best regards,
          <br />
          <strong>The ZurichJS Team</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default SponsorshipConfirmationEmail;

// Styles
const greetingSectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
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

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.card}px`,
  padding: spacing['2xl'],
  marginBottom: spacing['2xl'],
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  lineHeight: '24px',
  fontWeight: 700,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  borderLeft: `4px solid #000000`,
  padding: spacing.base,
  borderRadius: `${radii.button}px`,
  marginBottom: spacing.base,
};

const infoBoxTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.primary,
  margin: `0 0 ${spacing.xs}px 0`,
};

const cardBodyStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: 0,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
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
  margin: `${spacing['2xl']}px 0`,
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

const linkStyle: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'underline',
};

const signoffStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `${spacing.lg}px 0 0 0`,
  textAlign: 'center' as const,
};
