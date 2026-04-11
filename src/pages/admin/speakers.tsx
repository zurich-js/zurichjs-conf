import { useState } from 'react';
import type { ReactNode } from 'react';
import Head from 'next/head';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import {
  AddSessionModal,
  AddSpeakerModal,
  AdminSpeakerCard,
  EditSessionModal,
  EditSpeakerModal,
  type Session,
  type SpeakerWithSessions,
  ScheduleItemModal,
} from '@/components/admin/speakers';
import type { ProgramScheduleItemRecord } from '@/lib/types/program-schedule';

type AdminTab = 'speakers' | 'talks' | 'workshops' | 'schedule';

async function fetchSpeakers(): Promise<{ speakers: SpeakerWithSessions[] }> {
  const res = await fetch('/api/admin/cfp/speakers');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  return res.json();
}

async function fetchProgramSchedule(): Promise<{ items: ProgramScheduleItemRecord[] }> {
  const res = await fetch('/api/admin/program-schedule');
  if (!res.ok) throw new Error('Failed to fetch schedule');
  return res.json();
}

export default function SpeakersDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('speakers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerWithSessions | null>(null);
  const [showAddSession, setShowAddSession] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<ProgramScheduleItemRecord | null>(null);
  const [initialScheduleSubmissionId, setInitialScheduleSubmissionId] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();

  const { data: speakersData, isLoading: isLoadingSpeakers } = useQuery({
    queryKey: ['speakers', 'list'],
    queryFn: fetchSpeakers,
    enabled: isAuthenticated === true,
  });

  const { data: scheduleData, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['program-schedule'],
    queryFn: fetchProgramSchedule,
    enabled: isAuthenticated === true,
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      const res = await fetch(`/api/admin/cfp/speakers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: isVisible }),
      });
      if (!res.ok) throw new Error('Failed to update visibility');
    },
    onSuccess: (_data, { isVisible }) => {
      queryClient.invalidateQueries({ queryKey: ['speakers'] });
      toast.success('Visibility Updated', isVisible ? 'Speaker is now visible on the lineup' : 'Speaker is now hidden from the lineup');
    },
    onError: () => {
      toast.error('Error', 'Failed to update speaker visibility');
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/program-schedule/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete schedule item');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-schedule'] });
      toast.success('Schedule Updated', 'Schedule item deleted');
    },
    onError: (error: Error) => {
      toast.error('Delete Failed', error.message);
    },
  });

  const speakers = speakersData?.speakers || [];
  const scheduleItems = scheduleData?.items || [];

  const confirmedSpeakers = speakers.filter((speaker) => {
    const hasAcceptedSession = speaker.submissions?.some((submission) => submission.status === 'accepted');
    return speaker.is_visible || hasAcceptedSession;
  });

  const filteredSpeakers = confirmedSpeakers.filter((speaker) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      speaker.first_name?.toLowerCase().includes(query) ||
      speaker.last_name?.toLowerCase().includes(query) ||
      speaker.email.toLowerCase().includes(query) ||
      speaker.company?.toLowerCase().includes(query)
    );
  });

  const acceptedSessions = speakers.flatMap((speaker) =>
    speaker.submissions
      .filter((submission) => submission.status === 'accepted')
      .map((submission) => ({
        ...submission,
        speaker,
      }))
  );

  const talks = acceptedSessions.filter((submission) => submission.submission_type !== 'workshop');
  const workshops = acceptedSessions.filter((submission) => submission.submission_type === 'workshop');
  const scheduleCountBySubmissionId = scheduleItems.reduce((map, item) => {
    if (!item.submission_id) {
      return map;
    }

    map.set(item.submission_id, (map.get(item.submission_id) || 0) + 1);
    return map;
  }, new Map<string, number>());

  const availableScheduleSessions = acceptedSessions.map((submission) => ({
    id: submission.id,
    title: submission.title,
    submission_type: submission.submission_type,
    speaker: {
      first_name: submission.speaker.first_name,
      last_name: submission.speaker.last_name,
    },
  }));

  const speakerOptions = confirmedSpeakers.map((speaker) => ({
    id: speaker.id,
    first_name: speaker.first_name,
    last_name: speaker.last_name,
  }));

  const unscheduledSessions = availableScheduleSessions.filter((session) => {
    if (session.id === initialScheduleSubmissionId) {
      return true;
    }

    if (selectedScheduleItem?.submission_id === session.id) {
      return true;
    }

    return !scheduleCountBySubmissionId.has(session.id);
  });

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Speakers Dashboard" />;

  return (
    <>
      <Head>
        <title>Speakers Dashboard - Admin</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader
          title="Speakers Dashboard"
          subtitle="Manage speakers, invited sessions, and the public schedule"
          onLogout={logout}
        />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total Speakers" value={confirmedSpeakers.length} />
            <StatCard label="Accepted Talks" value={talks.length} valueClassName="text-blue-600" />
            <StatCard label="Accepted Workshops" value={workshops.length} valueClassName="text-purple-600" />
            <StatCard label="Schedule Rows" value={scheduleItems.length} valueClassName="text-green-600" />
          </div>

          <div className="mb-6">
            <div className="hidden sm:block">
              <div className="inline-flex space-x-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                {([
                  ['speakers', 'Speakers'],
                  ['talks', 'Talks'],
                  ['workshops', 'Workshops'],
                  ['schedule', 'Schedule'],
                ] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`cursor-pointer rounded-md px-6 py-2.5 text-sm font-medium transition-all ${
                      activeTab === tab ? 'bg-[#F1E271] text-black shadow-sm' : 'text-black hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'schedule' ? 'Search schedule rows...' : 'Search speakers or sessions...'}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
            />

            {activeTab === 'speakers' ? (
              <button
                onClick={() => setShowAddSpeaker(true)}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#F1E271] px-4 py-2 font-semibold text-black transition-all hover:bg-[#e8d95e]"
              >
                <Plus className="h-4 w-4" />
                Add Speaker
              </button>
            ) : activeTab === 'schedule' ? (
              <button
                onClick={() => {
                  setSelectedScheduleItem(null);
                  setInitialScheduleSubmissionId(null);
                  setShowScheduleModal(true);
                }}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#F1E271] px-4 py-2 font-semibold text-black transition-all hover:bg-[#e8d95e]"
              >
                <Plus className="h-4 w-4" />
                Add Schedule Item
              </button>
            ) : null}
          </div>

          {activeTab === 'speakers' ? (
            isLoadingSpeakers ? (
              <LoadingBlock />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredSpeakers.map((speaker) => (
                  <AdminSpeakerCard
                    key={speaker.id}
                    speaker={speaker}
                    onToggleVisibility={(id, isVisible) => toggleVisibilityMutation.mutate({ id, isVisible })}
                    onAddSession={(speakerId) => setShowAddSession(speakerId)}
                    onEdit={(entry) => setSelectedSpeaker(entry)}
                    isTogglingVisibility={toggleVisibilityMutation.isPending}
                  />
                ))}
              </div>
            )
          ) : activeTab === 'talks' ? (
            <SessionTable
              rows={talks.filter((session) => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                  session.title.toLowerCase().includes(query) ||
                  `${session.speaker.first_name} ${session.speaker.last_name}`.toLowerCase().includes(query)
                );
              })}
              scheduleCountBySubmissionId={scheduleCountBySubmissionId}
              onEdit={(session) => setSelectedSession(session)}
              onSchedule={(session) => {
                setSelectedScheduleItem(null);
                setInitialScheduleSubmissionId(session.id);
                setShowScheduleModal(true);
              }}
            />
          ) : activeTab === 'workshops' ? (
            <SessionTable
              rows={workshops.filter((session) => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                  session.title.toLowerCase().includes(query) ||
                  `${session.speaker.first_name} ${session.speaker.last_name}`.toLowerCase().includes(query)
                );
              })}
              scheduleCountBySubmissionId={scheduleCountBySubmissionId}
              onEdit={(session) => setSelectedSession(session)}
              onSchedule={(session) => {
                setSelectedScheduleItem(null);
                setInitialScheduleSubmissionId(session.id);
                setShowScheduleModal(true);
              }}
            />
          ) : isLoadingSchedule ? (
            <LoadingBlock />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-sm font-semibold text-black">
                  <tr>
                    <HeaderCell>Date</HeaderCell>
                    <HeaderCell>Time</HeaderCell>
                    <HeaderCell>Type</HeaderCell>
                    <HeaderCell>Title</HeaderCell>
                    <HeaderCell>Linked Session</HeaderCell>
                    <HeaderCell>Visibility</HeaderCell>
                    <HeaderCell>Actions</HeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {scheduleItems
                    .filter((item) => {
                      if (!searchQuery) return true;
                      const query = searchQuery.toLowerCase();
                      return item.title.toLowerCase().includes(query) || (item.description || '').toLowerCase().includes(query);
                    })
                    .map((item) => {
                      const linkedSession = acceptedSessions.find((session) => session.id === item.submission_id);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <BodyCell>{item.date}</BodyCell>
                          <BodyCell>{item.start_time.slice(0, 5)}</BodyCell>
                          <BodyCell className="capitalize">{item.type}</BodyCell>
                          <BodyCell>{item.title}</BodyCell>
                          <BodyCell>
                            {linkedSession ? `${linkedSession.title} (${linkedSession.speaker.first_name} ${linkedSession.speaker.last_name})` : 'No linked session'}
                          </BodyCell>
                          <BodyCell>{item.is_visible ? 'Visible' : 'Hidden'}</BodyCell>
                          <BodyCell>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setSelectedScheduleItem(item);
                                  setInitialScheduleSubmissionId(null);
                                  setShowScheduleModal(true);
                                }}
                                className="cursor-pointer text-blue-600 hover:text-blue-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteScheduleMutation.mutate(item.id)}
                                className="cursor-pointer text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </BodyCell>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {showAddSpeaker ? (
          <AddSpeakerModal
            onClose={() => setShowAddSpeaker(false)}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['speakers'] });
              setShowAddSpeaker(false);
              toast.success('Speaker Added', 'New speaker has been created');
            }}
          />
        ) : null}

        {showAddSession ? (
          <AddSessionModal
            speakerId={showAddSession}
            onClose={() => setShowAddSession(null)}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['speakers'] });
              setShowAddSession(null);
              toast.success('Session Added', 'New invited session has been created');
            }}
          />
        ) : null}

        {selectedSpeaker ? (
          <EditSpeakerModal
            speaker={selectedSpeaker}
            onClose={() => setSelectedSpeaker(null)}
            onUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['speakers'] });
              setSelectedSpeaker(null);
              toast.success('Speaker Updated', 'Speaker profile has been updated');
            }}
          />
        ) : null}

        {selectedSession ? (
          <EditSessionModal
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
            onUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['speakers'] });
              setSelectedSession(null);
              toast.success('Session Updated', 'Session details have been saved');
            }}
          />
        ) : null}

        {showScheduleModal ? (
          <ScheduleItemModal
            item={selectedScheduleItem}
            sessions={unscheduledSessions}
            speakers={speakerOptions}
            initialSubmissionId={initialScheduleSubmissionId}
            onClose={() => {
              setSelectedScheduleItem(null);
              setInitialScheduleSubmissionId(null);
              setShowScheduleModal(false);
            }}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['speakers'] });
              queryClient.invalidateQueries({ queryKey: ['program-schedule'] });
              setSelectedScheduleItem(null);
              setInitialScheduleSubmissionId(null);
              setShowScheduleModal(false);
              toast.success('Schedule Updated', 'Schedule item saved');
            }}
          />
        ) : null}
      </div>
    </>
  );
}

