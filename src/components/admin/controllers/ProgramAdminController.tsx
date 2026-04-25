import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTabLayout } from '@/components/admin/AdminTabLayout';
import type { AdminTab } from '@/components/admin/AdminTabBar';
import { AddSpeakerModal, EditSpeakerModal, type SpeakerWithSessions } from '@/components/admin/speakers';
import {
  ProgramScheduleTab,
  ProgramSessionsTab,
  ProgramSpeakersTab,
} from '@/components/admin/program/ProgramAdminTabs';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useProgramScheduleItems, useProgramSessions } from '@/hooks/useProgram';
import { useToast } from '@/contexts/ToastContext';
import { AdminOverviewCards } from '@/components/admin/common';

type ProgramAdminTab = 'sessions' | 'schedule' | 'speakers';

const TABS: AdminTab<ProgramAdminTab>[] = [
  { id: 'sessions', label: 'Sessions', href: '/admin/program/sessions' },
  { id: 'schedule', label: 'Schedule', href: '/admin/program/schedule' },
  { id: 'speakers', label: 'Speakers', href: '/admin/program/speakers' },
];

async function fetchSpeakers(): Promise<{ speakers: SpeakerWithSessions[] }> {
  const res = await fetch('/api/admin/cfp/speakers?scope=program');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  return res.json();
}

