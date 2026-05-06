/**
 * Admin CFP Travel Dashboard
 * Manage speaker travel, flights, accommodation, and invoices
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminTabBar, type AdminTab } from '@/components/admin/AdminTabBar';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/contexts/ToastContext';
import type { SpeakerWithTravel } from '@/lib/cfp/admin-travel';
import {
  OverviewTab,
  SpeakersTab,
  FlightsTab,
  ArrivalsTab,
  InvoicesTab,
  SpeakerDetailModal,
  travelQueryKeys,
  fetchTravelStats,
  fetchSpeakers,
  fetchFlights,
  fetchInvoices,
  type TabType,
  type CfpReimbursementStatus,
  type CfpFlightStatus,
} from '@/components/admin/cfp-travel';
import {
  updateFlightStatus as apiUpdateFlightStatus,
  updateInvoice as apiUpdateInvoice,
  deleteInvoice as apiDeleteInvoice,
} from '@/components/admin/cfp-travel/api';

const ITEMS_PER_PAGE = 10;

const TRAVEL_TABS: AdminTab<TabType>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'speakers', label: 'Speakers' },
  { id: 'flights', label: 'Flights' },
  { id: 'arrivals', label: 'Arrivals' },
  { id: 'invoices', label: 'Invoices' },
];

export default function AdminTravelPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [invoiceFilter, setInvoiceFilter] = useState<CfpReimbursementStatus | 'all'>('pending');
  const [flightDirection, setFlightDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerWithTravel | null>(null);

  // Search state
  const [speakersSearch, setSpeakersSearch] = useState('');
  const [flightsSearch, setFlightsSearch] = useState('');

  // Pagination state
  const [speakersPage, setSpeakersPage] = useState(1);
  const [flightsPage, setFlightsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);

  // Data queries
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: travelQueryKeys.stats,
    queryFn: fetchTravelStats,
    enabled: isAuthenticated === true,
    staleTime: 30 * 1000,
  });

  const { data: speakers = [], isLoading: isLoadingSpeakers } = useQuery({
    queryKey: travelQueryKeys.speakers,
    queryFn: fetchSpeakers,
    enabled: isAuthenticated === true && (activeTab === 'overview' || activeTab === 'speakers'),
    staleTime: 30 * 1000,
  });

  const { data: flights = [], isLoading: isLoadingFlights } = useQuery({
    queryKey: travelQueryKeys.flights,
    queryFn: fetchFlights,
    enabled: isAuthenticated === true && (activeTab === 'overview' || activeTab === 'flights' || activeTab === 'arrivals'),
    staleTime: 30 * 1000,
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: travelQueryKeys.invoices,
    queryFn: fetchInvoices,
    enabled: isAuthenticated === true && (activeTab === 'overview' || activeTab === 'invoices'),
    staleTime: 30 * 1000,
  });

  // Invoice mutations
  const invoiceMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approved' | 'rejected' | 'paid' }) =>
      apiUpdateInvoice(id, { status: action }),
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.invoices });
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.stats });
      toast.success('Invoice Updated', `Status changed to ${action}`);
    },
    onError: () => toast.error('Update Failed', 'Failed to update invoice status'),
  });

  const invoiceDeleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.invoices });
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.stats });
      toast.success('Invoice Deleted', 'Invoice has been removed');
    },
    onError: () => toast.error('Delete Failed', 'Failed to delete invoice'),
  });

  const flightMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CfpFlightStatus }) =>
      apiUpdateFlightStatus(id, status),
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.flights });
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.stats });
      toast.success('Flight Updated', `Status changed to ${status.replace('_', ' ')}`);
    },
    onError: () => toast.error('Update Failed', 'Failed to update flight status'),
  });

  // Filtered data
  const filteredInvoices =
    invoiceFilter === 'all' ? invoices : invoices.filter((r) => r.status === invoiceFilter);

  const filteredFlights = flightDirection === 'all' ? flights : flights.filter((f) => f.direction === flightDirection);

  // Reset page when filters change
  useEffect(() => setFlightsPage(1), [flightDirection]);
  useEffect(() => setInvoicesPage(1), [invoiceFilter]);

  // Handle selecting a speaker from the flights tab
  const handleSelectSpeakerById = useCallback((speakerId: string) => {
    const found = speakers.find((s) => s.id === speakerId);
    if (found) setSelectedSpeaker(found);
  }, [speakers]);

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Travel Management" />;

  return (
    <>
      <Head>
        <title>Travel Management | Admin - ZurichJS</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader title="Travel Management" subtitle="Speaker travel, flights & invoices" onLogout={logout} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
          <AdminTabBar tabs={TRAVEL_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {activeTab === 'overview' && <OverviewTab stats={stats} isLoading={isLoadingStats} onNavigate={setActiveTab} />}

          {activeTab === 'speakers' && (
            <SpeakersTab
              speakers={speakers}
              isLoading={isLoadingSpeakers}
              currentPage={speakersPage}
              onPageChange={setSpeakersPage}
              pageSize={ITEMS_PER_PAGE}
              onSelectSpeaker={setSelectedSpeaker}
              searchQuery={speakersSearch}
              onSearchChange={setSpeakersSearch}
            />
          )}

          {activeTab === 'flights' && (
            <FlightsTab
              flights={flights}
              filteredFlights={filteredFlights}
              isLoading={isLoadingFlights}
              flightDirection={flightDirection}
              setFlightDirection={setFlightDirection}
              currentPage={flightsPage}
              onPageChange={setFlightsPage}
              pageSize={ITEMS_PER_PAGE}
              onUpdateStatus={(id, status) => flightMutation.mutate({ id, status })}
              isUpdating={flightMutation.isPending}
              onSelectSpeaker={handleSelectSpeakerById}
              searchQuery={flightsSearch}
              onSearchChange={setFlightsSearch}
            />
          )}

          {activeTab === 'arrivals' && (
            <ArrivalsTab
              flights={flights}
              isLoading={isLoadingFlights}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesTab
              invoices={invoices}
              filteredInvoices={filteredInvoices}
              isLoading={isLoadingInvoices}
              filter={invoiceFilter}
              setFilter={setInvoiceFilter}
              currentPage={invoicesPage}
              onPageChange={setInvoicesPage}
              pageSize={ITEMS_PER_PAGE}
              onApprove={(id) => invoiceMutation.mutate({ id, action: 'approved' })}
              onReject={(id) => invoiceMutation.mutate({ id, action: 'rejected' })}
              onMarkPaid={(id) => invoiceMutation.mutate({ id, action: 'paid' })}
              onDelete={(id) => invoiceDeleteMutation.mutate(id)}
              isUpdating={invoiceMutation.isPending || invoiceDeleteMutation.isPending}
            />
          )}
        </main>

        {/* Speaker Detail Modal */}
        {selectedSpeaker && (
          <SpeakerDetailModal
            speaker={selectedSpeaker}
            onClose={() => setSelectedSpeaker(null)}
          />
        )}
      </div>
    </>
  );
}
