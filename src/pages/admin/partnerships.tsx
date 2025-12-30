/**
 * Partnerships Dashboard
 * Manage partnerships, coupons, vouchers, and tracking
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Partnership,
  PartnershipStats,
  PartnershipType,
  PartnershipStatus,
  StripeProductInfo,
  PartnershipList,
  StatsCards,
  AddPartnershipModal,
  PartnershipDetailModal,
  SendEmailModal,
  CreatePartnershipRequest,
  PartnershipCoupon,
  PartnershipVoucher,
  CouponType,
  VoucherCurrency,
  VoucherPurpose,
} from '@/components/admin/partnerships';

// API functions
async function fetchPartnerships(params: {
  type?: PartnershipType;
  status?: PartnershipStatus;
  search?: string;
}): Promise<{
  partnerships: Partnership[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const queryParams = new URLSearchParams();
  if (params.type) queryParams.set('type', params.type);
  if (params.status) queryParams.set('status', params.status);
  if (params.search) queryParams.set('search', params.search);

  const res = await fetch(`/api/admin/partnerships?${queryParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch partnerships');
  return res.json();
}

async function fetchStats(): Promise<PartnershipStats> {
  const res = await fetch('/api/admin/partnerships/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

async function fetchPartnershipDetails(id: string): Promise<
  Partnership & { coupons: PartnershipCoupon[]; vouchers: PartnershipVoucher[] }
> {
  const res = await fetch(`/api/admin/partnerships/${id}`);
  if (!res.ok) throw new Error('Failed to fetch partnership');
  return res.json();
}

async function fetchProducts(): Promise<{ products: StripeProductInfo[] }> {
  const res = await fetch('/api/admin/partnerships/products');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export default function PartnershipsDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PartnershipType | ''>('');
  const [statusFilter, setStatusFilter] = useState<PartnershipStatus | ''>('');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
  const [detailedPartnership, setDetailedPartnership] = useState<
    (Partnership & { coupons: PartnershipCoupon[]; vouchers: PartnershipVoucher[] }) | null
  >(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailPartnership, setEmailPartnership] = useState<Partnership | null>(null);

  // Check auth status
  const { isLoading: isAuthLoading } = useQuery({
    queryKey: ['admin', 'auth'],
    queryFn: async () => {
      const res = await fetch('/api/admin/partnerships/stats');
      if (res.ok) {
        setIsAuthenticated(true);
        return true;
      }
      setIsAuthenticated(false);
      return false;
    },
    retry: false,
    staleTime: 0,
  });

  // Fetch partnerships
  const { data: partnershipsData, isLoading: isLoadingPartnerships } = useQuery({
    queryKey: ['partnerships', 'list', { type: typeFilter, status: statusFilter, search: searchQuery }],
    queryFn: () =>
      fetchPartnerships({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      }),
    enabled: isAuthenticated === true,
  });

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['partnerships', 'stats'],
    queryFn: fetchStats,
    enabled: isAuthenticated === true,
  });

  // Fetch products for coupon restrictions
  const { data: productsData } = useQuery({
    queryKey: ['partnerships', 'products'],
    queryFn: fetchProducts,
    enabled: isAuthenticated === true,
  });

  // Fetch detailed partnership when selected
  const { data: detailedData } = useQuery({
    queryKey: ['partnerships', 'detail', selectedPartnership?.id],
    queryFn: () => fetchPartnershipDetails(selectedPartnership!.id),
    enabled: !!selectedPartnership,
  });

  // Update detailed partnership when data changes
  useEffect(() => {
    if (detailedData) {
      setDetailedPartnership(detailedData);
    }
  }, [detailedData]);

  // Create partnership mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePartnershipRequest) => {
      const res = await fetch('/api/admin/partnerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create partnership');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      setShowAddModal(false);
      toast.success('Partnership Created', 'The partnership has been created successfully');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });

  // Delete partnership mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/partnerships/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete partnership');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      toast.success('Partnership Deleted', 'The partnership has been deleted');
    },
    onError: () => {
      toast.error('Error', 'Failed to delete partnership');
    },
  });

  // Create coupon mutation
  const createCouponMutation = useMutation({
    mutationFn: async ({
      partnershipId,
      data,
    }: {
      partnershipId: string;
      data: {
        code: string;
        type: CouponType;
        discount_percent?: number;
        discount_amount?: number;
        currency?: VoucherCurrency;
        restricted_product_ids: string[];
        max_redemptions?: number;
        expires_at?: string;
      };
    }) => {
      const res = await fetch(`/api/admin/partnerships/${partnershipId}/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create coupon');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      toast.success('Coupon Created', 'The coupon has been created in Stripe');
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });

  // Delete coupon mutation
  const deleteCouponMutation = useMutation({
    mutationFn: async ({ partnershipId, couponId }: { partnershipId: string; couponId: string }) => {
      const res = await fetch(`/api/admin/partnerships/${partnershipId}/coupons`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId }),
      });
      if (!res.ok) throw new Error('Failed to delete coupon');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      toast.success('Coupon Deleted', 'The coupon has been deleted');
    },
    onError: () => {
      toast.error('Error', 'Failed to delete coupon');
    },
  });

  // Create vouchers mutation
  const createVouchersMutation = useMutation({
    mutationFn: async ({
      partnershipId,
      data,
    }: {
      partnershipId: string;
      data: {
        purpose: VoucherPurpose;
        amount: number;
        currency: VoucherCurrency;
        quantity: number;
        recipient_name?: string;
        recipient_email?: string;
      };
    }) => {
      const res = await fetch(`/api/admin/partnerships/${partnershipId}/vouchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create vouchers');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      const count = data.vouchers?.length || 1;
      toast.success('Vouchers Created', `${count} voucher${count > 1 ? 's' : ''} created in Stripe`);
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });

  // Delete voucher mutation
  const deleteVoucherMutation = useMutation({
    mutationFn: async ({ partnershipId, voucherId }: { partnershipId: string; voucherId: string }) => {
      const res = await fetch(`/api/admin/partnerships/${partnershipId}/vouchers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherId }),
      });
      if (!res.ok) throw new Error('Failed to delete voucher');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      toast.success('Voucher Deleted', 'The voucher has been deleted');
    },
    onError: () => {
      toast.error('Error', 'Failed to delete voucher');
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({
      partnershipId,
      options,
    }: {
      partnershipId: string;
      options: {
        include_coupons: boolean;
        include_vouchers: boolean;
        include_logo: boolean;
        include_banner: boolean;
        custom_message?: string;
      };
    }) => {
      const res = await fetch(`/api/admin/partnerships/${partnershipId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send email');
      }
      return res.json();
    },
    onSuccess: () => {
      setShowEmailModal(false);
      setEmailPartnership(null);
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setLoginError('Invalid password');
      }
    } catch {
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
    queryClient.clear();
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#F1E271] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <Head>
          <title>Admin Login | ZurichJS Conference</title>
        </Head>
        <div className="max-w-sm w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#F1E271] flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold">Z</span>
            </div>
            <h1 className="text-xl font-bold">Admin Login</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271]"
            />
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-[#F1E271] text-black font-medium py-2 rounded-lg hover:bg-[#E5D665]"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Partnerships | ZurichJS Admin</title>
      </Head>

      <AdminHeader
        title="Partnerships"
        subtitle="Manage partners, coupons, and tracking"
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        <StatsCards
          stats={stats || { total: 0, byType: {}, byStatus: {}, activeCoupons: 0, activeVouchers: 0 }}
          isLoading={isLoadingStats}
        />

        {/* Actions and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search partnerships..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271]"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as PartnershipType | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271]"
            >
              <option value="">All Types</option>
              <option value="community">Community</option>
              <option value="individual">Individual</option>
              <option value="company">Company</option>
              <option value="sponsor">Sponsor</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PartnershipStatus | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271]"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#E5D665] flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Partnership
          </button>
        </div>

        {/* Partnerships List */}
        {isLoadingPartnerships ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-[#F1E271] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <PartnershipList
            partnerships={partnershipsData?.partnerships || []}
            onView={(p) => setSelectedPartnership(p)}
            onEdit={(p) => setSelectedPartnership(p)}
            onDelete={(p) => {
              if (confirm(`Are you sure you want to delete "${p.name}"?`)) {
                deleteMutation.mutate(p.id);
              }
            }}
            onEmail={(p) => {
              setEmailPartnership(p);
              setShowEmailModal(true);
            }}
          />
        )}
      </main>

      {/* Add Partnership Modal */}
      <AddPartnershipModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={(data) => createMutation.mutateAsync(data)}
        isSubmitting={createMutation.isPending}
      />

      {/* Partnership Detail Modal */}
      {selectedPartnership && detailedPartnership && (
        <PartnershipDetailModal
          partnership={detailedPartnership}
          products={productsData?.products || []}
          isOpen={!!selectedPartnership}
          onClose={() => {
            setSelectedPartnership(null);
            setDetailedPartnership(null);
          }}
          onCreateCoupon={(data) =>
            createCouponMutation.mutateAsync({
              partnershipId: selectedPartnership.id,
              data,
            })
          }
          onDeleteCoupon={(couponId) =>
            deleteCouponMutation.mutateAsync({
              partnershipId: selectedPartnership.id,
              couponId,
            })
          }
          onCreateVouchers={(data) =>
            createVouchersMutation.mutateAsync({
              partnershipId: selectedPartnership.id,
              data,
            })
          }
          onDeleteVoucher={(voucherId) =>
            deleteVoucherMutation.mutateAsync({
              partnershipId: selectedPartnership.id,
              voucherId,
            })
          }
          onSendEmail={() => {
            setEmailPartnership(selectedPartnership);
            setShowEmailModal(true);
          }}
        />
      )}

      {/* Send Email Modal */}
      {emailPartnership && (
        <SendEmailModal
          partnership={emailPartnership}
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setEmailPartnership(null);
          }}
          onSend={(options) =>
            sendEmailMutation.mutateAsync({
              partnershipId: emailPartnership.id,
              options,
            })
          }
        />
      )}
    </div>
  );
}
