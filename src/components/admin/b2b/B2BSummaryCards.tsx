/**
 * B2B Summary Cards - Statistics display for B2B orders
 */

import { FileText, Clock3, CheckCircle2, Wallet2, ReceiptText } from 'lucide-react';
import { AdminOverviewCards } from '@/components/admin/common';
import { formatAmount, type B2BSummaryStats } from './types';

interface B2BSummaryCardsProps {
  stats: B2BSummaryStats;
}

export function B2BSummaryCards({ stats }: B2BSummaryCardsProps) {
  return (
    <AdminOverviewCards
      items={[
        { label: 'Total Invoices', value: stats.total, icon: FileText },
        { label: 'Draft', value: stats.draft, icon: ReceiptText },
        { label: 'Awaiting Payment', value: stats.sent, icon: Clock3, valueClassName: 'text-blue-700' },
        { label: 'Paid', value: stats.paid, icon: CheckCircle2, valueClassName: 'text-green-700' },
        { label: 'Total Revenue', value: formatAmount(stats.totalValue), icon: Wallet2 },
      ]}
      columnsClassName="grid-cols-2 lg:grid-cols-5"
    />
  );
}
