/**
 * Desktop table for the networking directory.
 */

import { ExternalLink } from 'lucide-react';
import { KindBadge, LinkIcons, StatusPill, sourceDescription } from './shared';
import type { NetworkingDirectoryEntry } from './types';

export interface NetworkingDirectoryTableProps {
  entries: NetworkingDirectoryEntry[];
}

function formatUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function NetworkingDirectoryTable({ entries }: NetworkingDirectoryTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
          <tr>
            <th scope="col" className="px-4 py-3">Person / company</th>
            <th scope="col" className="px-4 py-3">Type</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Shared links</th>
            <th scope="col" className="px-4 py-3">Contact email</th>
            <th scope="col" className="px-4 py-3">Updated</th>
            <th scope="col" className="px-4 py-3">Share page</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry) => (
            <tr key={`${entry.source}-${entry.id}`} className={entry.enabled ? '' : 'bg-gray-50/60'}>
              <td className="px-4 py-3 align-top">
                <p className="font-semibold text-gray-900">{entry.name || <span className="italic text-gray-500">Unnamed</span>}</p>
                <p className="mt-0.5 text-xs text-gray-500">{entry.headline ?? sourceDescription(entry)}</p>
              </td>
              <td className="px-4 py-3 align-top">
                <KindBadge kind={entry.kind} />
                <p className="mt-1 text-xs text-gray-500">{sourceDescription(entry)}</p>
              </td>
              <td className="px-4 py-3 align-top"><StatusPill enabled={entry.enabled} /></td>
              <td className="px-4 py-3 align-top"><LinkIcons entry={entry} /></td>
              <td className="px-4 py-3 align-top text-gray-700">
                {entry.contactEmail ? (
                  <a href={`mailto:${entry.contactEmail}`} className="hover:underline">{entry.contactEmail}</a>
                ) : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-4 py-3 align-top whitespace-nowrap text-gray-700">
                <time dateTime={entry.updatedAt}>{formatUpdated(entry.updatedAt)}</time>
              </td>
              <td className="px-4 py-3 align-top">
                <a
                  href={entry.shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-blue-700 hover:underline"
                >
                  Open <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
