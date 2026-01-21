/**
 * Sponsorship Invoice PDF Styles
 * Style definitions for the invoice PDF template
 */

import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
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
  conversionSection: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    borderLeft: '3px solid #3B82F6',
  },
  conversionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  conversionRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  conversionLabel: {
    fontSize: 9,
    color: '#1E40AF',
    width: '40%',
  },
  conversionValue: {
    fontSize: 9,
    color: '#000000',
    width: '60%',
  },
  conversionNote: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
  },
  amountDueHighlight: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  amountDueLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  amountDueValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
export function formatAmount(cents: number, currency: string): string {
  const absAmount = Math.abs(cents);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount / 100);
  const sign = cents < 0 ? '-' : '';
  return `${sign}${formatted} ${currency.toUpperCase()}`;
}
