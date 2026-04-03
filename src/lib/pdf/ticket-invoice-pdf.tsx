/**
 * PDF Ticket Invoice Template
 * Generates a PDF invoice for individual and group ticket purchases
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { TicketInvoicePDFProps } from '@/lib/types/ticket-invoice';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  companyInfo: {
    width: '50%',
  },
  invoiceInfo: {
    width: '40%',
    textAlign: 'right',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  divider: {
    borderBottom: '2px solid #F1E271',
    marginBottom: 20,
  },
  billTo: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  billToName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  billToText: {
    fontSize: 10,
    color: '#333333',
    marginBottom: 2,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottom: '1px solid #E5E7EB',
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottom: '1px solid #E5E7EB',
  },
  tableCell: {
    fontSize: 10,
    color: '#000000',
  },
  descriptionCol: {
    width: '50%',
  },
  quantityCol: {
    width: '15%',
    textAlign: 'center',
  },
  priceCol: {
    width: '17.5%',
    textAlign: 'right',
  },
  totalCol: {
    width: '17.5%',
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottom: '1px solid #E5E7EB',
  },
  totalLabel: {
    fontSize: 10,
    color: '#666666',
  },
  totalValue: {
    fontSize: 10,
    color: '#000000',
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    backgroundColor: '#F1E271',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  paymentInfo: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#F0FDF4',
    borderRadius: 4,
  },
  paymentTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 9,
    color: '#166534',
    width: '30%',
  },
  paymentValue: {
    fontSize: 9,
    color: '#166534',
    fontWeight: 'bold',
    width: '70%',
  },
  notes: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#92400E',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#999999',
    marginBottom: 2,
  },
});

/**
 * Format amount from cents to currency string
 */
function formatAmount(cents: number, currency: string): string {
  return (
    (cents / 100).toLocaleString('en-CH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    ' ' +
    currency.toUpperCase()
  );
}

/**
 * PDF Ticket Invoice Document Component
 */
export const TicketInvoicePDF: React.FC<TicketInvoicePDFProps> = ({
  invoiceNumber,
  issueDate,
  billing,
  lineItems,
  subtotalAmount,
  discountAmount,
  totalAmount,
  currency,
  paymentReference,
  notes,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>Swiss JavaScript Group</Text>
            <Text style={styles.companyDetail}>Alderstrasse 30</Text>
            <Text style={styles.companyDetail}>8008 Zürich, Switzerland</Text>
            <Text style={styles.companyDetail}>UID: CHE-255.581.547</Text>
            <Text style={styles.companyDetail}>hello@zurichjs.com</Text>
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>TICKET INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
            <Text style={styles.invoiceDate}>Issue Date: {issueDate}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        <View style={styles.billTo}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.billToName}>{billing.name}</Text>
          {billing.company && (
            <Text style={styles.billToText}>{billing.company}</Text>
          )}
          {billing.addressLine1 && (
            <Text style={styles.billToText}>{billing.addressLine1}</Text>
          )}
          {billing.addressLine2 && (
            <Text style={styles.billToText}>{billing.addressLine2}</Text>
          )}
          {(billing.postalCode || billing.city) && (
            <Text style={styles.billToText}>
              {[billing.postalCode, billing.city].filter(Boolean).join(' ')}
            </Text>
          )}
          {billing.state && <Text style={styles.billToText}>{billing.state}</Text>}
          {billing.country && <Text style={styles.billToText}>{billing.country}</Text>}
          <Text style={styles.billToText}>{billing.email}</Text>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descriptionCol]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.quantityCol]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.priceCol]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.totalCol]}>Total</Text>
          </View>

          {/* Table Rows */}
          {lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.descriptionCol]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.quantityCol]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.priceCol]}>
                {formatAmount(item.unitAmount, currency)}
              </Text>
              <Text style={[styles.tableCell, styles.totalCol]}>
                {formatAmount(item.totalAmount, currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          {discountAmount > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Gross Amount</Text>
                <Text style={styles.totalValue}>{formatAmount(subtotalAmount, currency)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount Applied</Text>
                <Text style={styles.totalValue}>-{formatAmount(discountAmount, currency)}</Text>
              </View>
            </>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Paid</Text>
            <Text style={styles.grandTotalValue}>{formatAmount(totalAmount, currency)}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>Payment Received</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Status:</Text>
            <Text style={styles.paymentValue}>PAID</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Reference:</Text>
            <Text style={styles.paymentValue}>{paymentReference}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Amount:</Text>
            <Text style={styles.paymentValue}>{formatAmount(totalAmount, currency)}</Text>
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your purchase!</Text>
          <Text style={styles.footerText}>
            Questions? Contact us at hello@zurichjs.com
          </Text>
        </View>
      </Page>
    </Document>
  );
};
