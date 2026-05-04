/**
 * ProgramSessionsTab
 * Sessions list with filtering, search, and CRUD operations
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Eye, Plus, Trash2 } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import { Pill } from '@/components/admin/shared';
import { usePromoteSubmissionToSession } from '@/hooks/useProgram';
import type { Workshop } from '@/lib/types/database';
import type { ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import type { ProgramSession } from '@/lib/types/program';
import type { CfpSubmissionWithStats } from '@/lib/types/cfp/admin';
import type { SpeakerWithSessions } from '@/components/admin/speakers';
import {
  filterProgramSessions,
  getSessionScheduleCount,
  getSessionSpeakers,
  hasMissingSpeakerProfile,
  isWorkshopCommerceReady,
  matchesProgramSearch,
  type ProgramSessionFilter,
} from './utils';
import { ProgramSessionModal } from './ProgramSessionModal';
import type { ProgramTabsProps, SessionModalState } from './types';

export function ProgramSessionsTab({
  sessions,
  speakers,
  scheduleItems,
  onRefresh,
  onToast,
}: ProgramTabsProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProgramSessionFilter>('all');
  const [kind, setKind] = useState<string>('all');
  const [modal, setModal] = useState<SessionModalState>(null);
  const [showPromote, setShowPromote] = useState(false);
  const [offeringsBySessionId, setOfferingsBySessionId] = useState<Map<string, Workshop | null>>(new Map());
  const queryClient = useQueryClient();

  useEffect(() => {
    const workshopSessions = sessions.filter((session) => session.kind === 'workshop');
    if (workshopSessions.length === 0) {
      setOfferingsBySessionId(new Map());
      return;
    }

    let active = true;
    Promise.all(
      workshopSessions.map(async (session) => {
        const response = await fetch(`/api/admin/program/workshop-offerings/${session.id}`);
        if (!response.ok) return [session.id, null] as const;
        const data = await response.json();
        return [session.id, data.offering ?? null] as const;
      })
    ).then((entries) => {
      if (active) setOfferingsBySessionId(new Map(entries));
    });

    return () => {
      active = false;
    };
  }, [sessions]);

  const archiveMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/admin/program/sessions/${sessionId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to archive session');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program'] });
      onRefresh();
      onToast('Session archived');
    },
    onError: (error: Error) => onToast('Archive failed', error.message, 'error'),
  });

  const visibleSessions = useMemo(() => {
    return filterProgramSessions(sessions, filter, scheduleItems, speakers, offeringsBySessionId)
      .filter((session) => kind === 'all' || session.kind === kind)
      .filter((session) => matchesProgramSearch(session, search, speakers));
  }, [filter, kind, offeringsBySessionId, scheduleItems, search, sessions, speakers]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Sessions</h2>
            <p className="text-sm text-gray-600">Program sessions are the source of truth for talks, panels, workshops, and keynotes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowPromote(true)}
              className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-brand-gray-medium hover:bg-gray-50"
            >
              <Eye className="size-4" />
              Promote from CFP
            </button>
            <button
              onClick={() => setModal({ mode: 'create' })}
              className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f]"
            >
              <Plus className="size-4" />
              Create Session
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_180px_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search sessions or speakers"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
          />
          <select value={kind} onChange={(event) => setKind(event.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950">
            <option value="all">All kinds</option>
            <option value="talk">Talks</option>
            <option value="workshop">Workshops</option>
            <option value="panel">Panels</option>
            <option value="keynote">Keynotes</option>
            <option value="event">Events</option>
          </select>
          <select value={filter} onChange={(event) => setFilter(event.target.value as ProgramSessionFilter)} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950">
            <option value="all">All sessions</option>
            <option value="scheduled">Scheduled</option>
            <option value="unscheduled">Unscheduled</option>
            <option value="missing-speakers">Missing speakers</option>
            <option value="missing-profile">Missing profile data</option>
            <option value="commerce-ready">Commerce ready</option>
          </select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-3">Session</th>
              <th className="px-3 py-3">Kind</th>
              <th className="px-3 py-3">Speakers</th>
              <th className="px-3 py-3">Placement</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Signals</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {visibleSessions.map((session) => {
              const assignedSpeakers = getSessionSpeakers(session, speakers);
              const scheduleCount = getSessionScheduleCount(session, scheduleItems);
              const offering = offeringsBySessionId.get(session.id);
              return (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-950">{session.title}</p>
                    {session.cfp_submission_id ? <p className="text-xs text-brand-blue">Promoted from CFP</p> : null}
                  </td>
                  <td className="px-3 py-3 text-sm capitalize text-brand-gray-medium">{session.kind}</td>
                  <td className="px-3 py-3 text-sm text-brand-gray-medium">
                    {assignedSpeakers.length > 0
                      ? assignedSpeakers.map((speaker) => `${speaker.first_name} ${speaker.last_name}`).join(', ')
                      : <span className="text-brand-red">Missing</span>}
                  </td>
                  <td className="px-3 py-3 text-sm text-brand-gray-medium">{scheduleCount === 0 ? 'Unscheduled' : scheduleCount === 1 ? 'Scheduled once' : `Scheduled ${scheduleCount} times`}</td>
                  <td className="px-3 py-3 text-sm capitalize text-brand-gray-medium">{session.status}</td>
                  <td className="px-3 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {hasMissingSpeakerProfile(session, speakers) ? <Pill tone="red">profile</Pill> : null}
                      {session.kind === 'workshop' && isWorkshopCommerceReady(offering) ? <Pill tone="green">buyable</Pill> : null}
                      {session.kind === 'workshop' && offering && !isWorkshopCommerceReady(offering) ? <Pill tone="amber">not buyable</Pill> : null}
                      {session.kind === 'workshop' && !offering ? <Pill tone="amber">no offering</Pill> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModal({ mode: 'edit', session })} className="cursor-pointer rounded-md p-2 text-brand-blue hover:bg-blue-50" title="Edit session">
                        <Edit3 className="size-4" />
                      </button>
                      <button onClick={() => archiveMutation.mutate(session.id)} className="cursor-pointer rounded-md p-2 text-brand-red hover:bg-red-50" title="Archive session">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="lg:hidden space-y-3">
        {visibleSessions.map((session) => {
          const assignedSpeakers = getSessionSpeakers(session, speakers);
          const scheduleCount = getSessionScheduleCount(session, scheduleItems);
          const offering = offeringsBySessionId.get(session.id);
          return (
            <div key={session.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-950">{session.title}</p>
                  {session.cfp_submission_id ? <p className="text-xs text-brand-blue">Promoted from CFP</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => setModal({ mode: 'edit', session })} className="cursor-pointer rounded-md p-2 text-brand-blue hover:bg-blue-50" title="Edit session">
                    <Edit3 className="size-4" />
                  </button>
                  <button onClick={() => archiveMutation.mutate(session.id)} className="cursor-pointer rounded-md p-2 text-brand-red hover:bg-red-50" title="Archive session">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-brand-gray-medium">
                <span className="capitalize font-medium">{session.kind}</span>
                <span className="text-gray-300">|</span>
                <span className="capitalize">{session.status}</span>
                <span className="text-gray-300">|</span>
                <span>{scheduleCount === 0 ? 'Unscheduled' : scheduleCount === 1 ? 'Scheduled' : `${scheduleCount}x scheduled`}</span>
              </div>
              <div className="text-sm text-brand-gray-medium">
                {assignedSpeakers.length > 0
                  ? assignedSpeakers.map((speaker) => `${speaker.first_name} ${speaker.last_name}`).join(', ')
                  : <span className="text-brand-red">Missing speakers</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {hasMissingSpeakerProfile(session, speakers) ? <Pill tone="red">profile</Pill> : null}
                {session.kind === 'workshop' && isWorkshopCommerceReady(offering) ? <Pill tone="green">buyable</Pill> : null}
                {session.kind === 'workshop' && offering && !isWorkshopCommerceReady(offering) ? <Pill tone="amber">not buyable</Pill> : null}
                {session.kind === 'workshop' && !offering ? <Pill tone="amber">no offering</Pill> : null}
              </div>
            </div>
          );
        })}
      </div>

      {modal ? (
        <ProgramSessionModal
          session={modal.mode === 'edit' ? modal.session : null}
          speakers={speakers}
          preselectedSpeakerId={modal.mode === 'create' ? modal.speakerId : null}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            onRefresh();
            onToast('Session saved');
          }}
        />
      ) : null}
      {showPromote ? (
        <PromoteSubmissionModal
          existingSubmissionIds={new Set(sessions.map((session) => session.cfp_submission_id).filter(Boolean) as string[])}
          onClose={() => setShowPromote(false)}
          onPromoted={() => {
            setShowPromote(false);
            onRefresh();
            onToast('Submission promoted');
          }}
        />
      ) : null}
    </div>
  );
}

function PromoteSubmissionModal({
  existingSubmissionIds,
  onClose,
  onPromoted,
}: {
  existingSubmissionIds: Set<string>;
  onClose: () => void;
  onPromoted: () => void;
}) {
  const promoteMutation = usePromoteSubmissionToSession();
  const [selectedId, setSelectedId] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'cfp', 'accepted-submissions-for-program'],
    queryFn: async () => {
      const response = await fetch('/api/admin/cfp/submissions?status=accepted&limit=200&sort_by=title&sort_order=asc');
      if (!response.ok) throw new Error('Failed to load accepted submissions');
      return response.json() as Promise<{ submissions: CfpSubmissionWithStats[] }>;
    },
  });
  const options = (data?.submissions ?? []).filter((submission) => !existingSubmissionIds.has(submission.id));

  const handlePromote = async () => {
    if (!selectedId) return;
    await promoteMutation.mutateAsync({ submission_id: selectedId, status: 'confirmed' });
    onPromoted();
  };

  return (
    <AdminModal
      title="Promote CFP Submission"
      maxWidth="xl"
      showHeader={false}
      onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="button" onClick={handlePromote} disabled={!selectedId || promoteMutation.isPending} className="cursor-pointer rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f] disabled:opacity-50">
            {promoteMutation.isPending ? 'Promoting...' : 'Promote'}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        {isLoading ? <p className="text-sm text-gray-500">Loading submissions...</p> : null}
        {error ? <p className="text-sm text-brand-red">{(error as Error).message}</p> : null}
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950">
          <option value="">Choose accepted CFP submission</option>
          {options.map((submission) => (
            <option key={submission.id} value={submission.id}>
              {submission.title} — {submission.speaker?.first_name} {submission.speaker?.last_name}
            </option>
          ))}
        </select>
        {options.length === 0 && !isLoading ? <p className="text-sm text-gray-500">All accepted submissions have already been promoted.</p> : null}
      </div>
    </AdminModal>
  );
}
