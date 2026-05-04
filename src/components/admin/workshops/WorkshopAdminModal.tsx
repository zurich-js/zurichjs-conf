/**
 * Edit modal for a workshop offering.
 * Sections: Schedule, Pricing, Capacity & status, Readiness, Registrants, Revenue.
 * Hard publish gate: Publish button disabled until the readiness checklist is
 * fully green (including Stripe validation).
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, ExternalLink, Loader2, Save, Trash2, X } from 'lucide-react';

import type { Workshop, WorkshopStatus } from '@/lib/types/database';
import { queryKeys } from '@/lib/query-keys';
import { RegistrantsPanel, RevenuePanel } from './DetailPanels';
import { ReadinessChecklist } from './ReadinessChecklist';
import { ValidationResultPanel } from './ValidationResultPanel';
import { IconButton, LabeledField, Section } from './ModalFormPrimitives';
import { computeFullReadiness, type StripeValidation } from './readiness';

const ALLOWED_STATUSES: WorkshopStatus[] = [
  'draft',
  'published',
  'cancelled',
  'completed',
  'archived',
];

export interface PatchPayload {
  room?: string | null;
  capacity?: number;
  stripeProductId?: string | null;
  stripePriceLookupKey?: string | null;
  stripeValidation?: StoredStripeValidation;
  status?: WorkshopStatus;
  title?: string;
  description?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface CreateWorkshopDraft {
  cfpSubmissionId: string;
  title: string;
  description: string | null;
  talkLevel?: string | null;
  durationMinutes: number | null;
  capacity: number | null;
  date?: string | null;
  startTime?: string | null;
  room?: string | null;
  participantSpeakerIds?: string[];
}

export interface WorkshopAdminSession {
  id: string;
  speaker_id: string;
  title: string;
  abstract: string | null;
  talk_level: string | null;
  workshop_duration_hours: number | null;
  workshop_max_participants: number | null;
  participant_speaker_ids?: string[];
}

export interface WorkshopSchedulePlacement {
  id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  room: string | null;
  is_visible: boolean;
}

export interface WorkshopSpeakerOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface CreatePayload extends PatchPayload {
  cfpSubmissionId: string;
  title: string;
  description: string | null;
  durationMinutes?: number | null;
}

type FullStripeValidation = StripeValidation & { productMismatch: boolean; missing: string[] };

interface StoredStripeValidation extends FullStripeValidation {
  lookupKey: string;
  stripeProductId: string | null;
  validatedAt: string;
}

const createOffering = async (payload: CreatePayload): Promise<Workshop> => {
  const res = await fetch('/api/admin/workshops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cfpSubmissionId: payload.cfpSubmissionId,
      title: payload.title,
      description: payload.description ?? undefined,
      capacity: payload.capacity ?? undefined,
      room: payload.room,
      durationMinutes: payload.durationMinutes,
      stripeProductId: payload.stripeProductId,
      stripePriceLookupKey: payload.stripePriceLookupKey,
      stripeValidation: payload.stripeValidation,
      status: payload.status,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 409 && data.offering) {
    return patchOffering((data.offering as Workshop).id, {
      room: payload.room,
      capacity: payload.capacity,
      stripeProductId: payload.stripeProductId,
      stripePriceLookupKey: payload.stripePriceLookupKey,
      status: payload.status,
      title: payload.title,
      description: payload.description,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
    });
  }
  if (!res.ok) throw new Error(data.error ?? 'Failed to create offering');

  const created = data.offering as Workshop;
  const hasSchedule =
    payload.date !== undefined || payload.startTime !== undefined || payload.endTime !== undefined;
  if (!hasSchedule) return created;

  return patchOffering(created.id, {
    room: payload.room,
    capacity: payload.capacity,
    stripeProductId: payload.stripeProductId,
    stripePriceLookupKey: payload.stripePriceLookupKey,
    stripeValidation: payload.stripeValidation,
    status: payload.status,
    title: payload.title,
    description: payload.description,
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
  });
};

async function patchOffering(id: string, payload: PatchPayload): Promise<Workshop> {
  const res = await fetch(`/api/admin/workshops/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error ?? 'Failed to update offering');
  }
  const data = await res.json();
  return data.offering as Workshop;
}

async function validateStripeLookup(
  lookupKey: string,
  stripeProductId: string | null
): Promise<FullStripeValidation> {
  const res = await fetch('/api/admin/workshops/validate-stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lookupKey, stripeProductId }),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error ?? 'Failed to validate lookup key');
  }
  return (await res.json()) as FullStripeValidation;
}

interface WorkshopAdminModalProps {
  offering?: Workshop | null;
  createDraft?: CreateWorkshopDraft | null;
  session?: WorkshopAdminSession | null;
  scheduleItem?: WorkshopSchedulePlacement | null;
  speakers?: WorkshopSpeakerOption[];
  open: boolean;
  onClose: () => void;
  onSaved: (offering?: Workshop) => void;
  listQueryKey: readonly unknown[];
  onToast?: (message: string, type?: 'success' | 'error') => void;
}

const toTimeInputValue = (value: string | null): string => {
  if (!value) return '';
  return /^\d{2}:\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : value;
};

const addMinutesToTime = (time: string | null | undefined, minutes: number | null | undefined): string | null => {
  if (!time || !minutes) return null;
  const [hours, mins] = time.slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  const total = hours * 60 + mins + minutes;
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${Math.floor(normalized / 60).toString().padStart(2, '0')}:${(normalized % 60).toString().padStart(2, '0')}`;
};

function getStoredStripeValidation(offering: Workshop): FullStripeValidation | null {
  const metadata = offering.metadata;
  const stored =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata.stripeValidation as Partial<StoredStripeValidation> | undefined)
      : undefined;

  if (
    stored?.valid === true &&
    stored.lookupKey === offering.stripe_price_lookup_key &&
    stored.stripeProductId === offering.stripe_product_id &&
    Array.isArray(stored.results)
  ) {
    return {
      valid: true,
      results: stored.results,
      productMismatch: stored.productMismatch ?? false,
      missing: stored.missing ?? [],
    };
  }

  if (offering.status === 'published' && offering.stripe_price_lookup_key && offering.stripe_product_id) {
    return {
      valid: true,
      results: [],
      productMismatch: false,
      missing: [],
    };
  }

  return null;
}

function PlacementLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-0.5 font-medium text-gray-900">{value}</div>
    </div>
  );
}

async function patchSubmission(id: string, payload: {
  speaker_id: string;
  title: string;
  abstract: string;
  talk_level: string;
  workshop_duration_hours: number | null;
  workshop_max_participants: number | null;
  participant_speaker_ids: string[];
}) {
  const res = await fetch(`/api/admin/cfp/submissions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      submission_type: 'workshop',
    }),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error ?? 'Failed to update workshop submission');
  }
}

export function WorkshopAdminModal({
  offering,
  createDraft,
  session,
  scheduleItem,
  speakers = [],
  open,
  onClose,
  onSaved,
  listQueryKey,
  onToast,
}: WorkshopAdminModalProps) {
  const qc = useQueryClient();
  const isCreateMode = !offering;
  const displayOffering: Workshop = offering ?? {
    id: 'new-workshop-offering',
    title: createDraft?.title ?? 'Workshop offering',
    description: createDraft?.description ?? '',
    instructor_id: null,
    cfp_submission_id: createDraft?.cfpSubmissionId ?? null,
    room: createDraft?.room ?? null,
    duration_minutes: createDraft?.durationMinutes ?? null,
    stripe_product_id: null,
    stripe_price_lookup_key: null,
    date: createDraft?.date ?? null,
    start_time: createDraft?.startTime ?? null,
    end_time: addMinutesToTime(createDraft?.startTime, createDraft?.durationMinutes),
    capacity: createDraft?.capacity ?? 20,
    enrolled_count: 0,
    price: null,
    currency: 'CHF',
    status: 'draft',
    metadata: {},
    created_at: '',
    updated_at: '',
  };
  const [form, setForm] = useState({
    title: session?.title ?? displayOffering.title,
    speakerId: session?.speaker_id ?? '',
    abstract: session?.abstract ?? displayOffering.description ?? '',
    talkLevel: session?.talk_level ?? createDraft?.talkLevel ?? 'intermediate',
    participantSpeakerIds: session?.participant_speaker_ids ?? createDraft?.participantSpeakerIds ?? [],
    capacity: displayOffering.capacity?.toString() ?? '',
    stripeProductId: displayOffering.stripe_product_id ?? '',
    stripePriceLookupKey: displayOffering.stripe_price_lookup_key ?? '',
    status: displayOffering.status,
  });
  const initialValidation = getStoredStripeValidation(displayOffering);
  const [validation, setValidation] = useState<FullStripeValidation | null>(initialValidation);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({
    workshop: false,
    pricing: true,
    capacity: true,
    registrants: false,
    revenue: false,
  });

  const modalResetKey = useMemo(
    () =>
      JSON.stringify({
        offeringId: displayOffering.id,
        offeringTitle: displayOffering.title,
        offeringDescription: displayOffering.description,
        offeringRoom: displayOffering.room,
        offeringDate: displayOffering.date,
        offeringStartTime: displayOffering.start_time,
        offeringDurationMinutes: displayOffering.duration_minutes,
        offeringCapacity: displayOffering.capacity,
        offeringStripeProductId: displayOffering.stripe_product_id,
        offeringStripePriceLookupKey: displayOffering.stripe_price_lookup_key,
        offeringStatus: displayOffering.status,
        offeringStripeValidation:
          displayOffering.metadata &&
          typeof displayOffering.metadata === 'object' &&
          !Array.isArray(displayOffering.metadata)
            ? displayOffering.metadata.stripeValidation ?? null
            : null,
        sessionId: session?.id ?? null,
        sessionSpeakerId: session?.speaker_id ?? null,
        sessionTitle: session?.title ?? null,
        sessionAbstract: session?.abstract ?? null,
        sessionTalkLevel: session?.talk_level ?? null,
        sessionParticipantSpeakerIds: session?.participant_speaker_ids ?? [],
        scheduleItemId: scheduleItem?.id ?? null,
        createDraftSubmissionId: createDraft?.cfpSubmissionId ?? null,
        createDraftTitle: createDraft?.title ?? null,
        createDraftDescription: createDraft?.description ?? null,
        createDraftTalkLevel: createDraft?.talkLevel ?? null,
        createDraftParticipantSpeakerIds: createDraft?.participantSpeakerIds ?? [],
      }),
    [
      createDraft?.cfpSubmissionId,
      createDraft?.description,
      createDraft?.participantSpeakerIds,
      createDraft?.talkLevel,
      createDraft?.title,
      displayOffering.capacity,
      displayOffering.date,
      displayOffering.description,
      displayOffering.duration_minutes,
      displayOffering.id,
      displayOffering.room,
      displayOffering.start_time,
      displayOffering.status,
      displayOffering.stripe_price_lookup_key,
      displayOffering.stripe_product_id,
      displayOffering.metadata,
      displayOffering.title,
      scheduleItem?.id,
      session?.abstract,
      session?.id,
      session?.participant_speaker_ids,
      session?.speaker_id,
      session?.talk_level,
      session?.title,
    ]
  );

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  // Reset state when the modal opens with a different offering.
  useEffect(() => {
    if (open) {
      setForm({
        title: session?.title ?? displayOffering.title,
        speakerId: session?.speaker_id ?? '',
        abstract: session?.abstract ?? displayOffering.description ?? '',
        talkLevel: session?.talk_level ?? createDraft?.talkLevel ?? 'intermediate',
        participantSpeakerIds: session?.participant_speaker_ids ?? createDraft?.participantSpeakerIds ?? [],
        capacity: displayOffering.capacity?.toString() ?? '',
        stripeProductId: displayOffering.stripe_product_id ?? '',
        stripePriceLookupKey: displayOffering.stripe_price_lookup_key ?? '',
        status: displayOffering.status,
      });
      setValidation((current) => {
        const storedValidation = getStoredStripeValidation(displayOffering);
        if (storedValidation) return storedValidation;
        if (
          current &&
          form.stripePriceLookupKey === (displayOffering.stripe_price_lookup_key ?? '') &&
          form.stripeProductId === (displayOffering.stripe_product_id ?? '')
        ) {
          return current;
        }
        return null;
      });
      setValidationError(null);
      setOpenSections({
        workshop: false,
        pricing: true,
        capacity: true,
        registrants: false,
        revenue: false,
      });
    }
  }, [open, modalResetKey]);

  // B7: when the admin edits the Stripe product id or lookup key after
  // validating, the previous validation result is stale — clear it so the
  // readiness checklist re-gates publish until they re-validate.
  useEffect(() => {
    if (!validation) return;
    const expectedKey = displayOffering.stripe_price_lookup_key ?? '';
    const expectedProduct = displayOffering.stripe_product_id ?? '';
    if (form.stripePriceLookupKey !== expectedKey || form.stripeProductId !== expectedProduct) {
      setValidation(null);
    }
    // We only clear when the user types — not when the offering prop itself
    // changes (that's handled by the reset-on-open effect above).
  }, [form.stripePriceLookupKey, form.stripeProductId]);

  const scheduleDate = scheduleItem?.date ?? displayOffering.date ?? createDraft?.date ?? null;
  const scheduleStartTime = toTimeInputValue(scheduleItem?.start_time ?? displayOffering.start_time ?? createDraft?.startTime ?? null);
  const scheduleDurationMinutes =
    scheduleItem?.duration_minutes ??
    displayOffering.duration_minutes ??
    createDraft?.durationMinutes ??
    (session?.workshop_duration_hours ? Math.round(session.workshop_duration_hours * 60) : null);
  const scheduleEndTime =
    toTimeInputValue(displayOffering.end_time) || addMinutesToTime(scheduleStartTime, scheduleDurationMinutes);
  const scheduleRoom = scheduleItem?.room ?? displayOffering.room ?? createDraft?.room ?? null;

  const readinessInput = useMemo(
    () => ({
      offering: displayOffering,
      draft: {
        date: scheduleDate,
        startTime: scheduleStartTime || null,
        endTime: scheduleEndTime,
        room: scheduleRoom,
        capacity: form.capacity ? Number(form.capacity) : null,
        stripeProductId: form.stripeProductId || null,
        stripePriceLookupKey: form.stripePriceLookupKey || null,
      },
      validation,
    }),
    [displayOffering, form, validation, scheduleDate, scheduleStartTime, scheduleEndTime, scheduleRoom]
  );
  const readiness = useMemo(() => computeFullReadiness(readinessInput), [readinessInput]);

  const saveMutation = useMutation({
    mutationFn: async (payload: PatchPayload) => {
      const cfpSubmissionId = createDraft?.cfpSubmissionId ?? offering?.cfp_submission_id ?? session?.id ?? null;
      if (!cfpSubmissionId) throw new Error('Missing workshop submission');
      if (!form.title.trim() || !form.abstract.trim()) throw new Error('Title and abstract are required');
      if (!form.speakerId) throw new Error('Choose a primary speaker');
      if (!scheduleDurationMinutes || scheduleDurationMinutes <= 0) {
        throw new Error('Schedule this workshop before saving commerce');
      }

      await patchSubmission(cfpSubmissionId, {
        title: form.title.trim(),
        speaker_id: form.speakerId,
        abstract: form.abstract.trim(),
        talk_level: form.talkLevel,
        workshop_duration_hours: scheduleDurationMinutes / 60,
        workshop_max_participants: form.capacity ? Number(form.capacity) : null,
        participant_speaker_ids: form.participantSpeakerIds,
      });

      if (offering) return patchOffering(offering.id, payload);
      if (!createDraft) throw new Error('Missing workshop submission');
      return createOffering({
        ...payload,
        cfpSubmissionId,
        title: form.title.trim(),
        description: form.abstract.trim(),
        durationMinutes: scheduleDurationMinutes,
      });
    },
    onSuccess: (result, payload) => {
      qc.invalidateQueries({ queryKey: listQueryKey });
      // I8: also bust the public schedule cache so /workshops reflects changes
      // without waiting the 5-min staleTime.
      qc.invalidateQueries({ queryKey: queryKeys.workshops.all });
      onSaved(result);
      if (onToast) {
        const statusChange = payload.status && payload.status !== displayOffering.status;
        onToast(
          isCreateMode ? 'Workshop offering created' : statusChange ? `Workshop ${payload.status}` : 'Workshop saved',
          'success'
        );
      }
    },
    onError: (err: Error) => {
      onToast?.(err.message || 'Save failed', 'error');
    },
  });

  const validateMutation = useMutation({
    mutationFn: () =>
      validateStripeLookup(form.stripePriceLookupKey, form.stripeProductId || null),
    onSuccess: (result) => {
      setValidation(result);
      setValidationError(null);
      if (onToast) {
        onToast(
          result.valid ? 'Stripe prices look good' : 'Some Stripe prices are missing',
          result.valid ? 'success' : 'error'
        );
      }
    },
    onError: (err: Error) => {
      setValidation(null);
      setValidationError(err.message);
      onToast?.(err.message || 'Validation failed', 'error');
    },
  });

  const stripeValidationPayload =
    validation?.valid === true
      ? {
          ...validation,
          lookupKey: form.stripePriceLookupKey,
          stripeProductId: form.stripeProductId || null,
          validatedAt: new Date().toISOString(),
        }
      : undefined;

  const buildPayload = (overrides: Partial<PatchPayload> = {}): PatchPayload => ({
    room: scheduleRoom,
    capacity: form.capacity ? Number(form.capacity) : undefined,
    stripeProductId: form.stripeProductId || null,
    stripePriceLookupKey: form.stripePriceLookupKey || null,
    stripeValidation: stripeValidationPayload,
    status: form.status,
    title: form.title.trim(),
    description: form.abstract.trim(),
    date: scheduleDate,
    startTime: scheduleStartTime || null,
    endTime: scheduleEndTime,
    ...overrides,
  });

  const handleSave = () => {
    saveMutation.mutate(buildPayload());
  };

  const handlePublish = async () => {
    if (!readiness.isReady) return;
    saveMutation.mutate(buildPayload({ status: 'published' }));
    setForm((f) => ({ ...f, status: 'published' }));
  };

  const handleArchive = () => {
    if (!offering) return;
    if (!window.confirm('Archive this workshop? Buyers can\u2019t see it on /workshops but existing registrants stay intact.')) return;
    saveMutation.mutate(buildPayload({ status: 'archived' }));
    setForm((f) => ({ ...f, status: 'archived' }));
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* no-op */
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
          <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-semibold text-gray-900">
                {displayOffering.title}
              </DialogTitle>
              <div className="mt-0.5 text-xs text-gray-500">Workshop admin</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isCreateMode ? (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              This workshop offering has not been created yet. Fill in the fields and click Create draft.
            </div>
          ) : null}

          <ReadinessChecklist items={readiness.items} isReady={readiness.isReady} openItems={readiness.openItems} />

          <Section
            title="Workshop"
            description="CFP content and participant assignment."
            collapsed={!openSections.workshop}
            onToggle={() => toggleSection('workshop')}
          >
            <div className="grid gap-3">
              <LabeledField label="Title">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                />
              </LabeledField>
              {speakers.length > 0 ? (
                <LabeledField label="Primary speaker">
                  <select
                    value={form.speakerId}
                    onChange={(e) => setForm({ ...form, speakerId: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                  >
                    {speakers.map((speaker) => (
                      <option key={speaker.id} value={speaker.id}>
                        {speaker.first_name} {speaker.last_name}
                      </option>
                    ))}
                  </select>
                </LabeledField>
              ) : null}
              <LabeledField label="Abstract">
                <textarea
                  rows={4}
                  value={form.abstract}
                  onChange={(e) => setForm({ ...form, abstract: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                />
              </LabeledField>
              <LabeledField label="Level">
                <select
                  value={form.talkLevel}
                  onChange={(e) => setForm({ ...form, talkLevel: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </LabeledField>
              {speakers.length > 0 ? (
                <LabeledField label="Additional speakers">
                  <div className="grid max-h-32 gap-2 overflow-y-auto rounded-md border border-gray-300 p-3">
                    {speakers.map((speaker) => {
                      const checked = form.participantSpeakerIds.includes(speaker.id);
                      return (
                        <label key={speaker.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setForm({
                              ...form,
                              participantSpeakerIds: checked
                                ? form.participantSpeakerIds.filter((id) => id !== speaker.id)
                                : [...form.participantSpeakerIds, speaker.id],
                            })}
                          />
                          {speaker.first_name} {speaker.last_name}
                        </label>
                      );
                    })}
                  </div>
                </LabeledField>
              ) : null}
            </div>
          </Section>

          <Section
            title="Placement"
            description="Read-only schedule slot. Edit this from the Schedule tab."
            collapsed={false}
          >
            <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <PlacementLine label="Date" value={scheduleDate ?? 'Not scheduled'} />
              <PlacementLine label="Time" value={scheduleStartTime && scheduleEndTime ? `${scheduleStartTime} - ${scheduleEndTime}` : 'Not scheduled'} />
              <PlacementLine label="Duration" value={scheduleDurationMinutes ? `${scheduleDurationMinutes} min` : 'Not set'} />
              <PlacementLine label="Room" value={scheduleRoom || 'Not assigned'} />
              <PlacementLine label="Visibility" value={scheduleItem?.is_visible === false ? 'Hidden' : scheduleItem ? 'Visible' : 'Not scheduled'} />
            </div>
          </Section>

          <Section
            title="Pricing"
            description="Link a Stripe product + CHF base lookup key. Validate to confirm all currencies resolve."
            collapsed={!openSections.pricing}
            onToggle={() => toggleSection('pricing')}
          >
            <div className="grid gap-3">
              <LabeledField label="Stripe product ID" hint="Paste the `prod_…` id from Stripe.">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.stripeProductId}
                    onChange={(e) => setForm({ ...form, stripeProductId: e.target.value })}
                    placeholder="prod_…"
                    className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm font-mono"
                  />
                  {form.stripeProductId && (
                    <IconButton label="Copy" onClick={() => copyToClipboard(form.stripeProductId)}>
                      <Copy className="size-4" />
                    </IconButton>
                  )}
                </div>
              </LabeledField>
              <LabeledField
                label="Stripe price lookup key (CHF base)"
                hint="Runtime appends _eur / _gbp / _usd. Example: workshop_react-patterns"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.stripePriceLookupKey}
                    onChange={(e) =>
                      setForm({ ...form, stripePriceLookupKey: e.target.value })
                    }
                    placeholder="workshop_my-slug"
                    className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm font-mono"
                  />
                  {form.stripePriceLookupKey && (
                    <IconButton
                      label="Copy"
                      onClick={() => copyToClipboard(form.stripePriceLookupKey)}
                    >
                      <Copy className="size-4" />
                    </IconButton>
                  )}
                </div>
              </LabeledField>

              <div>
                <button
                  onClick={() => validateMutation.mutate()}
                  disabled={validateMutation.isPending || !form.stripePriceLookupKey}
                  className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {validateMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Validate Stripe
                </button>
              </div>

              {validationError && (
                <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{validationError}</div>
              )}
              {validation && <ValidationResultPanel validation={validation} />}
            </div>
          </Section>

          <Section
            title="Capacity & status"
            description="Seats and publication state."
            collapsed={!openSections.capacity}
            onToggle={() => toggleSection('capacity')}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledField label="Capacity" hint="Also saves as workshop max participants on the CFP submission.">
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="20"
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                />
              </LabeledField>
              <LabeledField label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as WorkshopStatus })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                >
                  {ALLOWED_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </LabeledField>
            </div>
          </Section>

          {!isCreateMode ? (
            <>
              <Section
                title="Registrants"
                description="Purchasers for this workshop."
                collapsed={!openSections.registrants}
                onToggle={() => toggleSection('registrants')}
              >
                {openSections.registrants && offering && (
                  <RegistrantsPanel workshopId={offering.id} onClose={() => toggleSection('registrants')} />
                )}
              </Section>

              <Section
                title="Revenue"
                description="Confirmed-registration totals by currency."
                collapsed={!openSections.revenue}
                onToggle={() => toggleSection('revenue')}
              >
                {openSections.revenue && offering && (
                  <RevenuePanel workshopId={offering.id} onClose={() => toggleSection('revenue')} />
                )}
              </Section>

              <div className="mt-8">
                <button
                  onClick={handleArchive}
                  className="inline-flex items-center gap-2 text-xs font-medium text-red-700 hover:text-red-800 cursor-pointer"
                >
                  <Trash2 className="size-3.5" /> Archive this workshop
                </button>
              </div>
            </>
          ) : null}
        </div>

        <footer className="border-t border-gray-200 bg-white px-4 py-3">
          {saveMutation.isError && (
            <div className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700">
              {(saveMutation.error as Error)?.message}
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Close
            </button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {isCreateMode ? 'Create draft' : 'Save draft'}
              </button>
              <button
                onClick={handlePublish}
                disabled={!readiness.isReady || saveMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  readiness.isReady
                    ? 'Publish this workshop'
                    : `${readiness.openItems} checklist item${readiness.openItems === 1 ? '' : 's'} still open`
                }
              >
                <ExternalLink className="size-4" />
                {readiness.isReady ? 'Validate & publish' : `Publish (${readiness.openItems} to fix)`}
              </button>
            </div>
          </div>
        </footer>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
