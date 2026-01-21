/**
 * B2B Summary Cards - Statistics display for B2B orders
 */

import { formatAmount, type B2BSummaryStats } from './types';

interface B2BSummaryCardsProps {
  stats: B2BSummaryStats;
}

export function B2BSummaryCards({ stats }: B2BSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <p className="text-sm text-gray-700">Total Invoices</p>
        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <p className="text-sm text-gray-700">Draft</p>
        <p className="text-2xl font-bold text-gray-800">{stats.draft}</p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <p className="text-sm text-gray-700">Awaiting Payment</p>
        <p className="text-2xl font-bold text-blue-700">{stats.sent}</p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <p className="text-sm text-gray-700">Paid</p>
        <p className="text-2xl font-bold text-green-700">{stats.paid}</p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <p className="text-sm text-gray-700">Total Revenue</p>
        <p className="text-2xl font-bold text-gray-900">{formatAmount(stats.totalValue)}</p>
      </div>
    </div>
  );
}
