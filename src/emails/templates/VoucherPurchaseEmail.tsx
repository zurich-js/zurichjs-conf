/**
 * Workshop Voucher Purchase Confirmation Email Template
 * Sent to customers after successful voucher purchase
 */

import { Button, Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, InfoBlock } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface VoucherPurchaseEmailProps {
  firstName: string;
  amountPaid: number;
  voucherValue: number;
  currency: string;
  bonusPercent?: number;
  orderUrl?: string;
  workshopsUrl?: string;
  supportEmail?: string;
}

export const VoucherPurchaseEmail: React.FC<VoucherPurchaseEmailProps> = ({
  firstName,
  amountPaid,
  voucherValue,
  currency,
  bonusPercent,
  orderUrl,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = `Your workshop voucher worth ${voucherValue} ${currency}`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Greeting */}
      <Section style={greetingSectionStyle}>
        <Text style={greetingStyle}>Dear {firstName},</Text>
        <Text style={bodyTextStyle}>
          Thank you for purchasing a workshop voucher! Your order has been confirmed.
        </Text>
        <Text style={bodyTextStyle}>
          Keep this email safe — it serves as your proof of purchase.
        </Text>
      </Section>

      {/* Voucher Details Card */}
      <Section style={voucherCardStyle}>
        {/* Header with badge - using table for email compatibility */}
        <table style={voucherHeaderTableStyle}>
          <tbody>
            <tr>
              <td style={voucherHeaderLeftStyle}>
                <Text style={voucherTitleStyle}>🎓 Workshop Voucher</Text>
              </td>
              {bonusPercent && bonusPercent > 0 && (
                <td style={voucherHeaderRightStyle}>
                  <span style={bonusBadgeStyle}>+{bonusPercent}% BONUS</span>
                </td>
              )}
            </tr>
          </tbody>
        </table>

        <div style={voucherDetailsStyle}>
          <InfoBlock
            label="Amount Paid"
            value={`${amountPaid.toFixed(2)} ${currency}`}
          />
          {bonusPercent && bonusPercent > 0 && (
            <InfoBlock
              label="Bonus Credit"
              value={`+${((amountPaid * bonusPercent) / 100).toFixed(2)} ${currency}`}
              valueStyle={{ color: colors.brand.green, fontWeight: 600 }}
            />
          )}
          <InfoBlock
            label="Total Voucher Value"
            value={`${voucherValue.toFixed(2)} ${currency}`}
            valueStyle={{ fontSize: '24px', fontWeight: 700, color: colors.brand.green }}
          />
        </div>

        <div style={infoBoxStyle}>
          <Text style={infoBoxTextStyle}>
            <strong>⏱️ Processing Time:</strong> Your voucher will be manually issued within{' '}
            <strong>7 business days</strong>. You&apos;ll receive a separate email with your voucher
            code and instructions on how to use it.
          </Text>
        </div>
      </Section>

      {/* What's Next Section */}
      <Section style={nextStepsSectionStyle}>
        <Text style={sectionTitleStyle}>What Happens Next?</Text>
        <ol style={listStyle}>
          <li style={listItemStyle}>
            <Text style={listItemTextStyle}>
              <strong>Voucher Issuance:</strong> Our team will manually process your voucher within
              7 business days.
            </Text>
          </li>
          <li style={listItemStyle}>
            <Text style={listItemTextStyle}>
              <strong>Email Notification:</strong> You&apos;ll receive an email with your unique voucher
              code.
            </Text>
          </li>
          <li style={listItemStyle}>
            <Text style={listItemTextStyle}>
              <strong>Browse Workshops:</strong> Use your voucher credit for conference workshops or
              ZurichJS meetup workshops.
            </Text>
          </li>
          <li style={listItemStyle}>
            <Text style={listItemTextStyle}>
              <strong>Redeem Anytime:</strong> Your voucher doesn&apos;t expire and can be used for any
              eligible workshop.
            </Text>
          </li>
        </ol>
      </Section>

      {/* Quick Actions */}
      {orderUrl && (
        <Section style={actionsSectionStyle}>
          <Text style={sectionTitleStyle}>Quick Actions</Text>
          <div style={{ textAlign: 'center' }}>
            <Button href={orderUrl} style={actionButtonPrimaryStyle}>
              Manage Order
            </Button>
          </div>
        </Section>
      )}

      <Hr style={dividerStyle} />

      {/* Footer Information */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          <strong>Need help?</strong> Contact us at{' '}
          <Link href={`mailto:${supportEmail}`} style={linkStyle}>
            {supportEmail}
          </Link>
        </Text>
        <Text style={footerTextStyle}>
          <Link href="https://conf.zurichjs.com" style={linkStyle}>
            Conference Website
          </Link>
        </Text>
        <Text style={footerTextStyle}>
          Thank you for your purchase!
          <br />
          <strong>The ZurichJS Team</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default VoucherPurchaseEmail;

// Styles
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
  color: colors.text.secondary, // Better contrast than muted
  margin: `0 0 ${spacing.base}px 0`,
};

const voucherCardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.card}px`,
  padding: spacing['2xl'],
  marginBottom: spacing['3xl'],
};

// Table-based header for better email client compatibility
const voucherHeaderTableStyle: React.CSSProperties = {
  width: '100%',
  marginBottom: spacing.lg,
  borderBottom: `2px solid ${colors.border.default}`,
  paddingBottom: spacing.base,
  borderCollapse: 'collapse' as const,
};

const voucherHeaderLeftStyle: React.CSSProperties = {
  textAlign: 'left' as const,
  verticalAlign: 'middle' as const,
  padding: `${spacing.xs}px 0`,
};

const voucherHeaderRightStyle: React.CSSProperties = {
  textAlign: 'right' as const,
  verticalAlign: 'middle' as const,
  padding: `${spacing.xs}px 0`,
};

const voucherTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  lineHeight: '24px',
  fontWeight: 700,
  color: colors.text.primary,
  margin: 0,
};

const bonusBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: colors.brand.yellow,
  color: '#000000', // Pure black for maximum contrast on yellow
  padding: `${spacing.xs}px ${spacing.base}px`,
  borderRadius: `${radii.badge}px`,
  fontSize: '11px',
  fontWeight: 800,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  border: '2px solid #000000', // Add border for extra definition
};

const voucherDetailsStyle: React.CSSProperties = {
  marginBottom: spacing.lg,
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: '#FEF7CD', // Light yellow background
  borderLeft: `4px solid ${colors.brand.yellow}`,
  border: `1px solid #E5D84F`, // Slightly darker yellow border
  padding: spacing.base,
  borderRadius: `${radii.button}px`,
};

const infoBoxTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.primary, // Dark text on light background
  margin: 0,
};

const nextStepsSectionStyle: React.CSSProperties = {
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
  color: colors.text.secondary, // Better contrast
  margin: 0,
};

const actionsSectionStyle: React.CSSProperties = {
  marginBottom: spacing['3xl'],
};

const actionButtonStyle: React.CSSProperties = {
  display: 'block',
  padding: `${spacing.md}px ${spacing.base}px`,
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.button}px`,
  color: colors.text.primary,
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center' as const,
  cursor: 'pointer',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const actionButtonPrimaryStyle: React.CSSProperties = {
  ...actionButtonStyle,
  backgroundColor: colors.brand.yellow,
  border: 'none',
  color: colors.text.primary,
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing['3xl']}px 0`,
};

const footerSectionStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  marginTop: spacing['3xl'],
};

const footerTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary, // Better contrast for footer
  margin: `0 0 ${spacing.md}px 0`,
  textAlign: 'center' as const,
};

const linkStyle: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'underline',
};
