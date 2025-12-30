/**
 * Partnership Package Email Template
 * Sent to partners with their coupon codes, vouchers, and tracking links
 */

import { Hr, Link, Section, Text, Img } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';
import type { PartnershipType, VoucherPurpose } from '@/lib/types/partnership';

export interface PartnershipPackageEmailProps {
  partnerName: string;
  partnershipName: string;
  partnershipType: PartnershipType;
  couponCodes: Array<{
    code: string;
    description: string;
    discount: string;
    expires_at?: string;
  }>;
  voucherCodes: Array<{
    code: string;
    purpose: VoucherPurpose;
    value: string;
  }>;
  trackingUrl: string;
  logoUrl?: string;
  bannerUrl?: string;
  customMessage?: string;
}

const VOUCHER_PURPOSE_LABELS: Record<VoucherPurpose, string> = {
  community_discount: 'Community Discount',
  raffle: 'Raffle Prize',
  giveaway: 'Giveaway',
  organizer_discount: 'Organizer Discount',
};

export const PartnershipPackageEmail: React.FC<PartnershipPackageEmailProps> = ({
  partnerName,
  partnershipName,
  partnershipType,
  couponCodes,
  voucherCodes,
  trackingUrl,
  logoUrl,
  bannerUrl,
  customMessage,
}) => {
  const preheader = `Your ZurichJS Conference 2026 Partnership Package - ${partnershipName}`;

  const partnershipTypeLabels: Record<PartnershipType, string> = {
    community: 'Community Partner',
    individual: 'Individual Partner',
    company: 'Company Partner',
    sponsor: 'Sponsor',
  };

  return (
    <EmailLayout preheader={preheader}>
      {/* Header */}
      <Section style={headerSectionStyle}>
        {logoUrl && (
          <Img
            src={logoUrl}
            alt="ZurichJS Conference"
            width={80}
            height={80}
            style={logoStyle}
          />
        )}
        <Text style={headerTitleStyle}>Partnership Package</Text>
        <Text style={headerSubtitleStyle}>
          {partnershipTypeLabels[partnershipType]} – {partnershipName}
        </Text>
      </Section>

      {/* Banner */}
      {bannerUrl && (
        <Section style={bannerSectionStyle}>
          <Img
            src={bannerUrl}
            alt="ZurichJS Conference 2026"
            width={600}
            style={bannerImageStyle}
          />
        </Section>
      )}

      {/* Welcome Message */}
      <Section style={cardStyle}>
        <Text style={welcomeTextStyle}>
          Dear {partnerName},
        </Text>
        <Text style={bodyTextStyle}>
          Thank you for partnering with ZurichJS Conference 2026! We&apos;re excited to have you
          on board and can&apos;t wait to see your community at the event.
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

      {/* Coupon Codes Section */}
      {couponCodes.length > 0 && (
        <Section style={cardStyle}>
          <Text style={sectionTitleStyle}>Discount Codes for Your Community</Text>
          <Text style={bodyTextStyle}>
            Share these codes with your community to give them exclusive discounts on conference tickets:
          </Text>

          {couponCodes.map((coupon, index) => (
            <div key={index} style={codeCardStyle}>
              <Text style={codeStyle}>{coupon.code}</Text>
              <Text style={codeDescriptionStyle}>
                {coupon.discount} – {coupon.description}
              </Text>
              {coupon.expires_at && (
                <Text style={codeExpiryStyle}>
                  Valid until {coupon.expires_at}
                </Text>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Voucher Codes Section */}
      {voucherCodes.length > 0 && (
        <Section style={cardStyle}>
          <Text style={sectionTitleStyle}>Voucher Codes</Text>
          <Text style={bodyTextStyle}>
            These vouchers can be used for raffles, giveaways, or organizer discounts:
          </Text>

          {voucherCodes.map((voucher, index) => (
            <div key={index} style={codeCardStyle}>
              <Text style={codeStyle}>{voucher.code}</Text>
              <Text style={codeDescriptionStyle}>
                {voucher.value} – {VOUCHER_PURPOSE_LABELS[voucher.purpose]}
              </Text>
            </div>
          ))}
        </Section>
      )}

      {/* Tracking Link Section */}
      <Section style={cardStyle}>
        <Text style={sectionTitleStyle}>Your Affiliate Link</Text>
        <Text style={bodyTextStyle}>
          Use this link to promote the conference. We&apos;ll track clicks and conversions so you can
          see the impact of your partnership:
        </Text>
        <div style={linkBoxStyle}>
          <Link href={trackingUrl} style={trackingLinkStyle}>
            {trackingUrl}
          </Link>
        </div>
        <Text style={tipTextStyle}>
          💡 Tip: Add this link to your community website, newsletter, or social media posts.
        </Text>
      </Section>

      {/* Assets Section */}
      <Section style={cardStyle}>
        <Text style={sectionTitleStyle}>Promotional Assets</Text>
        <Text style={bodyTextStyle}>
          Need logos, banners, or other promotional materials? We&apos;ve got you covered:
        </Text>
        <Link
          href="https://conf.zurichjs.com/partners/assets"
          style={buttonStyle}
        >
          Download Partner Assets
        </Link>
      </Section>

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          Questions? Reply to this email or reach out to us at{' '}
          <Link href="mailto:hello@zurichjs.com" style={linkStyle}>
            hello@zurichjs.com
          </Link>
        </Text>
        <Text style={footerTextStyle}>
          ZurichJS Conference 2026 • September 11, 2026 • Technopark Zürich
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default PartnershipPackageEmail;

// Styles
const headerSectionStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  padding: spacing['2xl'],
  borderRadius: `${radii.card}px ${radii.card}px 0 0`,
  marginBottom: 0,
  textAlign: 'center',
};

const logoStyle: React.CSSProperties = {
  margin: '0 auto',
  marginBottom: spacing.base,
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

const bannerSectionStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
};

const bannerImageStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  display: 'block',
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
  border: `1px solid #BAE6FD`,
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
};

const codeStyle: React.CSSProperties = {
  fontSize: '20px',
  lineHeight: '28px',
  fontWeight: 700,
  color: colors.text.primary,
  fontFamily: 'monospace',
  margin: 0,
  letterSpacing: '1px',
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

const linkBoxStyle: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
  marginBottom: spacing.base,
  wordBreak: 'break-all' as const,
};

const trackingLinkStyle: React.CSSProperties = {
  fontSize: '14px',
  color: colors.brand.blue,
  textDecoration: 'none',
};

const tipTextStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '20px',
  color: colors.text.muted,
  margin: 0,
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
