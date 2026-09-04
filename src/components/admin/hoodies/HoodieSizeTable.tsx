/**
 * Hoodie Size Table
 * Per-size order quantities for eligible people only — the numbers to hand
 * to the supplier. Sizes are columns so the table stays one screen wide on
 * a phone.
 */

import React from 'react';
import { APPAREL_SIZES } from '@/lib/types/ticket-constants';
import type { HoodieStats } from './types';

export interface HoodieSizeTableProps {
  stats: HoodieStats;
}

export function HoodieSizeTable({ stats }: HoodieSizeTableProps): React.JSX.Element {
  return (
    <section aria-label="Hoodie sizes to order" className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Sizes to order</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Eligible people who gave a size. {stats.missing_size > 0 ? `${stats.missing_size} still missing — ` : ''}
          the Apparel tab can send size reminders.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              {APPAREL_SIZES.map((size) => (
                <th key={size} scope="col" className="px-3 py-2 text-center">
                  {size}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-center">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {APPAREL_SIZES.map((size) => (
                <td key={size} className="px-3 py-3 text-center font-medium text-gray-900">
                  {stats.size_counts[size] ?? 0}
                </td>
              ))}
              <td className="px-3 py-3 text-center font-semibold text-gray-950">{stats.with_size}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
