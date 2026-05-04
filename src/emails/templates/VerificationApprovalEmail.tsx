/**
 * Verification Approval Email Template
 * Sent to students/unemployed users when their verification is approved
 * with a payment link to complete their discounted ticket purchase
 */

import { Button, Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, InfoBlock, BadgePill } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface VerificationApprovalEmailProps {
  firstName: string;
  verificationType: 'student' | 'unemployed';
  verificationId: string;
  paymentLinkUrl: string;
  supportEmail?: string;
}

export const VerificationApprovalEmail: React.FC<VerificationApprovalEmailProps> = ({
  firstName = 'Attendee',
  verificationType = 'student',
  verificationId = 'VER-XXXXX',
  paymentLinkUrl = 'https://buy.stripe.com/example',
  supportEmail = 'hello@zurichjs.com',
}) => {
  const typeLabel = verificationType === 'student' ? 'Student' : 'Unemployed';
  const preheader = `Your ${typeLabel.toLowerCase()} verification is approved — complete your ticket purchase!`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Greeting */}
      <Section style={greetingSectionStyle}>
        <Text style={greetingStyle}>Hi {firstName},</Text>
        <Text style={headlineStyle}>You&apos;re Verified!</Text>
        <Text style={bodyTextStyle}>
          Great news! Your {typeLabel.toLowerCase()} verification has been approved.
          You can now purchase your discounted ZurichJS Conference 2026 ticket using the
          secure payment link below.
        </Text>
      </Section>

      {/* Status Badge */}
      <Section style={badgeSectionStyle}>
        <BadgePill>VERIFICATION APPROVED</BadgePill>
      </Section>

      {/* CTA Button */}
      <Section style={ctaSectionStyle}>
        <table style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center', padding: `${spacing.lg}px 0` }}>
                <Button href={paymentLinkUrl} style={primaryButtonStyle}>
                  Complete Your Purchase
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
        <Text style={smallTextStyle}>
          Click the button above to securely pay via Stripe.
        </Text>
      </Section>

      <Hr style={dividerStyle} />

      {/* Verification Details */}
      <Section style={detailsSectionStyle}>
        <Text style={sectionTitleStyle}>Verification Details</Text>
        <div style={detailsBoxStyle}>
          <InfoBlock label="Verification ID" value={verificationId} />
          <InfoBlock label="Type" value={`${typeLabel} Discount`} />
          <InfoBlock label="Status" value="Approved" />
        </div>
      </Section>

      <Hr style={dividerStyle} />

      {/* What's Next */}
      <Section style={nextStepsSectionStyle}>
        <Text style={sectionTitleStyle}>What&apos;s Next?</Text>
        <ul style={stepsListStyle}>
          <li style={stepItemStyle}>
            <span style={stepBulletStyle}>1.</span>
            <span>Click the payment link above to complete your purchase</span>
          </li>
          <li style={stepItemStyle}>
            <span style={stepBulletStyle}>2.</span>
            <span>You&apos;ll receive your ticket confirmation email with a QR code</span>
          </li>
          <li style={stepItemStyle}>
            <span style={stepBulletStyle}>3.</span>
            <span>Show your QR code at the door on September 11, 2026</span>
          </li>
        </ul>
      </Section>

      <Hr style={dividerStyle} />

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          <strong>Questions?</strong> Contact us at{' '}
          <Link href={`mailto:${supportEmail}`} style={linkStyle}>
            {supportEmail}
          </Link>
        </Text>
        <Text style={footerTextStyle}>
          See you at the conference!
          <br />
          <strong>The ZurichJS Team</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default VerificationApprovalEmail;

// Styles
const greetingSectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
};

const greetingStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.muted,
  margin: `0 0 ${spacing.base}px 0`,
};

const headlineStyle: React.CSSProperties = {
  fontSize: '32px',
  lineHeight: '1.2',
  fontWeight: 700,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.muted,
  margin: `0 0 ${spacing.base}px 0`,
};

const badgeSectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
  textAlign: 'center',
};

const ctaSectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const detailsSectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
};

const detailsBoxStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  borderRadius: `${radii.card}px`,
  padding: `${spacing.base}px`,
  border: `1px solid ${colors.border.default}`,
};

const nextStepsSectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
};

const stepsListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

const stepItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: `${spacing.sm}px`,
  marginBottom: `${spacing.sm}px`,
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.muted,
};

const stepBulletStyle: React.CSSProperties = {
  flexShrink: 0,
  fontWeight: 600,
  color: colors.text.primary,
};

const smallTextStyle: React.CSSProperties = {
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  color: colors.text.muted,
  textAlign: 'center' as const,
  margin: 0,
};

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: `${spacing.md}px ${spacing['2xl']}px`,
  backgroundColor: colors.brand.yellow,
  border: 'none',
  borderRadius: `${radii.button}px`,
  color: colors.text.primary,
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center',
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing['2xl']}px 0`,
};

const footerSectionStyle: React.CSSProperties = {
  textAlign: 'center',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.muted,
  margin: `0 0 ${spacing.md}px 0`,
  textAlign: 'center',
};

const linkStyle: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'underline',
};
