/**
 * CSV export for the networking directory (client-side).
 */

import type { NetworkingDirectoryEntry } from './types';

function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function networkingDirectoryToCsv(entries: NetworkingDirectoryEntry[]): string {
  const header = ['Name', 'Headline', 'Type', 'Source', 'Public', 'Contact email', 'Links', 'Share page', 'Updated'];
  const rows = entries.map((entry) => [
    entry.name,
    entry.headline ?? '',
    entry.kind,
    entry.source,
    entry.enabled ? 'yes' : 'no',
    entry.contactEmail ?? '',
    entry.links.map((link) => `${link.label}: ${link.href}`).join(' | '),
    entry.shareUrl,
    entry.updatedAt,
  ]);
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
