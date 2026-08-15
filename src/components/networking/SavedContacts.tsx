import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Heading } from '@/components/atoms';
import {
  clearSavedNetworkingProfiles,
  deleteSavedNetworkingProfile,
  loadSavedNetworkingProfiles,
} from '@/lib/networking/storage';
import type { SavedNetworkingProfile } from '@/lib/types/networking';
import { NetworkingProfileCard } from './NetworkingProfileCard';

export function SavedContacts() {
  const [isMounted, setIsMounted] = useState(false);
  const [profiles, setProfiles] = useState<SavedNetworkingProfile[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setProfiles(loadSavedNetworkingProfiles());
    setIsMounted(true);
  }, []);

  const handleRemove = (profile: SavedNetworkingProfile) => {
    const next = deleteSavedNetworkingProfile(profile.publicId);
    if (!next) {
      setFeedback(`${profile.name} could not be removed from this device.`);
      return;
    }
    setProfiles(next);
    setFeedback(`${profile.name} was removed.`);
  };

  const handleClear = () => {
    if (!window.confirm('Remove all saved contacts from this device?')) return;
    if (!clearSavedNetworkingProfiles()) {
      setFeedback('Saved contacts could not be cleared on this device.');
      return;
    }
    setProfiles([]);
    setFeedback('All saved contacts were removed.');
  };

  if (!isMounted) {
    return (
      <div className="rounded-3xl border border-brand-gray-light bg-brand-gray-lightest p-8 text-center" aria-busy="true">
        <p className="text-brand-gray-darkest">Loading saved contacts…</p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-3xl border border-brand-gray-light bg-brand-gray-lightest p-8 text-center">
        <Heading level="h2" variant="light" className="text-2xl">
          No saved contacts yet
        </Heading>
        <p className="mx-auto mt-3 max-w-lg text-brand-gray-darkest">
          Scan someone&apos;s ZurichJS networking QR code and choose Save contact to keep their
          public links on this device.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-brand-yellow-main px-6 py-3 font-bold text-brand-black transition-colors hover:bg-brand-yellow-secondary focus:outline-none focus:ring-4 focus:ring-brand-blue"
        >
          Back to the conference
        </Link>
        <p className="mt-4 text-sm text-brand-gray-darkest" role="status" aria-live="polite">
          {feedback ?? ''}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-brand-gray-darkest">
          Saved only on this device. Open or forward any contact whenever you need it.
        </p>
        <Button type="button" variant="black" size="sm" onClick={handleClear}>
          Clear all
        </Button>
      </div>

      <p className="text-sm text-brand-gray-darkest" role="status" aria-live="polite">
        {feedback ?? ''}
      </p>

      <ul className="space-y-6">
        {profiles.map((profile) => (
          <li key={profile.publicId}>
            <NetworkingProfileCard
              profile={profile}
              headingLevel="h2"
              showOpen
              onRemove={() => handleRemove(profile)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
