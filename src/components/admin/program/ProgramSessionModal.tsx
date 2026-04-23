import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import {
  useCreateWorkshopOffering,
  useCreateProgramSession,
  useProgramSessionSpeakers,
  useUpdateProgramSession,
  useUpdateWorkshopOffering,
  useValidateWorkshopStripe,
  useWorkshopOffering,
} from '@/hooks/useProgram';
import type { Workshop } from '@/lib/types/database';
import type {
  ProgramSession,
  ProgramSessionKind,
  ProgramSessionLevel,
  ProgramSessionSpeakerRole,
  ProgramSessionStatus,
} from '@/lib/types/program';
import type { SpeakerWithSessions } from '@/components/admin/speakers';

interface ProgramSessionModalProps {
  session?: ProgramSession | null;
  speakers: SpeakerWithSessions[];
  preselectedSpeakerId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const KIND_OPTIONS: Array<{ value: ProgramSessionKind; label: string }> = [
  { value: 'talk', label: 'Talk' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'panel', label: 'Panel' },
  { value: 'keynote', label: 'Keynote' },
  { value: 'event', label: 'Event' },
];

const ROLE_OPTIONS: Array<{ value: ProgramSessionSpeakerRole; label: string }> = [
  { value: 'speaker', label: 'Speaker' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'panelist', label: 'Panelist' },
  { value: 'host', label: 'Host' },
  { value: 'mc', label: 'MC' },
];

function defaultRole(kind: ProgramSessionKind): ProgramSessionSpeakerRole {
  if (kind === 'workshop') return 'instructor';
  if (kind === 'panel') return 'panelist';
  return 'speaker';
}

export function ProgramSessionModal({
  session,
  speakers,
  preselectedSpeakerId,
  onClose,
  onSaved,
}: ProgramSessionModalProps) {
  const createMutation = useCreateProgramSession();
  const updateMutation = useUpdateProgramSession();
  const speakerMutation = useProgramSessionSpeakers(session?.id ?? '');
  const { data: offering } = useWorkshopOffering(session?.kind === 'workshop' ? session.id : null);
  const createOfferingMutation = useCreateWorkshopOffering();
  const updateOfferingMutation = useUpdateWorkshopOffering();
  const validateStripeMutation = useValidateWorkshopStripe();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    kind: session?.kind ?? 'talk' as ProgramSessionKind,
    title: session?.title ?? '',
    abstract: session?.abstract ?? '',
    level: session?.level ?? 'intermediate' as ProgramSessionLevel,
    status: session?.status ?? 'confirmed' as ProgramSessionStatus,
    tags: Array.isArray(session?.metadata?.tags) ? session.metadata.tags.join(', ') : '',
    workshop_duration_minutes: session?.workshop_duration_minutes?.toString() ?? '',
    workshop_capacity: session?.workshop_capacity?.toString() ?? '',
    stripe_product_id: '',
    stripe_price_lookup_key: '',
    workshop_status: 'draft' as Workshop['status'],
  });
  const [assignments, setAssignments] = useState<Array<{
    speaker_id: string;
    role: ProgramSessionSpeakerRole;
  }>>([]);

  useEffect(() => {
    const initialAssignments = (session?.speakers ?? [])
      .slice()
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
      .map((speaker) => ({
        speaker_id: speaker.speaker_id,
        role: speaker.role ?? defaultRole(session?.kind ?? 'talk'),
      }));

    if (initialAssignments.length > 0) {
      setAssignments(initialAssignments);
      return;
    }

    if (preselectedSpeakerId) {
      setAssignments([{ speaker_id: preselectedSpeakerId, role: defaultRole(session?.kind ?? 'talk') }]);
    }
  }, [preselectedSpeakerId, session]);

  useEffect(() => {
    if (!offering) return;
    setForm((current) => ({
      ...current,
      workshop_capacity: offering.capacity?.toString() ?? current.workshop_capacity,
      stripe_product_id: offering.stripe_product_id ?? '',
      stripe_price_lookup_key: offering.stripe_price_lookup_key ?? '',
      workshop_status: offering.status,
    }));
  }, [offering]);

  const speakerOptions = useMemo(() => {
    const selectedIds = new Set(assignments.map((assignment) => assignment.speaker_id).filter(Boolean));
    return speakers.filter((speaker) => !selectedIds.has(speaker.id));
  }, [assignments, speakers]);

  const isSubmitting = createMutation.isPending ||
    updateMutation.isPending ||
    speakerMutation.isPending ||
    createOfferingMutation.isPending ||
    updateOfferingMutation.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      const payload = {
        kind: form.kind,
        title: form.title.trim(),
        abstract: form.abstract.trim() || null,
        level: form.kind === 'event' ? null : form.level,
        status: form.status,
        metadata: {
          ...(session?.metadata ?? {}),
          tags: form.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
        workshop_duration_minutes: form.kind === 'workshop' && form.workshop_duration_minutes
          ? parseInt(form.workshop_duration_minutes, 10)
          : null,
        workshop_capacity: form.kind === 'workshop' && form.workshop_capacity
          ? parseInt(form.workshop_capacity, 10)
          : null,
      };
      const normalizedAssignments = assignments
        .filter((assignment) => assignment.speaker_id)
        .map((assignment, index) => ({
          speaker_id: assignment.speaker_id,
          role: assignment.role,
          sort_order: index,
        }));

      if (session) {
        await updateMutation.mutateAsync({ id: session.id, data: payload });
        await speakerMutation.mutateAsync(normalizedAssignments);
      } else {
        const createdSession = await createMutation.mutateAsync({
          ...payload,
          metadata: { ...payload.metadata, created_from: 'program_admin' },
          speakers: normalizedAssignments,
        });

        if (form.kind === 'workshop' && hasWorkshopCommerceInput()) {
          await createOfferingMutation.mutateAsync({
            sessionId: createdSession.id,
            data: buildWorkshopOfferingPayload(),
          });
        }
      }

      if (session && form.kind === 'workshop' && hasWorkshopCommerceInput()) {
        if (offering) {
          await updateOfferingMutation.mutateAsync({
            sessionId: session.id,
            data: buildWorkshopOfferingPayload(),
          });
        } else {
          await createOfferingMutation.mutateAsync({
            sessionId: session.id,
            data: buildWorkshopOfferingPayload(),
          });
        }
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
    }
  };

  const addSpeaker = () => {
    const nextSpeaker = speakerOptions[0];
    if (!nextSpeaker) return;
    setAssignments((current) => [...current, { speaker_id: nextSpeaker.id, role: defaultRole(form.kind) }]);
  };

  const buildWorkshopOfferingPayload = () => ({
    title: form.title.trim(),
    description: form.abstract.trim(),
    capacity: form.workshop_capacity ? parseInt(form.workshop_capacity, 10) : undefined,
    duration_minutes: form.workshop_duration_minutes ? parseInt(form.workshop_duration_minutes, 10) : null,
    stripe_product_id: form.stripe_product_id || null,
    stripe_price_lookup_key: form.stripe_price_lookup_key || null,
    status: form.workshop_status,
  });

  const hasWorkshopCommerceInput = () =>
    Boolean(form.workshop_capacity || form.stripe_product_id || form.stripe_price_lookup_key || form.workshop_status !== 'draft');

  const handleValidateStripe = async () => {
    if (!session?.id || !form.stripe_price_lookup_key) return;
    try {
      await validateStripeMutation.mutateAsync({
        sessionId: session.id,
        lookupKey: form.stripe_price_lookup_key,
        stripeProductId: form.stripe_product_id || null,
        store: Boolean(offering),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate Stripe');
    }
  };

  return (
    <AdminModal
      title={session ? 'Edit Session' : 'Create Session'}
      description={session?.cfp_submission_id ? 'Promoted from CFP submission' : undefined}
      maxWidth="3xl"
      showHeader={false}
      onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            form="program-session-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-black hover:bg-[#d9c51f] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Save Session
          </button>
        </>
      )}
    >
        <form id="program-session-form" onSubmit={handleSubmit} className="space-y-5">
          {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Kind
              <select
                value={form.kind}
                onChange={(event) => {
                  const kind = event.target.value as ProgramSessionKind;
                  setForm((current) => ({ ...current, kind }));
                  setAssignments((current) => current.map((assignment) => ({ ...assignment, role: defaultRole(kind) })));
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
              >
                {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Status
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as ProgramSessionStatus })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
              >
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            {form.kind !== 'event' ? (
              <label className="grid gap-1 text-sm font-medium text-gray-800">
                Level
                <select
                  value={form.level}
                  onChange={(event) => setForm({ ...form, level: event.target.value as ProgramSessionLevel })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            ) : null}
          </div>

          <label className="grid gap-1 text-sm font-medium text-gray-800">
            Title
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-gray-800">
            Abstract / description
            <textarea
              rows={5}
              value={form.abstract}
              onChange={(event) => setForm({ ...form, abstract: event.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-gray-800">
            Tags
            <input
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
              placeholder="react, architecture, ai"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
            />
          </label>

          {form.kind === 'workshop' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-gray-800">
                Duration (minutes)
                <input
                  type="number"
                  min="1"
                  value={form.workshop_duration_minutes}
                  onChange={(event) => setForm({ ...form, workshop_duration_minutes: event.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-800">
                Capacity
                <input
                  type="number"
                  min="1"
                  value={form.workshop_capacity}
                  onChange={(event) => setForm({ ...form, workshop_capacity: event.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-800">
                Workshop status
                <select
                  value={form.workshop_status}
                  onChange={(event) => setForm({ ...form, workshop_status: event.target.value as Workshop['status'] })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-800">
                Stripe product
                <input
                  value={form.stripe_product_id}
                  onChange={(event) => setForm({ ...form, stripe_product_id: event.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-800 sm:col-span-2">
                Stripe lookup key
                <div className="flex gap-2">
                  <input
                    value={form.stripe_price_lookup_key}
                    onChange={(event) => setForm({ ...form, stripe_price_lookup_key: event.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
                  />
                  <button
                    type="button"
                    onClick={handleValidateStripe}
                    disabled={!session?.id || !form.stripe_price_lookup_key || validateStripeMutation.isPending}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Validate
                  </button>
                </div>
              </label>
            </div>
          ) : null}

          <div className="rounded-md border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">Speakers</p>
              <button
                type="button"
                onClick={addSpeaker}
                disabled={speakerOptions.length === 0}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Add Speaker
              </button>
            </div>
            <div className="grid gap-3 p-4">
              {assignments.length === 0 ? (
                <p className="text-sm text-gray-500">No speakers assigned yet.</p>
              ) : assignments.map((assignment, index) => (
                <div key={`${assignment.speaker_id}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                  <select
                    value={assignment.speaker_id}
                    onChange={(event) => setAssignments((current) => current.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, speaker_id: event.target.value } : entry
                    ))}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
                  >
                    <option value="">Choose speaker</option>
                    {speakers.map((speaker) => (
                      <option key={speaker.id} value={speaker.id}>
                        {speaker.first_name} {speaker.last_name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={assignment.role}
                    onChange={(event) => setAssignments((current) => current.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, role: event.target.value as ProgramSessionSpeakerRole } : entry
                    ))}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-950"
                  >
                    {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setAssignments((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                    className="rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

        </form>
    </AdminModal>
  );
}
