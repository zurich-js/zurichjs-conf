/**
 * ProgramScheduleTab
 * Day-based schedule grid with slot management
 */

import { useState } from 'react';
import { Copy, Edit3, Plus, Trash2 } from 'lucide-react';
import { ToggleButton, Pill } from '@/components/admin/shared';
import { ConfirmationModal } from '@/components/admin/cfp';
import {
  useCreateScheduleItem,
  useDeleteScheduleItem,
  useUpdateScheduleItem,
} from '@/hooks/useProgram';
import type { ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import type { ProgramSession } from '@/lib/types/program';
import type { SpeakerWithSessions } from '@/components/admin/speakers';
import {
  getInsertionDraftAfter,
  getInsertionDraftBefore,
  getScheduleNeighbors,
  getSessionSpeakers,
  groupOverlappingScheduleItems,
  groupScheduleItemsByDay,
  minutesToTime,
  timeToMinutes,
  type ScheduleSlotDraft,
} from './utils';
import { formatScheduleDuration, getDisplayScheduleType, TypeChip, WorkshopBuyableSignal } from './components';
import { ProgramScheduleSlotModal } from './ProgramScheduleSlotModal';
import { SchedulePreviewModal } from './SchedulePreviewModal';
import type { ProgramTabsProps, ScheduleModalState } from './types';

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
          <h2 className="text-lg font-semibold text-gray-950">Schedule</h2>
          <p className="text-sm text-gray-600">Place program sessions and create non-session events without touching CFP records.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search schedule" className="w-full sm:w-auto rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950" />
          <button onClick={() => setScheduleModal({ mode: 'create', draft: getInsertionDraftAfter(null, null, fallbackDate) })} className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f]">
            <Plus className="size-4" />
            Add Slot
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {groupedByDay.map((group) => (
          <section key={group.date} className="space-y-3">
            <div className="sticky top-20 z-30 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between border-b-2 border-brand-gray-lightest bg-[#f7f8fa] pb-2 pt-2">
              <div>
                <h3 className="text-base font-semibold text-black">{group.label}</h3>
                <p className="text-sm text-gray-500">{group.items.length} scheduled {group.items.length === 1 ? 'slot' : 'slots'}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDate(group.date)}
                className="cursor-pointer self-start rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-brand-gray-medium hover:bg-gray-50"
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
                    {/* Multi-column grid for desktop */}
                    <div
                      className="hidden sm:grid gap-x-5 gap-y-0"
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
                    {/* Mobile stacked layout */}
                    <div className="sm:hidden space-y-1">
                      {displayGroup.layout.map((entry) => {
                        const item = entry.item;
                        const nextItem = getScheduleNeighbors(item, scheduleItems).next;
                        return (
                          <div key={item.id} className="group/insert">
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
                            <InsertionButton
                              label={`Add slot at ${getInsertionDraftAfter(item, nextItem, group.date).start_time}`}
                              draft={getInsertionDraftAfter(item, nextItem, group.date)}
                              onInsert={(draft) => setScheduleModal({ mode: 'create', draft })}
                            />
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
        <ProgramScheduleSlotModal
          item={scheduleModal.mode === 'edit' ? scheduleModal.item : null}
          draft={scheduleModal.mode === 'create' ? scheduleModal.draft : undefined}
          sessions={sessions}
          onClose={() => setScheduleModal(null)}
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
      <span className="absolute left-1/2 top-1/2 inline-flex -translate-y-1/2 -translate-x-1/2 items-center gap-1 whitespace-nowrap text-xs font-medium text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 delay-500 group-focus:opacity-100">
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
    <div className="@container h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="sticky top-40 grid gap-3 [grid-template-areas:'time''title''visibility''actions'] @xs:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @xs:[grid-template-areas:'time_title''visibility_visibility''actions_actions'] @sm:grid-cols-[120px_minmax(0,1fr)_auto] @sm:[grid-template-areas:'time_title_actions''visibility_visibility_visibility'] @lg:grid-cols-[120px_minmax(0,1fr)_130px_120px] @lg:[grid-template-areas:'time_title_visibility_actions'] @lg:items-center">
        <div className="[grid-area:time] text-sm text-brand-gray-medium">
          <p className="font-semibold text-gray-950">{startTime} - {endTime}</p>
          <p>{formatScheduleDuration(item.duration_minutes)}{item.room ? ` · ${item.room}` : ''}</p>
          {neighbors.overlaps.length > 0 ? (
            <p className="mt-1 text-xxs font-medium text-brand-red">Overlaps {neighbors.overlaps.length} slot{neighbors.overlaps.length === 1 ? '' : 's'}</p>
          ) : null}
        </div>
        <div className="[grid-area:title]">
          <p className="font-medium text-gray-950">{session?.title ?? item.program_session?.title ?? item.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <TypeChip type={displayType} />
            {session ? <span>· {getSessionSpeakers(session, speakers).map((speaker) => speaker.first_name).join(', ')}</span> : null}
          </div>
          {session?.kind === 'workshop' ? <WorkshopBuyableSignal sessionId={session.id} /> : null}
        </div>
        <div className="[grid-area:visibility] text-sm text-gray-600">
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
          <button onClick={onEdit} className="cursor-pointer rounded-md p-2 h-fit hover:bg-brand-gray-lightest transition-colors duration-200" title="Edit slot"><Edit3 className="size-4" /></button>
          <button onClick={onDuplicate} className="cursor-pointer rounded-md p-2 h-fit hover:bg-brand-gray-lightest transition-colors duration-200" title="Duplicate slot"><Copy className="size-4" /></button>
          <button onClick={onDelete} className="cursor-pointer rounded-md p-2 h-fit hover:bg-brand-gray-lightest transition-colors duration-200" title="Delete slot"><Trash2 className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}
