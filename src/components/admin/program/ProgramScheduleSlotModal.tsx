/**
 * ProgramScheduleSlotModal
 * Create or edit a schedule slot (time, room, linked session)
 */

import { useState } from 'react';
import { AdminModal } from '@/components/admin/AdminModal';
import { ToggleButton } from '@/components/admin/shared';
import { useCreateScheduleItem, useUpdateScheduleItem } from '@/hooks/useProgram';
import type { ProgramScheduleItemInput, ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import type { ProgramSession } from '@/lib/types/program';
import { inferScheduleDurationForSession, minutesToTime, timeToMinutes, type ScheduleSlotDraft } from './utils';
import { parseDurationInput } from './components';

interface ProgramScheduleSlotModalProps {
  item: ProgramScheduleItemRecord | null;
  draft?: ScheduleSlotDraft;
  sessions: ProgramSession[];
  onClose: () => void;
  onSaved: () => void;
}

export function ProgramScheduleSlotModal({
  item,
  draft,
  sessions,
  onClose,
  onSaved,
}: ProgramScheduleSlotModalProps) {
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
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" form="program-schedule-form" disabled={createMutation.isPending || updateMutation.isPending} className="cursor-pointer rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f] disabled:opacity-50">Save Slot</button>
        </>
      )}
    >
      <form id="program-schedule-form" onSubmit={submit} className="grid gap-4">
        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-brand-red">{error}</div> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium text-gray-800">
            Date
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-gray-800">
            Start
            <input type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-gray-800">
            <span>Duration <span className="text-xs font-normal text-gray-500">(End time {derivedEndTime ?? '--:--'})</span></span>
            <input
              type="text"
              value={form.duration_minutes}
              onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })}
              placeholder="30 or 1:30"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-gray-800">
            Room
            <input value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} placeholder="Room" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950" />
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
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
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
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
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
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
            />
            {form.type !== 'session' ? (
              <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950" />
            ) : null}
          </>
        ) : null}
        <div className="flex w-fit items-center gap-3 rounded-md border border-gray-200 px-3 py-2">
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
