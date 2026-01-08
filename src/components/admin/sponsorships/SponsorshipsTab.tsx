/**
 * Sponsorships Tab Component
 * Main container for the sponsorship admin dashboard
 * Uses TanStack Query for data fetching and mutations
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
import { Pagination } from '@/components/atoms';
import { StatsCards } from './StatsCards';
import { SponsorshipsList } from './SponsorshipsList';
import { SponsorDetailModal } from './SponsorDetailModal';
import { AddSponsorModal } from './AddSponsorModal';
import { sponsorshipKeys } from '@/lib/query-keys';
import type {
  SponsorshipStats,
  SponsorshipDealListItem,
  SponsorshipDealWithRelations,
  SponsorshipTier,
  SponsorshipDealStatus,
  SponsorshipCurrency,
  CreateSponsorFormData,
  CreateDealFormData,
} from './types';
import { DEAL_STATUS_CONFIG } from '@/lib/types/sponsorship';

const ITEMS_PER_PAGE = 10;

// API fetch functions
async function fetchTiers(): Promise<SponsorshipTier[]> {
  const response = await fetch('/api/admin/sponsorships/tiers');
  if (!response.ok) throw new Error('Failed to fetch tiers');
  const data = await response.json();
  return data.tiers;
}

async function fetchStats(): Promise<SponsorshipStats> {
  const response = await fetch('/api/admin/sponsorships/stats');
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
}

async function fetchDeals(filters: {
  status?: string;
  tier?: string;
  currency?: string;
  search?: string;
}): Promise<SponsorshipDealListItem[]> {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.tier && filters.tier !== 'all') params.append('tier', filters.tier);
  if (filters.currency && filters.currency !== 'all') params.append('currency', filters.currency);

  const response = await fetch(`/api/admin/sponsorships/deals?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch deals');
  const data = await response.json();
  return data.deals;
}

async function fetchDeal(dealId: string): Promise<SponsorshipDealWithRelations> {
  const response = await fetch(`/api/admin/sponsorships/deals/${dealId}`);
  if (!response.ok) throw new Error('Failed to fetch deal');
  return response.json();
}

async function createSponsor(data: CreateSponsorFormData): Promise<{ id: string }> {
  const response = await fetch('/api/admin/sponsorships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: data.companyName,
      companyWebsite: data.companyWebsite || undefined,
      vatId: data.vatId || undefined,
      billingAddress: data.billingAddress,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone || undefined,
      internalNotes: data.internalNotes || undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create sponsor');
  }

  // API returns sponsor directly
  const sponsor = await response.json();
  return { id: sponsor.id };
}

async function createDeal(data: CreateDealFormData): Promise<void> {
  const response = await fetch('/api/admin/sponsorships/deals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sponsorId: data.sponsorId,
      tierId: data.tierId,
      currency: data.currency,
      internalNotes: data.internalNotes || undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create deal');
  }
}

export function SponsorshipsTab() {
  const queryClient = useQueryClient();

  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SponsorshipDealStatus | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<string | 'all'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<SponsorshipCurrency | 'all'>('all');

  // Query: Tiers
  const { data: tiers = [] } = useQuery({
    queryKey: sponsorshipKeys.tiers(),
    queryFn: fetchTiers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query: Stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: sponsorshipKeys.stats(),
    queryFn: fetchStats,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Query: Deals
  const filters = useMemo(() => ({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    tier: tierFilter !== 'all' ? tierFilter : undefined,
    currency: currencyFilter !== 'all' ? currencyFilter : undefined,
    search: searchQuery || undefined,
  }), [statusFilter, tierFilter, currencyFilter, searchQuery]);

  const { data: deals = [], isLoading: isLoadingDeals, error: dealsError } = useQuery({
    queryKey: sponsorshipKeys.deals(filters),
    queryFn: () => fetchDeals(filters),
  });

  // Query: Selected Deal
  const { data: selectedDeal } = useQuery({
    queryKey: sponsorshipKeys.deal(selectedDealId || ''),
    queryFn: () => fetchDeal(selectedDealId!),
    enabled: !!selectedDealId,
  });

  // Mutation: Create Sponsor
  const createSponsorMutation = useMutation({
    mutationFn: createSponsor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sponsorshipKeys.stats() });
      queryClient.invalidateQueries({ queryKey: sponsorshipKeys.sponsors() });
    },
  });

  // Mutation: Create Deal
  const createDealMutation = useMutation({
    mutationFn: createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sponsorshipKeys.stats() });
      queryClient.invalidateQueries({ queryKey: sponsorshipKeys.deals() });
    },
  });

  // Pagination
  const totalPages = Math.ceil(deals.length / ITEMS_PER_PAGE);
  const paginatedDeals = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return deals.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [deals, currentPage]);

  // Reset page when filters change
  const handleFilterChange = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setCurrentPage(1);
  };

  // Handle deal selection
  const handleSelectDeal = (dealId: string) => {
    setSelectedDealId(dealId);
  };

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: sponsorshipKeys.all });
  };

  // Handle modal close with refresh
  const handleAddModalClose = () => {
    setShowAddModal(false);
    handleRefresh();
  };

  const handleDetailModalClose = () => {
    setSelectedDealId(null);
    handleRefresh();
  };

  // Handle sponsor and deal creation
  const handleCreateSponsor = async (data: CreateSponsorFormData): Promise<{ id: string }> => {
    return createSponsorMutation.mutateAsync(data);
  };

  const handleCreateDeal = async (data: CreateDealFormData): Promise<void> => {
    return createDealMutation.mutateAsync(data);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTierFilter('all');
    setCurrencyFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || tierFilter !== 'all' || currencyFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sponsorships</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage sponsor companies, deals, and invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#F1E271] text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Sponsor
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats || null} isLoading={isLoadingStats} />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company name or deal number..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent text-gray-900 placeholder:text-gray-500"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filter:</span>
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value as SponsorshipDealStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent text-gray-900 text-sm"
            >
              <option value="all">All Statuses</option>
              {Object.entries(DEAL_STATUS_CONFIG).map(([status, config]) => (
                <option key={status} value={status}>
                  {config.label}
                </option>
              ))}
            </select>

            {/* Tier filter */}
            <select
              value={tierFilter}
              onChange={(e) => handleFilterChange(setTierFilter)(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent text-gray-900 text-sm"
            >
              <option value="all">All Tiers</option>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
            </select>

            {/* Currency filter */}
            <select
              value={currencyFilter}
              onChange={(e) => handleFilterChange(setCurrencyFilter)(e.target.value as SponsorshipCurrency | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent text-gray-900 text-sm"
            >
              <option value="all">All Currencies</option>
              <option value="CHF">CHF</option>
              <option value="EUR">EUR</option>
            </select>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {dealsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {dealsError instanceof Error ? dealsError.message : 'Failed to load sponsorship deals'}
        </div>
      )}

      {/* Deals List */}
      <SponsorshipsList
        deals={paginatedDeals}
        isLoading={isLoadingDeals}
        onSelectDeal={handleSelectDeal}
      />

      {/* Pagination */}
      {!isLoadingDeals && deals.length > ITEMS_PER_PAGE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={ITEMS_PER_PAGE}
          totalItems={deals.length}
          variant="light"
        />
      )}

      {/* Add Sponsor Modal */}
      <AddSponsorModal
        isOpen={showAddModal}
        onClose={handleAddModalClose}
        onCreateSponsor={handleCreateSponsor}
        onCreateDeal={handleCreateDeal}
        tiers={tiers}
      />

      {/* Sponsor Detail Modal */}
      {selectedDeal && (
        <SponsorDetailModal
          deal={selectedDeal}
          onClose={handleDetailModalClose}
          onUpdate={handleRefresh}
        />
      )}
    </div>
  );
}
