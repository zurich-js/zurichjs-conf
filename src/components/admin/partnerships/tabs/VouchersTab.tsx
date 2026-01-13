/**
 * Vouchers Tab Component
 * Manages vouchers/gift cards for a partnership
 */

import React, { useState } from 'react';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import type { PartnershipVoucher, VoucherPurpose, VoucherCurrency } from '../types';

interface VouchersTabProps {
  vouchers: PartnershipVoucher[];
  onCreateVouchers: (data: {
    purpose: VoucherPurpose;
    amount: number;
    currency: VoucherCurrency;
    quantity: number;
    recipient_name?: string;
    recipient_email?: string;
  }) => Promise<void>;
  onDeleteVoucher: (voucherId: string) => Promise<void>;
}

const VOUCHER_PURPOSE_LABELS: Record<VoucherPurpose, string> = {
  community_discount: 'Community Discount',
  raffle: 'Raffle Prize',
  giveaway: 'Giveaway',
  organizer_discount: 'Organizer Discount',
};

function formatAmount(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

export function VouchersTab({
  vouchers,
  onCreateVouchers,
  onDeleteVoucher,
}: VouchersTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    purpose: 'raffle' as VoucherPurpose,
    amount: 50,
    currency: 'CHF' as VoucherCurrency,
    quantity: 1,
    recipient_name: '',
    recipient_email: '',
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await onCreateVouchers({
        ...formData,
        amount: formData.amount * 100, // Convert to cents
        recipient_name: formData.recipient_name || undefined,
        recipient_email: formData.recipient_email || undefined,
      });
      setShowForm(false);
      setFormData({
        purpose: 'raffle',
        amount: 50,
        currency: 'CHF',
        quantity: 1,
        recipient_name: '',
        recipient_email: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group vouchers by purpose
  const groupedVouchers = vouchers.reduce(
    (acc, v) => {
      if (!acc[v.purpose]) acc[v.purpose] = [];
      acc[v.purpose].push(v);
      return acc;
    },
    {} as Record<VoucherPurpose, PartnershipVoucher[]>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-black">Vouchers & Gift Cards</h4>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-[#F1E271] text-black text-sm font-medium rounded-lg hover:bg-[#E5D665] flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Vouchers
        </button>
      </div>

      {/* Voucher Creation Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4 border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Purpose
              </label>
              <select
                value={formData.purpose}
                onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value as VoucherPurpose }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
              >
                {Object.entries(VOUCHER_PURPOSE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Value
              </label>
              <input
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value as VoucherCurrency }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
              >
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Recipient Info (for organizer discounts) */}
          {formData.purpose === 'organizer_discount' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, recipient_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={formData.recipient_email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, recipient_email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-black hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-[#F1E271] text-black font-medium rounded-lg text-sm hover:bg-[#E5D665] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : `Create ${formData.quantity} Voucher${formData.quantity > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Voucher List */}
      {vouchers.length === 0 ? (
        <div className="text-center py-8 text-black/50 text-sm">
          No vouchers yet. Create some for raffles or giveaways.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedVouchers).map(([purpose, purposeVouchers]) => (
            <div key={purpose}>
              <h5 className="text-xs font-medium text-black/60 uppercase tracking-wide mb-2">
                {VOUCHER_PURPOSE_LABELS[purpose as VoucherPurpose]} ({purposeVouchers.length})
              </h5>
              <div className="space-y-2">
                {purposeVouchers.map((voucher) => (
                  <div
                    key={voucher.id}
                    className={`p-3 border rounded-lg ${
                      voucher.is_redeemed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => copyCode(voucher.code)}
                          className="font-mono text-sm font-medium text-black flex items-center gap-1.5 hover:text-black/70 cursor-pointer"
                          title="Copy code"
                        >
                          {copiedCode === voucher.code ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          {voucher.code}
                        </button>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            voucher.is_redeemed ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {voucher.is_redeemed ? 'Redeemed' : 'Available'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-black font-medium">
                          {formatAmount(voucher.amount, voucher.currency)}
                        </span>
                        {voucher.is_redeemed && voucher.redeemed_by_email && (
                          <span className="text-black/60 text-xs hidden sm:inline">
                            by {voucher.redeemed_by_email}
                          </span>
                        )}
                        {!voucher.is_redeemed && (
                          <button
                            onClick={() => onDeleteVoucher(voucher.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Delete voucher"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
