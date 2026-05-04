/**
 * VIP Perks Config Panel
 * Admin configuration for VIP workshop discount settings
 */

import React, { useState, useEffect } from 'react';
import { Settings, AlertTriangle, Save } from 'lucide-react';
import { ProductMultiSelect } from '@/components/admin/partnerships/ProductMultiSelect';
import type { VipPerkConfig, StripeProductInfo } from './types';

interface ConfigPanelProps {
  config: VipPerkConfig;
  products: StripeProductInfo[];
  onSave: (updates: {
    discount_percent?: number;
    restricted_product_ids?: string[];
    expires_at?: string | null;
    auto_send_email?: boolean;
    custom_email_message?: string | null;
  }) => void;
  isSaving: boolean;
}

export function ConfigPanel({ config, products, onSave, isSaving }: ConfigPanelProps) {
  const [discountPercent, setDiscountPercent] = useState(config.discount_percent);
  const [restrictedProductIds, setRestrictedProductIds] = useState<string[]>(config.restricted_product_ids);
  const [expiresAt, setExpiresAt] = useState(config.expires_at ? config.expires_at.split('T')[0] : '');
  const [autoSendEmail, setAutoSendEmail] = useState(config.auto_send_email);
  const [customEmailMessage, setCustomEmailMessage] = useState(config.custom_email_message || '');

  // Sync when config changes externally
  useEffect(() => {
    setDiscountPercent(config.discount_percent);
    setRestrictedProductIds(config.restricted_product_ids);
    setExpiresAt(config.expires_at ? config.expires_at.split('T')[0] : '');
    setAutoSendEmail(config.auto_send_email);
    setCustomEmailMessage(config.custom_email_message || '');
  }, [config]);

  const handleSave = () => {
    onSave({
      discount_percent: discountPercent,
      restricted_product_ids: restrictedProductIds,
      expires_at: expiresAt || null,
      auto_send_email: autoSendEmail,
      custom_email_message: customEmailMessage || null,
    });
  };

  const hasNoProducts = restrictedProductIds.length === 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5 text-gray-600" />
        <h3 className="text-base font-semibold text-gray-900">VIP Perk Configuration</h3>
      </div>

      {hasNoProducts && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            No workshop products selected. Configure which workshops the discount applies to before creating perks or running backfill.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Discount Percent */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>

        {/* Expiry Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (optional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
          />
        </div>

        {/* Product Restrictions */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Restrict to Workshops
          </label>
          <ProductMultiSelect
            products={products}
            selectedIds={restrictedProductIds}
            onChange={setRestrictedProductIds}
          />
          <p className="text-xs text-gray-500 mt-1">
            {restrictedProductIds.length === 0
              ? 'No products selected — select workshop products above'
              : `${restrictedProductIds.length} product(s) selected`}
          </p>
        </div>

        {/* Auto-send Email */}
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSendEmail}
              onChange={(e) => setAutoSendEmail(e.target.checked)}
              className="rounded text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-sm font-medium text-gray-700">
              Auto-send email when new VIP perks are created (via purchase or upgrade)
            </span>
          </label>
        </div>

        {/* Default Custom Message */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Custom Email Message (optional)
          </label>
          <textarea
            value={customEmailMessage}
            onChange={(e) => setCustomEmailMessage(e.target.value)}
            placeholder="Add a default personalized message for auto-sent emails..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-brand-primary text-black font-medium rounded-lg hover:bg-[#E5D665] disabled:opacity-50 flex items-center gap-2 cursor-pointer text-sm"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
