/**
 * FinancialsTab - Display comprehensive financial overview and analytics
 */

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { FinancialData } from './types';

const LineChart = dynamic(() => import('recharts').then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((mod) => mod.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then((mod) => mod.Legend), { ssr: false });

const formatCHF = (cents: number) => (cents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function FinancialsTab() {
  const [financials, setFinancials] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFinancials(); }, []);

  const fetchFinancials = async () => {
    try {
      const res = await fetch('/api/admin/financials');
      if (res.ok) setFinancials(await res.json());
    } catch (err) { console.error('Failed to fetch financials:', err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-12 space-y-4"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div><p className="text-base font-medium text-black">Loading financial data...</p></div>;
  if (!financials) return <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200"><p className="text-base font-medium text-black">Failed to load financial data</p></div>;

  const { summary, byCategory, byStage } = financials;

  return (
    <div className="space-y-6">
      <SummaryCards summary={summary} />
      {financials.revenueBreakdown && <RevenueByChannel financials={financials} />}
      {financials.purchasesTimeSeries?.length > 0 && <PurchasesChart timeSeries={financials.purchasesTimeSeries} />}
      <RevenueByCategory byCategory={byCategory} />
      <RevenueByStage byStage={byStage} />
    </div>
  );
}

function SummaryCards({ summary }: { summary: FinancialData['summary'] }) {
  const cards = [
    { title: 'Gross Revenue', value: `${formatCHF(summary.grossRevenue)} CHF`, subtitle: `${summary.confirmedTickets} confirmed tickets`, color: 'green', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { title: 'Stripe Fees', value: `-${formatCHF(summary.totalStripeFees)} CHF`, subtitle: `${summary.grossRevenue > 0 ? ((summary.totalStripeFees / summary.grossRevenue) * 100).toFixed(1) : 0}% of gross`, color: 'purple', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { title: 'Net Revenue', value: `${formatCHF(summary.netRevenue)} CHF`, subtitle: 'After Stripe fees', color: 'blue', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { title: 'Total Refunded', value: `${formatCHF(summary.totalRefunded)} CHF`, subtitle: `${summary.refundedTickets} refunded tickets`, color: 'red', icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((c) => (
        <div key={c.title} className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">{c.title}</h3>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-${c.color}-100 rounded-lg flex items-center justify-center`}>
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-${c.color}-700`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} /></svg>
            </div>
          </div>
          <p className={`text-xl font-bold text-${c.color}-600`}>{c.value}</p>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium">{c.subtitle}</p>
        </div>
      ))}
    </div>
  );
}

function RevenueByChannel({ financials }: { financials: FinancialData }) {
  const { revenueBreakdown, b2bSummary, sponsorshipSummary } = financials;
  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg sm:text-xl font-bold text-black">Revenue by Sales Channel</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Breakdown of revenue by individual sales, B2B sales, and complimentary tickets</p>
      </div>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChannelCard title="Individual Sales" color="blue" amount={revenueBreakdown.individual.total.revenue} count={revenueBreakdown.individual.total.count} fees={revenueBreakdown.individual.total.fees}
            details={[{ label: 'via Stripe', count: revenueBreakdown.individual.stripe.count, amount: revenueBreakdown.individual.stripe.revenue },
              ...(revenueBreakdown.individual.bank_transfer.count > 0 ? [{ label: 'via Bank Transfer', count: revenueBreakdown.individual.bank_transfer.count, amount: revenueBreakdown.individual.bank_transfer.revenue }] : [])]} />
          <ChannelCard title="B2B Sales" color="green" amount={revenueBreakdown.b2b.total.revenue} count={revenueBreakdown.b2b.total.count} fees={revenueBreakdown.b2b.total.fees}
            details={[{ label: 'via Bank Transfer', count: revenueBreakdown.b2b.bank_transfer.count, amount: revenueBreakdown.b2b.bank_transfer.revenue },
              ...(revenueBreakdown.b2b.stripe.count > 0 ? [{ label: 'via Stripe', count: revenueBreakdown.b2b.stripe.count, amount: revenueBreakdown.b2b.stripe.revenue }] : [])]} />
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 rounded-full bg-gray-400"></div><h4 className="font-bold text-gray-900">Complimentary</h4></div>
            <p className="text-2xl font-bold text-gray-700">{revenueBreakdown.complimentary.count} tickets</p>
            <p className="text-sm text-gray-600 mt-1">Free tickets (no payment)</p>
          </div>
        </div>
        {b2bSummary && b2bSummary.totalInvoices > 0 && <B2BPipeline summary={b2bSummary} />}
        {sponsorshipSummary && sponsorshipSummary.totalDeals > 0 && <SponsorshipSummary summary={sponsorshipSummary} />}
      </div>
    </div>
  );
}

function ChannelCard({ title, color, amount, count, fees, details }: { title: string; color: string; amount: number; count: number; fees: number; details: { label: string; count: number; amount: number }[] }) {
  return (
    <div className={`bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-lg p-5 border border-${color}-200`}>
      <div className="flex items-center gap-2 mb-3"><div className={`w-3 h-3 rounded-full bg-${color}-500`}></div><h4 className="font-bold text-gray-900">{title}</h4></div>
      <p className={`text-2xl font-bold text-${color}-700`}>{formatCHF(amount)} CHF</p>
      <p className="text-sm text-gray-600 mt-1">{count.toLocaleString('de-CH')} tickets</p>
      <p className="text-xs text-gray-500 mt-1">Stripe fees: {formatCHF(fees)} CHF</p>
      <div className={`mt-4 pt-3 border-t border-${color}-200 space-y-2 text-sm`}>
        {details.map((d) => (
          <div key={d.label} className="flex justify-between"><span className="text-gray-600">{d.label}</span><span className="font-medium text-gray-900">{d.count.toLocaleString('de-CH')} tickets · {formatCHF(d.amount)} CHF</span></div>
        ))}
      </div>
    </div>
  );
}

function B2BPipeline({ summary }: { summary: NonNullable<FinancialData['b2bSummary']> }) {
  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-3">B2B Invoice Pipeline</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><p className="text-gray-600">Paid Invoices</p><p className="font-bold text-green-700">{summary.paidInvoices}</p><p className="text-xs text-gray-500">{formatCHF(summary.paidRevenue)} CHF</p></div>
        <div><p className="text-gray-600">Pending Payment</p><p className="font-bold text-amber-600">{summary.pendingInvoices}</p><p className="text-xs text-gray-500">{formatCHF(summary.pendingRevenue)} CHF</p></div>
        <div><p className="text-gray-600">Draft Invoices</p><p className="font-bold text-gray-600">{summary.draftInvoices}</p></div>
        <div><p className="text-gray-600">Total Invoices</p><p className="font-bold text-gray-900">{summary.totalInvoices}</p></div>
      </div>
    </div>
  );
}

function SponsorshipSummary({ summary }: { summary: NonNullable<FinancialData['sponsorshipSummary']> }) {
  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-3">Sponsorship Revenue</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><p className="text-gray-600">Paid (CHF)</p><p className="font-bold text-green-700">{summary.paidDeals} deals</p><p className="text-xs text-gray-500">{formatCHF(summary.revenueByCurrency.CHF.paid)} CHF</p></div>
        <div><p className="text-gray-600">Paid (EUR)</p><p className="font-bold text-green-700">{formatCHF(summary.revenueByCurrency.EUR.paid)} EUR</p></div>
        <div><p className="text-gray-600">Pending (CHF)</p><p className="font-bold text-amber-600">{summary.pendingDeals} deals</p><p className="text-xs text-gray-500">{formatCHF(summary.revenueByCurrency.CHF.pending)} CHF</p></div>
        <div><p className="text-gray-600">Total Deals</p><p className="font-bold text-gray-900">{summary.totalDeals}</p></div>
      </div>
    </div>
  );
}

function PurchasesChart({ timeSeries }: { timeSeries: FinancialData['purchasesTimeSeries'] }) {
  const data = timeSeries.map((item) => ({ ...item, date: new Date(item.date).toLocaleDateString('en-CH', { month: 'short', day: 'numeric' }), revenueChf: item.revenue / 100, cumulativeRevenueChf: item.cumulativeRevenue / 100 }));
  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg sm:text-xl font-bold text-black">Ticket Purchases Over Time</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Daily ticket sales and cumulative total</p>
      </div>
      <div className="p-4 sm:p-6">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} />
              <YAxis yAxisId="left" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} label={{ value: 'Tickets', angle: -90, position: 'insideLeft', fill: '#6b7280' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={{ stroke: '#e5e7eb' }} label={{ value: 'Revenue (CHF)', angle: 90, position: 'insideRight', fill: '#6b7280' }} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value, name) => { const n = typeof value === 'number' ? value : 0; if (name === 'Daily Sales') return [n, 'Daily Sales']; if (name === 'Cumulative') return [n, 'Cumulative Tickets']; if (name === 'Daily Revenue') return [`${n.toFixed(2)} CHF`, 'Daily Revenue']; return [n, String(name)]; }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="count" name="Daily Sales" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#f97316' }} />
              <Line yAxisId="left" type="monotone" dataKey="cumulative" name="Cumulative" stroke="#16a34a" strokeWidth={3} dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#16a34a' }} />
              <Line yAxisId="right" type="monotone" dataKey="revenueChf" name="Daily Revenue" stroke="#7c3aed" strokeWidth={3} strokeDasharray="5 5" dot={{ fill: '#7c3aed', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#7c3aed' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function RevenueByCategory({ byCategory }: { byCategory: FinancialData['byCategory'] }) {
  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg sm:text-xl font-bold text-black">Revenue by Category</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Breakdown by ticket type</p>
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        {Object.entries(byCategory).map(([category, data]) => (
          <div key={category} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <span className="font-bold text-black capitalize text-sm sm:text-base">{category}</span>
            <div className="text-left sm:text-right"><span className="text-black font-bold text-base sm:text-lg">{(data.revenue / 100).toFixed(2)} CHF</span><span className="text-gray-600 text-xs sm:text-sm ml-2 sm:ml-3 font-medium">({data.count} {data.count === 1 ? 'ticket' : 'tickets'})</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueByStage({ byStage }: { byStage: FinancialData['byStage'] }) {
  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg sm:text-xl font-bold text-black">Revenue by Purchase Stage</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Breakdown by pricing period</p>
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        {Object.entries(byStage).map(([stage, data]) => (
          <div key={stage} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <span className="font-bold text-black capitalize text-sm sm:text-base">{stage.replace('_', ' ')}</span>
            <div className="text-left sm:text-right"><span className="text-black font-bold text-base sm:text-lg">{(data.revenue / 100).toFixed(2)} CHF</span><span className="text-gray-600 text-xs sm:text-sm ml-2 sm:ml-3 font-medium">({data.count} {data.count === 1 ? 'ticket' : 'tickets'})</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
