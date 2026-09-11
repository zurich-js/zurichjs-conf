/**
 * Mobile card list for the networking directory.
 */

import { ExternalLink } from 'lucide-react';
import { KindBadge, LinkIcons, StatusPill, sourceDescription } from './shared';
import type { NetworkingDirectoryEntry } from './types';

export interface NetworkingDirectoryCardListProps {
  entries: NetworkingDirectoryEntry[];
}

export function NetworkingDirectoryCardList({ entries }: NetworkingDirectoryCardListProps) {
  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={`${entry.source}-${entry.id}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">{entry.name || 'Unnamed'}</p>
              <p className="mt-0.5 text-xs text-gray-500">{entry.headline ?? sourceDescription(entry)}</p>
            </div>
            <StatusPill enabled={entry.enabled} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <KindBadge kind={entry.kind} />
            <span className="text-xs text-gray-500">{sourceDescription(entry)}</span>
          </div>
          <div className="mt-3"><LinkIcons entry={entry} /></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            {entry.contactEmail ? (
              <a href={`mailto:${entry.contactEmail}`} className="truncate text-gray-700 hover:underline">{entry.contactEmail}</a>
            ) : <span className="text-gray-400">No contact email</span>}
            <a
              href={entry.shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
            >
              Share page <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
