/**
 * Ticket Stock Tab
 *
 * Admin configuration for how many tickets exist in each category, replacing
 * the hardcoded GLOBAL_STOCK_LIMITS constants (which remain as fallback only).
 *
 * Two kinds of limit are configured here:
 * - VIP and Student/Unemployed are per-category allowances.
 * - The standard limit is a TOTAL-ATTENDEE cap: standard tickets are what is
 *   left of the venue once VIP and student/unemployed seats are accounted for,
 *   so its remaining stock is the cap minus every confirmed ticket. Left blank
 *   it is off and standard stays uncapped.
 */

import { useState, useEffect } from 'react';
import { Info, Save, Ticket, TriangleAlert } from 'lucide-react';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { useTicketStockConfig, useUpdateTicketStockConfig } from './hooks';
import type { TicketStockConfigResponse, TicketStockConfigUpdateInput } from './types';

interface NumberFieldProps {
  label: string;
  hint: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}

function NumberField({ label, hint, value, min = 0, onChange }: NumberFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        <input
          type="number"
          min={min}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
        />
      </label>
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>
  );
}

/**
 * The total cap is nullable, so it needs an explicit "no limit" state rather
 * than a number that happens to be blank — an empty input must not read as 0
 * and sell the conference out.
 */
function TotalCapField({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Total attendee cap
        <input
          type="number"
          min={0}
          step={1}
          value={value === null ? '' : value}
          placeholder="No limit"
          onChange={(e) => {
            const raw = e.target.value.trim();
            onChange(raw === '' ? null : Number(raw));
          }}
          className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
        />
      </label>
      <p className="text-xs text-gray-500 mt-1">
        Bounds standard tickets. Remaining standard = this cap minus every confirmed
        ticket (VIP + Student/Unemployed + Standard). Leave blank for no limit.
      </p>
    </div>
  );
}

function StockRow({
  title,
  sold,
  remaining,
  total,
  soldOut,
}: {
  title: string;
  sold: number;
  remaining: number | null;
  total: number | null;
  soldOut: boolean;
}) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-4 text-sm font-medium text-black">{title}</td>
      <td className="py-2 pr-4 text-sm text-gray-700 tabular-nums">{sold}</td>
      <td className="py-2 pr-4 text-sm text-gray-700 tabular-nums">
        {total === null ? <span className="text-gray-400">No limit</span> : total}
      </td>
      <td className="py-2 pr-4 text-sm tabular-nums">
        {remaining === null ? (
          <span className="text-gray-400">&mdash;</span>
        ) : (
          <span className={remaining === 0 ? 'text-red-600 font-semibold' : 'text-black'}>
            {remaining}
          </span>
        )}
      </td>
      <td className="py-2 text-sm">
        {soldOut ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
            Sold out
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
            On sale
          </span>
        )}
      </td>
    </tr>
  );
}

