/**
 * Discount Code Email Template
 * Sent when a visitor unlocks the discount popup offer with their email.
 * Carries the single-use code and its expiry so the offer survives a closed tab.
 */

import { Button, Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface DiscountCodeEmailProps {
  code: string;
  percentOff: number;
  /** How long the code stays valid, in minutes */
  validMinutes: number;
  /** Absolute expiry, ISO string — rendered in Zurich time */
  expiresAtISO: string;
  ticketsUrl: string;
  supportEmail?: string;
}

function formatZurichTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zurich',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatDuration(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${minutes} minutes`;
}

export const DiscountCodeEmail: React.FC<DiscountCodeEmailProps> = ({
  code,
  percentOff,
  validMinutes,
  expiresAtISO,
  ticketsUrl,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = `Your ${percentOff}% code — valid for the next ${formatDuration(validMinutes)}`;

  return (
    <EmailLayout preheader={preheader}>
      <Section style={greetingSectionStyle}>
        <Text style={greetingStyle}>Your {percentOff}% discount is locked in</Text>
        <Text style={bodyTextStyle}>
          Here&apos;s the code you unlocked on the site. It&apos;s single-use and valid for the
          next <strong>{formatDuration(validMinutes)}</strong> — until{' '}
          <strong>{formatZurichTime(expiresAtISO)} (Zurich time)</strong>.
        </Text>
      </Section>

      <Section style={codeCardStyle}>
        <Text style={codeStyle}>{code}</Text>
        <Text style={codeFinePrintStyle}>
          Enter it in the promo code field at checkout.
        </Text>
      </Section>

      <Section style={ctaSectionStyle}>
        <div style={{ textAlign: 'center' }}>
          <Button href={ticketsUrl} style={ctaButtonStyle}>
            Get your ticket
          </Button>
        </div>
      </Section>

      <Hr style={dividerStyle} />

      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          <Link href="https://conf.zurichjs.com" style={linkStyle}>
            ZurichJS Conference 2026
          </Link>
        </Text>
        <Text style={footerTextStyle}>September 11, 2026 · Technopark Zurich</Text>
        <Text style={footerMutedStyle}>
          You received this email because you requested a discount code on our website. Questions?{' '}
          <Link href={`mailto:${supportEmail}`} style={linkStyle}>
            {supportEmail}
          </Link>
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default DiscountCodeEmail;

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
  color: colors.text.secondary,
  margin: `0 0 ${spacing.base}px 0`,
};

const codeCardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `2px dashed ${colors.brand.yellow}`,
  borderRadius: `${radii.card}px`,
  padding: spacing['2xl'],
  marginBottom: spacing['3xl'],
  textAlign: 'center' as const,
};

const codeStyle: React.CSSProperties = {
  fontSize: '24px',
  lineHeight: '32px',
  fontWeight: 700,
  letterSpacing: '4px',
  fontFamily: 'ui-monospace, Menlo, monospace',
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const codeFinePrintStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: colors.text.muted,
  margin: 0,
};

const ctaSectionStyle: React.CSSProperties = {
  marginBottom: spacing['3xl'],
  textAlign: 'center' as const,
};

const ctaButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: `${spacing.md}px ${spacing['2xl']}px`,
  backgroundColor: colors.brand.yellow,
  borderRadius: `${radii.button}px`,
  color: colors.text.primary,
  fontSize: '16px',
  fontWeight: 700,
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing['3xl']}px 0`,
};

const footerSectionStyle: React.CSSProperties = {
  textAlign: 'center' as const,
};

const footerTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `0 0 ${spacing.sm}px 0`,
  textAlign: 'center' as const,
};

const footerMutedStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: colors.text.muted,
  margin: `${spacing.base}px 0 0 0`,
  textAlign: 'center' as const,
};

const linkStyle: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'underline',
};
