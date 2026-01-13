/**
 * Partnership Detail Modal
 * Shows full partnership details with coupons, vouchers, and tracking
 * Refactored to use tab sub-components for better maintainability
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Copy, Check, Mail, LinkIcon, ExternalLink } from 'lucide-react';
import { CouponsTab, VouchersTab, AnalyticsTab } from './tabs';
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

type TabType = 'overview' | 'coupons' | 'vouchers' | 'tracking' | 'analytics';

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
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Fetch analytics using TanStack Query - only fetch when tab is active
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<PartnershipAnalyticsResponse>({
    queryKey: ['partnership-analytics', partnership.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/partnerships/${partnership.id}/analytics`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    enabled: activeTab === 'analytics' && isOpen,
    staleTime: 30000,
  });

  if (!isOpen) return null;

  const trackingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}?utm_source=${partnership.utm_source}&utm_medium=${partnership.utm_medium}&utm_campaign=${partnership.utm_campaign}`;

  const copyTrackingUrl = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'coupons', label: 'Coupons', count: partnership.coupons?.length },
    { id: 'vouchers', label: 'Vouchers', count: partnership.vouchers?.length },
    { id: 'tracking', label: 'Tracking' },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-4xl sm:mx-4 bg-white sm:rounded-xl text-black shadow-xl flex flex-col max-h-[100dvh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#F1E271] px-4 py-3 shrink-0 sm:rounded-t-xl">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <h3 className="text-base sm:text-lg font-bold text-black truncate">{partnership.name}</h3>
              <p className="text-xs sm:text-sm text-black/70 truncate">{partnership.contact_email}</p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={onSendEmail}
                className="px-2 sm:px-3 py-1.5 bg-black text-white text-xs sm:text-sm rounded-lg hover:bg-black/80 flex items-center gap-1 cursor-pointer"
              >
                <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Send Package</span>
                <span className="sm:hidden">Send</span>
              </button>
              <button onClick={onClose} className="p-1.5 sm:p-1 rounded-lg hover:bg-black/10 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 shrink-0">
          <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'border-[#F1E271] text-black'
                    : 'border-transparent text-black hover:text-black'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 sm:ml-2 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
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
            <OverviewTab partnership={partnership} />
          )}

          {/* Coupons Tab */}
          {activeTab === 'coupons' && (
            <CouponsTab
              partnership={partnership}
              coupons={partnership.coupons || []}
              products={products}
              onCreateCoupon={onCreateCoupon}
              onDeleteCoupon={onDeleteCoupon}
            />
          )}

          {/* Vouchers Tab */}
          {activeTab === 'vouchers' && (
            <VouchersTab
              vouchers={partnership.vouchers || []}
              onCreateVouchers={onCreateVouchers}
              onDeleteVoucher={onDeleteVoucher}
            />
          )}

          {/* Tracking Tab */}
          {activeTab === 'tracking' && (
            <TrackingTab
              partnership={partnership}
              trackingUrl={trackingUrl}
              copiedUrl={copiedUrl}
              onCopyUrl={copyTrackingUrl}
            />
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <AnalyticsTab analytics={analytics} isLoading={isLoadingAnalytics} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Inline Sub-components (smaller, kept here)
// ============================================

function OverviewTab({ partnership }: { partnership: Partnership }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <h4 className="text-sm font-medium text-black mb-2">Contact Information</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-black/60">Name</dt>
              <dd className="text-sm font-medium">{partnership.contact_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-black/60">Email</dt>
              <dd className="text-sm">{partnership.contact_email}</dd>
            </div>
            {partnership.contact_phone && (
              <div>
                <dt className="text-xs text-black/60">Phone</dt>
                <dd className="text-sm">{partnership.contact_phone}</dd>
              </div>
            )}
          </dl>
        </div>
        <div>
          <h4 className="text-sm font-medium text-black mb-2">Partnership Details</h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-black/60">Type</dt>
              <dd className="text-sm font-medium capitalize">{partnership.type}</dd>
            </div>
            <div>
              <dt className="text-xs text-black/60">Status</dt>
              <dd className="text-sm capitalize">{partnership.status}</dd>
            </div>
            {partnership.company_name && (
              <div>
                <dt className="text-xs text-black/60">Company</dt>
                <dd className="text-sm">{partnership.company_name}</dd>
              </div>
            )}
            {partnership.company_website && (
              <div>
                <dt className="text-xs text-black/60">Website</dt>
                <dd className="text-sm">
                  <a
                    href={partnership.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    {partnership.company_website.replace(/^https?:\/\//, '')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      {partnership.notes && (
        <div>
          <h4 className="text-sm font-medium text-black mb-2">Notes</h4>
          <p className="text-sm text-black/80 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
            {partnership.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function TrackingTab({
  partnership,
  trackingUrl,
  copiedUrl,
  onCopyUrl,
}: {
  partnership: Partnership;
  trackingUrl: string;
  copiedUrl: boolean;
  onCopyUrl: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-black mb-3">Tracking URL</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 font-mono text-xs sm:text-sm break-all">
            {trackingUrl}
          </div>
          <button
            onClick={onCopyUrl}
            className="px-4 py-2 bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#E5D665] flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {copiedUrl ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy URL
              </>
            )}
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-black mb-3">UTM Parameters</h4>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <dt className="text-xs text-black/60 flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                utm_source
              </dt>
              <dd className="text-sm font-mono font-medium mt-1">{partnership.utm_source}</dd>
            </div>
            <div>
              <dt className="text-xs text-black/60 flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                utm_medium
              </dt>
              <dd className="text-sm font-mono font-medium mt-1">{partnership.utm_medium}</dd>
            </div>
            <div>
              <dt className="text-xs text-black/60 flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                utm_campaign
              </dt>
              <dd className="text-sm font-mono font-medium mt-1">{partnership.utm_campaign}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="text-sm text-black/60">
        <p>
          Share this URL with the partner. All visits and conversions will be tracked automatically.
        </p>
      </div>
    </div>
  );
}
