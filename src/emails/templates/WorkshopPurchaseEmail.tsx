/**
 * Workshop Seat Purchase Confirmation Email Template.
 * Sent to each attendee (seat) after a successful workshop purchase.
 * Design aligned with TicketPurchaseEmail.
 */

import { Button, Hr, Img, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, InfoBlock } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';
import { formatDate } from '../utils/render';

export interface WorkshopPurchaseEmailProps {
  firstName: string;
  workshopTitle: string;
  workshopDescription?: string | null;
  instructorName?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  amountPaid: number;
  currency: string;
  seatLabel?: string | null;
  workshopUrl?: string;
  calendarUrl?: string;
  qrSrc?: string;
  supportEmail?: string;
}

export const WorkshopPurchaseEmail: React.FC<WorkshopPurchaseEmailProps> = ({
  firstName,
  workshopTitle,
  workshopDescription,
  instructorName,
  date,
  startTime,
  endTime,
  room,
  amountPaid,
  currency,
  seatLabel,
  workshopUrl,
  calendarUrl,
  qrSrc,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = `Your seat at ${workshopTitle} is confirmed`;
  const timeRange =
    startTime && endTime ? `${startTime.slice(0, 5)} – ${endTime.slice(0, 5)}` : startTime?.slice(0, 5) ?? null;

  const formattedDate = date
    ? formatDate(date + 'T00:00:00', 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <EmailLayout preheader={preheader}>
      {/* Greeting */}
      <Section style={greetingSectionStyle}>
        <Text style={greetingStyle}>Dear {firstName},</Text>
        <Text style={bodyTextStyle}>
          Your seat at <strong>{workshopTitle}</strong> is confirmed — see you at ZurichJS Engineering Day!
        </Text>
        {seatLabel && <Text style={bodyTextStyle}>{seatLabel}</Text>}
      </Section>

      {/* Workshop Details Card */}
      <Section style={cardStyle}>
        <Text style={cardTitleStyle}>🎓 {workshopTitle}</Text>
        {workshopDescription && <Text style={cardBodyStyle}>{workshopDescription}</Text>}
        <div style={{ marginTop: spacing.base }}>
          {instructorName && <InfoBlock label="Instructor" value={instructorName} />}
          {formattedDate && <InfoBlock label="Date" value={formattedDate} />}
          {timeRange && <InfoBlock label="Time" value={timeRange} />}
          {room && <InfoBlock label="Room" value={room} />}
          <InfoBlock label="Amount paid" value={`${(amountPaid / 100).toFixed(2)} ${currency}`} />
        </div>

        {qrSrc && (
          <div style={{ textAlign: 'center' as const, marginTop: spacing.xl }}>
            <Text style={{ ...sectionTitleStyle, textAlign: 'center' as const }}>Your Workshop Entry QR Code</Text>
            <Img src={qrSrc} alt="Workshop QR Code" width="180" height="180" style={{ margin: '0 auto' }} />
            <Text style={{ ...bodyTextStyle, textAlign: 'center' as const, marginTop: spacing.sm }}>
              Scan this code at the workshop entrance for check-in
            </Text>
          </div>
        )}
      </Section>

      {/* Quick Actions */}
      {(calendarUrl || workshopUrl) && (
        <Section style={actionsSectionStyle}>
          <Text style={sectionTitleStyle}>Quick Actions</Text>
          <table style={actionsTableStyle}>
            <tbody>
              <tr>
                {calendarUrl && (
                  <td style={actionCellStyle}>
                    <Button href={calendarUrl} style={actionButtonStyle}>
                      📅 Add to Calendar
                    </Button>
                  </td>
                )}
                {workshopUrl && (
                  <td style={actionCellStyle}>
                    <Button href={workshopUrl} style={actionButtonPrimaryStyle}>
                      View Workshop Details
                    </Button>
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </Section>
      )}

      <Hr style={dividerStyle} />

      {/* Footer */}
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
          See you at the conference!
          <br />
          <strong>The ZurichJS Team</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

// Styles — aligned with TicketPurchaseEmail
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

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderTop: `4px solid ${colors.brand.yellow}`,
  borderRadius: radii.card,
  padding: spacing.xl,
  marginBottom: spacing['3xl'],
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: typography.h1.fontSize,
  lineHeight: typography.h1.lineHeight,
  fontWeight: typography.h1.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const cardBodyStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.muted,
  margin: `0 0 ${spacing.sm}px 0`,
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

const actionsTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: `${spacing.md}px 0`,
  margin: 0,
};

const actionCellStyle: React.CSSProperties = {
  verticalAlign: 'top',
  width: '50%',
  padding: 0,
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
  textAlign: 'center',
  cursor: 'pointer',
  width: '100%',
  boxSizing: 'border-box',
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
