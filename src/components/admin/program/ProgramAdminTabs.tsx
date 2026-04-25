import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper, type ColumnDef, type SortingState, type Updater } from '@tanstack/react-table';
import { CalendarRange, Coffee, Copy, Edit3, Eye, MicVocal, Plus, Search, Trash2, Users } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import { ConfirmationModal } from '@/components/admin/cfp';
import { AdminDataTable, AdminMobileCard, AdminTableToolbar } from '@/components/admin/common';
import {
  useCreateScheduleItem,
  useDeleteScheduleItem,
  usePromoteSubmissionToSession,
  useUpdateScheduleItem,
  useWorkshopOffering,
} from '@/hooks/useProgram';
import type { Workshop } from '@/lib/types/database';
import type { ProgramScheduleItemInput, ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import type { ProgramSession } from '@/lib/types/program';
import type { CfpSubmissionWithStats } from '@/lib/types/cfp/admin';
import type { SpeakerWithSessions } from '@/components/admin/speakers';
import {
  filterProgramSessions,
  groupOverlappingScheduleItems,
  getInsertionDraftAfter,
  getInsertionDraftBefore,
  getScheduleNeighbors,
  getSessionScheduleCount,
  getSessionSpeakers,
  groupScheduleItemsByDay,
  hasMissingSpeakerProfile,
  inferScheduleDurationForSession,
  isWorkshopCommerceReady,
  matchesProgramSearch,
  minutesToTime,
  timeToMinutes,
  type ScheduleSlotDraft,
  type ProgramSessionFilter,
} from './utils';
import { ProgramSessionModal } from './ProgramSessionModal';

interface ProgramTabsProps {
  sessions: ProgramSession[];
  speakers: SpeakerWithSessions[];
  scheduleItems: ProgramScheduleItemRecord[];
  isLoading?: boolean;
  onEditSpeaker: (speaker: SpeakerWithSessions) => void;
  onCreateSpeaker: () => void;
  onToggleSpeakerVisibility: (id: string, isVisible: boolean) => void;
  onToggleSpeakerFeatured: (id: string, isFeatured: boolean) => void;
  togglingVisibilityId?: string | null;
  togglingFeaturedId?: string | null;
  onRefresh: () => void;
  onToast: (title: string, message?: string, type?: 'success' | 'error') => void;
}

type SessionModalState =
  | { mode: 'create'; speakerId?: string | null }
  | { mode: 'edit'; session: ProgramSession }
  | null;

type ScheduleModalState =
  | { mode: 'create'; draft?: ScheduleSlotDraft }
  | { mode: 'edit'; item: ProgramScheduleItemRecord }
  | null;

const sessionColumnHelper = createColumnHelper<ProgramSession>();
const speakerColumnHelper = createColumnHelper<SpeakerWithSessions>();

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
  const [sorting, setSorting] = useState<SortingState>([{ id: 'session', desc: false }]);
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
    let next = filterProgramSessions(sessions, filter, scheduleItems, speakers, offeringsBySessionId)
      .filter((session) => kind === 'all' || session.kind === kind)
      .filter((session) => matchesProgramSearch(session, search, speakers));

    if (sorting.length > 0) {
      next = [...next].sort((a, b) => {
        for (const rule of sorting) {
          const direction = rule.desc ? -1 : 1;
          let comparison = 0;

          if (rule.id === 'session') {
            comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
          } else if (rule.id === 'kind') {
            comparison = a.kind.localeCompare(b.kind, undefined, { sensitivity: 'base' });
          } else if (rule.id === 'speakers') {
            comparison = getSessionSpeakers(a, speakers)
              .map((speaker) => `${speaker.first_name} ${speaker.last_name}`)
              .join(', ')
              .localeCompare(
                getSessionSpeakers(b, speakers)
                  .map((speaker) => `${speaker.first_name} ${speaker.last_name}`)
                  .join(', '),
                undefined,
                { sensitivity: 'base' }
              );
          } else if (rule.id === 'placement') {
            comparison = getSessionScheduleCount(a, scheduleItems) - getSessionScheduleCount(b, scheduleItems);
          } else if (rule.id === 'status') {
            comparison = a.status.localeCompare(b.status, undefined, { sensitivity: 'base' });
          }

          if (comparison !== 0) return comparison * direction;
        }

        return 0;
      });
    }

    return next;
  }, [filter, kind, offeringsBySessionId, scheduleItems, search, sessions, sorting, speakers]);

  const handleSortingChange = (updater: Updater<SortingState>) => {
    setSorting((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      return next.slice(0, 1);
    });
  };

  const sessionColumns = useMemo<Array<ColumnDef<ProgramSession>>>(
    () => getProgramSessionColumns({
      speakers,
      scheduleItems,
      offeringsBySessionId,
      onEdit: (session) => setModal({ mode: 'edit', session }),
      onArchive: (session) => archiveMutation.mutate(session.id),
    }),
    [archiveMutation, offeringsBySessionId, scheduleItems, speakers]
  );

  return (
    <div className="space-y-4">
      <AdminDataTable
        data={visibleSessions}
        columns={sessionColumns}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        getRowId={(session) => session.id}
        emptyState="No sessions match the current filters"
        toolbar={(
          <AdminTableToolbar
            right={(
              <>
                <div className="relative min-w-[280px] max-w-full flex-1 lg:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-medium" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search sessions or speakers"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-10 text-sm text-black placeholder-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <select value={kind} onChange={(event) => setKind(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary">
                  <option value="all">All kinds</option>
                  <option value="talk">Talks</option>
                  <option value="workshop">Workshops</option>
                  <option value="panel">Panels</option>
                  <option value="keynote">Keynotes</option>
                  <option value="event">Events</option>
                </select>
                <select value={filter} onChange={(event) => setFilter(event.target.value as ProgramSessionFilter)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary">
                  <option value="all">All sessions</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="unscheduled">Unscheduled</option>
                  <option value="missing-speakers">Missing speakers</option>
                  <option value="missing-profile">Missing profile data</option>
                  <option value="commerce-ready">Commerce ready</option>
                </select>
                <button
                  onClick={() => setShowPromote(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-brand-gray-medium hover:bg-gray-50"
                >
                  <Eye className="size-4" />
                  Promote from CFP
                </button>
                <button
                  onClick={() => setModal({ mode: 'create' })}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f]"
                >
                  <Plus className="size-4" />
                  Create Session
                </button>
              </>
            )}
          />
        )}
        mobileList={{
          renderCard: (session) => (
            <AdminMobileCard key={session.id}>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-black">{session.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-gray-dark">
                    <span className="capitalize">{session.kind}</span>
                    <span>·</span>
                    <span>{getSessionScheduleCount(session, scheduleItems) === 0 ? 'Unscheduled' : `${getSessionScheduleCount(session, scheduleItems)} placement${getSessionScheduleCount(session, scheduleItems) === 1 ? '' : 's'}`}</span>
                  </div>
                </div>
                <div className="text-sm text-brand-gray-dark">
                  {getSessionSpeakers(session, speakers).length > 0
                    ? getSessionSpeakers(session, speakers).map((speaker) => `${speaker.first_name} ${speaker.last_name}`).join(', ')
                    : 'Missing speakers'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {renderSessionSignals(session, speakers, offeringsBySessionId.get(session.id))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal({ mode: 'edit', session })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand-gray-medium hover:bg-gray-50">Edit</button>
                  <button onClick={() => archiveMutation.mutate(session.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-brand-red hover:bg-red-50">Archive</button>
                </div>
              </div>
            </AdminMobileCard>
          ),
        }}
      />

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
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-brand-gray-dark hover:bg-text-brand-gray-lightest">Cancel</button>
          <button type="button" onClick={handlePromote} disabled={!selectedId || promoteMutation.isPending} className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f] disabled:opacity-50">
            {promoteMutation.isPending ? 'Promoting...' : 'Promote'}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        {isLoading ? <p className="text-sm text-brand-gray-medium">Loading submissions...</p> : null}
        {error ? <p className="text-sm text-brand-red">{(error as Error).message}</p> : null}
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black">
          <option value="">Choose accepted CFP submission</option>
          {options.map((submission) => (
            <option key={submission.id} value={submission.id}>
              {submission.title} — {submission.speaker?.first_name} {submission.speaker?.last_name}
            </option>
          ))}
        </select>
        {options.length === 0 && !isLoading ? <p className="text-sm text-brand-gray-medium">All accepted submissions have already been promoted.</p> : null}
      </div>
    </AdminModal>
  );
}

export function ProgramScheduleTab({
  sessions,
  speakers,
  scheduleItems,
  onRefresh,
  onToast,
}: ProgramTabsProps) {
  const [search, setSearch] = useState('');
  const [scheduleModal, setScheduleModal] = useState<ScheduleModalState>(null);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ProgramScheduleItemRecord | null>(null);
  const deleteMutation = useDeleteScheduleItem();
  const createMutation = useCreateScheduleItem();
  const updateMutation = useUpdateScheduleItem();
  const sessionById = new Map(sessions.map((session) => [session.id, session]));

  const filteredScheduleItems = scheduleItems
    .filter((item) => !search || `${item.title} ${item.room ?? ''} ${item.program_session?.title ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const groupedByDay = groupScheduleItemsByDay(filteredScheduleItems);
  const fallbackDate = groupedByDay[0]?.date ?? '2026-09-11';
  const previewGroup = previewDate ? groupedByDay.find((group) => group.date === previewDate) ?? null : null;

  const handleDelete = (item: ProgramScheduleItemRecord) => {
    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        setDeleteCandidate(null);
        onRefresh();
        onToast('Schedule item deleted');
      },
      onError: (error) => onToast('Delete failed', (error as Error).message, 'error'),
    });
  };

  const requestDelete = (item: ProgramScheduleItemRecord) => {
    if (item.is_visible || item.session_id) {
      setDeleteCandidate(item);
      return;
    }

    handleDelete(item);
  };

  const handleDuplicate = (item: ProgramScheduleItemRecord) => {
    createMutation.mutate({
      type: item.type,
      session_id: item.session_id ?? null,
      date: item.date,
      start_time: item.start_time,
      duration_minutes: item.duration_minutes,
      room: item.room ?? null,
      title: item.title,
      description: item.description ?? null,
      is_visible: false,
    }, {
      onSuccess: () => {
        onRefresh();
        onToast('Slot duplicated');
      },
      onError: (error) => onToast('Duplicate failed', (error as Error).message, 'error'),
    });
  };

  const handleVisibilityToggle = (item: ProgramScheduleItemRecord) => {
    updateMutation.mutate({
      id: item.id,
      data: { is_visible: !item.is_visible },
    }, {
      onSuccess: () => {
        onRefresh();
        onToast(item.is_visible ? 'Slot hidden' : 'Slot made public');
      },
      onError: (error) => onToast('Visibility update failed', (error as Error).message, 'error'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">Schedule</h2>
          <p className="text-sm text-brand-gray-dark">Place program sessions and create non-session events without touching CFP records.</p>
        </div>
        <div className="flex gap-2">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search schedule" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black" />
          <button onClick={() => setScheduleModal({ mode: 'create', draft: getInsertionDraftAfter(null, null, fallbackDate) })} className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f]">
            <Plus className="size-4" />
            Add Slot
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {groupedByDay.map((group) => (
          <section key={group.date} className="space-y-3">
            <div className="sticky top-20 z-30 flex items-start justify-between gap-3 border-b-2 border-brand-gray-lightest bg-[#f7f8fa] pb-2 pt-2">
              <div>
                <h3 className="text-base font-semibold text-black">{group.label}</h3>
                <p className="text-sm text-brand-gray-medium">{group.items.length} scheduled {group.items.length === 1 ? 'slot' : 'slots'}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDate(group.date)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-brand-gray-medium hover:bg-gray-50"
              >
                Preview schedule
              </button>
            </div>
            <div className="grid gap-1">
              <InsertionButton
                label={`Add slot at ${getInsertionDraftBefore(group.items[0] ?? null, group.date).start_time}`}
                draft={getInsertionDraftBefore(group.items[0] ?? null, group.date)}
                onInsert={(draft) => setScheduleModal({ mode: 'create', draft })}
              />
              {(() => {
                const displayGroup = groupOverlappingScheduleItems(group.items);
                const hasOverlappingColumns = (left: { colStart: number; colSpan: number }, right: { colStart: number; colSpan: number }) => {
                  const leftEnd = left.colStart + left.colSpan - 1;
                  const rightEnd = right.colStart + right.colSpan - 1;
                  return left.colStart <= rightEnd && right.colStart <= leftEnd;
                };

                return (
                  <div className="grid gap-1">
                    <div
                      className="grid gap-x-5 gap-y-0"
                      style={{
                        gridTemplateColumns: `repeat(${displayGroup.totalColumns}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${displayGroup.rows.length}, minmax(0, auto))`,
                      }}
                    >
                      {displayGroup.layout.map((entry) => {
                        const item = entry.item;
                        const nextItem = getScheduleNeighbors(item, scheduleItems).next;
                        const hasAfterOverlayAlready = displayGroup.layout.some((candidate) =>
                          candidate.item.id !== entry.item.id &&
                          candidate.rowStart + candidate.rowSpan === entry.rowStart &&
                          hasOverlappingColumns(candidate, entry)
                        );

                        return (
                          <div
                            key={item.id}
                            style={{
                              gridColumn: `${entry.colStart} / span ${entry.colSpan}`,
                              gridRow: `${entry.rowStart} / span ${entry.rowSpan}`,
                            }}
                            className="group/insert flex h-full flex-col"
                          >
                            {entry.rowStart > 1 && !hasAfterOverlayAlready ? (
                              <div>
                                <InsertionButton
                                  label={`Add slot at ${getInsertionDraftBefore(item, group.date).start_time}`}
                                  draft={getInsertionDraftBefore(item, group.date)}
                                  onInsert={(draft) => setScheduleModal({ mode: 'create', draft })}
                                />
                              </div>
                            ) : null}
                            <div className="min-h-0 flex-1">
                              <ScheduleGridCard
                                item={item}
                                session={item.session_id ? sessionById.get(item.session_id) ?? null : null}
                                speakers={speakers}
                                scheduleItems={scheduleItems}
                                isUpdatingVisibility={updateMutation.isPending}
                                onToggleVisibility={() => handleVisibilityToggle(item)}
                                onEdit={() => setScheduleModal({ mode: 'edit', item })}
                                onDuplicate={() => handleDuplicate(item)}
                                onDelete={() => requestDelete(item)}
                              />
                            </div>
                            <div>
                              <InsertionButton
                                label={`Add slot at ${getInsertionDraftAfter(item, nextItem, group.date).start_time}`}
                                draft={getInsertionDraftAfter(item, nextItem, group.date)}
                                onInsert={(draft) => setScheduleModal({ mode: 'create', draft })}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>
        ))}
      </div>

      {scheduleModal ? (
        <ProgramScheduleModal
          item={scheduleModal.mode === 'edit' ? scheduleModal.item : null}
          draft={scheduleModal.mode === 'create' ? scheduleModal.draft : undefined}
          sessions={sessions}
          onClose={() => {
            setScheduleModal(null);
          }}
          onSaved={() => {
            setScheduleModal(null);
            onRefresh();
            onToast('Schedule saved');
          }}
        />
      ) : null}
      {previewGroup ? (
        <SchedulePreviewModal group={previewGroup} onClose={() => setPreviewDate(null)} />
      ) : null}
      {deleteCandidate ? (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setDeleteCandidate(null)}
          onConfirm={() => handleDelete(deleteCandidate)}
          title="Delete schedule item?"
          message={`Delete "${deleteCandidate.program_session?.title ?? deleteCandidate.title}" from ${deleteCandidate.date} at ${deleteCandidate.start_time.slice(0, 5)}?`}
          confirmText="Delete slot"
          confirmStyle="danger"
          isLoading={deleteMutation.isPending}
        />
      ) : null}
    </div>
  );
}

function InsertionButton({
  label,
  draft,
  onInsert,
}: {
  label: string;
  draft: ScheduleSlotDraft;
  onInsert: (draft: ScheduleSlotDraft) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onInsert(draft)}
      className="group relative block h-5 w-full opacity-0 transition-opacity duration-150 hover:opacity-100 focus:opacity-100 group-hover/insert:opacity-100"
    >
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 rounded-xl bg-brand-blue transition-[height] border border-transparent duration-150 delay-500 group-hover:bg-transparent group-hover:border-brand-blue group-hover:h-full group-focus:h-full" />
      <span className="absolute left-1/2 top-1/2 inline-flex -translate-y-1/2 -translate-x-1/2 items-center gap-1 whitespace-nowrap text-xs font-medium text-brand-gray-medium opacity-0 transition-opacity group-hover:opacity-100 delay-500 group-focus:opacity-100">
        <Plus className="size-3" aria-hidden="true" />
        {label}
      </span>
    </button>
  );
}

function ScheduleGridCard({
  item,
  session,
  speakers,
  scheduleItems,
  isUpdatingVisibility,
  onToggleVisibility,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  item: ProgramScheduleItemRecord;
  session: ProgramSession | null;
  speakers: SpeakerWithSessions[];
  scheduleItems: ProgramScheduleItemRecord[];
  isUpdatingVisibility: boolean;
  onToggleVisibility: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const neighbors = getScheduleNeighbors(item, scheduleItems, { sameRoomOnly: false });
  const visibilityLocked = item.type === 'session' && !item.session_id;
  const displayType = getDisplayScheduleType(item);
  const startTime = item.start_time.slice(0, 5);
  const endTime = minutesToTime(timeToMinutes(startTime) + item.duration_minutes);

  return (
    <div className="@container h-full rounded-lg border border-brand-gray-lightest bg-white p-4 shadow-sm">
      <div className="sticky top-40 grid gap-3 [grid-template-areas:'time''title''visibility''actions'] @xs:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @xs:[grid-template-areas:'time_title''visibility_visibility''actions_actions'] @sm:grid-cols-[120px_minmax(0,1fr)_auto] @sm:[grid-template-areas:'time_title_actions''visibility_visibility_visibility'] @lg:grid-cols-[120px_minmax(0,1fr)_130px_120px] @lg:[grid-template-areas:'time_title_visibility_actions'] @lg:items-center">
        <div className="[grid-area:time] text-sm text-brand-gray-medium">
          <p className="font-semibold text-black">{startTime} - {endTime}</p>
          <p>{formatScheduleDuration(item.duration_minutes)}{item.room ? ` · ${item.room}` : ''}</p>
            {neighbors.overlaps.length > 0 ? (
                <p className="mt-1 text-xxs font-medium text-brand-red">Overlaps {neighbors.overlaps.length} slot{neighbors.overlaps.length === 1 ? '' : 's'}</p>
            ) : null}
        </div>
        <div className="[grid-area:title]">
          <p className="font-medium text-black">{session?.title ?? item.program_session?.title ?? item.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-gray-dark">
            <TypeChip type={displayType} />
            {session ? <span>· {getSessionSpeakers(session, speakers).map((speaker) => speaker.first_name).join(', ')}</span> : null}
          </div>
          {session?.kind === 'workshop' ? <WorkshopBuyableSignal sessionId={session.id} /> : null}
        </div>
        <div className="[grid-area:visibility] text-sm text-brand-gray-dark">
          <ToggleButton
            label={item.is_visible ? 'Public' : 'Hidden'}
            checked={item.is_visible}
            disabled={isUpdatingVisibility || visibilityLocked}
            activeClassName="bg-green-500"
            title={visibilityLocked
              ? 'Select a session before making this slot public'
              : item.is_visible
                ? 'Visible publicly'
                : 'Hidden from public schedule'}
            onClick={onToggleVisibility}
          />
        </div>
        <div className="[grid-area:actions] flex gap-2 @xs:justify-end @sm:justify-end @lg:justify-start">
          <button onClick={onEdit} className="rounded-md p-2 h-fit hover:bg-brand-gray-lightest transition-colors duration-200" title="Edit slot"><Edit3 className="size-4" /></button>
          <button onClick={onDuplicate} className="rounded-md p-2 h-fit hover:bg-brand-gray-lightest transition-colors duration-200" title="Duplicate slot"><Copy className="size-4" /></button>
          <button onClick={onDelete} className="rounded-md p-2 h-fit hover:bg-brand-gray-lightest transition-colors duration-200" title="Delete slot"><Trash2 className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}

function getDisplayScheduleType(item: Pick<ProgramScheduleItemRecord, 'type' | 'session_id'>): ProgramScheduleItemRecord['type'] | 'placeholder' {
  return item.type === 'session' && !item.session_id ? 'placeholder' : item.type;
}

function formatScheduleDuration(durationMinutes: number) {
  if (durationMinutes < 60) return `${durationMinutes}m`;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const minutes = Number.parseInt(trimmed, 10);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes >= 60) return null;

  const totalMinutes = (hours * 60) + minutes;
  return totalMinutes > 0 ? totalMinutes : null;
}

function TypeChip({ type }: { type: ProgramScheduleItemRecord['type'] | 'placeholder' }) {
  const config = {
    session: { icon: MicVocal, label: 'Session', className: 'border-blue-200 bg-blue-50 text-brand-blue' },
    event: { icon: CalendarRange, label: 'Event', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    break: { icon: Coffee, label: 'Break', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    placeholder: { icon: null, label: 'Placeholder', className: 'border-transparent bg-transparent text-brand-gray-medium' },
  }[type];

  if (!config.icon) {
    return <span className="text-xs font-medium text-brand-gray-medium">{config.label}</span>;
  }

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-1 py-0.5 text-xs font-medium ${config.className}`}>
      <Icon className="size-3.5" />
      {config.label}
    </span>
  );
}

function ProgramScheduleModal({
  item,
  draft,
  sessions,
  onClose,
  onSaved,
}: {
  item: ProgramScheduleItemRecord | null;
  draft?: ScheduleSlotDraft;
  sessions: ProgramSession[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const createMutation = useCreateScheduleItem();
  const updateMutation = useUpdateScheduleItem();
  const [error, setError] = useState('');
  const initialType = item?.type ?? 'session';
  const initialSessionId = item?.session_id ?? '';
  const initialIsSessionPlaceholder = initialType === 'session' && !initialSessionId;
  const [form, setForm] = useState({
    type: initialType,
    session_id: initialSessionId,
    date: item?.date ?? draft?.date ?? '2026-09-11',
    start_time: item?.start_time?.slice(0, 5) ?? draft?.start_time ?? '09:00',
    duration_minutes: item?.duration_minutes?.toString() ?? '30',
    room: item?.room ?? draft?.room ?? '',
    title: item?.title ?? '',
    description: item?.description ?? '',
    is_visible: initialIsSessionPlaceholder ? false : (item?.is_visible ?? false),
  });

  const selectedSession = sessions.find((session) => session.id === form.session_id);
  const parsedDuration = parseDurationInput(form.duration_minutes);
  const derivedEndTime = form.start_time && parsedDuration !== null
    ? minutesToTime(timeToMinutes(form.start_time) + parsedDuration)
    : null;
  const isSessionPlaceholder = form.type === 'session' && !form.session_id;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!parsedDuration) {
      setError('Duration must be a positive number of minutes or use HH:MM');
      return;
    }
    const resolvedDuration = parsedDuration;
    const payload: ProgramScheduleItemInput = {
      type: form.type as ProgramScheduleItemInput['type'],
      session_id: form.type === 'session' ? form.session_id || null : null,
      date: form.date,
      start_time: `${form.start_time}:00`,
      duration_minutes: resolvedDuration,
      room: form.room || null,
      title: form.type === 'session' ? (selectedSession?.title ?? (form.title || 'TBA')) : form.title,
      description: form.type === 'session' ? null : form.description || null,
      is_visible: form.is_visible,
    };

    try {
      if (item) {
        await updateMutation.mutateAsync({ id: item.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule item');
    }
  };

  return (
    <AdminModal
      title={item ? 'Edit Slot' : 'Add Slot'}
      maxWidth="screen-xl"
      showHeader={false}
      onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-brand-gray-dark hover:bg-text-brand-gray-lightest">Cancel</button>
          <button type="submit" form="program-schedule-form" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f] disabled:opacity-50">Save Slot</button>
        </>
      )}
    >
        <form id="program-schedule-form" onSubmit={submit} className="grid gap-4">
          {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-brand-red">{error}</div> : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Date
              <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Start
              <input type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
                <span>Duration <span className="text-xs font-normal text-brand-gray-medium">(End time {derivedEndTime ?? '--:--'})</span></span>
              <input
                type="text"
                value={form.duration_minutes}
                onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })}
                placeholder="30 or 1:30"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Room
              <input value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} placeholder="Room" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black" />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Type
              <select
                value={form.type}
                onChange={(event) => {
                  const nextType = event.target.value as ProgramScheduleItemInput['type'];
                  setForm({
                    ...form,
                    type: nextType,
                    session_id: nextType === 'session' ? form.session_id : '',
                    is_visible: nextType === 'session' ? false : form.is_visible,
                  });
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
              >
                <option value="session">Session</option>
                <option value="event">Event</option>
                <option value="break">Break</option>
              </select>
            </label>
            {form.type === 'session' ? (
              <label className="grid gap-1 text-sm font-medium text-gray-800">
                Program session
                <select
                  value={form.session_id}
                  onChange={(event) => {
                    const session = sessions.find((candidate) => candidate.id === event.target.value);
                    setForm({
                      ...form,
                      session_id: event.target.value,
                      duration_minutes: inferScheduleDurationForSession(session).toString(),
                      title: session?.title ?? form.title,
                      is_visible: event.target.value ? form.is_visible : false,
                    });
                  }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                >
                  <option value="">Keep as planning slot</option>
                  {sessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}
                </select>
              </label>
            ) : null}
          </div>

          {form.type !== 'session' || isSessionPlaceholder ? (
            <>
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder={isSessionPlaceholder ? 'Planning title, e.g. Lightning slot' : 'Title'}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
              />
              {form.type !== 'session' ? (
                <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black" />
              ) : null}
            </>
          ) : null}
          <div className="flex w-fit items-center gap-3 rounded-md border border-brand-gray-lightest px-3 py-2">
            <span className="text-sm font-medium text-gray-800">Visible publicly</span>
            <ToggleButton
              label={form.is_visible ? 'Public' : 'Hidden'}
              checked={form.is_visible}
              disabled={isSessionPlaceholder}
              activeClassName="bg-green-500"
              title={isSessionPlaceholder
                ? 'Select a session before making this slot public'
                : form.is_visible
                  ? 'Visible publicly'
                  : 'Hidden from public schedule'}
              onClick={() => {
                if (isSessionPlaceholder) return;
                setForm({ ...form, is_visible: !form.is_visible });
              }}
            />
          </div>
        </form>
    </AdminModal>
  );
}

function SchedulePreviewModal({
  group,
  onClose,
}: {
  group: { date: string; label: string; items: ProgramScheduleItemRecord[] };
  onClose: () => void;
}) {
  const layout = groupOverlappingScheduleItems(group.items);

  return (
    <AdminModal
      title={`Schedule preview for ${group.label}`}
      maxWidth="4xl"
      showHeader={false}
      onClose={onClose}
      footer={<button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-brand-gray-dark hover:bg-text-brand-gray-lightest">Close</button>}
    >
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${layout.totalColumns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${layout.rows.length}, minmax(0, auto))`,
        }}
      >
        {layout.layout.map((entry) => {
          const item = entry.item;
          const displayType = getDisplayScheduleType(item);
          const startTime = item.start_time.slice(0, 5);
          const endTime = minutesToTime(timeToMinutes(startTime) + item.duration_minutes);

          return (
            <div
              key={item.id}
              style={{
                gridColumn: `${entry.colStart} / span ${entry.colSpan}`,
                gridRow: `${entry.rowStart} / span ${entry.rowSpan}`,
              }}
              className="flex h-full min-h-0 flex-col"
            >
              <div className="flex-1 flex flex-wrap gap-4 items-center rounded-lg border border-brand-gray-lightest bg-white p-2 text-sm text-brand-gray-medium">
                <div className="font-medium text-black">
                  {startTime} - {endTime} ({formatScheduleDuration(item.duration_minutes)})
                </div>
                <TypeChip type={displayType} />
                <div className="font-medium text-black">{item.program_session?.title ?? item.title}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AdminModal>
  );
}

export function ProgramSpeakersTab({
  sessions,
  speakers,
  scheduleItems,
  onEditSpeaker,
  onCreateSpeaker,
  onToggleSpeakerVisibility,
  onToggleSpeakerFeatured,
  togglingVisibilityId,
  togglingFeaturedId,
  onRefresh,
  onToast,
}: ProgramTabsProps) {
  const [modal, setModal] = useState<SessionModalState>(null);
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'speaker', desc: false }]);
  const visibleSpeakers = useMemo(() => {
    let next = speakers.filter((speaker) => {
      const speakerSessions = sessions.filter((session) => (session.speakers ?? []).some((assignment) => assignment.speaker_id === speaker.id));
      if (visibilityFilter === 'public' && !speaker.is_visible) return false;
      if (visibilityFilter === 'hidden' && speaker.is_visible) return false;
      if (featuredFilter === 'featured' && !speaker.is_featured) return false;
      if (featuredFilter === 'not-featured' && speaker.is_featured) return false;
      if (profileFilter === 'complete' && isSpeakerProfileIncomplete(speaker)) return false;
      if (profileFilter === 'incomplete' && !isSpeakerProfileIncomplete(speaker)) return false;
      if (sessionFilter === 'has-session' && speakerSessions.length === 0) return false;
      if (sessionFilter === 'no-session' && speakerSessions.length > 0) return false;
      if (!search) return true;
      const query = search.toLowerCase();
      return `${speaker.first_name} ${speaker.last_name} ${speaker.email} ${speaker.company ?? ''}`.toLowerCase().includes(query);
    });

    if (sorting.length > 0) {
      next = [...next].sort((a, b) => {
        for (const rule of sorting) {
          const direction = rule.desc ? -1 : 1;
          let comparison = 0;
          const aSessions = sessions.filter((session) => (session.speakers ?? []).some((assignment) => assignment.speaker_id === a.id));
          const bSessions = sessions.filter((session) => (session.speakers ?? []).some((assignment) => assignment.speaker_id === b.id));

          if (rule.id === 'speaker') {
            comparison = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, undefined, { sensitivity: 'base' });
          } else if (rule.id === 'company') {
            comparison = `${a.company ?? ''} ${a.job_title ?? ''}`.localeCompare(`${b.company ?? ''} ${b.job_title ?? ''}`, undefined, { sensitivity: 'base' });
          } else if (rule.id === 'sessions') {
            comparison = aSessions.length - bSessions.length;
          } else if (rule.id === 'visibility') {
            comparison = Number(a.is_visible) - Number(b.is_visible);
          } else if (rule.id === 'featured') {
            comparison = Number(a.is_featured) - Number(b.is_featured);
          }

          if (comparison !== 0) return comparison * direction;
        }

        return 0;
      });
    }

    return next;
  }, [featuredFilter, profileFilter, search, sessionFilter, sessions, sorting, speakers, visibilityFilter]);

  const handleSortingChange = (updater: Updater<SortingState>) => {
    setSorting((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      return next.slice(0, 1);
    });
  };

  const speakerColumns = useMemo<Array<ColumnDef<SpeakerWithSessions>>>(
    () => getProgramSpeakerColumns({
      sessions,
      scheduleItems,
      togglingVisibilityId,
      togglingFeaturedId,
      onToggleSpeakerVisibility,
      onToggleSpeakerFeatured,
      onCreateSession: (speaker) => setModal({ mode: 'create', speakerId: speaker.id }),
      onEditSpeaker,
    }),
    [
      onEditSpeaker,
      onToggleSpeakerFeatured,
      onToggleSpeakerVisibility,
      scheduleItems,
      sessions,
      togglingFeaturedId,
      togglingVisibilityId,
    ]
  );

  return (
    <div className="space-y-4">
      <AdminDataTable
        data={visibleSpeakers}
        columns={speakerColumns}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        getRowId={(speaker) => speaker.id}
        emptyState="No speakers match the current filters"
        toolbar={(
          <AdminTableToolbar
            right={(
              <>
                <div className="relative min-w-[260px] max-w-full flex-1 lg:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-medium" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search speakers" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-10 text-sm text-black placeholder-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                </div>
                <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary">
                  <option value="all">All visibility</option>
                  <option value="public">Public</option>
                  <option value="hidden">Hidden</option>
                </select>
                <select value={featuredFilter} onChange={(event) => setFeaturedFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary">
                  <option value="all">All featured</option>
                  <option value="featured">Featured</option>
                  <option value="not-featured">Not featured</option>
                </select>
                <select value={profileFilter} onChange={(event) => setProfileFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary">
                  <option value="all">All profiles</option>
                  <option value="complete">Profile complete</option>
                  <option value="incomplete">Profile incomplete</option>
                </select>
                <select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary">
                  <option value="all">All assignments</option>
                  <option value="has-session">Has session</option>
                  <option value="no-session">No session</option>
                </select>
                <button onClick={onCreateSpeaker} className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f]">
                  <Plus className="size-4" />
                  Add Speaker
                </button>
              </>
            )}
          />
        )}
        mobileList={{
          renderCard: (speaker) => {
            const speakerSessions = sessions.filter((session) => (session.speakers ?? []).some((assignment) => assignment.speaker_id === speaker.id));
            const incompleteProfile = isSpeakerProfileIncomplete(speaker);
            const publishRisk = incompleteProfile && (speaker.is_visible || speaker.is_featured);
            return (
              <AdminMobileCard key={speaker.id} className={publishRisk ? 'border-red-200' : undefined}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {speaker.profile_image_url ? <img src={speaker.profile_image_url} alt="" className="size-12 rounded-full object-cover" /> : <div className="flex size-12 items-center justify-center rounded-full bg-text-brand-gray-lightest"><Users className="size-5 text-brand-gray-medium" /></div>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-black">{speaker.first_name} {speaker.last_name}</p>
                      <p className="truncate text-sm text-brand-gray-dark">{[speaker.job_title, speaker.company].filter(Boolean).join(' @ ') || speaker.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {speaker.speaker_role === 'mc' ? <Pill tone="blue">MC</Pill> : null}
                        {incompleteProfile ? <Pill tone={publishRisk ? 'red' : 'amber'}>incomplete</Pill> : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <ToggleButton label="Public" checked={speaker.is_visible} disabled={togglingVisibilityId === speaker.id} activeClassName="bg-green-500" title={speaker.is_visible ? 'Public on /speakers' : 'Hidden from /speakers'} onClick={() => onToggleSpeakerVisibility(speaker.id, !speaker.is_visible)} />
                  <ToggleButton label="Featured" checked={speaker.is_featured} disabled={togglingFeaturedId === speaker.id} activeClassName="bg-brand-primary" title={speaker.is_featured ? 'Featured on the frontpage speaker strip' : 'Not featured on the frontpage'} onClick={() => onToggleSpeakerFeatured(speaker.id, !speaker.is_featured)} />
                </div>
                <div className="mt-4 space-y-2">
                  {speakerSessions.length > 0 ? speakerSessions.map((session) => (
                    <div key={session.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                      <p className="font-medium text-black">{session.title}</p>
                      <p className="text-brand-gray-medium">{session.kind} · {getSessionScheduleCount(session, scheduleItems) ? 'scheduled' : 'unscheduled'}</p>
                    </div>
                  )) : <p className="text-sm text-brand-gray-medium">No program sessions assigned.</p>}
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setModal({ mode: 'create', speakerId: speaker.id })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand-gray-medium hover:bg-gray-50">Add session</button>
                  <button onClick={() => onEditSpeaker(speaker)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand-gray-medium hover:bg-gray-50">Edit profile</button>
                </div>
              </AdminMobileCard>
            );
          },
        }}
      />

      {modal ? (
        <ProgramSessionModal
          session={null}
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
    </div>
  );
}

function getProgramSessionColumns({
  speakers,
  scheduleItems,
  offeringsBySessionId,
  onEdit,
  onArchive,
}: {
  speakers: SpeakerWithSessions[];
  scheduleItems: ProgramScheduleItemRecord[];
  offeringsBySessionId: Map<string, Workshop | null>;
  onEdit: (session: ProgramSession) => void;
  onArchive: (session: ProgramSession) => void;
}): Array<ColumnDef<ProgramSession>> {
  return [
    sessionColumnHelper.display({
      id: 'session',
      header: 'Session',
      enableSorting: true,
      size: 260,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-black">{row.original.title}</p>
          {row.original.cfp_submission_id ? <p className="text-xs text-brand-blue">Promoted from CFP</p> : null}
        </div>
      ),
    }),
    sessionColumnHelper.display({
      id: 'kind',
      header: 'Kind',
      enableSorting: true,
      size: 110,
      cell: ({ row }) => <span className="text-sm capitalize text-brand-gray-medium">{row.original.kind}</span>,
    }),
    sessionColumnHelper.display({
      id: 'speakers',
      header: 'Speakers',
      enableSorting: true,
      size: 220,
      cell: ({ row }) => {
        const assignedSpeakers = getSessionSpeakers(row.original, speakers);
        return (
          <span className="text-sm text-brand-gray-medium">
            {assignedSpeakers.length > 0
              ? assignedSpeakers.map((speaker) => `${speaker.first_name} ${speaker.last_name}`).join(', ')
              : <span className="text-brand-red">Missing</span>}
          </span>
        );
      },
    }),
    sessionColumnHelper.display({
      id: 'placement',
      header: 'Placement',
      enableSorting: true,
      size: 140,
      cell: ({ row }) => {
        const scheduleCount = getSessionScheduleCount(row.original, scheduleItems);
        return <span className="text-sm text-brand-gray-medium">{scheduleCount === 0 ? 'Unscheduled' : scheduleCount === 1 ? 'Scheduled once' : `Scheduled ${scheduleCount} times`}</span>;
      },
    }),
    sessionColumnHelper.display({
      id: 'status',
      header: 'Status',
      enableSorting: true,
      size: 110,
      cell: ({ row }) => <span className="text-sm capitalize text-brand-gray-medium">{row.original.status}</span>,
    }),
    sessionColumnHelper.display({
      id: 'signals',
      header: 'Signals',
      enableSorting: false,
      size: 180,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {renderSessionSignals(row.original, speakers, offeringsBySessionId.get(row.original.id))}
        </div>
      ),
    }),
    sessionColumnHelper.display({
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      size: 110,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(row.original)} className="rounded-md p-2 text-brand-blue hover:bg-blue-50" title="Edit session">
            <Edit3 className="size-4" />
          </button>
          <button onClick={() => onArchive(row.original)} className="rounded-md p-2 text-brand-red hover:bg-red-50" title="Archive session">
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    }),
  ];
}

function getProgramSpeakerColumns({
  sessions,
  scheduleItems,
  togglingVisibilityId,
  togglingFeaturedId,
  onToggleSpeakerVisibility,
  onToggleSpeakerFeatured,
  onCreateSession,
  onEditSpeaker,
}: {
  sessions: ProgramSession[];
  scheduleItems: ProgramScheduleItemRecord[];
  togglingVisibilityId?: string | null;
  togglingFeaturedId?: string | null;
  onToggleSpeakerVisibility: (id: string, isVisible: boolean) => void;
  onToggleSpeakerFeatured: (id: string, isFeatured: boolean) => void;
  onCreateSession: (speaker: SpeakerWithSessions) => void;
  onEditSpeaker: (speaker: SpeakerWithSessions) => void;
}): Array<ColumnDef<SpeakerWithSessions>> {
  return [
    speakerColumnHelper.display({
      id: 'speaker',
      header: 'Speaker',
      enableSorting: true,
      size: 240,
      cell: ({ row }) => {
        const speaker = row.original;
        const incompleteProfile = isSpeakerProfileIncomplete(speaker);
        const publishRisk = incompleteProfile && (speaker.is_visible || speaker.is_featured);
        return (
          <div className="flex items-start gap-3">
            {speaker.profile_image_url ? <img src={speaker.profile_image_url} alt="" className="size-10 rounded-full object-cover" /> : <div className="flex size-10 items-center justify-center rounded-full bg-text-brand-gray-lightest"><Users className="size-4 text-brand-gray-medium" /></div>}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-black">{speaker.first_name} {speaker.last_name}</p>
              <p className="truncate text-sm text-brand-gray-dark">{[speaker.job_title, speaker.company].filter(Boolean).join(' @ ') || speaker.email}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {speaker.speaker_role === 'mc' ? <Pill tone="blue">MC</Pill> : null}
                {incompleteProfile ? <Pill tone={publishRisk ? 'red' : 'amber'}>incomplete</Pill> : null}
              </div>
            </div>
          </div>
        );
      },
    }),
    speakerColumnHelper.display({
      id: 'company',
      header: 'Company',
      enableSorting: true,
      size: 180,
      cell: ({ row }) => (
        <div className="text-sm text-brand-gray-dark">
          <div className="font-medium text-black">{row.original.company || '-'}</div>
          <div>{row.original.job_title || row.original.email}</div>
        </div>
      ),
    }),
    speakerColumnHelper.display({
      id: 'sessions',
      header: 'Sessions',
      enableSorting: true,
      size: 260,
      cell: ({ row }) => {
        const speakerSessions = sessions.filter((session) => (session.speakers ?? []).some((assignment) => assignment.speaker_id === row.original.id));
        return speakerSessions.length > 0 ? (
          <div className="space-y-1">
            {speakerSessions.map((session) => (
              <div key={session.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                <p className="font-medium text-black">{session.title}</p>
                <p className="text-brand-gray-medium">{session.kind} · {getSessionScheduleCount(session, scheduleItems) ? 'scheduled' : 'unscheduled'}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-brand-gray-medium">No program sessions assigned.</p>;
      },
    }),
    speakerColumnHelper.display({
      id: 'visibility',
      header: 'Visible',
      enableSorting: true,
      size: 90,
      cell: ({ row }) => (
        <ToggleButton
          label="Public"
          checked={row.original.is_visible}
          disabled={togglingVisibilityId === row.original.id}
          activeClassName="bg-green-500"
          title={row.original.is_visible ? 'Public on /speakers' : 'Hidden from /speakers'}
          onClick={() => onToggleSpeakerVisibility(row.original.id, !row.original.is_visible)}
        />
      ),
    }),
    speakerColumnHelper.display({
      id: 'featured',
      header: 'Featured',
      enableSorting: true,
      size: 100,
      cell: ({ row }) => (
        <ToggleButton
          label="Featured"
          checked={row.original.is_featured}
          disabled={togglingFeaturedId === row.original.id}
          activeClassName="bg-brand-primary"
          title={row.original.is_featured ? 'Featured on the frontpage speaker strip' : 'Not featured on the frontpage'}
          onClick={() => onToggleSpeakerFeatured(row.original.id, !row.original.is_featured)}
        />
      ),
    }),
    speakerColumnHelper.display({
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      size: 160,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button onClick={() => onCreateSession(row.original)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand-gray-medium hover:bg-gray-50">Add session</button>
          <button onClick={() => onEditSpeaker(row.original)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-brand-gray-medium hover:bg-gray-50">Edit profile</button>
        </div>
      ),
    }),
  ];
}

function renderSessionSignals(session: ProgramSession, speakers: SpeakerWithSessions[], offering: Workshop | null | undefined) {
  return (
    <>
      {hasMissingSpeakerProfile(session, speakers) ? <Pill tone="red">profile</Pill> : null}
      {session.kind === 'workshop' && isWorkshopCommerceReady(offering) ? <Pill tone="green">buyable</Pill> : null}
      {session.kind === 'workshop' && offering && !isWorkshopCommerceReady(offering) ? <Pill tone="amber">not buyable</Pill> : null}
      {session.kind === 'workshop' && !offering ? <Pill tone="amber">no offering</Pill> : null}
    </>
  );
}

function WorkshopBuyableSignal({ sessionId }: { sessionId: string }) {
  const { data: offering, isLoading } = useWorkshopOffering(sessionId);
  if (isLoading) return <p className="mt-1 text-xs text-brand-gray-medium">Checking workshop sales...</p>;
  if (isWorkshopCommerceReady(offering)) return <p className="mt-1 text-xs font-medium text-green-700">Buyable</p>;
  return <p className="mt-1 text-xs font-medium text-amber-700">Not buyable</p>;
}

function isSpeakerProfileIncomplete(speaker: SpeakerWithSessions) {
  return !speaker.first_name?.trim() ||
    !speaker.last_name?.trim() ||
    !speaker.job_title?.trim() ||
    !speaker.company?.trim() ||
    !speaker.bio?.trim() ||
    !speaker.profile_image_url?.trim();
}

function ToggleButton({
  label,
  checked,
  onClick,
  disabled,
  activeClassName,
  title,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
  disabled: boolean;
  activeClassName: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-brand-gray-medium">{label}</span>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? activeClassName : 'bg-gray-300'
        }`}
        title={title}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function Pill({ children, tone }: { children: ReactNode; tone: 'red' | 'green' | 'amber' | 'blue' }) {
  const classes = {
    red: 'bg-red-50 text-brand-red ring-red-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    blue: 'bg-blue-50 text-brand-blue ring-blue-200',
  }[tone];

  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${classes}`}>{children}</span>;
}
