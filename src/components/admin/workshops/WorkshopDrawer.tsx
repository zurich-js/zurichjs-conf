/**
 * Edit drawer for a workshop offering.
 * Desktop: right-side drawer (~600px). Mobile: full-screen takeover.
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
import { IconButton, LabeledField, Section } from './DrawerFormPrimitives';
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
  status?: WorkshopStatus;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

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
): Promise<StripeValidation & { productMismatch: boolean; missing: string[] }> {
  const res = await fetch('/api/admin/workshops/validate-stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lookupKey, stripeProductId }),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error ?? 'Failed to validate lookup key');
  }
  return (await res.json()) as StripeValidation & { productMismatch: boolean; missing: string[] };
}

interface WorkshopDrawerProps {
  offering: Workshop;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  listQueryKey: readonly unknown[];
  onToast?: (message: string, type?: 'success' | 'error') => void;
}

const toTimeInputValue = (value: string | null): string => {
  if (!value) return '';
  return /^\d{2}:\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : value;
};

const computeDurationMinutes = (start: string, end: string): number | null => {
  if (!/^\d{2}:\d{2}/.test(start) || !/^\d{2}:\d{2}/.test(end)) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (e <= s) return null;
  return e - s;
};

export function WorkshopDrawer({
  offering,
  open,
  onClose,
  onSaved,
  listQueryKey,
  onToast,
}: WorkshopDrawerProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    room: offering.room ?? '',
    date: offering.date ?? '',
    startTime: toTimeInputValue(offering.start_time),
    endTime: toTimeInputValue(offering.end_time),
    capacity: offering.capacity?.toString() ?? '',
    stripeProductId: offering.stripe_product_id ?? '',
    stripePriceLookupKey: offering.stripe_price_lookup_key ?? '',
    status: offering.status,
  });
  const [validation, setValidation] = useState<(StripeValidation & { productMismatch: boolean; missing: string[] }) | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<'registrants' | 'revenue' | null>(null);

  // Reset state when the drawer opens with a different offering.
  useEffect(() => {
    if (open) {
      setForm({
        room: offering.room ?? '',
        date: offering.date ?? '',
        startTime: toTimeInputValue(offering.start_time),
        endTime: toTimeInputValue(offering.end_time),
        capacity: offering.capacity?.toString() ?? '',
        stripeProductId: offering.stripe_product_id ?? '',
        stripePriceLookupKey: offering.stripe_price_lookup_key ?? '',
        status: offering.status,
      });
      setValidation(null);
      setValidationError(null);
      setExpandedPanel(null);
    }
  }, [open, offering]);

  // B7: when the admin edits the Stripe product id or lookup key after
  // validating, the previous validation result is stale — clear it so the
  // readiness checklist re-gates publish until they re-validate.
  useEffect(() => {
    if (!validation) return;
    const expectedKey = offering.stripe_price_lookup_key ?? '';
    const expectedProduct = offering.stripe_product_id ?? '';
    if (form.stripePriceLookupKey !== expectedKey || form.stripeProductId !== expectedProduct) {
      setValidation(null);
    }
    // We only clear when the user types — not when the offering prop itself
    // changes (that's handled by the reset-on-open effect above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.stripePriceLookupKey, form.stripeProductId]);

  const durationMinutes =
    form.startTime && form.endTime ? computeDurationMinutes(form.startTime, form.endTime) : null;
  const durationInvalid = Boolean(form.startTime && form.endTime && durationMinutes === null);

  const readinessInput = useMemo(
    () => ({
      offering,
      draft: {
        date: form.date || null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        room: form.room || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        stripeProductId: form.stripeProductId || null,
        stripePriceLookupKey: form.stripePriceLookupKey || null,
      },
      validation,
    }),
    [offering, form, validation]
  );
  const readiness = useMemo(() => computeFullReadiness(readinessInput), [readinessInput]);

  const saveMutation = useMutation({
    mutationFn: (payload: PatchPayload) => patchOffering(offering.id, payload),
    onSuccess: (_result, payload) => {
      qc.invalidateQueries({ queryKey: listQueryKey });
      // I8: also bust the public schedule cache so /workshops reflects changes
      // without waiting the 5-min staleTime.
      qc.invalidateQueries({ queryKey: queryKeys.workshops.all });
      onSaved();
      if (onToast) {
        const statusChange = payload.status && payload.status !== offering.status;
        onToast(
          statusChange ? `Workshop ${payload.status}` : 'Workshop saved',
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

  const buildPayload = (overrides: Partial<PatchPayload> = {}): PatchPayload => ({
    room: form.room || null,
    capacity: form.capacity ? Number(form.capacity) : undefined,
    stripeProductId: form.stripeProductId || null,
    stripePriceLookupKey: form.stripePriceLookupKey || null,
    status: form.status,
    date: form.date || null,
    startTime: form.startTime || null,
    endTime: form.endTime || null,
    ...overrides,
  });

  const handleSave = () => {
    if (durationInvalid) return;
    saveMutation.mutate(buildPayload());
  };

  const handlePublish = async () => {
    if (!readiness.isReady) return;
    saveMutation.mutate(buildPayload({ status: 'published' }));
    setForm((f) => ({ ...f, status: 'published' }));
  };

  const handleArchive = () => {
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
      <div className="fixed inset-0 flex md:justify-end">
        <DialogPanel className="flex w-full flex-col bg-white shadow-2xl md:w-[640px] md:max-w-full">
          <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Workshop offering
              </div>
              <DialogTitle className="truncate text-base font-semibold text-gray-900 sm:text-lg">
                {offering.title}
              </DialogTitle>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <ReadinessChecklist items={readiness.items} isReady={readiness.isReady} openItems={readiness.openItems} />

          <Section title="Schedule" description="Date, time, and room for /workshops.">
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledField label="Date">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                />
              </LabeledField>
              <LabeledField label="Room">
                <input
                  type="text"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  placeholder="e.g. Aula 1"
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                />
              </LabeledField>
              <LabeledField label="Start time">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                />
              </LabeledField>
              <LabeledField
                label="End time"
                hint={
                  durationInvalid
                    ? 'End time must be after start time.'
                    : durationMinutes !== null
                      ? `Duration: ${durationMinutes} min`
                      : 'Set start + end to compute duration.'
                }
                hintTone={durationInvalid ? 'error' : 'muted'}
              >
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className={`w-full rounded-md border px-3 py-2.5 text-sm ${
                    durationInvalid ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
              </LabeledField>
            </div>
          </Section>

          <Section
            title="Pricing"
            description="Link a Stripe product + CHF base lookup key. Validate to confirm all three currencies resolve."
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
                hint="Runtime appends _eur / _gbp. Example: workshop_react-patterns"
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

          <Section title="Capacity & status" description="Seats and publication state.">
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledField label="Capacity">
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

          <Section
            title="Registrants"
            description="Purchasers for this workshop."
            collapsed={expandedPanel !== 'registrants'}
            onToggle={() =>
              setExpandedPanel(expandedPanel === 'registrants' ? null : 'registrants')
            }
          >
            {expandedPanel === 'registrants' && (
              <RegistrantsPanel workshopId={offering.id} onClose={() => setExpandedPanel(null)} />
            )}
          </Section>

          <Section
            title="Revenue"
            description="Confirmed-registration totals by currency."
            collapsed={expandedPanel !== 'revenue'}
            onToggle={() => setExpandedPanel(expandedPanel === 'revenue' ? null : 'revenue')}
          >
            {expandedPanel === 'revenue' && (
              <RevenuePanel workshopId={offering.id} onClose={() => setExpandedPanel(null)} />
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
        </div>

        <footer className="border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
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
                disabled={saveMutation.isPending || durationInvalid}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save draft
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


