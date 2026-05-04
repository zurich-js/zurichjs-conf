import { useState } from 'react';
import Head from 'next/head';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ListChecks, Users } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AddSpeakerModal, EditSpeakerModal, type SpeakerWithSessions } from '@/components/admin/speakers';
import {
  ProgramScheduleTab,
  ProgramSessionsTab,
  ProgramSpeakersTab,
} from '@/components/admin/program/ProgramAdminTabs';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useProgramScheduleItems, useProgramSessions } from '@/hooks/useProgram';
import { useToast } from '@/contexts/ToastContext';

type ProgramAdminTab = 'sessions' | 'schedule' | 'speakers';

const TABS: Array<{ id: ProgramAdminTab; label: string; icon: typeof ListChecks }> = [
  { id: 'sessions', label: 'Sessions', icon: ListChecks },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'speakers', label: 'Speakers', icon: Users },
];

async function fetchSpeakers(): Promise<{ speakers: SpeakerWithSessions[] }> {
  const res = await fetch('/api/admin/cfp/speakers?scope=program');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  return res.json();
}

export default function ProgramAdminPage() {
  const [activeTab, setActiveTab] = useState<ProgramAdminTab>('sessions');
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerWithSessions | null>(null);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();

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

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Program Admin" />;

  return (
    <>
      <Head>
        <title>Program Admin - ZurichJS</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader
          title="Program Admin"
          onLogout={logout}
        />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Program Sessions" value={sessions.length} />
            <StatCard label="Scheduled Slots" value={scheduleItems.filter((item) => item.session_id).length} />
            <StatCard label="Speakers" value={speakers.length} />
            <StatCard label="Workshops" value={sessions.filter((session) => session.kind === 'workshop').length} />
          </div>

          <div className="mb-6">
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm sm:inline-flex sm:grid-cols-none">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`cursor-pointer inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-brand-primary text-black'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                    }`}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

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
        </main>

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
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-950">{value}</p>
    </div>
  );
}
