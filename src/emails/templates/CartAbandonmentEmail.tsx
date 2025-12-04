/**
 * Cart Abandonment Recovery Email Template
 * Sent to users who abandoned their cart with items
 */

import { Button, Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

interface CartItem {
  title: string;
  quantity: number;
  price: number;
  currency: string;
}

export interface CartAbandonmentEmailProps {
  firstName?: string;
  cartItems: CartItem[];
  cartTotal: number;
  currency: string;
  cartUrl: string;
  supportEmail?: string;
}

export const CartAbandonmentEmail: React.FC<CartAbandonmentEmailProps> = ({
  firstName,
  cartItems,
  cartTotal,
  currency,
  cartUrl,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = `Your ZurichJS Conference tickets are waiting for you`;
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';

  return (
    <EmailLayout preheader={preheader}>
      {/* Greeting */}
      <Section style={greetingSectionStyle}>
        <Text style={greetingStyle}>{greeting}</Text>
        <Text style={bodyTextStyle}>
          We noticed you didn&apos;t complete your ticket purchase for ZurichJS Conference 2026.
          No worries - your selection is still waiting for you!
        </Text>
      </Section>

      {/* Cart Summary Card */}
      <Section style={cartCardStyle}>
        <Text style={cartTitleStyle}>Your Cart</Text>

        <div style={cartItemsStyle}>
          {cartItems.map((item, index) => (
            <table key={index} width="100%" cellPadding={0} cellSpacing={0} style={cartItemRowStyle}>
              <tr>
                <td style={cartItemInfoStyle}>
                  <Text style={cartItemTitleStyle}>{item.title}</Text>
                  <Text style={cartItemQtyStyle}>Qty: {item.quantity}</Text>
                </td>
                <td style={cartItemPriceCellStyle}>
                  <Text style={cartItemPriceStyle}>
                    {(item.price * item.quantity).toFixed(2)} {item.currency}
                  </Text>
                </td>
              </tr>
            </table>
          ))}
        </div>

        <table width="100%" cellPadding={0} cellSpacing={0} style={cartTotalRowStyle}>
          <tr>
            <td>
              <Text style={cartTotalLabelStyle}>Total</Text>
            </td>
            <td style={cartTotalValueCellStyle}>
              <Text style={cartTotalValueStyle}>
                {cartTotal.toFixed(2)} {currency}
              </Text>
            </td>
          </tr>
        </table>
      </Section>

      {/* CTA Section */}
      <Section style={ctaSectionStyle}>
        <div style={{ textAlign: 'center' }}>
          <Button href={cartUrl} style={ctaButtonStyle}>
            Complete Your Purchase
          </Button>
        </div>
        <Text style={ctaSubtextStyle}>
          Secure your spot at Switzerland&apos;s premier JavaScript conference
        </Text>
      </Section>

      {/* Help Section */}
      <Section style={helpSectionStyle}>
        <Text style={helpTitleStyle}>Need help?</Text>
        <Text style={helpTextStyle}>
          If you ran into any issues or have questions about the conference,
          we&apos;re here to help. Just reply to this email or reach out to us at{' '}
          <Link href={`mailto:${supportEmail}`} style={linkStyle}>
            {supportEmail}
          </Link>
        </Text>
      </Section>

      <Hr style={dividerStyle} />

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          <Link href="https://conf.zurichjs.com" style={linkStyle}>
            ZurichJS Conference 2026
          </Link>
        </Text>
        <Text style={footerTextStyle}>
          September 11, 2026 · Technopark Zurich
        </Text>
        <Text style={footerMutedStyle}>
          You received this email because you started a ticket purchase on our website.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default CartAbandonmentEmail;

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

const cartCardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.card}px`,
  padding: spacing['2xl'],
  marginBottom: spacing['3xl'],
};

const cartTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  lineHeight: '24px',
  fontWeight: 700,
  color: colors.text.primary,
  margin: `0 0 ${spacing.lg}px 0`,
  borderBottom: `2px solid ${colors.border.default}`,
  paddingBottom: spacing.base,
};

const cartItemsStyle: React.CSSProperties = {
  marginBottom: spacing.lg,
};

const cartItemRowStyle: React.CSSProperties = {
  padding: `${spacing.base}px 0`,
  borderBottom: `1px solid ${colors.border.subtle}`,
};

const cartItemInfoStyle: React.CSSProperties = {
  verticalAlign: 'top',
};

const cartItemPriceCellStyle: React.CSSProperties = {
  textAlign: 'right' as const,
  verticalAlign: 'top',
};

const cartItemTitleStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  color: colors.text.primary,
  margin: 0,
};

const cartItemQtyStyle: React.CSSProperties = {
  fontSize: '12px',
  color: colors.text.muted,
  margin: `${spacing.xs}px 0 0 0`,
};

const cartItemPriceStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  color: colors.text.primary,
  margin: 0,
};

const cartTotalRowStyle: React.CSSProperties = {
  paddingTop: spacing.base,
};

const cartTotalValueCellStyle: React.CSSProperties = {
  textAlign: 'right' as const,
};

const cartTotalLabelStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  color: colors.text.primary,
  margin: 0,
};

const cartTotalValueStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: colors.text.primary,
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

const ctaSubtextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  color: colors.text.muted,
  margin: `${spacing.base}px 0 0 0`,
  textAlign: 'center' as const,
};

const helpSectionStyle: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  borderRadius: `${radii.button}px`,
  padding: spacing.lg,
  marginBottom: spacing['3xl'],
};

const helpTitleStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const helpTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: 0,
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
