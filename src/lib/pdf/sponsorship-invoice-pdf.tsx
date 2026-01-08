/**
 * Sponsorship Invoice PDF Template
 * Generates a PDF invoice for sponsorship deals
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { SponsorshipInvoicePDFProps } from '@/lib/types/sponsorship';

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
  invoiceSubtitle: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 8,
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
  tierBadge: {
    marginTop: 8,
    padding: '4 8',
    backgroundColor: '#F1E271',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  tierText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
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
  tableRowCredit: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#F0FDF4',
  },
  tableRowAdjustment: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#FEF3C7',
  },
  tableCell: {
    fontSize: 10,
    color: '#000000',
  },
  tableCellMuted: {
    fontSize: 9,
    color: '#666666',
    fontStyle: 'italic',
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
    width: '45%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottom: '1px solid #E5E7EB',
  },
  totalRowCredit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    marginHorizontal: -6,
  },
  totalLabel: {
    fontSize: 10,
    color: '#666666',
  },
  totalLabelCredit: {
    fontSize: 10,
    color: '#15803D',
  },
  totalValue: {
    fontSize: 10,
    color: '#000000',
    fontWeight: 'bold',
  },
  totalValueCredit: {
    fontSize: 10,
    color: '#15803D',
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
  creditIndicator: {
    fontSize: 8,
    color: '#15803D',
    marginTop: 2,
  },
});

/**
 * Format amount from cents to currency string with comma delimiters
 */
function formatAmount(cents: number, currency: string): string {
  const absAmount = Math.abs(cents);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount / 100);
  const sign = cents < 0 ? '-' : '';
  return `${sign}${formatted} ${currency.toUpperCase()}`;
}

/**
 * Sponsorship Invoice PDF Document Component
 */
export const SponsorshipInvoicePDF: React.FC<SponsorshipInvoicePDFProps> = ({
  invoiceNumber,
  issueDate,
  dueDate,
  companyName,
  vatId,
  billingAddress,
  contactName,
  contactEmail,
  tierName,
  lineItems,
  subtotal,
  creditApplied,
  adjustmentsTotal,
  total,
  currency,
  invoiceNotes,
}) => {
  // Separate line items by type for grouping
  const tierBaseItems = lineItems.filter((item) => item.type === 'tier_base');
  const addonItems = lineItems.filter((item) => item.type === 'addon');
  const adjustmentItems = lineItems.filter((item) => item.type === 'adjustment');

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
            <Text style={styles.invoiceSubtitle}>Sponsorship</Text>
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
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{tierName} Sponsor</Text>
          </View>
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

          {/* Tier Base Items */}
          {tierBaseItems.map((item, index) => (
            <View key={`tier-${index}`} style={styles.tableRow}>
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

          {/* Add-on Items */}
          {addonItems.map((item, index) => (
            <View key={`addon-${index}`} style={styles.tableRow}>
              <View style={styles.descriptionCol}>
                <Text style={styles.tableCell}>{item.description}</Text>
                {item.usesCredit && (
                  <Text style={styles.creditIndicator}>* Eligible for add-on credit</Text>
                )}
              </View>
              <Text style={[styles.tableCell, styles.quantityCol]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.priceCol]}>
                {formatAmount(item.unitPrice, currency)}
              </Text>
              <Text style={[styles.tableCell, styles.totalCol]}>
                {formatAmount(item.total, currency)}
              </Text>
            </View>
          ))}

          {/* Adjustment Items */}
          {adjustmentItems.map((item, index) => (
            <View key={`adj-${index}`} style={styles.tableRowAdjustment}>
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

          {creditApplied > 0 && (
            <View style={styles.totalRowCredit}>
              <Text style={styles.totalLabelCredit}>Add-on Credit Applied</Text>
              <Text style={styles.totalValueCredit}>-{formatAmount(creditApplied, currency)}</Text>
            </View>
          )}

          {adjustmentsTotal !== 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Adjustments</Text>
              <Text style={styles.totalValue}>{formatAmount(adjustmentsTotal, currency)}</Text>
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
          <Text style={styles.footerText}>Thank you for sponsoring ZurichJS Conference!</Text>
          <Text style={styles.footerText}>Questions? Contact us at hello@zurichjs.com</Text>
          <Text style={styles.footerText}>
            Swiss JavaScript Group · Alderstrasse 30 · 8008 Zürich · CHE-255.581.547
          </Text>
        </View>
      </Page>
    </Document>
  );
};
