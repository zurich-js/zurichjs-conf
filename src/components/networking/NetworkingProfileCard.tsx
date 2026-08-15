import { useState } from 'react';
import Image from 'next/image';
import {
  AtSign,
  ExternalLink,
  Github,
  Globe,
  Linkedin,
  Mail,
  Phone,
  QrCode,
  Share2,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, Heading } from '@/components/atoms';
import { addNetworkingUtm, shareNetworkingProfile } from '@/lib/networking/share';
import type {
  NetworkingLinkKind,
  PublicNetworkingProfile,
} from '@/lib/types/networking';

export interface NetworkingProfileCardProps {
  profile: PublicNetworkingProfile;
  headingLevel?: 'h1' | 'h2';
  showOpen?: boolean;
  showQr?: boolean;
  onRemove?: () => void;
  onSave?: () => void | Promise<void>;
}

const LINK_ICONS: Record<NetworkingLinkKind, LucideIcon> = {
  linkedin: Linkedin,
  github: Github,
  x: AtSign,
  bluesky: AtSign,
  mastodon: AtSign,
  website: Globe,
  email: Mail,
  phone: Phone,
};

function absoluteProfileUrl(profile: PublicNetworkingProfile): string {
  if (typeof window === 'undefined') return profile.path;
  return new URL(profile.path, window.location.origin).toString();
}

export function NetworkingProfileCard({
  profile,
  headingLevel = 'h2',
  showOpen = false,
  showQr = false,
  onRemove,
  onSave,
}: NetworkingProfileCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const titleId = `networking-profile-${profile.publicId}`;
  const initials = profile.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await onSave();
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not save this contact.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    setFeedback(null);
    const outcome = await shareNetworkingProfile(profile, absoluteProfileUrl(profile));
    if (outcome === 'copied') {
      setFeedback({ tone: 'success', text: 'Contact details copied to your clipboard.' });
    } else if (outcome === 'failed') {
      setFeedback({ tone: 'error', text: 'Sharing is unavailable on this device.' });
    }
  };

  return (
    <article
      aria-labelledby={titleId}
      className="overflow-hidden rounded-3xl border border-brand-gray-light bg-brand-white shadow-lg"
    >
      <div className="bg-brand-gray-lightest p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {profile.imageUrl ? (
            <Image
              src={profile.imageUrl}
              alt={profile.name}
              width={96}
              height={96}
              unoptimized
              className={
                profile.kind === 'sponsor'
                  ? 'size-24 rounded-xl bg-white object-contain p-2'
                  : 'size-24 rounded-full bg-brand-gray-light object-cover'
              }
            />
          ) : (
            <div
              className={`flex size-24 shrink-0 items-center justify-center bg-brand-black text-2xl font-bold text-brand-white ${
                profile.kind === 'sponsor' ? 'rounded-xl' : 'rounded-full'
              }`}
              aria-hidden="true"
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-gray-darkest">
              {profile.kind}
            </p>
            <Heading level={headingLevel} variant="light" id={titleId} className="text-xl xs:text-2xl xl:text-3xl">
              {profile.name}
            </Heading>
            {profile.headline ? (
              <p className="mt-2 text-base text-brand-gray-darkest">{profile.headline}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        {profile.links.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2" aria-label={`${profile.name}'s contact links`}>
            {profile.links.map((link) => {
              const Icon = LINK_ICONS[link.kind];
              const href = addNetworkingUtm(link.href, profile.publicId);
              const isHttp = /^https?:\/\//i.test(href);
              return (
                <li key={`${link.kind}-${link.href}`}>
                  <a
                    href={href}
                    target={isHttp ? '_blank' : undefined}
                    rel={isHttp ? 'noopener noreferrer' : undefined}
                    className="flex min-h-12 items-center gap-3 rounded-xl border border-brand-gray-light px-4 py-3 font-medium text-brand-black transition-colors hover:border-brand-blue hover:text-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/30"
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{link.label}</span>
                    {isHttp ? <ExternalLink className="size-4 shrink-0" aria-hidden="true" /> : null}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-brand-gray-darkest">No public contact links are available.</p>
        )}

        <div className="flex flex-wrap gap-3">
          {onSave ? (
            <Button type="button" onClick={handleSave} loading={isSaving}>
              Save contact
            </Button>
          ) : null}
          {showOpen ? (
            <Button variant="black" asChild href={profile.path}>
              Open page
            </Button>
          ) : null}
          <Button type="button" variant="black" onClick={handleShare}>
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </Button>
          {onRemove ? (
            <Button type="button" variant="ghost" forceDark onClick={onRemove}>
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>

        <p
          className={`text-sm ${feedback?.tone === 'error' ? 'text-red-700' : 'text-green-700'}`}
          role="status"
          aria-live={feedback?.tone === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          {feedback?.text ?? ''}
        </p>

        {showQr ? (
          <div className="flex flex-col gap-4 border-t border-brand-gray-light pt-6 sm:flex-row sm:items-center">
            <Image
              src={`/api/share/qr/${encodeURIComponent(profile.publicId)}`}
              alt={`QR code for ${profile.name}'s networking page`}
              width={144}
              height={144}
              unoptimized
              className="rounded-xl border border-brand-gray-light bg-white p-2"
            />
            <div>
              <p className="flex items-center gap-2 font-bold text-brand-black">
                <QrCode className="size-5" aria-hidden="true" />
                Share in person
              </p>
              <p className="mt-1 max-w-sm text-sm text-brand-gray-darkest">
                Let someone scan this QR code to open the same contact page.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
