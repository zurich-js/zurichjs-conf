import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTabLayout } from '@/components/admin/AdminTabLayout';
import type { AdminTab } from '@/components/admin/AdminTabBar';
import { AdminOverviewCards } from '@/components/admin/common';
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
  { id: 'overview', label: 'Overview', href: '/admin/travel/overview' },
  { id: 'speakers', label: 'Speakers', href: '/admin/travel/speakers' },
  { id: 'transportation', label: 'Transportation', href: '/admin/travel/transportation' },
  { id: 'reimbursements', label: 'Reimbursements', href: '/admin/travel/reimbursements' },
];

export function TravelAdminController({ activeTab }: { activeTab: TabType }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated } = useAdminAuth();
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

  useEffect(() => {
    if (activeTab !== 'transportation') return;
    const speakerId = typeof router.query.speaker === 'string' ? router.query.speaker : null;
    setSelectedTransportationSpeakerId(speakerId);
  }, [activeTab, router.query.speaker]);

  useEffect(() => {
    if (activeTab !== 'reimbursements') return;
    const reimbursementId = typeof router.query.highlight === 'string' ? router.query.highlight : null;
    setHighlightedReimbursementId(reimbursementId);
  }, [activeTab, router.query.highlight]);

  return (
    <AdminLayout title="Travel Management" headTitle="Travel Management | Admin - ZurichJS" contentClassName="pb-12">
      <AdminTabLayout
        tabs={TRAVEL_TABS}
        activeTab={activeTab}
        overview={<SummaryCards stats={stats} isLoading={isLoadingStats} />}
      >

          {activeTab === 'overview' && (
            <OverviewTab
              isLoading={isLoadingTransportation || isLoadingReimbursements}
              reimbursements={reimbursements}
              transportation={transportation}
              onOpenReimbursement={(id) => router.push(`/admin/travel/reimbursements?highlight=${id}`)}
              onOpenTransportation={(speakerId) => router.push(`/admin/travel/transportation?speaker=${speakerId}`)}
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
      </AdminTabLayout>
    </AdminLayout>
  );
}

function SummaryCards({
  stats,
  isLoading,
}: {
  stats: Awaited<ReturnType<typeof fetchTravelStats>> | undefined;
  isLoading: boolean;
}) {
  return (
    <AdminOverviewCards
      isLoading={isLoading || !stats}
      items={[
        { label: 'Program speakers', value: stats?.total_program_speakers ?? 0 },
        { label: 'Travel confirmed', value: stats?.travel_confirmed ?? 0 },
        { label: 'Attending dinner', value: stats?.attending_dinner ?? 0 },
        { label: 'Attending after-party', value: stats?.attending_after_party ?? 0 },
      ]}
    />
  );
}
