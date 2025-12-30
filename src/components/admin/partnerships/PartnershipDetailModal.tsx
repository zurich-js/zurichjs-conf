/**
 * Partnership Detail Modal
 * Shows full partnership details with coupons, vouchers, and tracking
 */

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Ticket,
  Gift,
  Link as LinkIcon,
  Plus,
  Trash2,
  Mail,
  ExternalLink,
} from 'lucide-react';
import type {
  Partnership,
  PartnershipCoupon,
  PartnershipVoucher,
  StripeProductInfo,
  CouponType,
  VoucherPurpose,
  VoucherCurrency,
} from './types';

interface PartnershipDetailModalProps {
  partnership: Partnership & {
    coupons?: PartnershipCoupon[];
    vouchers?: PartnershipVoucher[];
  };
  products: StripeProductInfo[];
  isOpen: boolean;
  onClose: () => void;
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
  onCreateVouchers: (data: {
    purpose: VoucherPurpose;
    amount: number;
    currency: VoucherCurrency;
    quantity: number;
    recipient_name?: string;
    recipient_email?: string;
  }) => Promise<void>;
  onDeleteVoucher: (voucherId: string) => Promise<void>;
  onSendEmail: () => void;
}

const VOUCHER_PURPOSE_LABELS: Record<VoucherPurpose, string> = {
  community_discount: 'Community Discount',
  raffle: 'Raffle Prize',
  giveaway: 'Giveaway',
  organizer_discount: 'Organizer Discount',
};

