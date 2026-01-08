/**
 * Perks Editor Component
 * Allows adding, editing, and removing perks for a sponsorship deal
 */

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, CheckCircle } from 'lucide-react';
import type { SponsorshipPerkStatus } from './types';
import { PERK_STATUS_CONFIG } from '@/lib/types/sponsorship';

interface Perk {
  id: string;
  deal_id: string;
  name: string;
  description: string | null;
  status: string;
  notes: string | null;
  completed_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface PerksEditorProps {
  dealId: string;
  perks: Perk[];
  onUpdate: () => void;
}

interface EditingPerk {
  id: string | null; // null for new perk
  name: string;
  description: string;
}

const initialEditingPerk: EditingPerk = {
  id: null,
  name: '',
  description: '',
};

const STATUS_OPTIONS: { value: SponsorshipPerkStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'not_applicable', label: 'N/A' },
];

export function PerksEditor({ dealId, perks, onUpdate }: PerksEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPerk, setEditingPerk] = useState<EditingPerk>(initialEditingPerk);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API calls
  const handleAddPerk = async () => {
    if (!editingPerk.name.trim()) {
      setError('Perk name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sponsorships/deals/${dealId}/perks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingPerk.name,
          description: editingPerk.description || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add perk');
      }

      setIsAdding(false);
      setEditingPerk(initialEditingPerk);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add perk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePerk = async () => {
    if (!editingId || !editingPerk.name.trim()) {
      setError('Perk name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sponsorships/deals/${dealId}/perks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perkId: editingId,
          name: editingPerk.name,
          description: editingPerk.description || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update perk');
      }

      setEditingId(null);
      setEditingPerk(initialEditingPerk);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update perk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (perkId: string, newStatus: SponsorshipPerkStatus) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sponsorships/deals/${dealId}/perks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perkId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePerk = async (perkId: string) => {
    if (!confirm('Are you sure you want to remove this perk?')) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sponsorships/deals/${dealId}/perks`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perkId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove perk');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove perk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (perk: Perk) => {
    setEditingId(perk.id);
    setEditingPerk({
      id: perk.id,
      name: perk.name,
      description: perk.description || '',
    });
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditingPerk(initialEditingPerk);
    setError(null);
  };

  const startAdding = () => {
    setIsAdding(true);
    setEditingId(null);
    setEditingPerk(initialEditingPerk);
  };

  // Render edit form
  const renderEditForm = (isNew: boolean) => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Perk Name *
        </label>
        <input
          type="text"
          value={editingPerk.name}
          onChange={(e) => setEditingPerk({ ...editingPerk, name: e.target.value })}
          placeholder="e.g., Logo on website, Booth space"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <input
          type="text"
          value={editingPerk.description}
          onChange={(e) => setEditingPerk({ ...editingPerk, description: e.target.value })}
          placeholder="Additional details about this perk"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={cancelEditing}
          disabled={isSubmitting}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={isNew ? handleAddPerk : handleUpdatePerk}
          disabled={isSubmitting}
          className="px-3 py-1.5 text-sm font-medium text-black bg-[#F1E271] hover:bg-[#e6d766] rounded transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          <Check className="h-4 w-4" />
          {isNew ? 'Add' : 'Save'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Perks List */}
      <div className="space-y-2">
        {perks.map((perk) => (
          <div key={perk.id}>
            {editingId === perk.id ? (
              renderEditForm(false)
            ) : (
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2 sm:gap-3">
                  {/* Quick complete toggle */}
                  <button
                    onClick={() => {
                      const nextStatus: SponsorshipPerkStatus =
                        perk.status === 'completed' ? 'pending' : 'completed';
                      handleStatusChange(perk.id, nextStatus);
                    }}
                    disabled={isSubmitting}
                    className={`p-1 rounded-full transition-colors flex-shrink-0 mt-0.5 ${
                      perk.status === 'completed'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                    } ${isSubmitting ? 'opacity-50' : ''}`}
                  >
                    <CheckCircle className="h-5 w-5" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        perk.status === 'completed' ? 'line-through text-gray-400' : ''
                      }`}
                    >
                      {perk.name}
                    </p>
                    {perk.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{perk.description}</p>
                    )}

                    {/* Mobile: Actions row */}
                    <div className="flex items-center gap-2 mt-2 sm:hidden">
                      <select
                        value={perk.status}
                        onChange={(e) =>
                          handleStatusChange(perk.id, e.target.value as SponsorshipPerkStatus)
                        }
                        disabled={isSubmitting}
                        className={`text-xs px-2 py-1 rounded border-0 ${
                          PERK_STATUS_CONFIG[perk.status as SponsorshipPerkStatus]?.bgColor || 'bg-gray-100'
                        } ${
                          PERK_STATUS_CONFIG[perk.status as SponsorshipPerkStatus]?.color || 'text-gray-700'
                        } ${isSubmitting ? 'opacity-50' : ''}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => startEditing(perk)}
                        disabled={isSubmitting}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePerk(perk.id)}
                        disabled={isSubmitting}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Desktop: Actions */}
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    <select
                      value={perk.status}
                      onChange={(e) =>
                        handleStatusChange(perk.id, e.target.value as SponsorshipPerkStatus)
                      }
                      disabled={isSubmitting}
                      className={`text-xs px-2 py-1 rounded border-0 ${
                        PERK_STATUS_CONFIG[perk.status as SponsorshipPerkStatus]?.bgColor || 'bg-gray-100'
                      } ${
                        PERK_STATUS_CONFIG[perk.status as SponsorshipPerkStatus]?.color || 'text-gray-700'
                      } ${isSubmitting ? 'opacity-50' : ''}`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => startEditing(perk)}
                      disabled={isSubmitting}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePerk(perk.id)}
                      disabled={isSubmitting}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {perks.length === 0 && !isAdding && (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No perks added yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add perks to track deliverables for this sponsorship
            </p>
          </div>
        )}
      </div>

      {/* Add New Perk Form */}
      {isAdding && renderEditForm(true)}

      {/* Add Button */}
      {!isAdding && !editingId && (
        <button
          onClick={startAdding}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Perk
        </button>
      )}

      {/* Progress Summary */}
      {perks.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">
              {perks.filter((p) => p.status === 'completed').length} / {perks.length} completed
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{
                width: `${(perks.filter((p) => p.status === 'completed').length / perks.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
