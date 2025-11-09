/**
 * PDF Ticket Template
 * Generates a PDF version of the conference ticket
 */

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '3px solid #F1E271',
    paddingBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid #E5E7EB',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    color: '#666666',
    width: '40%',
  },
  value: {
    fontSize: 11,
    color: '#000000',
    fontWeight: 'bold',
    width: '60%',
    textAlign: 'right',
  },
  qrSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
    marginBottom: 15,
  },
  qrText: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#F1E271',
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
    padding: '6 12',
    borderRadius: 4,
    marginTop: 10,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1px solid #E5E7EB',
  },
  footerText: {
    fontSize: 9,
    color: '#999999',
    marginBottom: 4,
    textAlign: 'center',
  },
  importantNote: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 6,
    marginTop: 20,
  },
  importantNoteText: {
    fontSize: 10,
    color: '#92400E',
    lineHeight: 1.5,
  },
  notesBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 6,
    marginTop: 15,
  },
  notesText: {
    fontSize: 9,
    color: '#1E40AF',
    lineHeight: 1.6,
  },
});

export interface TicketPDFProps {
  ticketId: string;
  attendeeName: string;
  attendeeEmail: string;
  ticketType: string;
  orderNumber: string;
  amountPaid: number;
  currency: string;
  conferenceDate: string;
  conferenceName: string;
  venueName: string;
  venueAddress: string;
  qrCodeDataUrl: string; // Base64 data URL of QR code
  notes?: string;
}

/**
 * PDF Ticket Document Component
 */
export const TicketPDF: React.FC<TicketPDFProps> = ({
  ticketId,
  attendeeName,
  attendeeEmail,
  ticketType,
  orderNumber,
  amountPaid,
  currency,
  conferenceDate,
  conferenceName,
  venueName,
  venueAddress,
  qrCodeDataUrl,
  notes,
}) => {
  const formattedAmount = `${(amountPaid / 100).toFixed(2)} ${currency.toUpperCase()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{conferenceName}</Text>
          <Text style={styles.subtitle}>Conference Ticket</Text>
        </View>

        {/* Attendee Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendee Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{attendeeName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{attendeeEmail}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Ticket Type</Text>
            <Text style={styles.value}>{ticketType}</Text>
          </View>
        </View>

        {/* Ticket Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ticket Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Ticket ID</Text>
            <Text style={styles.value}>{ticketId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Order Number</Text>
            <Text style={styles.value}>{orderNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount Paid</Text>
            <Text style={styles.value}>{formattedAmount}</Text>
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{conferenceDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Venue</Text>
            <Text style={styles.value}>{venueName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{venueAddress}</Text>
          </View>
        </View>

        {/* Additional Notes */}
        {notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Image src={qrCodeDataUrl} style={styles.qrImage} />
          <Text style={styles.qrText}>
            Scan this QR code at the entrance for check-in
          </Text>
          <Text style={styles.qrText}>
            Ticket ID: {ticketId}
          </Text>
        </View>

        {/* Important Information */}
        <View style={styles.importantNote}>
          <Text style={styles.importantNoteText}>
            IMPORTANT: Please bring this ticket (printed or on your mobile device) and a valid
            photo ID to the event. The name on your ticket must match your ID.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This ticket is non-transferable without prior authorization.
          </Text>
          <Text style={styles.footerText}>
            For questions or support, contact us at hello@zurichjs.com
          </Text>
          <Text style={styles.footerText}>
            © 2026 ZurichJS Conference. All rights reserved.
          </Text>
        </View>
      </Page>
    </Document>
  );
};