export function PartnershipDetailModal({
  partnership,
  products,
  isOpen,
  onClose,
  onCreateCoupon,
  onDeleteCoupon,
  onCreateVouchers,
  onDeleteVoucher,
  onSendEmail,
}: PartnershipDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'coupons' | 'vouchers' | 'tracking'>('overview');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showVoucherForm, setShowVoucherForm] = useState(false);

  // Coupon form state
  const [couponData, setCouponData] = useState({
    code: '',
    type: 'percentage' as CouponType,
    discount_percent: 10,
    discount_amount: 1000,
    currency: 'CHF' as VoucherCurrency,
    restricted_product_ids: [] as string[],
    max_redemptions: undefined as number | undefined,
    expires_at: '',
  });

  // Voucher form state
  const [voucherData, setVoucherData] = useState({
    purpose: 'raffle' as VoucherPurpose,
    amount: 5000,
    currency: 'CHF' as VoucherCurrency,
    quantity: 1,
    recipient_name: '',
    recipient_email: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const trackingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}?utm_source=${partnership.utm_source}&utm_medium=${partnership.utm_medium}&utm_campaign=${partnership.utm_campaign}`;

  const copyTrackingUrl = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCreateCoupon = async () => {
    setIsSubmitting(true);
    try {
      await onCreateCoupon({
        code: couponData.code,
        type: couponData.type,
        discount_percent: couponData.type === 'percentage' ? couponData.discount_percent : undefined,
        discount_amount: couponData.type === 'fixed_amount' ? couponData.discount_amount : undefined,
        currency: couponData.type === 'fixed_amount' ? couponData.currency : undefined,
        restricted_product_ids: couponData.restricted_product_ids,
        max_redemptions: couponData.max_redemptions,
        expires_at: couponData.expires_at || undefined,
      });
      setShowCouponForm(false);
      setCouponData({
        code: '',
        type: 'percentage',
        discount_percent: 10,
        discount_amount: 1000,
        currency: 'CHF',
        restricted_product_ids: [],
        max_redemptions: undefined,
        expires_at: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVouchers = async () => {
    setIsSubmitting(true);
    try {
      await onCreateVouchers(voucherData);
      setShowVoucherForm(false);
      setVoucherData({
        purpose: 'raffle',
        amount: 5000,
        currency: 'CHF',
        quantity: 1,
        recipient_name: '',
        recipient_email: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative inline-block w-full max-w-4xl bg-white rounded-lg text-left overflow-hidden shadow-xl transform sm:my-8">
          {/* Header */}
          <div className="bg-[#F1E271] px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-black">{partnership.name}</h3>
              <p className="text-sm text-black/70">{partnership.contact_email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onSendEmail}
                className="px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-black/80 flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                Send Package
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-black/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['overview', 'coupons', 'vouchers', 'tracking'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === tab
                      ? 'border-[#F1E271] text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'coupons' && partnership.coupons && (
                    <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                      {partnership.coupons.length}
                    </span>
                  )}
                  {tab === 'vouchers' && partnership.vouchers && (
                    <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                      {partnership.vouchers.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h4>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-gray-400">Name</dt>
                        <dd className="text-sm font-medium">{partnership.contact_name}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-400">Email</dt>
                        <dd className="text-sm">{partnership.contact_email}</dd>
                      </div>
                      {partnership.contact_phone && (
                        <div>
                          <dt className="text-xs text-gray-400">Phone</dt>
                          <dd className="text-sm">{partnership.contact_phone}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Partnership Details</h4>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-gray-400">Type</dt>
                        <dd className="text-sm font-medium capitalize">{partnership.type}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-400">Status</dt>
                        <dd className="text-sm capitalize">{partnership.status}</dd>
                      </div>
                      {partnership.company_name && (
                        <div>
                          <dt className="text-xs text-gray-400">Company</dt>
                          <dd className="text-sm">{partnership.company_name}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
                {partnership.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{partnership.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Coupons Tab */}
            {activeTab === 'coupons' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-900">Discount Codes</h4>
                  <button
                    onClick={() => setShowCouponForm(!showCouponForm)}
                    className="px-3 py-1.5 bg-[#F1E271] text-black text-sm font-medium rounded-lg hover:bg-[#E5D665] flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Coupon
                  </button>
                </div>

                {/* Coupon Creation Form */}
                {showCouponForm && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4 border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Coupon Code
                        </label>
                        <input
                          type="text"
                          value={couponData.code}
                          onChange={(e) =>
                            setCouponData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                          }
                          placeholder="ZURICHJS20"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Discount Type
                        </label>
                        <select
                          value={couponData.type}
                          onChange={(e) =>
                            setCouponData((prev) => ({
                              ...prev,
                              type: e.target.value as CouponType,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="percentage">Percentage</option>
                          <option value="fixed_amount">Fixed Amount</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {couponData.type === 'percentage' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Discount Percentage
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={couponData.discount_percent}
                            onChange={(e) =>
                              setCouponData((prev) => ({
                                ...prev,
                                discount_percent: parseInt(e.target.value),
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Amount (in cents)
                            </label>
                            <input
                              type="number"
                              min="100"
                              value={couponData.discount_amount}
                              onChange={(e) =>
                                setCouponData((prev) => ({
                                  ...prev,
                                  discount_amount: parseInt(e.target.value),
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Currency
                            </label>
                            <select
                              value={couponData.currency}
                              onChange={(e) =>
                                setCouponData((prev) => ({
                                  ...prev,
                                  currency: e.target.value as VoucherCurrency,
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="CHF">CHF</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Restrict to Products
                      </label>
                      <div className="border border-gray-300 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {products.map((product) => (
                          <label
                            key={product.id}
                            className="flex items-center gap-2 py-1 hover:bg-gray-50 px-2 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={couponData.restricted_product_ids.includes(product.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCouponData((prev) => ({
                                    ...prev,
                                    restricted_product_ids: [...prev.restricted_product_ids, product.id],
                                  }));
                                } else {
                                  setCouponData((prev) => ({
                                    ...prev,
                                    restricted_product_ids: prev.restricted_product_ids.filter(
                                      (id) => id !== product.id
                                    ),
                                  }));
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{product.name}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to allow coupon on all products
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Redemptions
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={couponData.max_redemptions || ''}
                          onChange={(e) =>
                            setCouponData((prev) => ({
                              ...prev,
                              max_redemptions: e.target.value ? parseInt(e.target.value) : undefined,
                            }))
                          }
                          placeholder="Unlimited"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expires At
                        </label>
                        <input
                          type="datetime-local"
                          value={couponData.expires_at}
                          onChange={(e) =>
                            setCouponData((prev) => ({ ...prev, expires_at: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowCouponForm(false)}
                        className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateCoupon}
                        disabled={!couponData.code || isSubmitting}
                        className="px-3 py-1.5 bg-[#F1E271] text-black font-medium rounded-lg text-sm hover:bg-[#E5D665] disabled:opacity-50"
                      >
                        {isSubmitting ? 'Creating...' : 'Create Coupon'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Coupons List */}
                <div className="space-y-2">
                  {partnership.coupons?.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="flex items-center justify-between p-3 bg-white border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Ticket className="h-5 w-5 text-gray-400" />
                        <div>
                          <code className="text-sm font-bold">{coupon.code}</code>
                          <p className="text-xs text-gray-500">
                            {coupon.type === 'percentage'
                              ? `${coupon.discount_percent}% off`
                              : formatAmount(coupon.discount_amount || 0, coupon.currency || 'CHF')}
                            {coupon.max_redemptions &&
                              ` • ${coupon.current_redemptions}/${coupon.max_redemptions} used`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            coupon.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {coupon.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => onDeleteCoupon(coupon.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!partnership.coupons || partnership.coupons.length === 0) && !showCouponForm && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No coupons created yet
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Vouchers Tab */}
            {activeTab === 'vouchers' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-900">Voucher Codes</h4>
                  <button
                    onClick={() => setShowVoucherForm(!showVoucherForm)}
                    className="px-3 py-1.5 bg-[#F1E271] text-black text-sm font-medium rounded-lg hover:bg-[#E5D665] flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Vouchers
                  </button>
                </div>

                {/* Voucher Creation Form */}
                {showVoucherForm && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4 border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Purpose
                        </label>
                        <select
                          value={voucherData.purpose}
                          onChange={(e) =>
                            setVoucherData((prev) => ({
                              ...prev,
                              purpose: e.target.value as VoucherPurpose,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="raffle">Raffle Prize</option>
                          <option value="giveaway">Giveaway</option>
                          <option value="community_discount">Community Discount</option>
                          <option value="organizer_discount">Organizer Discount</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={voucherData.quantity}
                          onChange={(e) =>
                            setVoucherData((prev) => ({
                              ...prev,
                              quantity: parseInt(e.target.value),
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Value (in cents)
                        </label>
                        <input
                          type="number"
                          min="100"
                          value={voucherData.amount}
                          onChange={(e) =>
                            setVoucherData((prev) => ({
                              ...prev,
                              amount: parseInt(e.target.value),
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Currency
                        </label>
                        <select
                          value={voucherData.currency}
                          onChange={(e) =>
                            setVoucherData((prev) => ({
                              ...prev,
                              currency: e.target.value as VoucherCurrency,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="CHF">CHF</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                    </div>

                    {voucherData.purpose === 'organizer_discount' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Recipient Name
                          </label>
                          <input
                            type="text"
                            value={voucherData.recipient_name}
                            onChange={(e) =>
                              setVoucherData((prev) => ({
                                ...prev,
                                recipient_name: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Recipient Email
                          </label>
                          <input
                            type="email"
                            value={voucherData.recipient_email}
                            onChange={(e) =>
                              setVoucherData((prev) => ({
                                ...prev,
                                recipient_email: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowVoucherForm(false)}
                        className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateVouchers}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 bg-[#F1E271] text-black font-medium rounded-lg text-sm hover:bg-[#E5D665] disabled:opacity-50"
                      >
                        {isSubmitting
                          ? 'Creating...'
                          : `Create ${voucherData.quantity} Voucher${voucherData.quantity > 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Vouchers List */}
                <div className="space-y-2">
                  {partnership.vouchers?.map((voucher) => (
                    <div
                      key={voucher.id}
                      className="flex items-center justify-between p-3 bg-white border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Gift className="h-5 w-5 text-gray-400" />
                        <div>
                          <code className="text-sm font-bold">{voucher.code}</code>
                          <p className="text-xs text-gray-500">
                            {formatAmount(voucher.amount, voucher.currency)} •{' '}
                            {VOUCHER_PURPOSE_LABELS[voucher.purpose]}
                            {voucher.recipient_name && ` • ${voucher.recipient_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            voucher.is_redeemed
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {voucher.is_redeemed ? 'Redeemed' : 'Available'}
                        </span>
                        {!voucher.is_redeemed && (
                          <button
                            onClick={() => onDeleteVoucher(voucher.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!partnership.vouchers || partnership.vouchers.length === 0) && !showVoucherForm && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No vouchers created yet
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tracking Tab */}
            {activeTab === 'tracking' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Tracking URL</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 border rounded-lg p-3 font-mono text-sm break-all">
                      {trackingUrl}
                    </div>
                    <button
                      onClick={copyTrackingUrl}
                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      {copiedUrl ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5 text-gray-600" />
                      )}
                    </button>
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      <ExternalLink className="h-5 w-5 text-gray-600" />
                    </a>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">UTM Parameters</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">utm_source</span>
                      <span className="font-mono">{partnership.utm_source}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">utm_medium</span>
                      <span className="font-mono">{partnership.utm_medium}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">utm_campaign</span>
                      <span className="font-mono">{partnership.utm_campaign}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <LinkIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-blue-900">Share this link</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        Send this URL to your partner. All clicks and conversions from this link
                        will be tracked in your analytics dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
