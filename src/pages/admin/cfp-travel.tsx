/**
 * Admin CFP Travel Dashboard
 * Manage speaker travel, flights, and reimbursements
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminTabBar, type AdminTab } from '@/components/admin/AdminTabBar';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/contexts/ToastContext';
import {
  OverviewTab,
  SpeakersTab,
  FlightsTab,
  ReimbursementsTab,
  travelQueryKeys,
  fetchTravelStats,
  fetchSpeakers,
  fetchFlights,
  fetchReimbursements,
  type TabType,
  type CfpReimbursementStatus,
  type CfpFlightStatus,
} from '@/components/admin/cfp-travel';

const ITEMS_PER_PAGE = 10;

const TRAVEL_TABS: AdminTab<TabType>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'speakers', label: 'Speakers' },
  { id: 'flights', label: 'Flights' },
  { id: 'reimbursements', label: 'Reimbursements' },
];

export default function AdminTravelPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [reimbursementFilter, setReimbursementFilter] = useState<CfpReimbursementStatus | 'all'>('pending');
  const [flightDirection, setFlightDirection] = useState<'all' | 'inbound' | 'outbound'>('all');

  // Pagination state
  const [speakersPage, setSpeakersPage] = useState(1);
  const [flightsPage, setFlightsPage] = useState(1);
  const [reimbursementsPage, setReimbursementsPage] = useState(1);

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
    enabled: isAuthenticated === true && (activeTab === 'overview' || activeTab === 'flights'),
    staleTime: 30 * 1000,
  });

  const { data: reimbursements = [], isLoading: isLoadingReimbursements } = useQuery({
    queryKey: travelQueryKeys.reimbursements,
    queryFn: fetchReimbursements,
    enabled: isAuthenticated === true && (activeTab === 'overview' || activeTab === 'reimbursements'),
    staleTime: 30 * 1000,
  });

  // Mutations
  const reimbursementMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approved' | 'rejected' | 'paid' }) => {
      const response = await fetch(`/api/admin/cfp/travel/reimbursements/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      if (!response.ok) throw new Error('Failed to update reimbursement');
      return response.json();
    },
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.reimbursements });
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.stats });
      toast.success('Reimbursement Updated', `Status changed to ${action}`);
    },
    onError: () => {
      toast.error('Update Failed', 'Failed to update reimbursement status');
    },
  });

  const flightMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CfpFlightStatus }) => {
      const response = await fetch(`/api/admin/cfp/travel/flights/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update flight status');
      return response.json();
    },
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.flights });
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.stats });
      toast.success('Flight Updated', `Status changed to ${status.replace('_', ' ')}`);
    },
    onError: () => {
      toast.error('Update Failed', 'Failed to update flight status');
    },
  });

  // Filtered data
  const filteredReimbursements =
    reimbursementFilter === 'all' ? reimbursements : reimbursements.filter((r) => r.status === reimbursementFilter);

  const filteredFlights = flightDirection === 'all' ? flights : flights.filter((f) => f.direction === flightDirection);

  // Reset page when filters change
  useEffect(() => setFlightsPage(1), [flightDirection]);
  useEffect(() => setReimbursementsPage(1), [reimbursementFilter]);

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Travel Management" />;

  return (
    <>
      <Head>
        <title>Travel Management | Admin - ZurichJS</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader title="Travel Management" subtitle="Speaker travel & reimbursements" onLogout={logout} />

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
            />
          )}

          {activeTab === 'reimbursements' && (
            <ReimbursementsTab
              reimbursements={reimbursements}
              filteredReimbursements={filteredReimbursements}
              isLoading={isLoadingReimbursements}
              filter={reimbursementFilter}
              setFilter={setReimbursementFilter}
              currentPage={reimbursementsPage}
              onPageChange={setReimbursementsPage}
              pageSize={ITEMS_PER_PAGE}
              onApprove={(id) => reimbursementMutation.mutate({ id, action: 'approved' })}
              onReject={(id) => reimbursementMutation.mutate({ id, action: 'rejected' })}
              onMarkPaid={(id) => reimbursementMutation.mutate({ id, action: 'paid' })}
              isUpdating={reimbursementMutation.isPending}
            />
          )}
        </main>
      </div>
    </>
  );
}
