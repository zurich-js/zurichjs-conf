/**
 * Speaker Accommodation Section
 * Manage hotel booking for a speaker within the detail modal
 */

import { useState } from 'react';
import { Hotel, Pencil } from 'lucide-react';
import type { CfpSpeakerAccommodation } from '@/lib/types/cfp';
import { calculateNights } from './types';

interface SpeakerAccommodationSectionProps {
  accommodation: CfpSpeakerAccommodation | null;
  speakerId: string;
  onSave: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
}

interface AccommodationFormData {
  hotel_name: string;
  hotel_address: string;
  check_in_date: string;
  check_out_date: string;
  reservation_number: string;
  reservation_confirmation_url: string;
  cost_amount: string;
  cost_currency: string;
  is_covered_by_conference: boolean;
  admin_notes: string;
}

export function SpeakerAccommodationSection({
  accommodation,
  onSave,
  isSubmitting,
}: SpeakerAccommodationSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<AccommodationFormData>({
    hotel_name: accommodation?.hotel_name || '',
    hotel_address: accommodation?.hotel_address || '',
    check_in_date: accommodation?.check_in_date || '',
    check_out_date: accommodation?.check_out_date || '',
    reservation_number: accommodation?.reservation_number || '',
    reservation_confirmation_url: accommodation?.reservation_confirmation_url || '',
    cost_amount: accommodation?.cost_amount ? (accommodation.cost_amount / 100).toString() : '',
    cost_currency: accommodation?.cost_currency || 'CHF',
    is_covered_by_conference: accommodation?.is_covered_by_conference ?? true,
    admin_notes: accommodation?.admin_notes || '',
  });

  const nights = calculateNights(form.check_in_date || null, form.check_out_date || null);
  const displayNights = calculateNights(
    accommodation?.check_in_date ?? null,
    accommodation?.check_out_date ?? null
  );

  const handleSubmit = () => {
    const costCents = form.cost_amount ? Math.round(parseFloat(form.cost_amount) * 100) : undefined;
    onSave({
      hotel_name: form.hotel_name || undefined,
      hotel_address: form.hotel_address || undefined,
      check_in_date: form.check_in_date || undefined,
      check_out_date: form.check_out_date || undefined,
      reservation_number: form.reservation_number || undefined,
      reservation_confirmation_url: form.reservation_confirmation_url || undefined,
      cost_amount: costCents,
      cost_currency: form.cost_currency,
      is_covered_by_conference: form.is_covered_by_conference,
      admin_notes: form.admin_notes || undefined,
    });
    setIsEditing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Hotel className="w-4 h-4" />
          Accommodation
        </h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-primary text-black hover:bg-[#e8d95e] cursor-pointer"
          >
            <Pencil className="w-3 h-3" /> {accommodation?.hotel_name ? 'Edit' : 'Add Hotel'}
          </button>
        )}
      </div>

      {!isEditing && !accommodation?.hotel_name && (
        <p className="text-sm text-gray-500 py-3">No hotel booked yet.</p>
      )}

      {!isEditing && accommodation?.hotel_name && (
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-gray-900 text-sm">{accommodation.hotel_name}</div>
              {accommodation.hotel_address && (
                <div className="text-xs text-gray-500 mt-0.5">{accommodation.hotel_address}</div>
              )}
            </div>
            {displayNights !== null && (
              <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium">
                {displayNights} night{displayNights !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2 text-xs text-gray-600">
            <div>
              <span className="text-gray-400">Check-in:</span>{' '}
              {accommodation.check_in_date || 'TBD'}
            </div>
            <div>
              <span className="text-gray-400">Check-out:</span>{' '}
              {accommodation.check_out_date || 'TBD'}
            </div>
          </div>
          {accommodation.reservation_number && (
            <div className="text-xs text-gray-500 mt-2">
              Reservation: {accommodation.reservation_confirmation_url ? (
                <a
                  href={accommodation.reservation_confirmation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {accommodation.reservation_number}
                </a>
              ) : (
                accommodation.reservation_number
              )}
            </div>
          )}
          {accommodation.cost_amount && (
            <div className="text-xs text-gray-500 mt-1">
              Cost: {accommodation.cost_currency} {(accommodation.cost_amount / 100).toFixed(2)}
              {accommodation.is_covered_by_conference && (
                <span className="ml-2 text-green-600">(Covered by conference)</span>
              )}
            </div>
          )}
          {accommodation.admin_notes && (
            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              Note: {accommodation.admin_notes}
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hotel Name</label>
                <input
                  value={form.hotel_name}
                  onChange={(e) => setForm({ ...form, hotel_name: e.target.value })}
                  placeholder="e.g. Marriott Zurich"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Address</label>
                <input
                  value={form.hotel_address}
                  onChange={(e) => setForm({ ...form, hotel_address: e.target.value })}
                  placeholder="Hotel address"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Check-in</label>
                <input
                  type="date"
                  value={form.check_in_date}
                  onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Check-out
                  {nights !== null && (
                    <span className="ml-2 text-blue-600 font-medium">({nights} night{nights !== 1 ? 's' : ''})</span>
                  )}
                </label>
                <input
                  type="date"
                  value={form.check_out_date}
                  onChange={(e) => setForm({ ...form, check_out_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Reservation #"
                value={form.reservation_number}
                onChange={(e) => setForm({ ...form, reservation_number: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
              <input
                placeholder="Confirmation URL"
                value={form.reservation_confirmation_url}
                onChange={(e) => setForm({ ...form, reservation_confirmation_url: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                placeholder="Cost (e.g. 150.00)"
                value={form.cost_amount}
                onChange={(e) => setForm({ ...form, cost_amount: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
              <select
                value={form.cost_currency}
                onChange={(e) => setForm({ ...form, cost_currency: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              >
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_covered_by_conference}
                onChange={(e) => setForm({ ...form, is_covered_by_conference: e.target.checked })}
                className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-sm text-gray-700">Covered by conference</span>
            </label>
            <textarea
              placeholder="Admin notes..."
              value={form.admin_notes}
              onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-black hover:bg-[#e8d95e] disabled:opacity-50 cursor-pointer"
              >
                Save Hotel
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
