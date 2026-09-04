/**
 * Hoodie List
 * Eligible people (and, on the excluded filter, VIPs who do not get one).
 * Cards by default, a table from lg up.
 */

import React from 'react';
import { AlertCircle, CheckCircle2, Shirt } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { HOODIE_EXCLUSION_LABELS, HOODIE_REASON_LABELS } from '@/lib/hoodies';
import type { HoodieEntry, HoodieExcludedEntry, HoodieReason } from './types';

const REASON_BADGE_CLASSES: Record<HoodieReason, string> = {
  speaker: 'bg-brand-primary/20 text-gray-900',
  vip_ticket_paid: 'bg-purple-100 text-purple-800',
  vip_upgrade_paid: 'bg-blue-100 text-blue-800',
  sponsor_comp: 'bg-amber-100 text-amber-800',
};

export type HoodieListRow =
  | { kind: 'eligible'; entry: HoodieEntry }
  | { kind: 'excluded'; entry: HoodieExcludedEntry };

function Badge({ row }: { row: HoodieListRow }): React.JSX.Element {
  if (row.kind === 'eligible') {
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${REASON_BADGE_CLASSES[row.entry.reason]}`}>
        {HOODIE_REASON_LABELS[row.entry.reason]}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      No hoodie · {HOODIE_EXCLUSION_LABELS[row.entry.exclusion]}
    </span>
  );
}

function SizeCell({ size }: { size: string | null }): React.JSX.Element {
  if (size) return <span className="font-medium text-gray-900">{size}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Size missing
    </span>
  );
}

function HandedCell({ row }: { row: HoodieListRow }): React.JSX.Element {
  if (row.kind === 'excluded') return <span className="text-xs text-gray-400">—</span>;
  if (row.entry.hoodie_handed_at) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Handed out
      </span>
    );
  }
  return <span className="text-xs text-gray-500">Not yet</span>;
}

export interface HoodieListProps {
  rows: HoodieListRow[];
  totalCount: number;
}

export function HoodieList({ rows, totalCount }: HoodieListProps): React.JSX.Element {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <AdminEmptyState
          icon={<Shirt className="h-6 w-6" aria-hidden="true" />}
          title={totalCount === 0 ? 'Nobody qualifies yet' : 'No one matches this filter'}
          description={
            totalCount === 0
              ? 'Speakers, paid VIP ticket buyers, and paid VIP upgrades will show up here.'
              : 'Try another filter or clear the search.'
          }
        />
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2 lg:hidden">
        {rows.map((row) => (
          <li key={row.entry.key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-950">
                  {row.entry.first_name} {row.entry.last_name}
                </p>
                <p className="truncate text-xs text-gray-500">{row.entry.email}</p>
              </div>
              <div className="shrink-0 text-right">
                <SizeCell size={row.entry.hoodie_size} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Badge row={row} />
              <HandedCell row={row} />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm lg:block">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Why</th>
              <th scope="col" className="px-4 py-3">Size</th>
              <th scope="col" className="px-4 py-3">Handed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.entry.key} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {row.entry.first_name} {row.entry.last_name}
                </td>
                <td className="break-all px-4 py-3 text-gray-700">{row.entry.email}</td>
                <td className="px-4 py-3"><Badge row={row} /></td>
                <td className="px-4 py-3"><SizeCell size={row.entry.hoodie_size} /></td>
                <td className="px-4 py-3"><HandedCell row={row} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