function LoadingBlock() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-black"></div>
    </div>
  );
}

function StatCard({ label, value, valueClassName = 'text-black' }: { label: string; value: number; valueClassName?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-1 text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{children}</th>;
}

function BodyCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-2 py-3 text-sm text-gray-700 ${className}`}>{children}</td>;
}

function SessionTable({
  rows,
  scheduleCountBySubmissionId,
  onEdit,
  onSchedule,
}: {
  rows: Array<Session & { speaker: SpeakerWithSessions }>;
  scheduleCountBySubmissionId: Map<string, number>;
  onEdit: (session: Session) => void;
  onSchedule: (session: Session) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50 text-left text-sm font-semibold text-black">
          <tr>
            <HeaderCell>Title</HeaderCell>
            <HeaderCell>Speaker</HeaderCell>
            <HeaderCell>Type</HeaderCell>
            <HeaderCell>Placement</HeaderCell>
            <HeaderCell>Actions</HeaderCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((session) => {
            const placements = scheduleCountBySubmissionId.get(session.id) || 0;
            return (
              <tr key={session.id} className="hover:bg-gray-50">
                <BodyCell>{session.title}</BodyCell>
                <BodyCell>{session.speaker.first_name} {session.speaker.last_name}</BodyCell>
                <BodyCell className="capitalize">{session.submission_type}</BodyCell>
                <BodyCell>
                  {placements === 0 ? 'Unscheduled' : placements === 1 ? 'Scheduled once' : `Scheduled ${placements} times`}
                </BodyCell>
                <BodyCell>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onEdit(session)}
                      className="cursor-pointer text-blue-600 hover:text-blue-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onSchedule(session)}
                      className="cursor-pointer text-gray-500 hover:text-black"
                      title="Add to schedule"
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </button>
                  </div>
                </BodyCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
