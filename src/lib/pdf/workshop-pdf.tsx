/**
 * PDF Workshop Ticket Template
 * Generates a PDF version of the workshop registration confirmation
 * Design aligned with ticket-pdf.tsx
 */

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

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
});

export interface WorkshopPDFProps {
  registrationId: string;
  attendeeName: string;
  attendeeEmail: string;
  workshopTitle: string;
  instructorName?: string | null;
  workshopDate: string;
  workshopTime?: string | null;
  room?: string | null;
  amountPaid: number;
  currency: string;
  qrCodeDataUrl: string;
}

export const WorkshopPDF: React.FC<WorkshopPDFProps> = ({
  registrationId,
  attendeeName,
  attendeeEmail,
  workshopTitle,
  instructorName,
  workshopDate,
  workshopTime,
  room,
  amountPaid,
  currency,
  qrCodeDataUrl,
}) => {
  const formattedAmount = `${(amountPaid / 100).toFixed(2)} ${currency.toUpperCase()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ZurichJS Engineering Day</Text>
          <Text style={styles.subtitle}>Workshop Registration</Text>
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
        </View>

        {/* Workshop Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workshop Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Workshop</Text>
            <Text style={styles.value}>{workshopTitle}</Text>
          </View>
          {instructorName && (
            <View style={styles.row}>
              <Text style={styles.label}>Instructor</Text>
              <Text style={styles.value}>{instructorName}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{workshopDate}</Text>
          </View>
          {workshopTime && (
            <View style={styles.row}>
              <Text style={styles.label}>Time</Text>
              <Text style={styles.value}>{workshopTime}</Text>
            </View>
          )}
          {room && (
            <View style={styles.row}>
              <Text style={styles.label}>Room</Text>
              <Text style={styles.value}>{room}</Text>
            </View>
          )}
        </View>

        {/* Registration Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registration Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Registration ID</Text>
            <Text style={styles.value}>{registrationId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount Paid</Text>
            <Text style={styles.value}>{formattedAmount}</Text>
          </View>
        </View>

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Image src={qrCodeDataUrl} style={styles.qrImage} />
          <Text style={styles.qrText}>
            Scan this QR code at the workshop entrance for check-in
          </Text>
          <Text style={styles.qrText}>
            Registration ID: {registrationId}
          </Text>
        </View>

        {/* Important Information */}
        <View style={styles.importantNote}>
          <Text style={styles.importantNoteText}>
            IMPORTANT: Please bring this registration (printed or on your mobile device) to the
            workshop. Arrive early to get settled in before the session starts.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
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
