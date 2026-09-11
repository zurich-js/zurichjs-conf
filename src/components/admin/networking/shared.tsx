/**
 * Small presentational pieces shared by the networking directory table and
 * card list: source/kind badges, the public/private pill, and link icons.
 */

import { AtSign, Github, Globe, Linkedin, Mail, Phone, type LucideIcon } from 'lucide-react';
import type { NetworkingLinkKind, NetworkingProfileKind } from '@/lib/types/networking';
import type { NetworkingDirectoryEntry, NetworkingDirectorySource } from './types';

export const SOURCE_LABELS: Record<NetworkingDirectorySource, string> = {
  attendee: 'Attendees',
  sponsor: 'Sponsors',
  manual: 'Manual badges',
};

const KIND_LABELS: Record<NetworkingProfileKind, string> = {
  attendee: 'Attendee',
  vip: 'VIP',
  speaker: 'Speaker',
  sponsor: 'Sponsor',
  organizer: 'Organizer',
};

const KIND_CLASSES: Record<NetworkingProfileKind, string> = {
  attendee: 'bg-gray-100 text-gray-700',
  vip: 'bg-amber-100 text-amber-800',
  speaker: 'bg-blue-100 text-blue-800',
  sponsor: 'bg-purple-100 text-purple-800',
  organizer: 'bg-emerald-100 text-emerald-800',
};

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

export function KindBadge({ kind }: { kind: NetworkingProfileKind }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${KIND_CLASSES[kind]}`}>
      {KIND_LABELS[kind]}
    </span>
  );
}

export function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      <span className={`size-1.5 rounded-full ${enabled ? 'bg-green-600' : 'bg-gray-400'}`} aria-hidden="true" />
      {enabled ? 'Public' : 'Off'}
    </span>
  );
}

export function LinkIcons({ entry }: { entry: NetworkingDirectoryEntry }) {
  if (entry.links.length === 0) {
    return <span className="text-xs text-gray-400">No links</span>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={`Links shared by ${entry.name}`}>
      {entry.links.map((link) => {
        const Icon = LINK_ICONS[link.kind];
        return (
          <li key={`${link.kind}-${link.href}`}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`${link.label}: ${link.href}`}
              className="inline-flex size-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{link.label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function sourceDescription(entry: NetworkingDirectoryEntry): string {
  if (entry.source === 'attendee') return 'Ticket holder';
  if (entry.source === 'sponsor') return 'Sponsor record';
  return 'Manual badge row';
}
