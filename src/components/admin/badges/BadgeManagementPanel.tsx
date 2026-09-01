import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ChevronDown,
  Database,
  Files,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { BadgeExportEditModal } from '@/components/admin/badges/BadgeExportEditModal';
import { BadgeTable } from '@/components/admin/badges/BadgeTable';
import { ManualBadgeModal } from '@/components/admin/badges/ManualBadgeModal';
import type { BadgeReviewResponse, BadgeReviewRow } from '@/components/admin/badges/types';
import type { BadgeCategory } from '@/lib/badges/export';
import { createBrowserZip, type BrowserZipFile } from '@/lib/badges/browser-zip';
import type { BadgeEntryOverride } from '@/lib/badges/overrides';

const ENTRY_OVERRIDES_STORAGE_KEY = 'zurichjs-badge-export-entry-overrides-v1';

const CATEGORIES: Array<{ id: BadgeCategory; label: string }> = [
  { id: 'vip', label: 'VIP' },
  { id: 'attendee', label: 'Attendees' },
  { id: 'speaker', label: 'Speakers' },
  { id: 'sponsor', label: 'Sponsors' },
  { id: 'organizer', label: 'Organizers' },
];

type ExportMode = 'tab-pdfs' | 'tab-data' | 'all-pdfs' | 'all-data';

interface BadgeExportMenuProps {
  activeCategoryLabel: string;
  exporting: boolean;
  tabDisabled: boolean;
  allDisabled: boolean;
  onExport: (mode: ExportMode) => void;
}

function BadgeExportMenu({
  activeCategoryLabel,
  exporting,
  tabDisabled,
  allDisabled,
  onExport,
}: BadgeExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const choose = (mode: ExportMode) => {
    setOpen(false);
    onExport(mode);
  };
  const optionClass = 'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={exporting || allDisabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-medium text-black transition-all hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
        {exporting ? 'Exporting badges…' : 'Export badges…'}
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button type="button" role="menuitem" disabled={tabDisabled} onClick={() => choose('tab-pdfs')} className={optionClass}>
            <FileText className="size-4 text-gray-500" aria-hidden="true" />
            Export {activeCategoryLabel} PDFs
          </button>
          <button type="button" role="menuitem" disabled={tabDisabled} onClick={() => choose('tab-data')} className={optionClass}>
            <Database className="size-4 text-gray-500" aria-hidden="true" />
            Export {activeCategoryLabel} full data
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button type="button" role="menuitem" onClick={() => choose('all-pdfs')} className={optionClass}>
            <Files className="size-4 text-gray-500" aria-hidden="true" />
            Export all PDFs
          </button>
          <button type="button" role="menuitem" onClick={() => choose('all-data')} className={optionClass}>
            <Archive className="size-4 text-gray-500" aria-hidden="true" />
            Export all data
          </button>
        </div>
      ) : null}
    </div>
  );
}

async function fetchBadgeRows(): Promise<BadgeReviewResponse> {
  const response = await fetch('/api/admin/badges');
  if (!response.ok) throw new Error('Could not load badge rows');
  return response.json();
}

function responseFileName(value: string | null): string {
  return value?.match(/filename="([^"]+)"/i)?.[1] ?? 'zurichjs-badges.zip';
}

async function responseError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => ({ error: 'Badge export failed' })) as {
    error?: string;
  };
  return new Error(body.error ?? 'Badge export failed');
}

async function mapConcurrent<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  );
  return results;
}

