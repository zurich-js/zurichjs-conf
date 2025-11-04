/**
 * Ticket Confirmation Email Template
 * Sent to customers after successful ticket purchase
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface TicketConfirmationEmailProps {
  customerName: string;
  customerEmail: string;
  ticketType: string;
  orderNumber: string;
  amountPaid: number;
  currency: string;
  conferenceDate: string;
  conferenceName: string;
}

export const TicketConfirmationEmail = ({
  customerName = 'John Doe',
  customerEmail = 'john@example.com',
  ticketType = 'Standard',
  orderNumber = 'ZJS-2026-001',
  amountPaid = 15000,
  currency = 'CHF',
  conferenceDate = 'September 11, 2026',
  conferenceName = 'ZurichJS Conference 2026',
}: TicketConfirmationEmailProps) => {
  const formattedAmount = new Intl.NumberFormat('en-CH', {
    style: 'currency',
    currency: currency,
  }).format(amountPaid / 100);

  return (
    <Html>
      <Head />
      <Preview>Your ticket confirmation for {conferenceName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Ticket Confirmed!</Heading>
            <Text style={text}>
              Thank you for registering for {conferenceName}
            </Text>
          </Section>

          <Section style={content}>
            <Text style={text}>Hi {customerName},</Text>
            <Text style={text}>
              Your ticket purchase has been confirmed! We&apos;re excited to see you at the
              conference.
            </Text>

            <Section style={infoBox}>
              <Text style={infoTitle}>Order Details</Text>
              <Hr style={divider} />
              <Text style={infoRow}>
                <strong>Order Number:</strong> {orderNumber}
              </Text>
              <Text style={infoRow}>
                <strong>Ticket Type:</strong> {ticketType}
              </Text>
              <Text style={infoRow}>
                <strong>Amount Paid:</strong> {formattedAmount}
              </Text>
              <Text style={infoRow}>
                <strong>Email:</strong> {customerEmail}
              </Text>
            </Section>

            <Section style={infoBox}>
              <Text style={infoTitle}>Event Information</Text>
              <Hr style={divider} />
              <Text style={infoRow}>
                <strong>Event:</strong> {conferenceName}
              </Text>
              <Text style={infoRow}>
                <strong>Date:</strong> {conferenceDate}
              </Text>
              <Text style={infoRow}>
                <strong>Location:</strong> Zurich, Switzerland
              </Text>
            </Section>

            <Section style={nextSteps}>
              <Text style={text}>
                <strong>What&apos;s Next?</strong>
              </Text>
              <Text style={text}>
                • You will receive your ticket with a QR code closer to the event date
              </Text>
              <Text style={text}>
                • Check your email for updates about speakers and schedule
              </Text>
              <Text style={text}>
                • Follow us on social media for the latest announcements
              </Text>
            </Section>

            <Text style={text}>
              If you have any questions, feel free to reply to this email or contact us
              at support@zurichjs.com
            </Text>

            <Text style={text}>
              See you at the conference!
              <br />
              The ZurichJS Team
            </Text>
          </Section>

          <Section style={footer}>
            <Hr style={divider} />
            <Text style={footerText}>
              © 2026 ZurichJS Conference. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href="https://zurichjs.com" style={link}>
                Website
              </Link>
              {' • '}
              <Link href="https://zurichjs.com/refund-policy" style={link}>
                Refund Policy
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TicketConfirmationEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 20px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 8px',
  padding: '0',
  lineHeight: '1.2',
};

const content = {
  padding: '0 40px',
};

const text = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const infoBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const infoTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const infoRow = {
  color: '#525252',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
};

const nextSteps = {
  margin: '32px 0',
};

const footer = {
  padding: '0 40px',
  marginTop: '32px',
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '8px 0',
};

const link = {
  color: '#556cd6',
  textDecoration: 'none',
};
