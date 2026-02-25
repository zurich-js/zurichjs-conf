/**
 * FinancialsTab - Display comprehensive financial overview and analytics
 */

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { DollarSign, CreditCard, TrendingUp, RotateCcw, Ticket, Handshake, Building2, Gift } from 'lucide-react';
import type { FinancialData } from './types';
import { formatAmount, getCombinedByCurrency, getGrandTotal } from './financials-utils';

const LineChart = dynamic(() => import('recharts').then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((mod) => mod.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then((mod) => mod.Legend), { ssr: false });

const formatCHF = formatAmount;

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
      <TotalRevenueSummary summary={summary} sponsorshipSummary={financials.sponsorshipSummary} />
      <RevenueBreakdown summary={summary} sponsorshipSummary={financials.sponsorshipSummary} />
      {financials.revenueBreakdown && <TicketRevenueByChannel financials={financials} />}
      {financials.sponsorshipSummary && financials.sponsorshipSummary.totalDeals > 0 && (
        <SponsorshipRevenueCard summary={financials.sponsorshipSummary} />
      )}
      {financials.purchasesTimeSeries?.length > 0 && <PurchasesChart timeSeries={financials.purchasesTimeSeries} />}
      <RevenueByCategory byCategory={byCategory} />
      <RevenueByStage byStage={byStage} />
    </div>
  );
}