export function ProgramAdminController({ activeTab }: { activeTab: ProgramAdminTab }) {
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerWithSessions | null>(null);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated } = useAdminAuth();

  const speakersQuery = useQuery({
    queryKey: ['speakers', 'list'],
    queryFn: fetchSpeakers,
    enabled: isAuthenticated === true,
  });
  const sessionsQuery = useProgramSessions({ includeArchived: false });
  const scheduleQuery = useProgramScheduleItems();

  const speakers = speakersQuery.data?.speakers ?? [];
  const sessions = sessionsQuery.data ?? [];
  const scheduleItems = scheduleQuery.data ?? [];
  const isLoading = speakersQuery.isLoading || sessionsQuery.isLoading || scheduleQuery.isLoading;

  const refreshProgram = () => {
    queryClient.invalidateQueries({ queryKey: ['speakers'] });
    queryClient.invalidateQueries({ queryKey: ['program'] });
    queryClient.invalidateQueries({ queryKey: ['program-schedule'] });
  };

  const removeManagedSpeakerMutation = useMutation({
    mutationFn: async (speaker: SpeakerWithSessions) => {
      const res = await fetch(`/api/admin/cfp/speakers/${speaker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_admin_managed: false,
          is_visible: false,
          is_featured: false,
        }),
      });
      if (!res.ok) throw new Error('Failed to remove speaker');
    },
    onSuccess: () => {
      refreshProgram();
      toast.success('Speaker hidden', 'Speaker was removed from the managed program list without deleting their CFP account.');
    },
    onError: () => toast.error('Error', 'Failed to remove speaker'),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      setTogglingVisibilityId(id);
      const res = await fetch(`/api/admin/cfp/speakers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: isVisible }),
      });
      if (!res.ok) throw new Error('Failed to update visibility');
      return isVisible;
    },
    onSuccess: (isVisible) => {
      refreshProgram();
      toast.success('Visibility updated', isVisible ? 'Speaker is now visible on the lineup.' : 'Speaker is now hidden from the lineup.');
    },
    onError: () => toast.error('Error', 'Failed to update speaker visibility'),
    onSettled: () => setTogglingVisibilityId(null),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      setTogglingFeaturedId(id);
      const res = await fetch(`/api/admin/cfp/speakers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: isFeatured }),
      });
      if (!res.ok) throw new Error('Failed to update featured status');
      return isFeatured;
    },
    onSuccess: (isFeatured) => {
      refreshProgram();
      toast.success('Featured status updated', isFeatured ? 'Speaker is now featured.' : 'Speaker is no longer featured.');
    },
    onError: () => toast.error('Error', 'Failed to update featured status'),
    onSettled: () => setTogglingFeaturedId(null),
  });

  const showToast = (title: string, message?: string, type: 'success' | 'error' = 'success') => {
    if (type === 'error') {
      toast.error(title, message);
    } else {
      toast.success(title, message);
    }
  };

  return (
    <AdminLayout title="Program Admin" headTitle="Program Admin - ZurichJS" backgroundClassName="bg-gray-50">
      <AdminTabLayout
        tabs={TABS}
        activeTab={activeTab}
        overview={
          <AdminOverviewCards
            items={[
              { label: 'Program Sessions', value: sessions.length },
              { label: 'Scheduled Slots', value: scheduleItems.filter((item) => item.session_id).length },
              { label: 'Speakers', value: speakers.length },
              { label: 'Workshops', value: sessions.filter((session) => session.kind === 'workshop').length },
            ]}
          />
        }
      >

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" />
            </div>
          ) : activeTab === 'sessions' ? (
            <ProgramSessionsTab
              sessions={sessions}
              speakers={speakers}
              scheduleItems={scheduleItems}
              onCreateSpeaker={() => setShowAddSpeaker(true)}
              onEditSpeaker={setSelectedSpeaker}
              onToggleSpeakerVisibility={(id, isVisible) => toggleVisibilityMutation.mutate({ id, isVisible })}
              onToggleSpeakerFeatured={(id, isFeatured) => toggleFeaturedMutation.mutate({ id, isFeatured })}
              togglingVisibilityId={togglingVisibilityId}
              togglingFeaturedId={togglingFeaturedId}
              onRefresh={refreshProgram}
              onToast={showToast}
            />
          ) : activeTab === 'schedule' ? (
            <ProgramScheduleTab
              sessions={sessions}
              speakers={speakers}
              scheduleItems={scheduleItems}
              onCreateSpeaker={() => setShowAddSpeaker(true)}
              onEditSpeaker={setSelectedSpeaker}
              onToggleSpeakerVisibility={(id, isVisible) => toggleVisibilityMutation.mutate({ id, isVisible })}
              onToggleSpeakerFeatured={(id, isFeatured) => toggleFeaturedMutation.mutate({ id, isFeatured })}
              togglingVisibilityId={togglingVisibilityId}
              togglingFeaturedId={togglingFeaturedId}
              onRefresh={refreshProgram}
              onToast={showToast}
            />
          ) : activeTab === 'speakers' ? (
            <ProgramSpeakersTab
              sessions={sessions}
              speakers={speakers}
              scheduleItems={scheduleItems}
              onCreateSpeaker={() => setShowAddSpeaker(true)}
              onEditSpeaker={setSelectedSpeaker}
              onToggleSpeakerVisibility={(id, isVisible) => toggleVisibilityMutation.mutate({ id, isVisible })}
              onToggleSpeakerFeatured={(id, isFeatured) => toggleFeaturedMutation.mutate({ id, isFeatured })}
              togglingVisibilityId={togglingVisibilityId}
              togglingFeaturedId={togglingFeaturedId}
              onRefresh={refreshProgram}
              onToast={showToast}
            />
          ) : null}
      </AdminTabLayout>

        {showAddSpeaker ? (
          <AddSpeakerModal
            onClose={() => setShowAddSpeaker(false)}
            onCreated={() => {
              refreshProgram();
              setShowAddSpeaker(false);
              toast.success('Speaker added', 'Speaker is available for program assignments.');
            }}
          />
        ) : null}

        {selectedSpeaker ? (
          <EditSpeakerModal
            speaker={selectedSpeaker}
            canRemoveFromList={selectedSpeaker.is_admin_managed}
            isRemovingFromList={removeManagedSpeakerMutation.isPending}
            onRemoveFromList={(speaker) => removeManagedSpeakerMutation.mutate(speaker)}
            onClose={() => setSelectedSpeaker(null)}
            onUpdated={() => {
              refreshProgram();
              setSelectedSpeaker(null);
              toast.success('Speaker updated', 'Speaker profile changes were saved.');
            }}
          />
        ) : null}
    </AdminLayout>
  );
}
