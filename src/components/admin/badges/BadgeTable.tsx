import { ExternalLink, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { BadgeReviewRow } from '@/components/admin/badges/types';

interface BadgeTableProps {
  rows: BadgeReviewRow[];
  excludedIds: ReadonlySet<string>;
  busyId: string | null;
  temporarilyEditedIds: ReadonlySet<string>;
  onToggle: (selectionId: string) => void;
  onRotate: (row: BadgeReviewRow) => void;
  onEdit: (row: BadgeReviewRow) => void;
  onDelete: (row: BadgeReviewRow) => void;
}

export function BadgeTable({
  rows,
  excludedIds,
  busyId,
  temporarilyEditedIds,
  onToggle,
  onRotate,
  onEdit,
  onDelete,
}: BadgeTableProps) {
  if (rows.length === 0) {
    return <p className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600">No rows in this category.</p>;
  }

  const showsLogos = rows.some((row) => row.category === 'sponsor');

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
          <tr>
            <th className="px-4 py-3"><span className="sr-only">Include</span></th>
            <th className="px-4 py-3">Person</th>
            <th className="px-4 py-3">Role / company</th>
            <th className="px-4 py-3">Share page</th>
            <th className="px-4 py-3">Badge QR</th>
            {showsLogos ? <th className="px-4 py-3">Default logo</th> : null}
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const included = !excludedIds.has(row.selectionId);
            const busy = busyId === row.selectionId;
            return (
              <tr key={row.selectionId} className={included ? '' : 'bg-gray-50 opacity-60'}>
                <td className="px-4 py-4 align-top">
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => onToggle(row.selectionId)}
                    aria-label={`Include ${row.firstName} ${row.lastName} in export`}
                    className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                  />
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="font-semibold text-gray-900">{`${row.firstName} ${row.lastName}`.trim()}</p>
                  <p className={`mt-1 text-xs ${temporarilyEditedIds.has(row.selectionId) ? 'font-semibold text-blue-700' : 'text-gray-500'}`}>
                    {temporarilyEditedIds.has(row.selectionId)
                      ? 'Temporary export edit'
                      : row.source === 'manual' ? 'Stored manual row' : 'Database record'}
                  </p>
                </td>
                <td className="px-4 py-4 align-top text-gray-700">
                  <p>{row.role || '—'}</p>
                  <p className="mt-1 text-xs text-gray-500">{row.company || '—'}</p>
                </td>
                <td className="px-4 py-4 align-top">
                  {row.shareUrl ? (
                    <a className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline" href={row.shareUrl} target="_blank" rel="noopener noreferrer">
                      Open <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : <span className="font-medium text-amber-700">Share ID missing</span>}
                  <p className={`mt-1 text-xs ${row.networkingEnabled ? 'text-green-700' : 'text-gray-500'}`}>
                    {row.networkingEnabled ? 'Public' : 'Not public yet'}
                  </p>
                </td>
                <td className="px-4 py-4 align-top">
                  {row.qrUrl ? (
                    <a className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline" href={row.qrUrl} target="_blank" rel="noopener noreferrer">
                      Test redirect <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : <span className="font-medium text-amber-700">Not generated</span>}
                  {row.badgeCode ? <p className="mt-1 font-mono text-[11px] text-gray-500">{row.badgeCode}</p> : null}
                </td>
                {showsLogos ? (
                  <td className="px-4 py-4 align-top">
                    {row.logoUrl ? (
                      <div className="inline-flex rounded-lg bg-black p-2">
                        <img src={row.logoUrl} alt={`${row.company} logo`} className="h-6 max-w-36 object-contain" />
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-amber-700">Edit this row to upload a logo</p>
                    )}
                  </td>
                ) : null}
                <td className="px-4 py-4 align-top">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onRotate(row)}
                      disabled={busy || !row.badgeCode}
                      title="Replace badge QR"
                      className="rounded-lg border border-amber-300 p-2 text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcw className={`size-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
                      <span className="sr-only">Replace QR for {row.firstName} {row.lastName}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      disabled={busy}
                      title={row.source === 'manual' ? 'Edit stored manual row' : 'Edit for this export only'}
                      className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      <span className="sr-only">Edit {row.firstName} {row.lastName}</span>
                    </button>
                    {row.source === 'manual' ? (
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        disabled={busy}
                        title="Delete manual row"
                        className="rounded-lg border border-red-300 p-2 text-red-700 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="sr-only">Delete {row.firstName} {row.lastName}</span>
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
