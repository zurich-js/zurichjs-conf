/**
 * WorkshopBookingsTab
 * Admin tab showing workshop attendees/bookings with filters and CSV export.
 */

import React, { useState } from 'react';
import { Download, Search, RefreshCw } from 'lucide-react';
import type { WorkshopBooking } from '@/lib/types/workshop';

interface WorkshopBookingsTabProps {
  bookings: WorkshopBooking[];
  workshops: Array<{ id: string; title: string }>;
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export function WorkshopBookingsTab({ bookings, workshops, onRefresh }: WorkshopBookingsTabProps) {
  const [search, setSearch] = useState('');
  const [workshopFilter, setWorkshopFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = bookings.filter(b => {
    if (workshopFilter !== 'all' && b.workshop_id !== workshopFilter) return false;
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      const name = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
      const email = (b.email || '').toLowerCase();
      if (!name.includes(term) && !email.includes(term)) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    params.set('export', 'csv');
    if (workshopFilter !== 'all') params.set('workshop_id', workshopFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search) params.set('search', search);
    window.open(`/api/admin/workshops/bookings?${params.toString()}`, '_blank');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-black">Workshop Bookings</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-black bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-black bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
          value={workshopFilter}
          onChange={e => setWorkshopFilter(e.target.value)}
        >
          <option value="all">All Workshops</option>
          {workshops.map(w => (
            <option key={w.id} value={w.id}>{w.title}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Attendee</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Workshop</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Booked</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(booking => {
              const workshopTitle = workshops.find(w => w.id === booking.workshop_id)?.title || 'Unknown';
              return (
                <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-black">
                      {booking.first_name} {booking.last_name}
                    </div>
                    {booking.company && (
                      <div className="text-xs text-gray-500">{booking.company}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{booking.email}</td>
                  <td className="py-3 px-4 text-gray-700 max-w-[200px] truncate">{workshopTitle}</td>
                  <td className="py-3 px-4 text-gray-700">
                    {booking.currency} {(booking.amount_paid / 100).toFixed(2)}
                    {booking.is_combo_purchase && (
                      <span className="ml-1 text-xs text-blue-600">Combo</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[booking.status] || 'bg-gray-100'}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