function StockTable({ data }: { data: TicketStockConfigResponse }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-1">Live availability</h3>
      <p className="text-xs text-gray-500 mb-4">
        Exactly what the public ticket page reports. &ldquo;Sold&rdquo; counts confirmed
        tickets only &mdash; a cancelled or refunded ticket releases its seat.
      </p>

      {!data.countsAvailable && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <TriangleAlert className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-amber-800">
            The sold-ticket count could not be read, so the figures below are showing
            every limit as fully available. Reload before acting on them.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem]">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th scope="col" className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Category</th>
              <th scope="col" className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Sold</th>
              <th scope="col" className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Limit</th>
              <th scope="col" className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Remaining</th>
              <th scope="col" className="pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map((entry) => (
              <StockRow
                key={entry.category}
                title={entry.title}
                sold={entry.sold}
                remaining={entry.stock.remaining}
                total={entry.stock.total}
                soldOut={entry.stock.soldOut}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td className="pt-2 pr-4 text-sm font-semibold text-black">All categories</td>
              <td className="pt-2 pr-4 text-sm font-semibold text-black tabular-nums">{data.totalSold}</td>
              <td className="pt-2 pr-4 text-sm font-semibold text-black tabular-nums">
                {data.config.standard_limit === null ? (
                  <span className="text-gray-400 font-normal">No limit</span>
                ) : (
                  data.config.standard_limit
                )}
              </td>
              <td className="pt-2 pr-4 text-sm font-semibold text-black tabular-nums">
                {data.config.standard_limit === null ? (
                  <span className="text-gray-400 font-normal">&mdash;</span>
                ) : (
                  Math.max(0, data.config.standard_limit - data.totalSold)
                )}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function LimitsForm({
  data,
  onSave,
  isSaving,
}: {
  data: TicketStockConfigResponse;
  onSave: (updates: TicketStockConfigUpdateInput) => void;
  isSaving: boolean;
}) {
  const { config } = data;
  const [vipLimit, setVipLimit] = useState(config.vip_limit);
  const [studentLimit, setStudentLimit] = useState(config.student_unemployed_limit);
  const [standardLimit, setStandardLimit] = useState<number | null>(config.standard_limit);

  // Sync when the config changes externally (save response, refetch)
  useEffect(() => {
    setVipLimit(config.vip_limit);
    setStudentLimit(config.student_unemployed_limit);
    setStandardLimit(config.standard_limit);
  }, [config]);

  const vipSold = data.categories.find((c) => c.category === 'vip')?.sold ?? 0;
  const studentSold =
    data.categories.find((c) => c.category === 'standard_student_unemployed')?.sold ?? 0;

  // A limit below what is already sold is legal (capacity can be reduced) but
  // is worth flagging: it sells that category out immediately.
  const warnings = [
    vipLimit < vipSold ? `VIP limit (${vipLimit}) is below the ${vipSold} already sold.` : null,
    studentLimit < studentSold
      ? `Student/Unemployed limit (${studentLimit}) is below the ${studentSold} already sold.`
      : null,
    standardLimit !== null && standardLimit < data.totalSold
      ? `Total cap (${standardLimit}) is below the ${data.totalSold} tickets already confirmed.`
      : null,
  ].filter((w): w is string => w !== null);

  const isDirty =
    vipLimit !== config.vip_limit ||
    studentLimit !== config.student_unemployed_limit ||
    standardLimit !== config.standard_limit;

  const isValid =
    Number.isInteger(vipLimit) &&
    vipLimit >= 0 &&
    Number.isInteger(studentLimit) &&
    studentLimit >= 0 &&
    (standardLimit === null || (Number.isInteger(standardLimit) && standardLimit >= 0));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Ticket className="h-5 w-5 text-gray-600" aria-hidden="true" />
        <h3 className="text-base font-semibold text-gray-900">Stock limits</h3>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm text-blue-800">
          Changes take effect within about a minute (server cache + CDN). Limits are
          enforced server-side &mdash; the client never decides what is still on sale.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NumberField
          label="VIP tickets"
          hint="Total VIP tickets available across every pricing stage."
          value={vipLimit}
          onChange={setVipLimit}
        />
        <NumberField
          label="Student / Unemployed tickets"
          hint="Total student and unemployed tickets across every pricing stage."
          value={studentLimit}
          onChange={setStudentLimit}
        />
        <TotalCapField value={standardLimit} onChange={setStandardLimit} />
      </div>

      {warnings.length > 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <TriangleAlert className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Saving this will sell out a category immediately:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            onSave({
              vip_limit: vipLimit,
              student_unemployed_limit: studentLimit,
              standard_limit: standardLimit,
            })
          }
          disabled={isSaving || !isDirty || !isValid}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSaving ? 'Saving…' : 'Save limits'}
        </button>
        {!isValid && (
          <p className="text-sm text-red-600">Limits must be whole numbers of zero or more.</p>
        )}
      </div>
    </div>
  );
}

export function TicketStockTab() {
  const { data, isPending, isError, error, refetch } = useTicketStockConfig();
  const updateMutation = useUpdateTicketStockConfig();

  if (isPending) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading stock limits…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <AdminErrorState
        message={error instanceof Error ? error.message : 'Failed to load ticket stock limits'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div>
      <LimitsForm
        data={data}
        onSave={(updates) => updateMutation.mutate(updates)}
        isSaving={updateMutation.isPending}
      />
      <StockTable data={data} />
    </div>
  );
}
