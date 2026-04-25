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
  TransportationTab,
  ReimbursementsTab,
  travelQueryKeys,
  fetchTravelStats,
  fetchSpeakers,
  fetchTransportation,
  fetchReimbursements,
  type TabType,
  type CfpReimbursementStatus,
  type CfpTransportStatus,
} from '@/components/admin/cfp-travel';

const ITEMS_PER_PAGE = 10;

const TRAVEL_TABS: AdminTab<TabType>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'speakers', label: 'Speakers' },
  { id: 'transportation', label: 'Transportation' },
  { id: 'reimbursements', label: 'Reimbursements' },
];

export default function AdminTravelPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated, isLoading: isAuthLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [reimbursementFilter, setReimbursementFilter] = useState<CfpReimbursementStatus | 'all'>('pending');

  // Pagination state
  const [speakersPage, setSpeakersPage] = useState(1);
  const [transportationPage, setTransportationPage] = useState(1);
  const [reimbursementsPage, setReimbursementsPage] = useState(1);
  const [updatingSpeakerId, setUpdatingSpeakerId] = useState<string | null>(null);
  const [savingTransportationSpeakerId, setSavingTransportationSpeakerId] = useState<string | null>(null);
  const [selectedTransportationSpeakerId, setSelectedTransportationSpeakerId] = useState<string | null>(null);
  const [highlightedReimbursementId, setHighlightedReimbursementId] = useState<string | null>(null);

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
    enabled: isAuthenticated === true && (activeTab === 'overview' || activeTab === 'speakers' || activeTab === 'transportation'),
    staleTime: 30 * 1000,
  });

  const { data: transportation = [], isLoading: isLoadingTransportation } = useQuery({
    queryKey: travelQueryKeys.transportation,
    queryFn: fetchTransportation,
    enabled: isAuthenticated === true && (activeTab === 'overview' || activeTab === 'transportation'),
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

  const transportationMutation = useMutation({
    mutationFn: async ({
      speakerId,
      legs,
    }: {
      speakerId: string;
      legs: Array<{
        direction: 'inbound' | 'outbound';
        transport_mode: 'flight' | 'train' | 'link_only' | 'none';
        transport_status: CfpTransportStatus;
        provider: string;
        reference_code: string;
        departure_label: string;
        arrival_label: string;
        departure_time: string;
        arrival_time: string;
        transport_link_url: string;
        admin_notes: string;
      }>;
    }) => {
      setSavingTransportationSpeakerId(speakerId);
      const response = await fetch(`/api/admin/cfp/travel/transport/${speakerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          legs: legs.map((leg) => ({
            ...leg,
            departure_time: leg.departure_time ? new Date(leg.departure_time).toISOString() : '',
            arrival_time: leg.arrival_time ? new Date(leg.arrival_time).toISOString() : '',
          })),
        }),
      });
      if (!response.ok) throw new Error('Failed to update transportation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.transportation });
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.stats });
      toast.success('Transportation Updated', 'Transportation details were saved.');
    },
    onError: () => {
      toast.error('Update Failed', 'Failed to update transportation');
    },
    onSettled: () => setSavingTransportationSpeakerId(null),
  });

  const speakerTravelMutation = useMutation({
    mutationFn: async ({
      speakerId,
      updates,
    }: {
      speakerId: string;
      updates: {
        attending_speakers_dinner?: boolean | null;
        attending_after_party?: boolean | null;
        attending_post_conf?: boolean | null;
        travel_confirmed?: boolean;
      };
    }) => {
      setUpdatingSpeakerId(speakerId);
      const response = await fetch(`/api/admin/cfp/travel/speakers/${speakerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update speaker travel');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.speakers });
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.stats });
      toast.success('Travel Updated', 'Speaker travel planner was updated.');
    },
    onError: () => {
      toast.error('Update Failed', 'Failed to update travel details');
    },
    onSettled: () => setUpdatingSpeakerId(null),
  });

  // Filtered data
  const filteredReimbursements =
    reimbursementFilter === 'all' ? reimbursements : reimbursements.filter((r) => r.status === reimbursementFilter);

  // Reset page when filters change
  useEffect(() => setTransportationPage(1), [speakers, transportation]);
  useEffect(() => setReimbursementsPage(1), [reimbursementFilter]);

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Travel Management" />;

  return (
    <>
      <Head>
        <title>Travel Management | Admin - ZurichJS</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-text-brand-gray-lightest">
        <AdminHeader title="Travel Management" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="mt-4 sm:mt-6">
            <SummaryCards stats={stats} isLoading={isLoadingStats} />
          </div>

          <AdminTabBar tabs={TRAVEL_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === 'overview' && (
            <OverviewTab
              isLoading={isLoadingTransportation || isLoadingReimbursements}
              reimbursements={reimbursements}
              transportation={transportation}
              onOpenReimbursement={(id) => {
                setHighlightedReimbursementId(id);
                setActiveTab('reimbursements');
              }}
              onOpenTransportation={(speakerId) => {
                setSelectedTransportationSpeakerId(speakerId);
                setActiveTab('transportation');
              }}
            />
          )}

          {activeTab === 'speakers' && (
            <SpeakersTab
              speakers={speakers}
              isLoading={isLoadingSpeakers}
              currentPage={speakersPage}
              onPageChange={setSpeakersPage}
              pageSize={ITEMS_PER_PAGE}
              onUpdateSpeakerTravel={(speakerId, updates) => speakerTravelMutation.mutate({ speakerId, updates })}
              updatingSpeakerId={updatingSpeakerId}
            />
          )}

          {activeTab === 'transportation' && (
            <TransportationTab
              speakers={speakers}
              transportation={transportation}
              isLoading={isLoadingSpeakers || isLoadingTransportation}
              currentPage={transportationPage}
              onPageChange={setTransportationPage}
              pageSize={ITEMS_PER_PAGE}
              onSaveTransportation={(speakerId, legs) => transportationMutation.mutate({ speakerId, legs })}
              savingSpeakerId={savingTransportationSpeakerId}
              focusSpeakerId={selectedTransportationSpeakerId}
              onFocusedSpeakerHandled={() => setSelectedTransportationSpeakerId(null)}
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
              highlightedReimbursementId={highlightedReimbursementId}
              onHighlightHandled={() => setHighlightedReimbursementId(null)}
            />
          )}
        </main>
      </div>
    </>
  );
}

function SummaryCards({
  stats,
  isLoading,
}: {
  stats: Awaited<ReturnType<typeof fetchTravelStats>> | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !stats) {
    return (
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
            <div className="mb-2 h-4 w-24 rounded bg-gray-200" />
            <div className="h-8 w-16 rounded bg-text-brand-gray-lightest" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Program speakers" value={stats.total_program_speakers} />
      <StatCard label="Travel confirmed" value={stats.travel_confirmed} subtitle={`of ${stats.total_program_speakers}`} />
      <StatCard label="Attending dinner" value={stats.attending_dinner} />
      <StatCard label="Attending after-party" value={stats.attending_after_party} />
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-brand-gray-medium">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-black">{value}</p>
      {subtitle ? <p className="mt-1 text-sm text-gray-400">{subtitle}</p> : null}
    </div>
  );
}
