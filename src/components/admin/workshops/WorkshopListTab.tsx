/**
 * WorkshopListTab
 * Admin tab showing all workshops with status, capacity, and quick actions.
 */

import React, { useState } from 'react';
import { Plus, ExternalLink, RefreshCw, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import type { WorkshopDetail } from '@/lib/types/workshop';
import { WORKSHOP_LEVEL_LABELS, WORKSHOP_TIME_SLOT_LABELS } from '@/lib/types/workshop';

interface WorkshopListTabProps {
  workshops: WorkshopDetail[];
  onRefresh: () => void;
  onCreateNew: () => void;
  onEdit: (workshop: WorkshopDetail) => void;
  onDelete: (workshopId: string) => void;
  onTogglePublish: (workshop: WorkshopDetail) => void;
  onStripeSync: (workshopId: string) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

export function WorkshopListTab({
  workshops,
  onRefresh,
  onCreateNew,
  onEdit,
  onDelete,
  onTogglePublish,
  onStripeSync,
}: WorkshopListTabProps) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all'
    ? workshops
    : workshops.filter(w => w.status === filter);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-black">Workshops</h2>
          <p className="text-sm text-gray-600 mt-1">
            {workshops.length} workshop{workshops.length !== 1 ? 's' : ''} total
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
            onClick={onCreateNew}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-black bg-[#F1E271] hover:bg-[#e8d95e]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Workshop
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'draft', 'published', 'cancelled', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === status
                ? 'bg-[#F1E271] text-black'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1 text-xs">
                ({workshops.filter(w => status === 'all' || w.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Workshop</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Slot</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Level</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Seats</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Stripe</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(workshop => {
              const seatPercent = Math.round((workshop.enrolled_count / workshop.capacity) * 100);
              return (
                <tr key={workshop.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-black">{workshop.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {workshop.instructor_name || 'No instructor'}
                      {workshop.featured && (
                        <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Featured</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[workshop.status] || 'bg-gray-100'}`}>
                      {workshop.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {WORKSHOP_TIME_SLOT_LABELS[workshop.time_slot]}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {WORKSHOP_LEVEL_LABELS[workshop.level]}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-gray-700">{workshop.enrolled_count}/{workshop.capacity}</div>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1">
                      <div
                        className={`h-1.5 rounded-full ${seatPercent >= 90 ? 'bg-red-500' : seatPercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, seatPercent)}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {workshop.currency} {(workshop.price / 100).toFixed(0)}
                  </td>
                  <td className="py-3 px-4">
                    {workshop.stripe_price_id ? (
                      <span className="text-xs text-green-600 font-medium">Synced</span>
                    ) : (
                      <button
                        onClick={() => onStripeSync(workshop.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Sync
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onTogglePublish(workshop)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100"
                        title={workshop.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {workshop.status === 'published' ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <a
                        href={`/workshops/${workshop.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100"
                        title="Preview"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => onEdit(workshop)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(workshop.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-500">
                  No workshops found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
