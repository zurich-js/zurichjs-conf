/**
 * Size Breakdown Table
 * Per-size reconciliation totals across attendees and speakers — the numbers
 * to hand to the apparel supplier
 */

import React from 'react';
import { APPAREL_SIZES } from '@/lib/types/ticket-constants';
import type { ApparelStats, ApparelSpeakerStats } from './types';

interface SizeBreakdownTableProps {
  stats: ApparelStats;
  speakerStats: ApparelSpeakerStats;
}

export function SizeBreakdownTable({ stats, speakerStats }: SizeBreakdownTableProps) {
  const rows = APPAREL_SIZES.map((size) => {
    const attendeeTees = stats.tshirtCounts[size] ?? 0;
    const speakerTees = speakerStats.tshirtCounts[size] ?? 0;
    const vipHoodies = stats.hoodieCounts[size] ?? 0;
    const speakerHoodies = speakerStats.hoodieCounts[size] ?? 0;
    return {
      size,
      attendeeTees,
      speakerTees,
      totalTees: attendeeTees + speakerTees,
      vipHoodies,
      speakerHoodies,
      totalHoodies: vipHoodies + speakerHoodies,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      attendeeTees: acc.attendeeTees + row.attendeeTees,
      speakerTees: acc.speakerTees + row.speakerTees,
      totalTees: acc.totalTees + row.totalTees,
      vipHoodies: acc.vipHoodies + row.vipHoodies,
      speakerHoodies: acc.speakerHoodies + row.speakerHoodies,
      totalHoodies: acc.totalHoodies + row.totalHoodies,
    }),
    { attendeeTees: 0, speakerTees: 0, totalTees: 0, vipHoodies: 0, speakerHoodies: 0, totalHoodies: 0 }
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Order Reconciliation by Size</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Collected sizes only — attendees and speakers still missing sizes are not included in these totals.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Attendee Tees</th>
              <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Speaker Tees</th>
              <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase bg-blue-50">Total Tees</th>
              <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">VIP Hoodies</th>
              <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Speaker Hoodies</th>
              <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase bg-amber-50">Total Hoodies</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.size}>
                <td className="px-4 py-2 font-medium text-gray-900">{row.size}</td>
                <td className="px-4 py-2 text-right text-gray-700">{row.attendeeTees}</td>
                <td className="px-4 py-2 text-right text-gray-700">{row.speakerTees}</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900 bg-blue-50/50">{row.totalTees}</td>
                <td className="px-4 py-2 text-right text-gray-700">{row.vipHoodies}</td>
                <td className="px-4 py-2 text-right text-gray-700">{row.speakerHoodies}</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900 bg-amber-50/50">{row.totalHoodies}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td className="px-4 py-2 font-semibold text-gray-900">Total</td>
              <td className="px-4 py-2 text-right font-semibold text-gray-900">{totals.attendeeTees}</td>
              <td className="px-4 py-2 text-right font-semibold text-gray-900">{totals.speakerTees}</td>
              <td className="px-4 py-2 text-right font-bold text-gray-900 bg-blue-50">{totals.totalTees}</td>
              <td className="px-4 py-2 text-right font-semibold text-gray-900">{totals.vipHoodies}</td>
              <td className="px-4 py-2 text-right font-semibold text-gray-900">{totals.speakerHoodies}</td>
              <td className="px-4 py-2 text-right font-bold text-gray-900 bg-amber-50">{totals.totalHoodies}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
