/**
 * Registrants and Revenue panels for the admin workshops page.
 * Extracted so the parent page stays under the max-lines convention.
 */

import { useQuery } from '@tanstack/react-query';
import type { WorkshopRegistrantRow } from '@/lib/workshops/getRegistrations';
import type { WorkshopRevenueSummary } from '@/lib/workshops/getRevenue';

const adminRegistrantsKey = (id: string) => ['admin', 'workshops', 'registrants', id] as const;
const adminRevenueKey = (id: string) => ['admin', 'workshops', 'revenue', id] as const;

async function fetchRegistrants(id: string): Promise<WorkshopRegistrantRow[]> {
  const res = await fetch(`/api/admin/workshops/${id}/registrants`);
  if (!res.ok) throw new Error('Failed to load registrants');
  const data = await res.json();
  return data.registrants as WorkshopRegistrantRow[];
}

async function fetchRevenue(id: string): Promise<WorkshopRevenueSummary> {
  const res = await fetch(`/api/admin/workshops/${id}/revenue`);
  if (!res.ok) throw new Error('Failed to load revenue');
  return (await res.json()) as WorkshopRevenueSummary;
}

export function RegistrantsPanel({ workshopId, onClose }: { workshopId: string; onClose: () => void }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: adminRegistrantsKey(workshopId),
    queryFn: () => fetchRegistrants(workshopId),
  });

  return (
    <div className="rounded border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <div className="text-sm font-semibold">Registrants</div>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer">
          Close
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {isLoading && <div className="p-3 text-xs text-gray-500">Loading…</div>}
        {isError && (
          <div className="p-3 text-xs text-red-700">Error: {(error as Error)?.message}</div>
        )}
        {data && data.length === 0 && (
          <div className="p-3 text-xs text-gray-500">No registrations yet.</div>
        )}
        {data && data.length > 0 && (
          <table className="min-w-full divide-y divide-gray-100 text-left text-xs">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Discount</th>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row) => {
                const name =
                  `${row.first_name ?? row.profile_first_name ?? ''} ${row.last_name ?? row.profile_last_name ?? ''}`.trim() ||
                  '—';
                const email = row.email ?? row.profile_email ?? '—';
                const couponCode =
                  row.coupon_code ?? row.partnership_coupon_code ?? row.partnership_voucher_code ?? '—';
                return (
                  <tr key={row.id}>
                    <td className="px-3 py-2">{name}</td>
                    <td className="px-3 py-2">{email}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {(row.amount_paid / 100).toFixed(2)} {row.currency?.toUpperCase()}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-500">
                      {row.discount_amount ? `-${(row.discount_amount / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono">{couponCode}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function RevenuePanel({ workshopId, onClose }: { workshopId: string; onClose: () => void }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: adminRevenueKey(workshopId),
    queryFn: () => fetchRevenue(workshopId),
  });

  return (
    <div className="rounded border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <div className="text-sm font-semibold">Revenue</div>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer">
          Close
        </button>
      </div>
      <div className="p-3">
        {isLoading && <div className="text-xs text-gray-500">Loading…</div>}
        {isError && <div className="text-xs text-red-700">Error: {(error as Error)?.message}</div>}
        {data && (
          <div className="space-y-2">
            <div className="text-xs text-gray-600">
              Total registrations: <span className="font-semibold">{data.totalRegistrations}</span>
            </div>
            {data.byCurrency.length === 0 ? (
              <div className="text-xs text-gray-500">No confirmed revenue yet.</div>
            ) : (
              <table className="min-w-full text-xs">
                <thead className="text-gray-600">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">Currency</th>
                    <th className="px-2 py-1 text-right font-medium">Gross</th>
                    <th className="px-2 py-1 text-right font-medium">Discount</th>
                    <th className="px-2 py-1 text-right font-medium">Net</th>
                    <th className="px-2 py-1 text-right font-medium"># Seats</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.byCurrency.map((b) => (
                    <tr key={b.currency}>
                      <td className="px-2 py-1">{b.currency}</td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {(b.grossCents / 100).toFixed(2)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-gray-500">
                        {(b.discountCents / 100).toFixed(2)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {(b.netCents / 100).toFixed(2)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">{b.registrations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
