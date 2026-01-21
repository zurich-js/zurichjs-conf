/**
 * Sponsorship Invoice PDF Template
 * Generates a PDF invoice for sponsorship deals
 */

import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import type { SponsorshipInvoicePDFProps } from '@/lib/types/sponsorship';
import { styles, formatAmount } from './sponsorship-invoice-pdf.styles';

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
  conversion,
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
            <Text style={styles.grandTotalLabel}>{conversion ? 'Base Total (CHF)' : 'Total Due'}</Text>
            <Text style={styles.grandTotalValue}>{formatAmount(total, currency)}</Text>
          </View>
        </View>

        {/* Currency Conversion Section - Only shown when paying in EUR */}
        {conversion && (
          <View style={styles.conversionSection}>
            <Text style={styles.conversionTitle}>Currency Conversion (CHF to EUR)</Text>
            <View style={styles.conversionRow}>
              <Text style={styles.conversionLabel}>Base Amount:</Text>
              <Text style={styles.conversionValue}>{formatAmount(conversion.baseAmountChf, 'CHF')}</Text>
            </View>
            <View style={styles.conversionRow}>
              <Text style={styles.conversionLabel}>Conversion Rate:</Text>
              <Text style={styles.conversionValue}>1 CHF = {conversion.conversionRateChfToEur.toFixed(4)} EUR</Text>
            </View>
            <View style={styles.conversionRow}>
              <Text style={styles.conversionLabel}>Justification:</Text>
              <Text style={styles.conversionValue}>{conversion.justification}</Text>
            </View>
            <View style={styles.amountDueHighlight}>
              <Text style={styles.amountDueLabel}>Amount Payable in EUR</Text>
              <Text style={styles.amountDueValue}>{formatAmount(conversion.convertedAmountEur, 'EUR')}</Text>
            </View>
            <Text style={styles.conversionNote}>
              Please pay the EUR amount shown above. The CHF amount is for reference only.
            </Text>
          </View>
        )}

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
