import { useState, type FormEvent } from 'react';
import { AdminModal } from '@/components/admin/AdminModal';
import type { BadgeReviewRow } from '@/components/admin/badges/types';
import type { BadgeCategory } from '@/lib/badges/export';
import { LOGO_UPLOAD_ACCEPT } from '@/lib/constants/logo-upload';

interface ManualBadgeModalProps {
  category: BadgeCategory;
  entry?: BadgeReviewRow;
  onClose: () => void;
  onSaved: (warning?: string) => void;
}

interface ManualFormState {
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  logoUrl: string;
  networkingEnabled: boolean;
  linkedinUrl: string;
  githubUrl: string;
  xHandle: string;
  blueskyHandle: string;
  mastodonHandle: string;
  websiteUrl: string;
}

const EMPTY_FORM: ManualFormState = {
  firstName: '',
  lastName: '',
  role: '',
  company: '',
  logoUrl: '',
  networkingEnabled: false,
  linkedinUrl: '',
  githubUrl: '',
  xHandle: '',
  blueskyHandle: '',
  mastodonHandle: '',
  websiteUrl: '',
};

const INPUT_CLASS = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30';

function initialForm(entry: BadgeReviewRow | undefined): ManualFormState {
  if (!entry) return EMPTY_FORM;
  return {
    firstName: entry.firstName,
    lastName: entry.lastName,
    role: entry.role,
    company: entry.company,
    logoUrl: entry.logoUrl ?? '',
    networkingEnabled: entry.networkingEnabled,
    linkedinUrl: entry.networkingProfile?.linkedinUrl ?? '',
    githubUrl: entry.networkingProfile?.githubUrl ?? '',
    xHandle: entry.networkingProfile?.xHandle ?? '',
    blueskyHandle: entry.networkingProfile?.blueskyHandle ?? '',
    mastodonHandle: entry.networkingProfile?.mastodonHandle ?? '',
    websiteUrl: entry.networkingProfile?.websiteUrl ?? '',
  };
}

export function ManualBadgeModal({ category, entry, onClose, onSaved }: ManualBadgeModalProps) {
  const [form, setForm] = useState<ManualFormState>(() => initialForm(entry));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const update = <K extends keyof ManualFormState>(key: K, value: ManualFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (category === 'sponsor' && !form.company.trim()) {
      setError('Enter the sponsor company shown on this badge.');
      return;
    }
    if (category === 'sponsor' && !logoFile && !form.logoUrl) {
      setError('Upload the default/white sponsor logo used on the black badge background.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(entry ? `/api/admin/badges/${encodeURIComponent(entry.id)}` : '/api/admin/badges', {
        method: entry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          company: form.company,
          logoUrl: form.logoUrl,
          networkingEnabled: form.networkingEnabled,
          networkingProfile: {
            linkedinUrl: form.linkedinUrl,
            githubUrl: form.githubUrl,
            xHandle: form.xHandle,
            blueskyHandle: form.blueskyHandle,
            mastodonHandle: form.mastodonHandle,
            websiteUrl: form.websiteUrl,
          },
        }),
      });
      const body = await response.json().catch(() => ({ error: 'Could not add badge row' })) as {
        id?: string;
        error?: string;
      };
      if (!response.ok || !body.id) {
        throw new Error(body.error ?? 'Could not add badge row');
      }

      let logoWarning: string | undefined;
      if (category === 'sponsor' && logoFile) {
        const logoForm = new FormData();
        logoForm.append('file', logoFile);
        const logoResponse = await fetch(
          `/api/admin/badges/${encodeURIComponent(body.id)}/logo`,
          { method: 'POST', body: logoForm }
        );
        const logoBody = await logoResponse.json().catch(() => ({
          error: 'Could not upload sponsor logo',
        })) as { error?: string; warning?: string | null };
        if (!logoResponse.ok) {
          if (!entry) {
            await fetch(`/api/admin/badges/${encodeURIComponent(body.id)}`, { method: 'DELETE' });
          }
          throw new Error(logoBody.error ?? 'Could not upload sponsor logo');
        }
        logoWarning = logoBody.warning ?? undefined;
      }
      onSaved(logoWarning);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not add badge row');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      title={`${entry ? 'Edit' : 'Add'} ${category} badge`}
      subtitle={entry ? 'Updates the badge and public share-page details without rotating its QR.' : 'Creates a persistent supplemental row with its own stable share ID and managed QR code.'}
      onClose={onClose}
      size="2xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" required value={form.firstName} onChange={(value) => update('firstName', value)} />
          <TextField label="Last name" value={form.lastName} onChange={(value) => update('lastName', value)} />
          <TextField label="Role" value={form.role} onChange={(value) => update('role', value)} />
          <TextField
            label="Company"
            required={category === 'sponsor'}
            value={form.company}
            onChange={(value) => update('company', value)}
          />
          {category === 'sponsor' ? (
            <div className="sm:col-span-2 rounded-xl border border-gray-200 p-4">
              <label className="block text-sm font-semibold text-gray-900">
                Default / white sponsor logo
                <input
                  type="file"
                  accept={LOGO_UPLOAD_ACCEPT}
                  onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:font-semibold file:text-gray-800 hover:file:bg-gray-200"
                />
              </label>
              <p className="mt-2 text-xs text-gray-500">
                Use the default light/white logo intended for a black background. PNG, JPEG, WebP, or SVG; at least 500px wide is recommended for raster files.
              </p>
              {logoFile ? <p className="mt-2 text-xs font-medium text-green-700">Selected: {logoFile.name}</p> : null}
              {form.logoUrl && !logoFile ? (
                <div className="mt-3 inline-flex rounded-lg bg-black p-3">
                  <img src={form.logoUrl} alt="Current sponsor logo" className="h-8 max-w-48 object-contain" />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <fieldset className="rounded-xl border border-gray-200 p-4">
          <legend className="px-2 text-sm font-semibold text-gray-900">Optional public share page</legend>
          <label className="mb-4 flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.networkingEnabled}
              onChange={(event) => update('networkingEnabled', event.target.checked)}
              className="mt-1 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
            />
            Enable the share page now. At least one link below is required when enabled.
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="LinkedIn" value={form.linkedinUrl} onChange={(value) => update('linkedinUrl', value)} />
            <TextField label="GitHub" value={form.githubUrl} onChange={(value) => update('githubUrl', value)} />
            <TextField label="Website" value={form.websiteUrl} onChange={(value) => update('websiteUrl', value)} />
            <TextField label="X handle" value={form.xHandle} onChange={(value) => update('xHandle', value)} />
            <TextField label="Bluesky handle" value={form.blueskyHandle} onChange={(value) => update('blueskyHandle', value)} />
            <TextField label="Mastodon handle" value={form.mastodonHandle} onChange={(value) => update('mastodonHandle', value)} />
          </div>
        </fieldset>

        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-50"
          >
            {saving ? 'Saving…' : entry ? 'Save changes' : 'Add badge row'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

function TextField({ label, value, onChange, required = false }: TextFieldProps) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        type="text"
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      />
    </label>
  );
}
