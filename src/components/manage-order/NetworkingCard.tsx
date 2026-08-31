/**
 * Attendee networking settings shown in the manage-ticket flow.
 */

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { UseMutationResult } from '@tanstack/react-query';
import { Check, ExternalLink, QrCode, Users } from 'lucide-react';
import { Button, Input } from '@/components/atoms';
import type { AttendeeNetworkingProfile, NetworkingSettings } from '@/lib/types/networking';
import type { NetworkingPreferencesData } from './types';

const EMPTY_PROFILE: AttendeeNetworkingProfile = {
  linkedinUrl: null,
  githubUrl: null,
  xHandle: null,
  blueskyHandle: null,
  mastodonHandle: null,
  websiteUrl: null,
};

interface NetworkingField {
  key: keyof AttendeeNetworkingProfile;
  label: string;
  placeholder: string;
  type?: 'text' | 'url';
}

const NETWORKING_FIELDS: NetworkingField[] = [
  { key: 'linkedinUrl', label: 'LinkedIn', placeholder: 'linkedin.com/in/your-name', type: 'url' },
  { key: 'githubUrl', label: 'GitHub', placeholder: 'github.com/your-handle', type: 'url' },
  { key: 'xHandle', label: 'X', placeholder: '@your-handle' },
  { key: 'blueskyHandle', label: 'Bluesky', placeholder: '@you.bsky.social' },
  { key: 'mastodonHandle', label: 'Mastodon', placeholder: '@you@mastodon.social' },
  { key: 'websiteUrl', label: 'Website', placeholder: 'your-site.com', type: 'url' },
];

export interface NetworkingCardProps {
  settings?: NetworkingSettings<AttendeeNetworkingProfile> | null;
  mutation: UseMutationResult<
    NetworkingSettings<AttendeeNetworkingProfile>,
    Error,
    NetworkingPreferencesData
  >;
}

export function NetworkingCard({ settings, mutation }: NetworkingCardProps) {
  const [enabled, setEnabled] = React.useState(settings?.enabled ?? false);
  const [profile, setProfile] = React.useState<AttendeeNetworkingProfile>(settings?.profile ?? EMPTY_PROFILE);

  React.useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setProfile(settings.profile);
  }, [settings]);

  const persistedSettings = mutation.data ?? settings;
  const shareId = persistedSettings?.shareId;
  const showShareTools = Boolean(enabled && persistedSettings?.enabled && shareId);
  const hasLink = Object.values(profile).some((value) => Boolean(value?.trim()));

  const updateField = (key: keyof AttendeeNetworkingProfile, value: string) => {
    mutation.reset();
    setProfile((current) => ({ ...current, [key]: value || null }));
  };

  const updateEnabled = (nextEnabled: boolean) => {
    mutation.reset();
    setEnabled(nextEnabled);
  };

  const handleSave = () => {
    mutation.mutate({ enabled, profile });
  };

  const sharePath = shareId ? `/share/attendee-${shareId}` : null;
  const qrPath = shareId ? `/api/share/qr/attendee-${shareId}` : null;

  return (
    <section className="rounded-2xl border border-brand-gray-light bg-brand-gray-lightest p-8 mb-8" aria-labelledby="networking-heading">
      <div className="flex items-center gap-3 mb-2">
        <Users className="w-6 h-6 text-brand-blue" aria-hidden="true" />
        <h2 id="networking-heading" className="text-xl font-bold text-brand-black">
          Networking
        </h2>
      </div>
      <p className="text-brand-gray-darkest mb-6">
        Choose the links people can open after scanning your networking QR. Your ticket email is never shared.
      </p>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-gray-medium p-4 mb-6">
        <div>
          <p className="font-semibold text-brand-black">Publish my networking page</p>
          <p className="text-sm text-brand-gray-darkest">Turn this off any time to hide the page.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Publish my networking page"
          aria-checked={enabled}
          disabled={mutation.isPending}
          onClick={() => updateEnabled(!enabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-brand-gray-lightest disabled:cursor-not-allowed disabled:opacity-50 ${
            enabled ? 'bg-brand-blue' : 'bg-brand-gray-medium'
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-6 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {NETWORKING_FIELDS.map((field) => (
          <label key={field.key} htmlFor={`networking-${field.key}`} className="block text-sm font-medium text-brand-black">
            <span className="mb-2 block">{field.label}</span>
            <Input
              id={`networking-${field.key}`}
              data-mask
              type={field.type ?? 'text'}
              inputMode={field.type === 'url' ? 'url' : 'text'}
              autoComplete={field.type === 'url' ? 'url' : 'off'}
              value={profile[field.key] ?? ''}
              onChange={(event) => updateField(field.key, event.target.value)}
              placeholder={field.placeholder}
              disabled={mutation.isPending}
              fullWidth
            />
          </label>
        ))}
      </div>

      {enabled && !hasLink && (
        <p className="mt-4 text-sm text-amber-800" role="alert">
          Add at least one link before publishing your page.
        </p>
      )}

      {mutation.error && (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {mutation.error.message}
        </p>
      )}

      {mutation.isSuccess && (
        <p className="mt-4 flex items-center gap-2 text-sm text-green-700" role="status">
          <Check className="w-4 h-4" aria-hidden="true" />
          Your networking settings have been saved.
        </p>
      )}

      <Button
        type="button"
        variant="primary"
        className="mt-6 w-full"
        onClick={handleSave}
        loading={mutation.isPending}
        disabled={enabled && !hasLink}
      >
        {mutation.isPending ? 'Saving...' : 'Save Networking Settings'}
      </Button>

      {showShareTools && sharePath && qrPath && (
        <div className="mt-8 border-t border-brand-gray-medium pt-8">
          <div className="flex items-center gap-2 mb-2">
            <QrCode className="w-5 h-5 text-brand-blue" aria-hidden="true" />
            <h3 className="font-semibold text-brand-black">Your Networking QR</h3>
          </div>
          <p className="text-sm text-brand-gray-darkest mb-5">
            This opens your public contact page. It is separate from the entry-pass QR above.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="rounded-xl bg-white p-4">
              <Image
                src={qrPath}
                alt="Networking profile QR code"
                width={220}
                height={220}
                className="size-48"
                unoptimized
              />
            </div>
            <Link
              href={sharePath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-brand-black px-5 py-2.5 text-sm font-semibold text-brand-black transition-colors hover:bg-brand-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            >
              Preview share page
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
