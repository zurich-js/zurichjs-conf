/**
 * Workshop Seat Purchase Confirmation Email Template.
 * Sent to each attendee (seat) after a successful workshop purchase.
 */

import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout, InfoBlock } from '../components';
import { colors } from '../design/tokens';

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
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = `Your seat at ${workshopTitle} is confirmed`;
  const timeRange =
    startTime && endTime ? `${startTime.slice(0, 5)} – ${endTime.slice(0, 5)}` : startTime?.slice(0, 5) ?? null;

  return (
    <EmailLayout preheader={preheader}>
      <Section style={greetingSection}>
        <Text style={greeting}>Dear {firstName},</Text>
        <Text style={body}>
          Your seat at <strong>{workshopTitle}</strong> is confirmed — see you at ZurichJS Engineering Day!
        </Text>
        {seatLabel && <Text style={muted}>{seatLabel}</Text>}
      </Section>

      <Section style={card}>
        <Text style={cardTitle}>🎓 {workshopTitle}</Text>
        {workshopDescription && <Text style={body}>{workshopDescription}</Text>}
        <div style={{ marginTop: 16 }}>
          {instructorName && <InfoBlock label="Instructor" value={instructorName} />}
          {date && <InfoBlock label="Date" value={date} />}
          {timeRange && <InfoBlock label="Time" value={timeRange} />}
          {room && <InfoBlock label="Room" value={room} />}
          <InfoBlock label="Amount paid" value={`${(amountPaid / 100).toFixed(2)} ${currency}`} />
        </div>
      </Section>

      {(calendarUrl || workshopUrl) && (
        <Section style={actions}>
          {calendarUrl && (
            <Link href={calendarUrl} style={primaryLink}>
              Add to Google Calendar
            </Link>
          )}
          {workshopUrl && (
            <Link href={workshopUrl} style={secondaryLink}>
              View workshop details
            </Link>
          )}
        </Section>
      )}

      <Hr style={divider} />

      <Section>
        <Text style={footer}>
          Questions? Email us at{' '}
          <Link href={`mailto:${supportEmail}`} style={link}>
            {supportEmail}
          </Link>
          .
        </Text>
        <Text style={footer}>
          See you soon,
          <br />
          <strong>The ZurichJS Team</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

const greetingSection: React.CSSProperties = { marginBottom: 16 };
const greeting: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: colors.text.primary,
  margin: '0 0 8px',
};
const body: React.CSSProperties = {
  fontSize: 14,
  color: colors.text.primary,
  lineHeight: 1.6,
  margin: '0 0 8px',
};
const muted: React.CSSProperties = {
  ...body,
  color: colors.text.muted,
  fontSize: 13,
};
const card: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  borderRadius: 12,
  padding: '20px 24px',
  margin: '16px 0',
};
const cardTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: colors.text.primary,
  margin: '0 0 8px',
};
const actions: React.CSSProperties = {
  marginTop: 16,
  textAlign: 'center' as const,
};
const primaryLink: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 18px',
  backgroundColor: colors.brand.blue,
  color: '#fff',
  borderRadius: 8,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: 13,
  marginRight: 8,
};
const secondaryLink: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 18px',
  color: colors.brand.blue,
  textDecoration: 'none',
  fontWeight: 500,
  fontSize: 13,
};
const divider: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: '24px 0',
};
const footer: React.CSSProperties = {
  fontSize: 13,
  color: colors.text.muted,
  lineHeight: 1.6,
  margin: '0 0 6px',
};
const link: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'none',
};
