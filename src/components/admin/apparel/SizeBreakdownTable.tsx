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

      {/* Mobile Card View */}
      <div className="md:hidden">
        {/* Totals Summary */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 border-b border-gray-200">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 font-medium">Total T-Shirts</p>
            <p className="text-2xl font-bold text-blue-900">{totals.totalTees}</p>
            <p className="text-xs text-blue-600">{totals.attendeeTees} attendee + {totals.speakerTees} speaker</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-xs text-amber-600 font-medium">Total Hoodies</p>
            <p className="text-2xl font-bold text-amber-900">{totals.totalHoodies}</p>
            <p className="text-xs text-amber-600">{totals.vipHoodies} VIP + {totals.speakerHoodies} speaker</p>
          </div>
        </div>
        {/* Per-size breakdown */}
        <div className="divide-y divide-gray-200">
          {rows.map((row) => (
            <div key={row.size} className="p-4">
              <p className="font-semibold text-gray-900 mb-2">{row.size}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">T-Shirts</p>
                  <p className="font-medium text-blue-700">{row.totalTees} total</p>
                  <p className="text-xs text-gray-500">{row.attendeeTees} att + {row.speakerTees} spk</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Hoodies</p>
                  <p className="font-medium text-amber-700">{row.totalHoodies} total</p>
                  <p className="text-xs text-gray-500">{row.vipHoodies} VIP + {row.speakerHoodies} spk</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
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
