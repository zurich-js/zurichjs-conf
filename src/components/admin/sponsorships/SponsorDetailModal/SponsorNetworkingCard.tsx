import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ExternalLink, Network, Save } from 'lucide-react';
import type {
  NetworkingSettings,
  SponsorNetworkingProfile,
} from '@/lib/types/networking';

interface SponsorNetworkingCardProps {
  sponsorId: string;
}

type PreferredMethod = NonNullable<SponsorNetworkingProfile['preferredMethod']>;

const EMPTY_PROFILE: SponsorNetworkingProfile = {
  contactName: null,
  email: null,
  phone: null,
  websiteUrl: null,
  linkedinUrl: null,
  preferredMethod: null,
};

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-brand-primary';

function clean(value: string | null): string | null {
  return value?.trim() || null;
}

function errorMessage(value: unknown, fallback: string): string {
  if (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  ) {
    return value.error;
  }
  return fallback;
}

export function SponsorNetworkingCard({ sponsorId }: SponsorNetworkingCardProps) {
  const [enabled, setEnabled] = useState(false);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [profile, setProfile] = useState<SponsorNetworkingProfile>(EMPTY_PROFILE);
  const [shareId, setShareId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings(): Promise<void> {
      setIsLoading(true);
      setFeedback(null);
      try {
        const response = await fetch(`/api/admin/sponsorships/${sponsorId}/networking`, {
          signal: controller.signal,
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error(errorMessage(body, 'Failed to load networking settings'));
        }

        const settings = body as NetworkingSettings<SponsorNetworkingProfile>;
        setEnabled(settings.enabled);
        setSavedEnabled(settings.enabled);
        setProfile(settings.profile);
        setShareId(settings.shareId);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Failed to load networking settings',
        });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadSettings();
    return () => controller.abort();
  }, [sponsorId]);

  const updateProfile = <K extends keyof SponsorNetworkingProfile>(
    field: K,
    value: SponsorNetworkingProfile[K]
  ) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/sponsorships/${sponsorId}/networking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          profile: {
            contactName: clean(profile.contactName),
            email: clean(profile.email),
            phone: clean(profile.phone),
            websiteUrl: clean(profile.websiteUrl),
            linkedinUrl: clean(profile.linkedinUrl),
            preferredMethod: profile.preferredMethod,
          },
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(errorMessage(body, 'Failed to save networking settings'));
      }

      const settings = body as NetworkingSettings<SponsorNetworkingProfile>;
      setEnabled(settings.enabled);
      setSavedEnabled(settings.enabled);
      setProfile(settings.profile);
      setShareId(settings.shareId);
      setFeedback({ tone: 'success', text: 'Networking settings saved.' });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Failed to save networking settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sharePath = savedEnabled && shareId ? `/share/sponsor-${shareId}` : null;

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <Network className="h-4 w-4" aria-hidden="true" />
            Networking
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Only the contact details entered here appear on the public share page.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={enabled}
            disabled={isLoading || isSaving}
            onChange={(event) => {
              setEnabled(event.target.checked);
              setFeedback(null);
            }}
            className="size-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          Public profile enabled
        </label>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading networking settings…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Public contact name
              <input
                type="text"
                data-mask
                value={profile.contactName ?? ''}
                onChange={(event) => updateProfile('contactName', event.target.value)}
                className={`${INPUT_CLASS} mt-1`}
                placeholder="Partnerships team"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Email
              <input
                type="email"
                data-mask
                value={profile.email ?? ''}
                onChange={(event) => updateProfile('email', event.target.value)}
                className={`${INPUT_CLASS} mt-1`}
                placeholder="partnerships@example.com"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Phone
              <input
                type="tel"
                data-mask
                value={profile.phone ?? ''}
                onChange={(event) => updateProfile('phone', event.target.value)}
                className={`${INPUT_CLASS} mt-1`}
                placeholder="+41 44 123 45 67"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Website
              <input
                type="text"
                data-mask
                inputMode="url"
                value={profile.websiteUrl ?? ''}
                onChange={(event) => updateProfile('websiteUrl', event.target.value)}
                className={`${INPUT_CLASS} mt-1`}
                placeholder="example.com"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              LinkedIn
              <input
                type="text"
                data-mask
                inputMode="url"
                value={profile.linkedinUrl ?? ''}
                onChange={(event) => updateProfile('linkedinUrl', event.target.value)}
                className={`${INPUT_CLASS} mt-1`}
                placeholder="linkedin.com/company/example"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Preferred contact method
              <select
                value={profile.preferredMethod ?? ''}
                onChange={(event) =>
                  updateProfile(
                    'preferredMethod',
                    (event.target.value || null) as PreferredMethod | null
                  )
                }
                className={`${INPUT_CLASS} mt-1`}
              >
                <option value="">No preference</option>
                <option value="email" disabled={!profile.email}>Email</option>
                <option value="phone" disabled={!profile.phone}>Phone</option>
                <option value="website" disabled={!profile.websiteUrl}>Website</option>
                <option value="linkedin" disabled={!profile.linkedinUrl}>LinkedIn</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-brand-primary/80 disabled:opacity-50"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? 'Saving…' : 'Save networking'}
            </button>
            {feedback ? (
              <p
                className={`text-sm ${feedback.tone === 'error' ? 'text-red-600' : 'text-green-700'}`}
                role={feedback.tone === 'error' ? 'alert' : 'status'}
              >
                {feedback.text}
              </p>
            ) : null}
          </div>
        </>
      )}

      {sharePath ? (
        <div className="flex flex-col gap-4 border-t border-gray-200 pt-4 sm:flex-row sm:items-center">
          <Image
            src={`/api/share/qr/sponsor-${shareId}`}
            alt="QR code for the sponsor networking page"
            width={144}
            height={144}
            unoptimized
            className="rounded-lg border border-gray-200 bg-white p-2"
          />
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Public share page</p>
            <a
              href={sharePath}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 break-all text-sm text-blue-700 hover:underline"
            >
              {sharePath}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
