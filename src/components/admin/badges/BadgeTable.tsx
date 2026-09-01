import { ExternalLink, ImageUp, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { BadgeReviewRow } from '@/components/admin/badges/types';

interface BadgeTableProps {
  rows: BadgeReviewRow[];
  excludedIds: ReadonlySet<string>;
  busyId: string | null;
  onToggle: (selectionId: string) => void;
  onRotate: (row: BadgeReviewRow) => void;
  onEdit: (row: BadgeReviewRow) => void;
  onDelete: (row: BadgeReviewRow) => void;
  logoOverrideNames: ReadonlyMap<string, string>;
  onLogoOverride: (row: BadgeReviewRow, file: File | null) => void;
}

export function BadgeTable({
  rows,
  excludedIds,
  busyId,
  onToggle,
  onRotate,
  onEdit,
  onDelete,
  logoOverrideNames,
  onLogoOverride,
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
            {showsLogos ? <th className="px-4 py-3">Logo for this export</th> : null}
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
                  <p className="mt-1 text-xs text-gray-500">{row.source === 'manual' ? 'Manual row' : 'Database record'}</p>
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
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      <ImageUp className="size-4" aria-hidden="true" />
                      {logoOverrideNames.has(row.selectionId) ? 'Replace PNG' : 'Attach PNG'}
                      <input
                        type="file"
                        accept="image/png,.png"
                        className="sr-only"
                        onChange={(event) => onLogoOverride(row, event.target.files?.[0] ?? null)}
                      />
                    </label>
                    {logoOverrideNames.has(row.selectionId) ? (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="max-w-40 truncate text-green-700">{logoOverrideNames.get(row.selectionId)}</span>
                        <button type="button" onClick={() => onLogoOverride(row, null)} className="font-semibold text-red-700 hover:underline">Remove</button>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">{row.logoUrl ? 'Using stored color logo' : 'No stored logo'}</p>
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
                    {row.source === 'manual' ? (
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        disabled={busy}
                        title="Edit manual row"
                        className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        <span className="sr-only">Edit {row.firstName} {row.lastName}</span>
                      </button>
                    ) : null}
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
