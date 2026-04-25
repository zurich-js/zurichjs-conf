import { useEffect, useMemo, useState } from 'react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import {
  useCreateWorkshopOffering,
  useCreateProgramSession,
  useCreateProgramTag,
  useProgramSessionSpeakers,
  useProgramTags,
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

function normalizeSessionTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);
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
  const { data: tagOptions = [], isLoading: isLoadingTags } = useProgramTags();
  const createTagMutation = useCreateProgramTag();
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
  const [selectedTags, setSelectedTags] = useState<string[]>(() => normalizeSessionTags(session?.metadata?.tags));
  const [tagInput, setTagInput] = useState('');

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

  const selectableTags = useMemo(() => {
    const selected = new Set(selectedTags.map((tag) => tag.toLowerCase()));
    return tagOptions.filter((tag) => !selected.has(tag.name.toLowerCase()));
  }, [selectedTags, tagOptions]);

  const isSubmitting = createMutation.isPending ||
    updateMutation.isPending ||
    speakerMutation.isPending ||
    createOfferingMutation.isPending ||
    updateOfferingMutation.isPending ||
    createTagMutation.isPending;

  const addSelectedTag = (name: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    setSelectedTags((current) => {
      if (current.some((tag) => tag.toLowerCase() === normalized.toLowerCase())) return current;
      return [...current, normalized];
    });
  };

  const handleCreateTag = async () => {
    const normalized = tagInput.trim();
    if (!normalized) return;
    const existing = tagOptions.find((tag) => tag.name.toLowerCase() === normalized.toLowerCase());
    if (existing) {
      addSelectedTag(existing.name);
      setTagInput('');
      return;
    }

    try {
      const tag = await createTagMutation.mutateAsync(normalized);
      addSelectedTag(tag.name);
      setTagInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    }
  };

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
          tags: selectedTags,
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
    setAssignments((current) => [...current, { speaker_id: '', role: defaultRole(form.kind) }]);
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
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-brand-gray-dark hover:bg-text-brand-gray-lightest">
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
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
              >
                {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-gray-800">
              Status
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as ProgramSessionStatus })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
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
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
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
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium text-gray-800">
            Abstract / description
            <textarea
              rows={5}
              value={form.abstract}
              onChange={(event) => setForm({ ...form, abstract: event.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
            />
          </label>

          <div className="grid gap-2 text-sm font-medium text-gray-800">
            <span>Tags</span>
            <Combobox
              value={selectedTags}
              onChange={(nextValue: string[]) => {
                setSelectedTags(nextValue);
                setTagInput('');
              }}
              multiple
            >
              <div className="relative">
                <div className="flex min-h-11 w-full flex-wrap items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-black focus-within:ring-2 focus-within:ring-brand-primary">
                  {selectedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedTags((current) => current.filter((entry) => entry !== tag));
                      }}
                      className="rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                      title={`Remove ${tag}`}
                    >
                      {tag} x
                    </button>
                  ))}
                  <ComboboxInput
                    className="min-w-[160px] flex-1 bg-transparent text-sm text-black placeholder:text-brand-gray-medium outline-none"
                    displayValue={() => ''}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && tagInput.trim()) {
                        event.preventDefault();
                        void handleCreateTag();
                      }
                    }}
                    onBlur={() => setTagInput('')}
                    placeholder={selectedTags.length > 0 ? 'Add another tag...' : 'Search or select tags...'}
                    aria-label="Session tags"
                  />
                </div>
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-gray-medium">
                  <ChevronDown className="size-4" />
                </ComboboxButton>
                <ComboboxOptions className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-md border border-brand-gray-lightest bg-white py-1 shadow-lg outline-none">
                  {isLoadingTags ? (
                    <div className="px-3 py-2 text-sm text-brand-gray-medium">Loading tags...</div>
                  ) : selectableTags.length === 0 && !tagInput.trim() ? (
                    <div className="px-3 py-2 text-sm text-brand-gray-medium">No tags available</div>
                  ) : (
                    <>
                      {selectableTags
                        .filter((tag) => !tagInput.trim() || tag.name.toLowerCase().includes(tagInput.trim().toLowerCase()))
                        .map((tag) => {
                          const isSelected = selectedTags.includes(tag.name);
                          return (
                            <ComboboxOption
                              key={tag.id}
                              value={tag.name}
                              className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 transition-colors data-[focus]:bg-text-brand-gray-lightest"
                            >
                              <span className={isSelected ? 'font-semibold' : ''}>{tag.name}</span>
                              {isSelected ? <Check className="size-4 text-brand-blue" /> : null}
                            </ComboboxOption>
                          );
                        })}
                      {tagInput.trim() && !tagOptions.some((tag) => tag.name.toLowerCase() === tagInput.trim().toLowerCase()) ? (
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={handleCreateTag}
                          disabled={createTagMutation.isPending}
                          className="flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm font-medium text-brand-blue hover:bg-text-brand-gray-lightest disabled:opacity-50"
                        >
                          Create &#34;{tagInput.trim()}&#34;
                        </button>
                      ) : null}
                    </>
                  )}
                </ComboboxOptions>
              </div>
            </Combobox>
          </div>

          {form.kind === 'workshop' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-gray-800">
                Duration (minutes)
                <input
                  type="number"
                  min="1"
                  value={form.workshop_duration_minutes}
                  onChange={(event) => setForm({ ...form, workshop_duration_minutes: event.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-800">
                Capacity
                <input
                  type="number"
                  min="1"
                  value={form.workshop_capacity}
                  onChange={(event) => setForm({ ...form, workshop_capacity: event.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-800">
                Workshop status
                <select
                  value={form.workshop_status}
                  onChange={(event) => setForm({ ...form, workshop_status: event.target.value as Workshop['status'] })}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
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
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-gray-800 sm:col-span-2">
                Stripe lookup key
                <div className="flex gap-2">
                  <input
                    value={form.stripe_price_lookup_key}
                    onChange={(event) => setForm({ ...form, stripe_price_lookup_key: event.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
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

          <div className="rounded-md border border-brand-gray-lightest">
            <div className="flex items-center justify-between border-b border-brand-gray-lightest px-4 py-3">
              <p className="text-sm font-semibold text-black">Speakers</p>
              <button
                type="button"
                onClick={addSpeaker}
                disabled={speakerOptions.length === 0 || assignments.some((assignment) => !assignment.speaker_id)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Add Speaker
              </button>
            </div>
            <div className="grid gap-3 p-4">
              {assignments.length === 0 ? (
                <p className="text-sm text-brand-gray-medium">No speakers assigned yet.</p>
              ) : assignments.map((assignment, index) => {
                const selectedIds = new Set(assignments
                  .filter((_, entryIndex) => entryIndex !== index)
                  .map((entry) => entry.speaker_id)
                  .filter(Boolean));
                const rowSpeakerOptions = speakers.filter((speaker) => !selectedIds.has(speaker.id));

                return (
                <div key={`${assignment.speaker_id || 'empty'}-${index}`} className="flex gap-2 w-full items-end">
                  <label className="flex-1 grid gap-1 text-sm font-medium text-gray-800">
                    Speaker
                    <select
                      value={assignment.speaker_id}
                      onChange={(event) => setAssignments((current) => current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, speaker_id: event.target.value } : entry
                      ))}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                    >
                      <option value="">Choose speaker</option>
                      {rowSpeakerOptions.map((speaker) => (
                        <option key={speaker.id} value={speaker.id}>
                          {speaker.first_name} {speaker.last_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex-1 grid gap-1 text-sm font-medium text-gray-800">
                    Role
                    <select
                      value={assignment.role}
                      onChange={(event) => setAssignments((current) => current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, role: event.target.value as ProgramSessionSpeakerRole } : entry
                      ))}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-black"
                    >
                      {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAssignments((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                    className="basis-10 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              );
              })}
            </div>
          </div>

        </form>
    </AdminModal>
  );
}
