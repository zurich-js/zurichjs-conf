/**
 * Coupons Tab Component
 * Manages discount coupons for a partnership
 */

import React, { useState } from 'react';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import { ProductMultiSelect } from '../ProductMultiSelect';
import type {
  Partnership,
  PartnershipCoupon,
  StripeProductInfo,
  CouponType,
  VoucherCurrency,
} from '../types';

interface CouponsTabProps {
  partnership: Partnership;
  coupons: PartnershipCoupon[];
  products: StripeProductInfo[];
  onCreateCoupon: (data: {
    code: string;
    type: CouponType;
    discount_percent?: number;
    discount_amount?: number;
    currency?: VoucherCurrency;
    restricted_product_ids: string[];
    max_redemptions?: number;
    expires_at?: string;
  }) => Promise<void>;
  onDeleteCoupon: (couponId: string) => Promise<void>;
}

/**
 * Generate suggested coupon codes based on partnership name
 */
function generateCouponSuggestions(partnershipName: string): string[] {
  const cleanName = partnershipName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim();

  const words = cleanName.split(/\s+/).filter(Boolean);
  const suggestions: string[] = [];

  const fullName = words.join('');
  if (fullName.length <= 15) {
    suggestions.push(fullName);
  }

  const initials = words.map((w) => w[0]).join('');
  if (initials.length >= 2) {
    suggestions.push(`${initials}2026`);
  }

  const firstWord = words[0] || 'PARTNER';
  if (firstWord.length <= 10) {
    suggestions.push(`${firstWord}10`);
    suggestions.push(`${firstWord}20`);
  }

  if (fullName.length <= 12) {
    suggestions.push(`${fullName}20`);
  }

  if (initials.length >= 2 && initials.length <= 5) {
    suggestions.push(`ZURICHJS_${initials}`);
  }

  return [...new Set(suggestions)].slice(0, 5);
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

export function CouponsTab({
  partnership,
  coupons,
  products,
  onCreateCoupon,
  onDeleteCoupon,
}: CouponsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as CouponType,
    discount_percent: 10,
    discount_amount: 10,
    currency: 'CHF' as VoucherCurrency,
    restricted_product_ids: [] as string[],
    max_redemptions: undefined as number | undefined,
    expires_at: '',
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await onCreateCoupon({
        code: formData.code,
        type: formData.type,
        discount_percent: formData.type === 'percentage' ? formData.discount_percent : undefined,
        discount_amount: formData.type === 'fixed_amount' ? formData.discount_amount * 100 : undefined,
        currency: formData.type === 'fixed_amount' ? formData.currency : undefined,
        restricted_product_ids: formData.restricted_product_ids,
        max_redemptions: formData.max_redemptions,
        expires_at: formData.expires_at || undefined,
      });
      setShowForm(false);
      setFormData({
        code: '',
        type: 'percentage',
        discount_percent: 10,
        discount_amount: 10,
        currency: 'CHF',
        restricted_product_ids: [],
        max_redemptions: undefined,
        expires_at: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-black">Discount Codes</h4>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-[#F1E271] text-black text-sm font-medium rounded-lg hover:bg-[#E5D665] flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Coupon
        </button>
      </div>

      {/* Coupon Creation Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4 border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Coupon Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="ZURICHJS20"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
              />
              {/* Suggested codes */}
              <div className="mt-2">
                <p className="text-xs text-black/50 mb-1.5">Suggested codes:</p>
                <div className="flex flex-wrap gap-1.5">
                  {generateCouponSuggestions(partnership.name).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, code: suggestion }))}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                        formData.code === suggestion
                          ? 'bg-[#F1E271] border-[#F1E271] text-black font-medium'
                          : 'bg-white border-gray-200 text-black/70 hover:border-[#F1E271] hover:bg-[#F1E271]/10'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Discount Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as CouponType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {formData.type === 'percentage' ? (
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Discount Percentage
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData((prev) => ({ ...prev, discount_percent: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, discount_amount: parseInt(e.target.value) }))}
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
              </>
            )}
          </div>

          {/* Product Restrictions */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Restrict to Products (optional)
            </label>
            <ProductMultiSelect
              products={products}
              selectedIds={formData.restricted_product_ids}
              onChange={(ids) => setFormData((prev) => ({ ...prev, restricted_product_ids: ids }))}
            />
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Max Redemptions (optional)
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_redemptions || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_redemptions: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                placeholder="Unlimited"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Expires (optional)
              </label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, expires_at: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
              />
            </div>
          </div>

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
              disabled={!formData.code || isSubmitting}
              className="px-3 py-1.5 bg-[#F1E271] text-black font-medium rounded-lg text-sm hover:bg-[#E5D665] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </div>
      )}

      {/* Coupon List */}
      {coupons.length === 0 ? (
        <div className="text-center py-8 text-black/50 text-sm">
          No coupons yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className={`p-3 sm:p-4 border rounded-lg ${
                coupon.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => copyCode(coupon.code)}
                    className="font-mono text-sm sm:text-base font-medium text-black flex items-center gap-1.5 hover:text-black/70 cursor-pointer shrink-0"
                    title="Copy code"
                  >
                    {copiedCode === coupon.code ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {coupon.code}
                  </button>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                      coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {coupon.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-sm">
                  <span className="text-black font-medium">
                    {coupon.type === 'percentage'
                      ? `${coupon.discount_percent}% off`
                      : formatAmount(coupon.discount_amount || 0, coupon.currency || 'CHF')}
                  </span>
                  <span className="text-black/60 hidden sm:inline">
                    {coupon.current_redemptions}
                    {coupon.max_redemptions ? `/${coupon.max_redemptions}` : ''} used
                  </span>
                  <button
                    onClick={() => onDeleteCoupon(coupon.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    title="Delete coupon"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Mobile: show redemptions */}
              <div className="mt-2 text-xs text-black/60 sm:hidden">
                {coupon.current_redemptions}
                {coupon.max_redemptions ? `/${coupon.max_redemptions}` : ''} redemptions
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
