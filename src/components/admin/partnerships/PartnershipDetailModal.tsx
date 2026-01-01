/**
 * Partnership Detail Modal
 * Shows full partnership details with coupons, vouchers, and tracking
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { ProductMultiSelect } from './ProductMultiSelect';
import type {
  Partnership,
  PartnershipCoupon,
  PartnershipVoucher,
  StripeProductInfo,
  CouponType,
  VoucherPurpose,
  VoucherCurrency,
  PartnershipAnalyticsResponse,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'coupons' | 'vouchers' | 'tracking' | 'analytics'>('overview');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showVoucherForm, setShowVoucherForm] = useState(false);

  // Fetch analytics using TanStack Query - only fetch when tab is active
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
  } = useQuery<PartnershipAnalyticsResponse>({
    queryKey: ['partnership-analytics', partnership.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/partnerships/${partnership.id}/analytics`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return res.json();
    },
    enabled: activeTab === 'analytics' && isOpen,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Coupon form state
  const [couponData, setCouponData] = useState({
    code: '',
    type: 'percentage' as CouponType,
    discount_percent: 10,
    discount_amount: 10,
    currency: 'CHF' as VoucherCurrency,
    restricted_product_ids: [] as string[],
    max_redemptions: undefined as number | undefined,
    expires_at: '',
  });

  // Voucher form state
  const [voucherData, setVoucherData] = useState({
    purpose: 'raffle' as VoucherPurpose,
    amount: 50,
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
        // Convert amount to cents for API
        discount_amount: couponData.type === 'fixed_amount' ? couponData.discount_amount * 100 : undefined,
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

  const handleCreateVouchers = async () => {
    setIsSubmitting(true);
    try {
      // Convert amount to cents and clean up empty strings
      await onCreateVouchers({
        ...voucherData,
        amount: voucherData.amount * 100, // Convert to cents for API
        recipient_name: voucherData.recipient_name || undefined,
        recipient_email: voucherData.recipient_email || undefined,
      });
      setShowVoucherForm(false);
      setVoucherData({
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

  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal - full width on mobile, slides up from bottom */}
      <div className="relative w-full sm:max-w-4xl sm:mx-4 bg-white sm:rounded-xl text-black shadow-xl flex flex-col max-h-[100dvh] sm:max-h-[85vh]">
        {/* Header - sticky */}
        <div className="bg-[#F1E271] px-4 py-3 shrink-0 sm:rounded-t-xl">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="text-base sm:text-lg font-bold text-black truncate">{partnership.name}</h3>
                <p className="text-xs sm:text-sm text-black/70 truncate">{partnership.contact_email}</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={onSendEmail}
                  className="px-2 sm:px-3 py-1.5 bg-black text-white text-xs sm:text-sm rounded-lg hover:bg-black/80 flex items-center gap-1"
                >
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Send Package</span>
                  <span className="sm:hidden">Send</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-1 rounded-lg hover:bg-black/10 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tabs - Scrollable on mobile */}
          <div className="border-b border-gray-200 shrink-0">
            <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
              {(['overview', 'coupons', 'vouchers', 'tracking', 'analytics'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab
                      ? 'border-[#F1E271] text-black'
                      : 'border-transparent text-black hover:text-black'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'coupons' && partnership.coupons && (
                    <span className="ml-1 sm:ml-2 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full text-xs">
                      {partnership.coupons.length}
                    </span>
                  )}
                  {tab === 'vouchers' && partnership.vouchers && (
                    <span className="ml-1 sm:ml-2 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full text-xs">
                      {partnership.vouchers.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-black mb-2">Contact Information</h4>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-black">Name</dt>
                        <dd className="text-sm font-medium">{partnership.contact_name}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-black">Email</dt>
                        <dd className="text-sm">{partnership.contact_email}</dd>
                      </div>
                      {partnership.contact_phone && (
                        <div>
                          <dt className="text-xs text-black">Phone</dt>
                          <dd className="text-sm">{partnership.contact_phone}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-black mb-2">Partnership Details</h4>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-xs text-black">Type</dt>
                        <dd className="text-sm font-medium capitalize">{partnership.type}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-black">Status</dt>
                        <dd className="text-sm capitalize">{partnership.status}</dd>
                      </div>
                      {partnership.company_name && (
                        <div>
                          <dt className="text-xs text-black">Company</dt>
                          <dd className="text-sm">{partnership.company_name}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
                {partnership.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-black mb-2">Notes</h4>
                    <p className="text-sm text-black whitespace-pre-wrap">{partnership.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Coupons Tab */}
            {activeTab === 'coupons' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-black">Discount Codes</h4>
                  <button
                    onClick={() => setShowCouponForm(!showCouponForm)}
                    className="px-3 py-1.5 bg-[#F1E271] text-black text-sm font-medium rounded-lg hover:bg-[#E5D665] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Add Coupon
                  </button>
                </div>

                {/* Coupon Creation Form */}
                {showCouponForm && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4 border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Coupon Code
                        </label>
                        <input
                          type="text"
                          value={couponData.code}
                          onChange={(e) =>
                            setCouponData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                          }
                          placeholder="ZURICHJS20"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
                        >
                          <option value="percentage">Percentage</option>
                          <option value="fixed_amount">Fixed Amount</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {couponData.type === 'percentage' ? (
                        <div>
                          <label className="block text-sm font-medium text-black mb-1">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
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
                              value={couponData.discount_amount}
                              onChange={(e) =>
                                setCouponData((prev) => ({
                                  ...prev,
                                  discount_amount: parseInt(e.target.value),
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-black mb-1">
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
                            >
                              <option value="CHF">CHF</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Restrict to Products
                      </label>
                      <ProductMultiSelect
                        products={products}
                        selectedIds={couponData.restricted_product_ids}
                        onChange={(ids) =>
                          setCouponData((prev) => ({
                            ...prev,
                            restricted_product_ids: ids,
                          }))
                        }
                        placeholder="Search and select products..."
                      />
                      <p className="text-xs text-black mt-1">
                        Leave empty to allow coupon on all products
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Expires At
                        </label>
                        <input
                          type="datetime-local"
                          value={couponData.expires_at}
                          onChange={(e) =>
                            setCouponData((prev) => ({ ...prev, expires_at: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowCouponForm(false)}
                        className="px-3 py-1.5 text-black bg-gray-100 rounded-lg text-sm hover:bg-gray-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateCoupon}
                        disabled={!couponData.code || isSubmitting}
                        className="px-3 py-1.5 bg-[#F1E271] text-black font-medium rounded-lg text-sm hover:bg-[#E5D665] disabled:opacity-50 cursor-pointer"
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
                      className="p-3 bg-white border rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                          <Ticket className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <code className="text-sm font-bold break-all">{coupon.code}</code>
                            <p className="text-xs text-black mt-0.5">
                              {coupon.type === 'percentage'
                                ? `${coupon.discount_percent}% off`
                                : formatAmount(coupon.discount_amount || 0, coupon.currency || 'CHF')}
                              {coupon.max_redemptions &&
                                ` • ${coupon.current_redemptions}/${coupon.max_redemptions} used`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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
                            className="p-1 text-black hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!partnership.coupons || partnership.coupons.length === 0) && !showCouponForm && (
                    <p className="text-sm text-black text-center py-4">
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
                  <h4 className="text-sm font-medium text-black">Voucher Codes</h4>
                  <button
                    onClick={() => setShowVoucherForm(!showVoucherForm)}
                    className="px-3 py-1.5 bg-[#F1E271] text-black text-sm font-medium rounded-lg hover:bg-[#E5D665] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Add Vouchers
                  </button>
                </div>

                {/* Voucher Creation Form */}
                {showVoucherForm && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4 border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
                        >
                          <option value="raffle">Raffle Prize</option>
                          <option value="giveaway">Giveaway</option>
                          <option value="community_discount">Community Discount</option>
                          <option value="organizer_discount">Organizer Discount</option>
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
                          value={voucherData.quantity}
                          onChange={(e) =>
                            setVoucherData((prev) => ({
                              ...prev,
                              quantity: parseInt(e.target.value),
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
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
                          value={voucherData.amount}
                          onChange={(e) =>
                            setVoucherData((prev) => ({
                              ...prev,
                              amount: parseInt(e.target.value),
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
                        >
                          <option value="CHF">CHF</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                    </div>

                    {voucherData.purpose === 'organizer_discount' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black mb-1">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black mb-1">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowVoucherForm(false)}
                        className="px-3 py-1.5 text-black bg-gray-100 rounded-lg text-sm hover:bg-gray-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateVouchers}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 bg-[#F1E271] text-black font-medium rounded-lg text-sm hover:bg-[#E5D665] disabled:opacity-50 cursor-pointer"
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
                      className="p-3 bg-white border rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                          <Gift className="h-5 w-5 text-black flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <code className="text-sm font-bold break-all">{voucher.code}</code>
                            <p className="text-xs text-black mt-0.5">
                              {formatAmount(voucher.amount, voucher.currency)} •{' '}
                              {VOUCHER_PURPOSE_LABELS[voucher.purpose]}
                              {voucher.recipient_name && ` • ${voucher.recipient_name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
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
                              className="p-1 text-black hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!partnership.vouchers || partnership.vouchers.length === 0) && !showVoucherForm && (
                    <p className="text-sm text-black text-center py-4">
                      No vouchers created yet
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tracking Tab */}
            {activeTab === 'tracking' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-black mb-2">Tracking URL</h4>
                  <div className="bg-gray-50 border rounded-lg p-3">
                    <div className="font-mono text-xs sm:text-sm break-all mb-3">
                      {trackingUrl}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyTrackingUrl}
                        className="flex-1 sm:flex-none px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 text-black" />
                            <span className="text-sm text-black">Copy URL</span>
                          </>
                        )}
                      </button>
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4 text-black" />
                        <span className="text-sm text-black hidden sm:inline">Open</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-black mb-2">UTM Parameters</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-black">utm_source</span>
                      <span className="font-mono">{partnership.utm_source}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-black">utm_medium</span>
                      <span className="font-mono">{partnership.utm_medium}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-black">utm_campaign</span>
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

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {isLoadingAnalytics ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
                  </div>
                ) : analytics ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-black" />
                          <span className="text-xs text-black font-medium">Tickets</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-black">{analytics.summary.totalTicketsSold}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                          <span className="text-xs text-black font-medium">Revenue</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-black">
                          CHF {(analytics.summary.grossRevenue / 100).toFixed(0)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#B8A830]" />
                          <span className="text-xs text-black font-medium">Coupons</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-black">{analytics.summary.totalCouponRedemptions}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-600" />
                          <span className="text-xs text-black font-medium">Vouchers</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-black">{analytics.summary.totalVouchersRedeemed}</p>
                      </div>
                    </div>

                    {/* Coupon Performance */}
                    {analytics.coupons.byCode.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-black mb-3">Coupon Performance</h4>
                        {/* Mobile: Card view */}
                        <div className="space-y-2 sm:hidden">
                          {analytics.coupons.byCode.map((coupon) => (
                            <div key={coupon.id} className="bg-white border rounded-lg p-3">
                              <div className="flex items-start justify-between mb-2">
                                <code className="font-mono font-bold text-sm break-all">{coupon.code}</code>
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2 flex-shrink-0">
                                  {coupon.type === 'percentage'
                                    ? `${coupon.discountPercent}%`
                                    : `${coupon.currency} ${((coupon.discountAmount || 0) / 100).toFixed(0)}`}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-black">
                                <span>Redemptions: {coupon.redemptions}{coupon.maxRedemptions && ` / ${coupon.maxRedemptions}`}</span>
                                <span>Saved: CHF {(coupon.discountGiven / 100).toFixed(0)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Desktop: Table view */}
                        <div className="hidden sm:block bg-white border rounded-lg overflow-hidden overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left px-4 py-2 text-black font-medium">Code</th>
                                <th className="text-left px-4 py-2 text-black font-medium">Discount</th>
                                <th className="text-right px-4 py-2 text-black font-medium">Redemptions</th>
                                <th className="text-right px-4 py-2 text-black font-medium">Discount Given</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.coupons.byCode.map((coupon) => (
                                <tr key={coupon.id} className="border-t">
                                  <td className="px-4 py-2">
                                    <code className="font-mono font-bold">{coupon.code}</code>
                                  </td>
                                  <td className="px-4 py-2 text-black">
                                    {coupon.type === 'percentage'
                                      ? `${coupon.discountPercent}%`
                                      : `${coupon.currency} ${((coupon.discountAmount || 0) / 100).toFixed(0)}`}
                                  </td>
                                  <td className="px-4 py-2 text-right text-black">
                                    {coupon.redemptions}
                                    {coupon.maxRedemptions && ` / ${coupon.maxRedemptions}`}
                                  </td>
                                  <td className="px-4 py-2 text-right text-black">
                                    CHF {(coupon.discountGiven / 100).toFixed(0)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Recent Voucher Redemptions */}
                    {analytics.vouchers.redemptions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-black mb-3">Recent Voucher Redemptions</h4>
                        <div className="space-y-2">
                          {analytics.vouchers.redemptions.slice(0, 5).map((voucher) => (
                            <div key={voucher.id} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <code className="text-sm font-bold break-all">{voucher.code}</code>
                                  <p className="text-xs text-black mt-0.5 truncate">
                                    {voucher.redeemedByEmail}
                                  </p>
                                  <p className="text-xs text-black/60">
                                    {voucher.redeemedAt && new Date(voucher.redeemedAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <span className="text-sm font-medium text-black flex-shrink-0">
                                  {voucher.currency} {(voucher.value / 100).toFixed(0)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Tickets */}
                    {analytics.tickets.recent.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-black mb-3">
                          Recent Ticket Purchases ({analytics.tickets.total} total)
                        </h4>
                        <div className="space-y-2">
                          {analytics.tickets.recent.slice(0, 5).map((ticket) => (
                            <div key={ticket.id} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-black truncate">
                                    {ticket.firstName} {ticket.lastName}
                                  </p>
                                  <p className="text-xs text-black mt-0.5 truncate">
                                    {ticket.email}
                                  </p>
                                  <p className="text-xs text-black/60">
                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-medium text-black">
                                    CHF {(ticket.amountPaid / 100).toFixed(0)}
                                  </p>
                                  {ticket.discountAmount > 0 && (
                                    <p className="text-xs text-green-600">
                                      -{(ticket.discountAmount / 100).toFixed(0)} off
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Data State */}
                    {analytics.tickets.total === 0 && analytics.coupons.total === 0 && analytics.vouchers.total === 0 && (
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 text-black mx-auto mb-3" />
                        <h4 className="text-sm font-medium text-black">No analytics data yet</h4>
                        <p className="text-xs text-black mt-1">
                          Analytics will appear here once tickets are purchased using this partnership&apos;s coupons or vouchers.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-black mx-auto mb-3" />
                    <h4 className="text-sm font-medium text-black">Failed to load analytics</h4>
                    <p className="text-xs text-black mt-1">Please try again later.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
