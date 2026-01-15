/**
 * VIP Upgrade Email Template
 * Sent to attendees when their ticket is upgraded to VIP
 */

import { Button, Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, InfoBlock, BadgePill } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';
import type { UpgradeMode, UpgradeStatus } from '@/lib/types/ticket-upgrade';
import { VIP_PERKS, BANK_TRANSFER_DETAILS } from '@/lib/types/ticket-upgrade';

export interface VipUpgradeEmailProps {
  firstName: string;
  ticketId: string;
  upgradeMode: UpgradeMode;
  upgradeStatus: UpgradeStatus;
  /** Amount in cents */
  amount: number | null;
  currency: string | null;
  stripePaymentUrl?: string | null;
  bankTransferReference?: string | null;
  /** ISO date string */
  bankTransferDueDate?: string | null;
  manageTicketUrl: string;
  supportEmail?: string;
}

/**
 * Format amount from cents to currency string
 */
function formatAmount(cents: number, currency: string): string {
  const amount = cents / 100;
  const formatted = new Intl.NumberFormat('en-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${currency.toUpperCase()} ${formatted}`;
}

/**
 * Format date string for display
 */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const VipUpgradeEmail: React.FC<VipUpgradeEmailProps> = ({
  firstName = 'Attendee',
  ticketId = '00000000-0000-0000-0000-000000000000',
  upgradeMode = 'complimentary',
  upgradeStatus = 'completed',
  amount = null,
  currency = null,
  stripePaymentUrl = null,
  bankTransferReference = null,
  bankTransferDueDate = null,
  manageTicketUrl = 'https://zurichjs-conf.vercel.app/manage-order',
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = upgradeStatus === 'completed'
    ? 'Your ticket has been upgraded to VIP!'
    : 'Complete your VIP upgrade for ZurichJS Conference 2026';

  const isCompleted = upgradeStatus === 'completed';
  const isPendingPayment = upgradeStatus === 'pending_payment';
  const isPendingBankTransfer = upgradeStatus === 'pending_bank_transfer';

  return (
    <EmailLayout preheader={preheader}>
      {/* Greeting */}
      <Section style={greetingSectionStyle}>
        <Text style={greetingStyle}>Dear {firstName},</Text>
        <Text style={headlineStyle}>You&apos;re now VIP!</Text>
        <Text style={bodyTextStyle}>
          {isCompleted
            ? 'Great news! Your ZurichJS Conference 2026 ticket has been upgraded from Standard to VIP.'
            : isPendingPayment
              ? 'Your VIP upgrade is ready! Complete your payment to unlock your VIP benefits.'
              : 'Your VIP upgrade is in progress! Complete your bank transfer to unlock your VIP benefits.'
          }
        </Text>
      </Section>

      {/* VIP Badge */}
      <Section style={badgeSectionStyle}>
        <BadgePill>
          {isCompleted ? 'VIP CONFIRMED' : 'VIP UPGRADE PENDING'}
        </BadgePill>
      </Section>

      {/* VIP Perks */}
      <Section style={perksSectionStyle}>
        <Text style={sectionTitleStyle}>Your VIP Benefits</Text>
        <ul style={perksListStyle}>
          {VIP_PERKS.map((perk, index) => (
            <li key={index} style={perkItemStyle}>
              <span style={perkBulletStyle}>✨</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Hr style={dividerStyle} />

      {/* Upgrade Details Section - For Records */}
      <Section style={detailsSectionStyle}>
        <Text style={sectionTitleStyle}>Upgrade Details (for your records)</Text>
        <div style={detailsBoxStyle}>
          <InfoBlock
            label="Ticket ID"
            value={ticketId.slice(0, 8).toUpperCase()}
          />
          <InfoBlock
            label="Upgrade Type"
            value="Standard → VIP"
          />
          {upgradeMode === 'complimentary' ? (
            <InfoBlock
              label="Payment"
              value="This was a complimentary upgrade."
            />
          ) : (
            <>
              <InfoBlock
                label="Payment Method"
                value={upgradeMode === 'stripe' ? 'Stripe (Card Payment)' : 'Bank Transfer'}
              />
              {amount && currency && (
                <InfoBlock
                  label="Amount"
                  value={formatAmount(amount, currency)}
                />
              )}
            </>
          )}
        </div>
      </Section>

      {/* Next Steps Section */}
      {!isCompleted && (
        <>
          <Hr style={dividerStyle} />

          <Section style={nextStepsSectionStyle}>
            <Text style={sectionTitleStyle}>Next Steps</Text>

            {isPendingPayment && stripePaymentUrl && (
              <>
                <Text style={bodyTextStyle}>
                  Complete your payment to activate your VIP benefits:
                </Text>
                <table style={{ width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'center', padding: `${spacing.lg}px 0` }}>
                        <Button href={stripePaymentUrl} style={primaryButtonStyle}>
                          Complete Payment
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <Text style={smallTextStyle}>
                  Click the button above to securely pay via Stripe.
                </Text>
              </>
            )}

            {isPendingBankTransfer && (
              <>
                <Text style={bodyTextStyle}>
                  Please transfer the upgrade amount to our bank account:
                </Text>
                <div style={bankDetailsBoxStyle}>
                  <InfoBlock label="Account Holder" value={BANK_TRANSFER_DETAILS.accountHolder} />
                  <InfoBlock label="Bank" value={BANK_TRANSFER_DETAILS.bank} />
                  <InfoBlock label="IBAN" value={BANK_TRANSFER_DETAILS.iban} />
                  {bankTransferReference && (
                    <InfoBlock label="Payment Reference" value={bankTransferReference} />
                  )}
                  {amount && currency && (
                    <InfoBlock label="Amount" value={formatAmount(amount, currency)} />
                  )}
                  {bankTransferDueDate && (
                    <InfoBlock label="Due Date" value={formatDate(bankTransferDueDate)} />
                  )}
                </div>
                <Text style={warningTextStyle}>
                  Important: Please include the payment reference in your transfer so we can identify your payment.
                </Text>
              </>
            )}
          </Section>
        </>
      )}

      {/* Completed confirmation */}
      {isCompleted && upgradeMode !== 'complimentary' && (
        <>
          <Hr style={dividerStyle} />
          <Section style={nextStepsSectionStyle}>
            <Text style={sectionTitleStyle}>Payment Confirmed</Text>
            <Text style={bodyTextStyle}>
              {upgradeMode === 'stripe'
                ? 'Your card payment has been processed successfully.'
                : 'Your bank transfer has been received and confirmed.'}
              {' '}Your VIP benefits are now active!
            </Text>
          </Section>
        </>
      )}

      <Hr style={dividerStyle} />

      {/* Manage Ticket Button */}
      <Section style={actionsSectionStyle}>
        <table style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center' }}>
                <Button href={manageTicketUrl} style={secondaryButtonStyle}>
                  Manage Your Ticket
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
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

export default VipUpgradeEmail;

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

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const perksSectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
};

const perksListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

const perkItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: `${spacing.sm}px`,
  marginBottom: `${spacing.sm}px`,
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.muted,
};

const perkBulletStyle: React.CSSProperties = {
  flexShrink: 0,
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

const bankDetailsBoxStyle: React.CSSProperties = {
  backgroundColor: colors.badge.bg,
  borderRadius: `${radii.card}px`,
  padding: `${spacing.base}px`,
  border: `1px solid ${colors.badge.fg}`,
  marginTop: `${spacing.base}px`,
  marginBottom: `${spacing.base}px`,
};

const warningTextStyle: React.CSSProperties = {
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  color: colors.badge.fg,
  fontWeight: 600,
  margin: 0,
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

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: `${spacing.md}px ${spacing['2xl']}px`,
  backgroundColor: colors.surface.card,
  border: `2px solid ${colors.brand.yellow}`,
  borderRadius: `${radii.button}px`,
  color: colors.text.primary,
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center',
};

const actionsSectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
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

