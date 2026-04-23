import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { ProgramScheduleItemRecord, ProgramScheduleItemType } from '@/lib/types/program-schedule';

interface AvailableSession {
  id: string;
  title: string;
  submission_type: string;
  workshop_duration_hours?: number | null;
  speaker: {
    first_name: string;
    last_name: string;
  };
}

interface SpeakerOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface ScheduleItemModalProps {
  item: ProgramScheduleItemRecord | null;
  sessions: AvailableSession[];
  speakers: SpeakerOption[];
  initialSubmissionId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const EDIT_TYPE_OPTIONS: ProgramScheduleItemType[] = ['session', 'event', 'break', 'placeholder'];

function getDefaultDurationMinutes(submissionType: string, workshopDurationHours?: number | null): string {
  if (submissionType === 'lightning') {
    return '20';
  }

  if (submissionType === 'standard') {
    return '35';
  }

  if (submissionType === 'workshop' && workshopDurationHours && workshopDurationHours > 0) {
    return Math.round(workshopDurationHours * 60).toString();
  }

  return '30';
}

function getSubmissionTypeSummary(submissionType: string, workshopDurationHours?: number | null): string {
  if (submissionType === 'lightning') {
    return 'Lightning talk';
  }

  if (submissionType === 'standard') {
    return 'Standard talk';
  }

  if (submissionType === 'workshop') {
    if (workshopDurationHours && workshopDurationHours > 0) {
      return `Workshop (${workshopDurationHours}h)`;
    }

    return 'Workshop';
  }

  if (submissionType === 'panel') {
    return 'Panel';
  }

  return submissionType;
}

function getProgramKind(submissionType: string) {
  if (submissionType === 'workshop') return 'workshop';
  if (submissionType === 'panel') return 'panel';
  return 'talk';
}

function VisibilityToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
        checked
          ? 'border-green-300 bg-green-50 text-green-900'
          : 'border-gray-300 bg-gray-50 text-gray-700'
      }`}
    >
      <span className="font-medium">{checked ? 'Visible' : 'Hidden'}</span>
      <span className={`relative inline-flex h-6 w-11 items-center rounded-full ${checked ? 'bg-green-600' : 'bg-gray-300'}`}>
        <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

export function ScheduleItemModal({
  item,
  sessions,
  speakers,
  initialSubmissionId = null,
  onClose,
  onSaved,
}: ScheduleItemModalProps) {
  const linkedSessionId = item?.session_id || item?.submission_id || initialSubmissionId || '';
  const initialLinkedSession = sessions.find((session) => session.id === linkedSessionId) || null;
  const [mode, setMode] = useState<'link' | 'custom'>('link');
  const [formData, setFormData] = useState({
    type: item?.type || 'session',
    submission_id: linkedSessionId,
    date: item?.date || '2026-09-11',
    start_time: item?.start_time?.slice(0, 5) || '09:00',
    duration_minutes: item?.duration_minutes?.toString() || getDefaultDurationMinutes(initialLinkedSession?.submission_type || 'session', initialLinkedSession?.workshop_duration_hours),
    room: item?.room || '',
    title: item?.title || '',
    description: item?.description || '',
    is_visible: item?.is_visible ?? true,
    speaker_id: '',
    custom_title: '',
    custom_abstract: '',
    custom_submission_type: 'standard',
    custom_talk_level: 'intermediate',
    custom_workshop_duration_hours: '',
    custom_workshop_max_participants: '',
    custom_participant_speaker_ids: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const availableSessions = useMemo(() => sessions, [sessions]);
  const selectedLinkedSession = availableSessions.find((session) => session.id === formData.submission_id) || null;
  const shouldShowScheduleFields = Boolean(item) || Boolean(formData.submission_id) || mode === 'custom';
  const isPlaceholderEdit = item?.type === 'placeholder';
  const modalTitle = item
    ? 'Edit schedule item'
    : initialSubmissionId
      ? 'Schedule session'
      : 'Add schedule item';

  useEffect(() => {
    if (mode !== 'link' || !selectedLinkedSession) {
      return;
    }

    if (!item || isPlaceholderEdit) {
      setFormData((current) => ({
        ...current,
        duration_minutes: getDefaultDurationMinutes(
          selectedLinkedSession.submission_type,
          selectedLinkedSession.workshop_duration_hours
        ),
      }));
    }
  }, [item, isPlaceholderEdit, mode, selectedLinkedSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const scheduleType =
        !item
          ? 'session'
          : isPlaceholderEdit && (formData.submission_id || mode === 'custom')
            ? 'session'
            : formData.type;
      let linkedSubmissionId = scheduleType === 'session' ? formData.submission_id || null : null;
      let linkedProgramSessionId = item?.session_id || null;

      if (!item && scheduleType === 'session' && mode === 'custom') {
        if (!formData.speaker_id || !formData.custom_title || !formData.custom_abstract) {
          throw new Error('Choose a speaker, title, and abstract for the custom session');
        }

        const sessionRes = await fetch('/api/admin/program/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: getProgramKind(formData.custom_submission_type),
            title: formData.custom_title,
            abstract: formData.custom_abstract,
            level: formData.custom_talk_level,
            status: 'confirmed',
            metadata: {
              created_from: 'schedule_modal',
              legacy_submission_type: formData.custom_submission_type,
            },
            ...(formData.custom_submission_type === 'workshop' && {
              workshop_duration_minutes: formData.custom_workshop_duration_hours ? Math.round(parseFloat(formData.custom_workshop_duration_hours) * 60) : undefined,
              workshop_capacity: formData.custom_workshop_max_participants ? parseInt(formData.custom_workshop_max_participants, 10) : undefined,
            }),
            speakers: [
              {
                speaker_id: formData.speaker_id,
                role: formData.custom_submission_type === 'workshop' ? 'instructor' : 'speaker',
                sort_order: 0,
              },
              ...formData.custom_participant_speaker_ids.map((speakerId, index) => ({
                speaker_id: speakerId,
                role: formData.custom_submission_type === 'panel' ? 'panelist' : 'speaker',
                sort_order: index + 1,
              })),
            ],
          }),
        });

        if (!sessionRes.ok) {
          const data = await sessionRes.json();
          throw new Error(data.error || 'Failed to create custom session');
        }

        const sessionData = await sessionRes.json();
        linkedProgramSessionId = sessionData.session?.id || null;
        linkedSubmissionId = null;
      } else if (scheduleType === 'session' && linkedSubmissionId) {
        const promoteRes = await fetch('/api/admin/program/sessions/promote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submission_id: linkedSubmissionId, status: 'confirmed' }),
        });

        if (!promoteRes.ok) {
          const data = await promoteRes.json();
          throw new Error(data.error || 'Failed to promote CFP submission');
        }

        const promoteData = await promoteRes.json();
        linkedProgramSessionId = promoteData.session?.id || null;
      }

      const payload = {
        type: scheduleType,
        date: formData.date,
        start_time: `${formData.start_time}:00`,
        duration_minutes: parseInt(formData.duration_minutes, 10),
        room: formData.room || null,
        title:
          scheduleType === 'session'
            ? selectedLinkedSession?.title || formData.custom_title || formData.title || 'TBA'
            : formData.title,
        description: scheduleType === 'session' ? null : formData.description || null,
        session_id: linkedProgramSessionId,
        submission_id: linkedProgramSessionId ? undefined : linkedSubmissionId,
        is_visible: formData.is_visible,
      };

      const res = await fetch(item ? `/api/admin/program-schedule/${item.id}` : '/api/admin/program-schedule', {
        method: item ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save schedule item');
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h3 className="text-xl font-bold text-black">{modalTitle}</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 cursor-pointer">
            <X className="h-5 w-5 text-black" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          {!item || isPlaceholderEdit ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-black">Choose CFP submission</label>
                  <select
                    value={formData.submission_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const chosenSession = availableSessions.find((session) => session.id === selectedId) || null;

                      setMode('link');
                      setFormData({
                        ...formData,
                        type: selectedId ? 'session' : item?.type || 'session',
                        submission_id: selectedId,
                        duration_minutes: chosenSession
                          ? getDefaultDurationMinutes(chosenSession.submission_type, chosenSession.workshop_duration_hours)
                          : formData.duration_minutes,
                      });
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="">{item ? 'Keep this slot open for now' : 'Select an unscheduled session'}</option>
                    {availableSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title} ({session.speaker.first_name} {session.speaker.last_name})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMode('custom');
                    setFormData({ ...formData, type: 'session', submission_id: '', speaker_id: '' });
                  }}
                  className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-100"
                >
                  Custom submission
                </button>
              </div>

              {formData.submission_id && selectedLinkedSession ? (
                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  <p>
                    <span className="font-medium">Session:</span>{' '}
                    {getSubmissionTypeSummary(selectedLinkedSession.submission_type, selectedLinkedSession.workshop_duration_hours)}
                  </p>
                  <p>
                    <span className="font-medium">Speaker:</span>{' '}
                    {selectedLinkedSession.speaker.first_name} {selectedLinkedSession.speaker.last_name}
                  </p>
                </div>
              ) : null}

              {mode === 'custom' ? (
                <div className="mt-4 grid gap-4 border-t border-gray-200 pt-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Speaker</label>
                    <select
                      value={formData.speaker_id}
                      onChange={(e) => setFormData({ ...formData, speaker_id: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="">Select speaker</option>
                      {speakers.map((speaker) => (
                        <option key={speaker.id} value={speaker.id}>
                          {speaker.first_name} {speaker.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Title</label>
                    <input
                      type="text"
                      value={formData.custom_title}
                      onChange={(e) => setFormData({ ...formData, custom_title: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Abstract</label>
                    <textarea
                      rows={4}
                      value={formData.custom_abstract}
                      onChange={(e) => setFormData({ ...formData, custom_abstract: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black">Type</label>
                      <select
                        value={formData.custom_submission_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            custom_submission_type: e.target.value,
                            duration_minutes: getDefaultDurationMinutes(
                              e.target.value,
                              formData.custom_workshop_duration_hours
                                ? parseFloat(formData.custom_workshop_duration_hours)
                                : null
                            ),
                          })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      >
                        <option value="lightning">Lightning Talk</option>
                        <option value="standard">Standard Talk</option>
                        <option value="panel">Panel</option>
                        <option value="workshop">Workshop</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-black">Level</label>
                      <select
                        value={formData.custom_talk_level}
                        onChange={(e) => setFormData({ ...formData, custom_talk_level: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  {formData.custom_submission_type === 'workshop' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-black">Workshop duration (hours)</label>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={formData.custom_workshop_duration_hours}
                          onChange={(e) => {
                            const workshopDurationHours = e.target.value;
                            setFormData({
                              ...formData,
                              custom_workshop_duration_hours: workshopDurationHours,
                              duration_minutes: formData.custom_submission_type === 'workshop'
                                ? getDefaultDurationMinutes(
                                  'workshop',
                                  workshopDurationHours ? parseFloat(workshopDurationHours) : null
                                )
                                : formData.duration_minutes,
                            });
                          }}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-black">Max participants</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.custom_workshop_max_participants}
                          onChange={(e) => setFormData({ ...formData, custom_workshop_max_participants: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                      </div>
                    </div>
                  ) : null}

                  {formData.custom_submission_type === 'panel' ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black">Additional panel speakers</label>
                      <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border border-gray-300 bg-white p-3">
                        {speakers.filter((speaker) => speaker.id !== formData.speaker_id).map((speaker) => {
                          const checked = formData.custom_participant_speaker_ids.includes(speaker.id);
                          return (
                            <label key={speaker.id} className="flex cursor-pointer items-center gap-2 text-sm text-black">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setFormData({
                                  ...formData,
                                  custom_participant_speaker_ids: checked
                                    ? formData.custom_participant_speaker_ids.filter((id) => id !== speaker.id)
                                    : [...formData.custom_participant_speaker_ids, speaker.id],
                                })}
                              />
                              {speaker.first_name} {speaker.last_name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ProgramScheduleItemType })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  {EDIT_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">Visibility</label>
                <VisibilityToggle
                  checked={formData.is_visible}
                  onChange={(is_visible) => setFormData({ ...formData, is_visible })}
                />
              </div>
            </div>
          )}

          {shouldShowScheduleFields ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">Start time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">Duration (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">Room</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {!item ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">Visibility</label>
                  <VisibilityToggle
                    checked={formData.is_visible}
                    onChange={(is_visible) => setFormData({ ...formData, is_visible })}
                  />
                </div>
              ) : null}

              {item && formData.type === 'session' && !isPlaceholderEdit ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">Linked CFP submission</label>
                  <select
                    value={formData.submission_id}
                    onChange={(e) => setFormData({ ...formData, submission_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="">No linked submission yet</option>
                    {availableSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title} ({session.speaker.first_name} {session.speaker.last_name})
                      </option>
                    ))}
                  </select>
                  {formData.submission_id && selectedLinkedSession ? (
                    <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                      <p>
                        <span className="font-medium">Session:</span>{' '}
                        {getSubmissionTypeSummary(selectedLinkedSession.submission_type, selectedLinkedSession.workshop_duration_hours)}
                      </p>
                      <p>
                        <span className="font-medium">Speaker:</span>{' '}
                        {selectedLinkedSession.speaker.first_name} {selectedLinkedSession.speaker.last_name}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {item && formData.type !== 'session' ? (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  {formData.type !== 'placeholder' ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black">Description</label>
                      <textarea
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-gray-600 hover:text-black">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!item && !formData.submission_id && mode !== 'custom')}
              className="cursor-pointer rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
