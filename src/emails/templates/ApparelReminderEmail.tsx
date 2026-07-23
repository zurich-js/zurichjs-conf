/**
 * Apparel Size Reminder Email Template
 * Asks ticket holders to tell us their t-shirt (and, for VIPs, hoodie) size
 * via their secure manage-ticket link
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface ApparelReminderEmailProps {
  firstName: string;
  manageTicketUrl: string;
  isVip: boolean;
  missingTshirt: boolean;
  missingHoodie: boolean;
  customMessage?: string;
  supportEmail?: string;
}

export const ApparelReminderEmail: React.FC<ApparelReminderEmailProps> = ({
  firstName,
  manageTicketUrl,
  isVip,
  missingTshirt,
  missingHoodie,
  customMessage,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const missingBoth = isVip && missingTshirt && missingHoodie;
  const missingLabel = missingBoth
    ? 't-shirt and hoodie sizes'
    : missingHoodie && !missingTshirt
      ? 'hoodie size'
      : 't-shirt size';
  const preheader = `Quick favour: tell us your ${missingLabel} for ZurichJS Conference 2026`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>What&apos;s Your Size?</Text>
        <Text style={headerSubtitleStyle}>
          Help us get your conference {missingBoth ? 'apparel' : missingLabel.replace(' size', '').replace(' sizes', '')} right
        </Text>
      </Section>

      {/* Message */}
      <Section style={cardStyle}>
        <Text style={welcomeTextStyle}>Hi {firstName},</Text>
        <Text style={bodyTextStyle}>
          Every attendee of ZurichJS Conference 2026 receives a limited edition conference t-shirt
          {isVip ? ', and as a VIP ticket holder your package also includes an exclusive hoodie' : ''}.
          We&apos;re about to place our order and still need your {missingLabel}.
        </Text>
        <Text style={bodyTextStyle}>
          It takes less than a minute — open your ticket page and pick your size
          {isVip ? 's (the hoodie can be a different size than the t-shirt)' : ''}.
        </Text>

        {customMessage && (
          <>
            <Hr style={dividerStyle} />
            <div style={customMessageBoxStyle}>
              <Text style={customMessageTextStyle}>{customMessage}</Text>
            </div>
          </>
        )}

        <Link href={manageTicketUrl} style={buttonStyle}>
          Choose My Size
        </Link>
      </Section>

      {/* Sizing note */}
      <Section style={cardStyle}>
        <Text style={sectionTitleStyle}>About Sizing</Text>
        <Text style={bodyTextStyle}>
          Sizes range from XS to 4XL in standard unisex fits. While we do our best, we cannot
          guarantee a perfect fit for every body type — if you&apos;re between sizes, we recommend
          sizing up.
        </Text>
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

export default ApparelReminderEmail;

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
  marginBottom: spacing.base,
};

const customMessageTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
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
