/**
 * Partnerships Dashboard
 * Manage partnerships, coupons, vouchers, and tracking
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Partnership,
  PartnershipType,
  PartnershipStatus,
  PartnershipList,
  StatsCards,
  AddPartnershipModal,
  PartnershipDetailModal,
  SendEmailModal,
  PartnershipWithDetails,
  fetchPartnerships,
  fetchPartnershipStats,
  fetchPartnershipDetails,
  fetchProducts,
  partnershipQueryKeys,
  useCreatePartnership,
  useDeletePartnership,
  useCreateCoupon,
  useDeleteCoupon,
  useCreateVouchers,
  useDeleteVoucher,
  useSendPartnershipEmail,
} from '@/components/admin/partnerships';

export default function PartnershipsDashboard() {
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const queryClient = useQueryClient();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PartnershipType | ''>('');
  const [statusFilter, setStatusFilter] = useState<PartnershipStatus | ''>('');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
  const [detailedPartnership, setDetailedPartnership] = useState<PartnershipWithDetails | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailPartnership, setEmailPartnership] = useState<Partnership | null>(null);

  // Auth check
  const { data: isAuthenticated, isLoading: isAuthLoading } = useQuery({
    queryKey: ['admin', 'auth'],
    queryFn: async () => {
      const res = await fetch('/api/admin/verify');
      return res.ok;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Queries
  const { data: partnershipsData, isLoading: isLoadingPartnerships } = useQuery({
    queryKey: partnershipQueryKeys.list({ type: typeFilter || undefined, status: statusFilter || undefined, search: searchQuery || undefined }),
    queryFn: () => fetchPartnerships({ type: typeFilter || undefined, status: statusFilter || undefined, search: searchQuery || undefined }),
    enabled: isAuthenticated === true,
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: partnershipQueryKeys.stats(),
    queryFn: fetchPartnershipStats,
    enabled: isAuthenticated === true,
  });

  const { data: productsData } = useQuery({
    queryKey: partnershipQueryKeys.products(),
    queryFn: fetchProducts,
    enabled: isAuthenticated === true,
  });

  const { data: detailedData } = useQuery({
    queryKey: partnershipQueryKeys.detail(selectedPartnership?.id || ''),
    queryFn: () => fetchPartnershipDetails(selectedPartnership!.id),
    enabled: !!selectedPartnership,
  });

  useEffect(() => {
    if (detailedData) setDetailedPartnership(detailedData);
  }, [detailedData]);

  // Mutations
  const createMutation = useCreatePartnership();
  const deleteMutation = useDeletePartnership();
  const createCouponMutation = useCreateCoupon();
  const deleteCouponMutation = useDeleteCoupon();
  const createVouchersMutation = useCreateVouchers();
  const deleteVoucherMutation = useDeleteVoucher();
  const sendEmailMutation = useSendPartnershipEmail(() => {
    setShowEmailModal(false);
    setEmailPartnership(null);
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
        setPassword('');
        queryClient.invalidateQueries({ queryKey: ['admin', 'auth'] });
        queryClient.invalidateQueries({ queryKey: partnershipQueryKeys.all });
      } else {
        setLoginError('Invalid password');
      }
    } catch {
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      queryClient.clear();
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-black">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#F1E271] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8 text-black">
        <Head><title>Admin Login | ZurichJS Conference</title></Head>
        <div className="max-w-sm w-full bg-white rounded-lg shadow-md p-5 sm:p-6">
          <div className="text-center mb-5 sm:mb-6">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#F1E271] flex items-center justify-center mx-auto mb-3">
              <span className="text-lg sm:text-xl font-bold">Z</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold">Admin Login</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-2.5 sm:py-2 border rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271]"
            />
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button type="submit" className="w-full bg-[#F1E271] text-black font-medium py-2.5 sm:py-2 rounded-lg hover:bg-[#E5D665]">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <Head><title>Partnerships | ZurichJS Admin</title></Head>

      <AdminHeader title="Partnerships" subtitle="Manage partners, coupons, and tracking" onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <StatsCards
          stats={stats || { total: 0, byType: {}, byStatus: {}, activeCoupons: 0, activeVouchers: 0, totalCouponRedemptions: 0, totalVoucherRedemptions: 0, totalDiscountGiven: 0 }}
          isLoading={isLoadingStats}
        />

        <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-4 sm:justify-between sm:items-center">
          <div className="sm:order-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#E5D665] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Partnership
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:order-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search partnerships..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271]"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as PartnershipType | '')}
                className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] bg-white"
              >
                <option value="">All Types</option>
                <option value="community">Community</option>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
                <option value="sponsor">Sponsor</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PartnershipStatus | '')}
                className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] bg-white"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

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

      <AddPartnershipModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={(data) => createMutation.mutateAsync(data).then(() => setShowAddModal(false))}
        isSubmitting={createMutation.isPending}
      />

      {selectedPartnership && detailedPartnership && (
        <PartnershipDetailModal
          partnership={detailedPartnership}
          products={productsData?.products || []}
          isOpen={!!selectedPartnership}
          onClose={() => {
            setSelectedPartnership(null);
            setDetailedPartnership(null);
          }}
          onCreateCoupon={(data) => createCouponMutation.mutateAsync({ partnershipId: selectedPartnership.id, data })}
          onDeleteCoupon={(couponId) => deleteCouponMutation.mutateAsync({ partnershipId: selectedPartnership.id, couponId })}
          onCreateVouchers={(data) => createVouchersMutation.mutateAsync({ partnershipId: selectedPartnership.id, data })}
          onDeleteVoucher={(voucherId) => deleteVoucherMutation.mutateAsync({ partnershipId: selectedPartnership.id, voucherId })}
          onSendEmail={() => {
            setEmailPartnership(selectedPartnership);
            setShowEmailModal(true);
          }}
        />
      )}

      {emailPartnership && (
        <SendEmailModal
          partnership={emailPartnership}
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setEmailPartnership(null);
          }}
          onSend={(options) => sendEmailMutation.mutateAsync({ partnershipId: emailPartnership.id, options })}
        />
      )}
    </div>
  );
}