/** Top-level summary cards per currency */
function TotalRevenueSummary({ summary, sponsorshipSummary }: { summary: FinancialData['summary']; sponsorshipSummary?: FinancialData['sponsorshipSummary'] }) {
  const byCurrency = getCombinedByCurrency(summary, sponsorshipSummary);
  const grand = getGrandTotal(byCurrency, summary);
  const multiCurrency = byCurrency.length > 1;

  return (
    <div className="space-y-4">
      {/* Grand total when multiple currencies */}
      {multiCurrency && (
        <div className="bg-black rounded-xl p-4 sm:p-6 border border-gray-800">
          <h3 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Grand Total (all currencies combined)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Gross</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{formatCHF(grand.totalGross)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Fees</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-400">-{formatCHF(grand.totalFees)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Net</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-400">{formatCHF(grand.totalNet)}</p>
            </div>
          </div>
          {grand.totalPending > 0 && (
            <p className="text-xs text-amber-400 mt-3">+ {formatCHF(grand.totalPending)} pending sponsorship revenue</p>
          )}
          <p className="text-xs text-gray-500 mt-2">Mixed-currency sum ({byCurrency.map(c => c.currency).join(' + ')})</p>
        </div>
      )}

      {byCurrency.map(({ currency: cur, combinedGross, fees, combinedNet }) => {
        const feePercent = combinedGross > 0 ? ((fees / combinedGross) * 100).toFixed(1) : '0';
        const refunded = summary.refundedByCurrency?.[cur] || (cur === 'CHF' ? summary.totalRefunded : 0);

        const cards = [
          { title: 'Combined Gross', value: `${formatCHF(combinedGross)} ${cur}`, subtitle: 'Tickets + Sponsorships', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100', iconColor: 'text-green-700' },
          { title: 'Stripe Fees', value: `-${formatCHF(fees)} ${cur}`, subtitle: `${feePercent}% of gross`, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-100', iconColor: 'text-purple-700' },
          { title: 'Combined Net', value: `${formatCHF(combinedNet)} ${cur}`, subtitle: 'After Stripe fees', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100', iconColor: 'text-blue-700' },
          { title: 'Refunded', value: `${formatCHF(refunded)} ${cur}`, subtitle: cur === 'CHF' ? `${summary.refundedTickets} refunded tickets` : 'Refunded amount', icon: RotateCcw, color: 'text-red-600', bg: 'bg-red-100', iconColor: 'text-red-700' },
        ];

        return (
          <div key={cur}>
            {multiCurrency && (
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">{cur}</h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {cards.map((c) => (
                <div key={c.title} className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">{c.title}</h3>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 ${c.bg} rounded-lg flex items-center justify-center`}>
                      <c.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${c.iconColor}`} />
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                  <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium">{c.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Breakdown card: shows how combined gross is composed, per currency */
function RevenueBreakdown({ summary, sponsorshipSummary }: { summary: FinancialData['summary']; sponsorshipSummary?: FinancialData['sponsorshipSummary'] }) {
  const byCurrency = getCombinedByCurrency(summary, sponsorshipSummary);
  const hasPending = byCurrency.some(c => c.sponsorPending > 0);

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg sm:text-xl font-bold text-black">Revenue Breakdown</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">How the combined gross revenue is composed</p>
      </div>
      <div className="p-4 sm:p-6 space-y-6">
        {byCurrency.map(({ currency: cur, ticketGross, sponsorPaid: sPaid, fees, combinedNet }) => (
          <div key={cur}>
            {byCurrency.length > 1 && (
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{cur}</h4>
            )}
            <div className="space-y-3">
              {ticketGross > 0 && (
                <BreakdownRow icon={Ticket} label="Ticket Sales (gross)" value={`${formatCHF(ticketGross)} ${cur}`} detail={cur === 'CHF' ? `${summary.confirmedTickets} confirmed tickets` : undefined} color="text-blue-700" />
              )}
              {sPaid > 0 && (
                <BreakdownRow icon={Handshake} label="Sponsorship Revenue (paid)" value={`${formatCHF(sPaid)} ${cur}`} color="text-green-700" />
              )}
              {fees > 0 && (
                <BreakdownRow icon={CreditCard} label="Stripe Fees" value={`-${formatCHF(fees)} ${cur}`} color="text-purple-700" />
              )}
              <div className="flex items-center justify-between p-4 bg-black rounded-lg">
                <p className="font-bold text-white text-sm sm:text-base">Net Revenue</p>
                <p className="font-bold text-lg sm:text-xl text-white">{formatCHF(combinedNet)} {cur}</p>
              </div>
            </div>
          </div>
        ))}

        {hasPending && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm">
            <p className="font-semibold text-amber-800">Pending Sponsorship Revenue</p>
            <p className="text-amber-700 mt-1">
              {byCurrency.filter(c => c.sponsorPending > 0).map(c => `${formatCHF(c.sponsorPending)} ${c.currency}`).join(' + ')}
              {' '}awaiting payment ({sponsorshipSummary?.pendingDeals || 0} deals)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownRow({ icon: Icon, label, value, detail, color }: { icon: typeof Ticket; label: string; value: string; detail?: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="font-semibold text-gray-900 text-sm sm:text-base">{label}</p>
          {detail && <p className="text-xs text-gray-500">{detail}</p>}
        </div>
      </div>
      <p className={`font-bold text-base sm:text-lg ${color}`}>{value}</p>
    </div>
  );
}

/** Ticket revenue by sales channel */
function TicketRevenueByChannel({ financials }: { financials: FinancialData }) {
  const { revenueBreakdown, b2bSummary } = financials;
  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg sm:text-xl font-bold text-black">Ticket Revenue by Channel</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Individual sales, B2B sales, and complimentary tickets</p>
      </div>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChannelCard title="Individual Sales" icon={Ticket} color="blue" amount={revenueBreakdown.individual.total.revenue} count={revenueBreakdown.individual.total.count} fees={revenueBreakdown.individual.total.fees}
            details={[{ label: 'via Stripe', count: revenueBreakdown.individual.stripe.count, amount: revenueBreakdown.individual.stripe.revenue },
              ...(revenueBreakdown.individual.bank_transfer.count > 0 ? [{ label: 'via Bank Transfer', count: revenueBreakdown.individual.bank_transfer.count, amount: revenueBreakdown.individual.bank_transfer.revenue }] : [])]} />
          <ChannelCard title="B2B Sales" icon={Building2} color="green" amount={revenueBreakdown.b2b.total.revenue} count={revenueBreakdown.b2b.total.count} fees={revenueBreakdown.b2b.total.fees}
            details={[{ label: 'via Bank Transfer', count: revenueBreakdown.b2b.bank_transfer.count, amount: revenueBreakdown.b2b.bank_transfer.revenue },
              ...(revenueBreakdown.b2b.stripe.count > 0 ? [{ label: 'via Stripe', count: revenueBreakdown.b2b.stripe.count, amount: revenueBreakdown.b2b.stripe.revenue }] : [])]} />
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-gray-500" />
              <h4 className="font-bold text-gray-900">Complimentary</h4>
            </div>
            <p className="text-2xl font-bold text-gray-700">{revenueBreakdown.complimentary.count} tickets</p>
            <p className="text-sm text-gray-600 mt-1">Free tickets (no payment)</p>
          </div>
        </div>
        {b2bSummary && b2bSummary.totalInvoices > 0 && <B2BPipeline summary={b2bSummary} />}
      </div>
    </div>
  );
}

function ChannelCard({ title, icon: Icon, color, amount, count, fees, details }: { title: string; icon: typeof Ticket; color: string; amount: number; count: number; fees: number; details: { label: string; count: number; amount: number }[] }) {
  const colorMap: Record<string, { bg: string; border: string; text: string; divider: string; dot: string }> = {
    blue: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', text: 'text-blue-700', divider: 'border-blue-200', dot: 'text-blue-500' },
    green: { bg: 'from-green-50 to-green-100', border: 'border-green-200', text: 'text-green-700', divider: 'border-green-200', dot: 'text-green-500' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-gradient-to-br ${c.bg} rounded-lg p-5 ${c.border} border`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${c.dot}`} />
        <h4 className="font-bold text-gray-900">{title}</h4>
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{formatCHF(amount)} CHF</p>
      <p className="text-sm text-gray-600 mt-1">{count.toLocaleString('de-CH')} tickets</p>
      {fees > 0 && <p className="text-xs text-gray-500 mt-1">Stripe fees: {formatCHF(fees)} CHF</p>}
      {details.length > 0 && (
        <div className={`mt-4 pt-3 border-t ${c.divider} space-y-2 text-sm`}>
          {details.map((d) => (
            <div key={d.label} className="flex justify-between">
              <span className="text-gray-600">{d.label}</span>
              <span className="font-medium text-gray-900">{d.count.toLocaleString('de-CH')} · {formatCHF(d.amount)} CHF</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function B2BPipeline({ summary }: { summary: NonNullable<FinancialData['b2bSummary']> }) {
  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h4 className="font-semibold text-gray-900 mb-3">B2B Invoice Pipeline</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-gray-600 text-xs font-medium uppercase">Paid</p>
          <p className="font-bold text-green-700 text-lg">{summary.paidInvoices}</p>
          <p className="text-xs text-gray-500">{formatCHF(summary.paidRevenue)} CHF</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-gray-600 text-xs font-medium uppercase">Pending</p>
          <p className="font-bold text-amber-600 text-lg">{summary.pendingInvoices}</p>
          <p className="text-xs text-gray-500">{formatCHF(summary.pendingRevenue)} CHF</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-xs font-medium uppercase">Draft</p>
          <p className="font-bold text-gray-600 text-lg">{summary.draftInvoices}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-xs font-medium uppercase">Total</p>
          <p className="font-bold text-gray-900 text-lg">{summary.totalInvoices}</p>
        </div>
      </div>
    </div>
  );
}

/** Standalone sponsorship revenue card */
function SponsorshipRevenueCard({ summary }: { summary: NonNullable<FinancialData['sponsorshipSummary']> }) {
  const hasTiers = Object.keys(summary.byTier).length > 0;

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg sm:text-xl font-bold text-black">Sponsorship Revenue</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">{summary.totalDeals} deals total ({summary.paidDeals} paid, {summary.pendingDeals} pending)</p>
      </div>
      <div className="p-4 sm:p-6">
        {/* Revenue by currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs font-medium uppercase text-gray-500 mb-1">Paid (CHF)</p>
            <p className="text-2xl font-bold text-green-700">{formatCHF(summary.revenueByCurrency.CHF.paid)} CHF</p>
            {summary.revenueByCurrency.CHF.pending > 0 && (
              <p className="text-xs text-amber-600 mt-1">+ {formatCHF(summary.revenueByCurrency.CHF.pending)} CHF pending</p>
            )}
          </div>
          {(summary.revenueByCurrency.EUR.paid > 0 || summary.revenueByCurrency.EUR.pending > 0) && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs font-medium uppercase text-gray-500 mb-1">Paid (EUR)</p>
              <p className="text-2xl font-bold text-green-700">{formatCHF(summary.revenueByCurrency.EUR.paid)} EUR</p>
              {summary.revenueByCurrency.EUR.pending > 0 && (
                <p className="text-xs text-amber-600 mt-1">+ {formatCHF(summary.revenueByCurrency.EUR.pending)} EUR pending</p>
              )}
            </div>
          )}
        </div>

        {/* By tier */}
        {hasTiers && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 text-sm">By Tier</h4>
            <div className="space-y-2">
              {Object.entries(summary.byTier).map(([tier, data]) => (
                <div key={tier} className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900 text-sm capitalize">{tier}</span>
                    <span className="text-xs text-gray-500">({data.count} {data.count === 1 ? 'deal' : 'deals'})</span>
                  </div>
                  <div className="flex gap-3 text-sm">
                    {data.revenueCHF > 0 && <span className="font-bold text-green-700">{formatCHF(data.revenueCHF)} CHF</span>}
                    {data.revenueEUR > 0 && <span className="font-bold text-green-700">{formatCHF(data.revenueEUR)} EUR</span>}
                    {data.revenueCHF === 0 && data.revenueEUR === 0 && <span className="text-gray-400 text-xs">No paid revenue</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
            <div className="text-left sm:text-right"><span className="text-black font-bold text-base sm:text-lg">{formatCHF(data.revenue)} CHF</span><span className="text-gray-600 text-xs sm:text-sm ml-2 sm:ml-3 font-medium">({data.count} {data.count === 1 ? 'ticket' : 'tickets'})</span></div>
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
            <div className="text-left sm:text-right"><span className="text-black font-bold text-base sm:text-lg">{formatCHF(data.revenue)} CHF</span><span className="text-gray-600 text-xs sm:text-sm ml-2 sm:ml-3 font-medium">({data.count} {data.count === 1 ? 'ticket' : 'tickets'})</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
