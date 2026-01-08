/**
 * Line Items Editor Component
 * Allows adding, editing, and removing line items for a sponsorship deal
 */

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';
import type { SponsorshipLineItem, SponsorshipCurrency } from './types';

interface LineItemsEditorProps {
  dealId: string;
  lineItems: SponsorshipLineItem[];
  currency: SponsorshipCurrency;
  tierCreditAvailable: number;
  onUpdate: () => void;
}

interface EditingItem {
  id: string | null; // null for new item
  type: 'addon' | 'adjustment';
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  unitPriceDisplay: string; // for user input
  usesCredit: boolean;
}

const initialEditingItem: EditingItem = {
  id: null,
  type: 'addon',
  description: '',
  quantity: 1,
  unitPrice: 0,
  unitPriceDisplay: '0',
  usesCredit: true,
};

export function LineItemsEditor({
  dealId,
  lineItems,
  currency,
  tierCreditAvailable,
  onUpdate,
}: LineItemsEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EditingItem>(initialEditingItem);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format currency for display with comma delimiters
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  // Parse currency input to cents
  const parseToCents = (value: string): number => {
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  // Calculate totals
  const tierBase = lineItems
    .filter((li) => li.type === 'tier_base')
    .reduce((sum, li) => sum + li.unit_price * li.quantity, 0);

  const addons = lineItems
    .filter((li) => li.type === 'addon')
    .reduce((sum, li) => sum + li.unit_price * li.quantity, 0);

  const creditableAddons = lineItems
    .filter((li) => li.type === 'addon' && li.uses_credit)
    .reduce((sum, li) => sum + li.unit_price * li.quantity, 0);

  const creditApplied = Math.min(tierCreditAvailable, creditableAddons);

  const adjustments = lineItems
    .filter((li) => li.type === 'adjustment')
    .reduce((sum, li) => sum + li.unit_price * li.quantity, 0);

  const subtotal = tierBase + addons;
  const total = Math.max(0, subtotal - creditApplied + adjustments);

  // API calls
  const handleAddItem = async () => {
    if (!editingItem.description.trim()) {
      setError('Description is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sponsorships/deals/${dealId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editingItem.type,
          description: editingItem.description,
          quantity: editingItem.quantity,
          unitPrice: editingItem.unitPrice,
          usesCredit: editingItem.type === 'addon' ? editingItem.usesCredit : false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add item');
      }

      setIsAdding(false);
      setEditingItem(initialEditingItem);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingId || !editingItem.description.trim()) {
      setError('Description is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sponsorships/deals/${dealId}/line-items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItemId: editingId,
          description: editingItem.description,
          quantity: editingItem.quantity,
          unitPrice: editingItem.unitPrice,
          usesCredit: editingItem.type === 'addon' ? editingItem.usesCredit : false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update item');
      }

      setEditingId(null);
      setEditingItem(initialEditingItem);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (lineItemId: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sponsorships/deals/${dealId}/line-items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItemId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove item');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (item: SponsorshipLineItem) => {
    setEditingId(item.id);
    setEditingItem({
      id: item.id,
      type: item.type as 'addon' | 'adjustment',
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      unitPriceDisplay: (item.unit_price / 100).toString(),
      usesCredit: item.uses_credit,
    });
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditingItem(initialEditingItem);
    setError(null);
  };

  const startAdding = () => {
    setIsAdding(true);
    setEditingId(null);
    setEditingItem(initialEditingItem);
  };

  // Render form row
  const renderEditForm = (isNew: boolean) => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
          <select
            value={editingItem.type}
            onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as 'addon' | 'adjustment' })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
            disabled={!isNew}
          >
            <option value="addon">Add-on</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
          <input
            type="number"
            min="1"
            value={editingItem.quantity}
            onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={editingItem.description}
          onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
          placeholder="e.g., Extra booth space, Workshop sponsorship"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Price ({currency}) {editingItem.type === 'adjustment' && '(can be negative)'}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={editingItem.unitPriceDisplay}
            onChange={(e) => {
              const value = e.target.value;
              // Allow typing numbers, decimals, and negative sign
              if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                setEditingItem({
                  ...editingItem,
                  unitPriceDisplay: value,
                  unitPrice: parseToCents(value),
                });
              }
            }}
            onBlur={() => {
              // Format on blur
              const cents = parseToCents(editingItem.unitPriceDisplay);
              setEditingItem({
                ...editingItem,
                unitPrice: cents,
                unitPriceDisplay: cents === 0 ? '0' : (cents / 100).toString(),
              });
            }}
            placeholder="0.00"
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
          />
        </div>
        {editingItem.type === 'addon' && (
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer pb-1.5">
              <input
                type="checkbox"
                checked={editingItem.usesCredit}
                onChange={(e) => setEditingItem({ ...editingItem, usesCredit: e.target.checked })}
                className="rounded border-gray-300 text-[#F1E271] focus:ring-[#F1E271]"
              />
              <span className="text-sm text-gray-700">Eligible for tier credit</span>
            </label>
          </div>
        )}
      </div>

      {editingItem.type === 'addon' && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 -mt-1">
          <p className="font-medium mb-1">What is &quot;Eligible for tier credit&quot;?</p>
          <p className="mb-2">
            Each sponsorship tier includes a <strong>free add-on budget</strong>. When an add-on is marked as
            &quot;eligible&quot;, it gets automatically deducted from this budget, reducing the final invoice.
          </p>
          <p className="font-medium">Example:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Gold tier: CHF 8,000 base + CHF 1,000 add-on credit</li>
            <li>Sponsor wants &quot;Extra Booth Table&quot; (CHF 500, credit eligible)</li>
            <li>Invoice: CHF 8,000 + CHF 500 - CHF 500 credit = <strong>CHF 8,000</strong></li>
          </ul>
          <p className="mt-2 text-amber-700">
            Leave unchecked for items that should always be charged (e.g., special custom requests).
          </p>
        </div>
      )}

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
          onClick={isNew ? handleAddItem : handleUpdateItem}
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

      {/* Line Items List */}
      <div className="space-y-2">
        {lineItems.map((item) => (
          <div key={item.id}>
            {editingId === item.id ? (
              renderEditForm(false)
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                        item.type === 'tier_base' ? 'bg-purple-100 text-purple-700' :
                        item.type === 'addon' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {item.type === 'tier_base' ? 'Base' : item.type === 'addon' ? 'Add-on' : 'Adj'}
                      </span>
                      <span className="text-sm font-medium break-words">{item.description}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {item.quantity > 1 && (
                        <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                      )}
                      {item.type === 'addon' && item.uses_credit && (
                        <span className="text-xs text-green-600">(credit eligible)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className={`text-sm font-medium ${item.unit_price < 0 ? 'text-red-600' : ''}`}>
                      {formatAmount(item.unit_price * item.quantity)}
                    </span>
                    {item.type !== 'tier_base' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditing(item)}
                          disabled={isSubmitting}
                          className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={isSubmitting}
                          className="p-1.5 sm:p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Item Form */}
      {isAdding && renderEditForm(true)}

      {/* Add Button */}
      {!isAdding && !editingId && (
        <button
          onClick={startAdding}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Line Item
        </button>
      )}

      {/* Totals Summary */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span>{formatAmount(subtotal)}</span>
        </div>
        {creditApplied > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span className="truncate mr-2">Credit (max {formatAmount(tierCreditAvailable)})</span>
            <span className="flex-shrink-0">-{formatAmount(creditApplied)}</span>
          </div>
        )}
        {adjustments !== 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Adjustments</span>
            <span className={adjustments < 0 ? 'text-red-600' : ''}>{formatAmount(adjustments)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base sm:text-lg pt-2 border-t border-gray-200">
          <span>Total</span>
          <span>{formatAmount(total)}</span>
        </div>
      </div>
    </div>
  );
}
