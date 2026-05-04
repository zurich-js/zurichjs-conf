/**
 * VIP Workshop Discount Email Template
 * Sent to VIP ticket holders with their unique workshop discount code
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface VipPerkEmailProps {
  firstName: string;
  couponCode: string;
  discountPercent: number;
  workshopsUrl: string;
  customMessage?: string;
  expiresAt?: string;
  supportEmail?: string;
}

export const VipPerkEmail: React.FC<VipPerkEmailProps> = ({
  firstName,
  couponCode,
  discountPercent,
  workshopsUrl,
  customMessage,
  expiresAt,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = `Your exclusive VIP perk: ${discountPercent}% off workshops at ZurichJS Conference 2026`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>VIP Workshop Discount</Text>
        <Text style={headerSubtitleStyle}>
          Your exclusive {discountPercent}% off workshop perk
        </Text>
      </Section>

      {/* Welcome Message */}
      <Section style={cardStyle}>
        <Text style={welcomeTextStyle}>
          Dear {firstName},
        </Text>
        <Text style={bodyTextStyle}>
          As a VIP ticket holder for ZurichJS Conference 2026, you get an exclusive{' '}
          {discountPercent}% discount on workshops. Use the code below when booking your workshop
          to claim your perk.
        </Text>

        {customMessage && (
          <>
            <Hr style={dividerStyle} />
            <div style={customMessageBoxStyle}>
              <Text style={customMessageTextStyle}>{customMessage}</Text>
            </div>
          </>
        )}
      </Section>

      {/* Coupon Code Section */}
      <Section style={cardStyle}>
        <Text style={sectionTitleStyle}>Your Discount Code</Text>
        <div style={codeCardStyle}>
          <Text style={codeStyle}>{couponCode}</Text>
          <Text style={codeDescriptionStyle}>
            {discountPercent}% off workshops
          </Text>
          {expiresAt && (
            <Text style={codeExpiryStyle}>
              Valid until {expiresAt}
            </Text>
          )}
        </div>
        <Text style={codeNoteStyle}>
          This code is single-use and tied to your VIP ticket.
        </Text>
      </Section>

      {/* CTA Section */}
      <Section style={cardStyle}>
        <Text style={sectionTitleStyle}>Ready to Book?</Text>
        <Text style={bodyTextStyle}>
          Browse our workshops and find the perfect session to level up your skills.
          Apply your discount code at checkout.
        </Text>
        <Link href={workshopsUrl} style={buttonStyle}>
          Browse Workshops
        </Link>
      </Section>

      {/* VIP Perks Reminder */}
      <Section style={cardStyle}>
        <Text style={sectionTitleStyle}>Your VIP Perks</Text>
        <Text style={perkItemStyle}>&#10024; {discountPercent}% off all workshops</Text>
        <Text style={perkItemStyle}>&#10024; Exclusive speaker tour invitation</Text>
        <Text style={perkItemStyle}>&#10024; Limited edition goodies</Text>
      </Section>

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          Questions? Reply to this email or reach out to us at{' '}
          <Link href={`mailto:${supportEmail}`} style={linkStyle}>
            {supportEmail}
          </Link>
        </Text>
        <Text style={footerTextStyle}>
          ZurichJS Conference 2026 &bull; September 11, 2026 &bull; Technopark Z&uuml;rich
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default VipPerkEmail;

// Styles
const headerSectionStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  padding: spacing['2xl'],
  borderRadius: `${radii.card}px ${radii.card}px 0 0`,
  marginBottom: 0,
  textAlign: 'center',
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '28px',
  lineHeight: '36px',
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
  borderRadius: `${radii.card}px`,
  padding: spacing['2xl'],
  marginBottom: spacing.lg,
};

const welcomeTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
  fontWeight: 600,
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: `0 0 ${spacing.base}px 0`,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing.lg}px 0`,
};

const customMessageBoxStyle: React.CSSProperties = {
  backgroundColor: '#F0F9FF',
  border: '1px solid #BAE6FD',
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
};

const customMessageTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
};

const codeCardStyle: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
  marginBottom: spacing.sm,
  textAlign: 'center' as const,
};

const codeStyle: React.CSSProperties = {
  fontSize: '24px',
  lineHeight: '32px',
  fontWeight: 700,
  color: colors.text.primary,
  fontFamily: 'monospace',
  margin: 0,
  letterSpacing: '2px',
};

const codeDescriptionStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '20px',
  color: colors.text.secondary,
  margin: `${spacing.xs}px 0 0 0`,
};

const codeExpiryStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.text.muted,
  margin: `${spacing.xs}px 0 0 0`,
};

const codeNoteStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '16px',
  color: colors.text.muted,
  margin: `${spacing.sm}px 0 0 0`,
  fontStyle: 'italic',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: colors.brand.yellow,
  color: colors.text.primary,
  fontSize: '14px',
  fontWeight: 600,
  padding: `${spacing.sm}px ${spacing.lg}px`,
  borderRadius: `${radii.button}px`,
  textDecoration: 'none',
};

const perkItemStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.8',
  color: colors.text.secondary,
  margin: 0,
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
  margin: `0 0 ${spacing.xs}px 0`,
};

const linkStyle: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'underline',
};