function saveDownload(data: Blob, fileName: string): void {
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function badgeRowLabel(row: BadgeReviewRow): string {
  return `${row.firstName} ${row.lastName}`.trim() || `empty ${row.category} row`;
}

async function validatedZipResponse(response: Response): Promise<Blob> {
  if (!response.headers.get('Content-Type')?.includes('application/zip')) {
    throw new Error('Badge export returned an invalid ZIP response');
  }
  const archive = await response.blob();
  if (archive.size < 22) throw new Error('Badge export returned an incomplete ZIP archive');
  const signature = new DataView(await archive.slice(-22, -18).arrayBuffer()).getUint32(0, true);
  if (signature !== 0x06054b50) {
    throw new Error('Badge export was truncated before the download completed');
  }
  return archive;
}

function readStoredEntryOverrides(): Map<string, BadgeEntryOverride> {
  try {
    const stored = window.sessionStorage.getItem(ENTRY_OVERRIDES_STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map();
    const overrides = Object.entries(parsed).flatMap(([selectionId, value]) => {
      if (!/^(attendee|speaker):[^:]+$/.test(selectionId)) return [];
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
      const candidate = value as Record<string, unknown>;
      if (
        typeof candidate.firstName !== 'string' ||
        typeof candidate.lastName !== 'string' ||
        typeof candidate.role !== 'string' ||
        typeof candidate.company !== 'string'
      ) return [];
      if (
        candidate.firstName.trim().length < 1 || candidate.firstName.length > 120 ||
        candidate.lastName.length > 120 || candidate.role.length > 200 || candidate.company.length > 200
      ) return [];
      return [[selectionId, {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        role: candidate.role,
        company: candidate.company,
      }] as const];
    });
    return new Map(overrides);
  } catch {
    return new Map();
  }
}

function storeEntryOverrides(overrides: ReadonlyMap<string, BadgeEntryOverride>): void {
  try {
    window.sessionStorage.setItem(
      ENTRY_OVERRIDES_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(overrides))
    );
  } catch {
    // The in-memory edit still works when session storage is unavailable.
  }
}

export function BadgeManagementPanel() {
  const [activeCategory, setActiveCategory] = useState<BadgeCategory>('vip');
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [modalEntry, setModalEntry] = useState<BadgeReviewRow | null | undefined>(undefined);
  const [exportEditEntry, setExportEditEntry] = useState<BadgeReviewRow | undefined>();
  const [entryOverrides, setEntryOverrides] = useState<Map<string, BadgeEntryOverride>>(new Map());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success' | 'warning'; message: string } | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'badges'], queryFn: fetchBadgeRows });
  const rows = query.data?.rows ?? [];
  const displayRows = rows.map((row) => ({
    ...row,
    ...entryOverrides.get(row.selectionId),
  }));
  const visibleRows = displayRows.filter((row) => row.category === activeCategory);
  const tabIncludedIds = visibleRows
    .filter((row) => !excludedIds.has(row.selectionId))
    .map((row) => row.selectionId);
  const allIncludedIds = rows
    .filter((row) => !excludedIds.has(row.selectionId))
    .map((row) => row.selectionId);
  const activeCategoryLabel = CATEGORIES.find((category) => category.id === activeCategory)?.label
    ?? activeCategory;

  useEffect(() => {
    setEntryOverrides(readStoredEntryOverrides());
  }, []);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'badges'] });
  };

  const toggle = (selectionId: string) => {
    setExcludedIds((current) => {
      const next = new Set(current);
      if (next.has(selectionId)) next.delete(selectionId);
      else next.add(selectionId);
      return next;
    });
  };

  const provision = async () => {
    setProvisioning(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/badges/provision', { method: 'POST' });
      if (!response.ok) throw await responseError(response);
      await refresh();
      setFeedback({ tone: 'success', message: 'All missing share IDs and badge QR codes are now provisioned.' });
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Provisioning failed' });
    } finally {
      setProvisioning(false);
    }
  };

  const rotate = async (row: BadgeReviewRow) => {
    const name = badgeRowLabel(row);
    if (!window.confirm(`Replace the badge QR for ${name}? The existing printed QR will stop working immediately. Only continue if it has not been printed.`)) return;
    setBusyId(row.selectionId);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/badges/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectionId: row.selectionId, confirmNotPrinted: true }),
      });
      if (!response.ok) throw new Error('Could not replace the badge QR');
      await refresh();
      setFeedback({ tone: 'success', message: `Badge QR replaced for ${name}. The previous code is invalid.` });
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'QR replacement failed' });
    } finally {
      setBusyId(null);
    }
  };

  const deleteManual = async (row: BadgeReviewRow) => {
    const name = badgeRowLabel(row);
    if (!window.confirm(`Delete the manual badge row for ${name}? Its share page and badge QR will stop working.`)) return;
    setBusyId(row.selectionId);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/badges/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete the manual badge row');
      setExcludedIds((current) => {
        const next = new Set(current);
        next.delete(row.selectionId);
        return next;
      });
      await refresh();
      setFeedback({ tone: 'success', message: `Deleted the manual badge row for ${name}.` });
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Delete failed' });
    } finally {
      setBusyId(null);
    }
  };

  const editEntry = (row: BadgeReviewRow) => {
    const sourceRow = rows.find((candidate) => candidate.selectionId === row.selectionId) ?? row;
    if (sourceRow.source === 'manual') setModalEntry(sourceRow);
    else setExportEditEntry(sourceRow);
  };

  const saveEntryOverride = (selectionId: string, value: BadgeEntryOverride) => {
    setEntryOverrides((current) => {
      const next = new Map(current).set(selectionId, value);
      storeEntryOverrides(next);
      return next;
    });
    setExportEditEntry(undefined);
    setFeedback({
      tone: 'success',
      message: 'Temporary badge edit saved for exports in this browser tab. The database was not changed.',
    });
  };

  const resetEntryOverride = (selectionId: string) => {
    setEntryOverrides((current) => {
      const next = new Map(current);
      next.delete(selectionId);
      storeEntryOverrides(next);
      return next;
    });
    setExportEditEntry(undefined);
    setFeedback({ tone: 'success', message: 'Temporary badge edit discarded.' });
  };

  const download = async (mode: ExportMode) => {
    setExporting(true);
    setFeedback(null);
    try {
      const isTabExport = mode.startsWith('tab-');
      const includedIds = isTabExport ? tabIncludedIds : allIncludedIds;
      const includedIdSet = new Set(includedIds);
      const includedEntryOverrides = Object.fromEntries(
        Array.from(entryOverrides).filter(([selectionId]) => includedIdSet.has(selectionId))
      );

      if (mode.endsWith('-pdfs')) {
        const files = await mapConcurrent(includedIds, 3, async (selectionId): Promise<BrowserZipFile> => {
          const entryOverride = includedEntryOverrides[selectionId];
          const response = await fetch('/api/admin/badges/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provisionShareIds: false,
              mode: 'single-pdf',
              includedIds: [selectionId],
              entryOverrides: entryOverride ? { [selectionId]: entryOverride } : {},
            }),
          });
          if (!response.ok) throw await responseError(response);
          if (!response.headers.get('Content-Type')?.includes('application/pdf')) {
            throw new Error('Badge export returned an invalid PDF response');
          }
          const name = response.headers.get('X-Badge-Archive-Path');
          if (!name) throw new Error('Badge export response is missing its file name');
          return { name, data: new Uint8Array(await response.arrayBuffer()) };
        });
        const date = new Date().toISOString().slice(0, 10);
        const archiveName = isTabExport
          ? `zurichjs-${activeCategory}-badge-pdfs-${date}.zip`
          : `zurichjs-all-badge-pdfs-${date}.zip`;
        saveDownload(createBrowserZip(files), archiveName);
        await refresh();
        return;
      }

      const response = await fetch('/api/admin/badges/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provisionShareIds: false,
          mode,
          category: isTabExport ? activeCategory : undefined,
          includedIds,
          entryOverrides: includedEntryOverrides,
        }),
      });
      if (!response.ok) throw await responseError(response);
      saveDownload(
        await validatedZipResponse(response),
        responseFileName(response.headers.get('Content-Disposition'))
      );
      await refresh();
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Badge export failed' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <section>
      <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-green-700" aria-hidden="true" />
          <p className="text-sm text-green-900">
            Badge QR tokens redirect to stable networking share pages. Temporary attendee and speaker edits affect only exports in this browser tab and never update their database records.
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Badge categories">
          {CATEGORIES.map((category) => {
            const count = rows.filter((row) => row.category === category.id).length;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeCategory === category.id ? 'bg-brand-primary text-black' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {category.label} ({count})
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setModalEntry(null)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
            <Plus className="size-4" aria-hidden="true" /> Add {activeCategory} row
          </button>
          <button type="button" onClick={provision} disabled={provisioning} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`size-4 ${provisioning ? 'animate-spin' : ''}`} aria-hidden="true" /> Generate missing codes
          </button>
          <BadgeExportMenu
            activeCategoryLabel={activeCategoryLabel}
            exporting={exporting}
            tabDisabled={tabIncludedIds.length === 0}
            allDisabled={allIncludedIds.length === 0}
            onExport={(mode) => void download(mode)}
          />
        </div>
      </div>

      {feedback ? <p role="status" className={`mb-4 rounded-lg p-3 text-sm ${feedback.tone === 'error' ? 'bg-red-50 text-red-800' : feedback.tone === 'warning' ? 'bg-amber-50 text-amber-900' : 'bg-green-50 text-green-800'}`}>{feedback.message}</p> : null}
      {query.isLoading ? (
        <div className="flex justify-center py-20"><LoaderCircle className="size-8 animate-spin text-gray-500" aria-label="Loading badge rows" /></div>
      ) : query.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">Could not load badge rows. <button type="button" onClick={() => query.refetch()} className="font-semibold underline">Try again</button></div>
      ) : (
        <BadgeTable
          rows={visibleRows}
          excludedIds={excludedIds}
          busyId={busyId}
          onToggle={toggle}
          onRotate={rotate}
          onEdit={editEntry}
          onDelete={deleteManual}
          temporarilyEditedIds={new Set(entryOverrides.keys())}
        />
      )}

      {modalEntry !== undefined ? (
        <ManualBadgeModal
          category={modalEntry?.category ?? activeCategory}
          entry={modalEntry ?? undefined}
          onClose={() => setModalEntry(undefined)}
          onSaved={async (warning) => {
            const edited = Boolean(modalEntry);
            setModalEntry(undefined);
            await refresh();
            setFeedback(warning
              ? { tone: 'warning', message: warning }
              : { tone: 'success', message: edited ? 'Updated the manual badge row.' : `Added a manual ${activeCategory} badge row.` });
          }}
        />
      ) : null}

      {exportEditEntry ? (
        <BadgeExportEditModal
          entry={exportEditEntry}
          override={entryOverrides.get(exportEditEntry.selectionId)}
          onClose={() => setExportEditEntry(undefined)}
          onReset={() => resetEntryOverride(exportEditEntry.selectionId)}
          onSave={(value) => saveEntryOverride(exportEditEntry.selectionId, value)}
        />
      ) : null}
    </section>
  );
}
