/**
 * Ticket Purchase Confirmation Email Template
 * Sent to customers after successful ticket purchase
 */

import { Button, Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, TicketCard, type TicketCardProps } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface TicketPurchaseEmailProps extends TicketCardProps {
  firstName: string;
  orderUrl?: string;
  calendarUrl?: string;
  venueMapUrl?: string;
  refundPolicyUrl?: string;
  supportEmail?: string;
  notes?: string;
}

export const TicketPurchaseEmail: React.FC<TicketPurchaseEmailProps> = ({
  firstName,
  orderUrl,
  calendarUrl,
  venueMapUrl,
  refundPolicyUrl = 'https://conf.zurichjs.com/refund-policy',
  supportEmail = 'tickets@zurichjs.com',
  notes,
  ...ticketCardProps
}) => {
  const preheader = `Your ${ticketCardProps.tierLabel} for ${ticketCardProps.eventName}`;

  return (
    <EmailLayout preheader={preheader}>
      {/* Greeting */}
      <Section style={greetingSectionStyle}>
        <Text style={greetingStyle}>Dear {firstName},</Text>
        <Text style={bodyTextStyle}>
          Your ticket purchase has been confirmed. We&apos;re excited to welcome you to{' '}
          {ticketCardProps.eventName}.
        </Text>
        <Text style={bodyTextStyle}>
          Keep this email safe — your QR code below is your entry to the conference.
        </Text>
      </Section>

      {/* Ticket Card */}
      <TicketCard {...ticketCardProps} />

      {/* Quick Actions */}
      <Section style={actionsSectionStyle}>
        <Text style={sectionTitleStyle}>Quick Actions</Text>
        <div style={actionsGridStyle}>
          {calendarUrl && (
            <Button href={calendarUrl} style={actionButtonStyle}>
              📅 Add to Calendar
            </Button>
          )}
          {venueMapUrl && (
            <Button href={venueMapUrl} style={actionButtonStyle}>
              📍 View Map
            </Button>
          )}
          {orderUrl && (
            <Button href={orderUrl} style={actionButtonPrimaryStyle}>
              Manage Order
            </Button>
          )}
        </div>
      </Section>

      {/* Conditional Notes */}
      {notes && (
        <Section style={notesSectionStyle}>
          <Text style={notesLabelStyle}>Important Note</Text>
          <Text style={notesTextStyle}>{notes}</Text>
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
          <Link href={refundPolicyUrl} style={linkStyle}>
            View Refund Policy
          </Link>
          {' • '}
          <Link href="https://conf.zurichjs.com" style={linkStyle}>
            Conference Website
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

export default TicketPurchaseEmail;

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
  color: colors.text.muted,
  margin: `0 0 ${spacing.base}px 0`,
};

const actionsSectionStyle: React.CSSProperties = {
  marginBottom: spacing['3xl'],
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const actionsGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: `${spacing.md}px`,
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
};

const actionButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: `${spacing.md}px ${spacing.lg}px`,
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.button}px`,
  color: colors.text.primary,
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center',
  cursor: 'pointer',
  width: '100%',
};

const actionButtonPrimaryStyle: React.CSSProperties = {
  ...actionButtonStyle,
  backgroundColor: colors.brand.yellow,
  border: 'none',
  color: colors.text.primary,
};

const notesSectionStyle: React.CSSProperties = {
  backgroundColor: colors.badge.bg,
  borderLeft: `4px solid ${colors.badge.fg}`,
  padding: spacing.base,
  borderRadius: `${radii.button}px`,
  marginBottom: spacing['3xl'],
};

const notesLabelStyle: React.CSSProperties = {
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  fontWeight: typography.label.fontWeight,
  textTransform: typography.label.textTransform,
  letterSpacing: typography.label.letterSpacing,
  color: colors.badge.fg,
  margin: `0 0 ${spacing.xs}px 0`,
};

const notesTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.primary,
  margin: 0,
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing['3xl']}px 0`,
};

const footerSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: spacing['3xl'],
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
