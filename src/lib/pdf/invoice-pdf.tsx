/**
 * PDF Invoice Template
 * Generates a PDF invoice for B2B sales
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { InvoicePDFProps } from '@/lib/types/b2b';

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
  bankDetails: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  bankTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bankLabel: {
    fontSize: 9,
    color: '#666666',
    width: '30%',
  },
  bankValue: {
    fontSize: 9,
    color: '#000000',
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
  dueDateSubtle: {
    marginTop: 10,
    textAlign: 'center',
  },
  dueDateText: {
    fontSize: 9,
    color: '#666666',
  },
});

/**
 * Format amount from cents to currency string
 */
function formatAmount(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

/**
 * PDF Invoice Document Component
 */
export const InvoicePDF: React.FC<InvoicePDFProps> = ({
  invoiceNumber,
  issueDate,
  dueDate,
  companyName,
  vatId,
  billingAddress,
  contactName,
  contactEmail,
  lineItems,
  subtotal,
  vatRate,
  vatAmount,
  total,
  currency,
  invoiceNotes,
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
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
            <Text style={styles.invoiceDate}>Issue Date: {issueDate}</Text>
            <Text style={styles.invoiceDate}>Due Date: {dueDate}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        <View style={styles.billTo}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.billToName}>{companyName}</Text>
          <Text style={styles.billToText}>Attn: {contactName}</Text>
          <Text style={styles.billToText}>{billingAddress.street}</Text>
          <Text style={styles.billToText}>
            {billingAddress.postalCode} {billingAddress.city}
          </Text>
          <Text style={styles.billToText}>{billingAddress.country}</Text>
          {vatId && <Text style={styles.billToText}>VAT ID: {vatId}</Text>}
          <Text style={styles.billToText}>{contactEmail}</Text>
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
                {formatAmount(item.unitPrice, currency)}
              </Text>
              <Text style={[styles.tableCell, styles.totalCol]}>
                {formatAmount(item.total, currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatAmount(subtotal, currency)}</Text>
          </View>
          {vatRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT ({vatRate}%)</Text>
              <Text style={styles.totalValue}>{formatAmount(vatAmount, currency)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Due</Text>
            <Text style={styles.grandTotalValue}>{formatAmount(total, currency)}</Text>
          </View>
        </View>

        {/* Payment Due Date - Subtle */}
        <View style={styles.dueDateSubtle}>
          <Text style={styles.dueDateText}>Payment due by {dueDate}</Text>
        </View>

        {/* Bank Details - Hardcoded PostFinance */}
        <View style={styles.bankDetails}>
          <Text style={styles.bankTitle}>Bank Transfer Details</Text>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account Holder:</Text>
            <Text style={styles.bankValue}>Swiss JavaScript Group</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Address:</Text>
            <Text style={styles.bankValue}>Alderstrasse 30, 8008 Zürich</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Bank:</Text>
            <Text style={styles.bankValue}>PostFinance</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>IBAN:</Text>
            <Text style={styles.bankValue}>CH27 0900 0000 1670 8701 0</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Reference:</Text>
            <Text style={styles.bankValue}>{invoiceNumber}</Text>
          </View>
        </View>

        {/* Invoice Notes (shown on invoice) */}
        {invoiceNotes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoiceNotes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business!</Text>
          <Text style={styles.footerText}>
            Questions? Contact us at hello@zurichjs.com
          </Text>
          <Text style={styles.footerText}>Swiss JavaScript Group · Alderstrasse 30 · 8008 Zürich · CHE-255.581.547</Text>
        </View>
      </Page>
    </Document>
  );
};
