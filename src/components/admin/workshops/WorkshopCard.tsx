/**
 * Compact workshop card shown in the admin list.
 * Clicking anywhere opens the edit modal. Includes status chip, readiness
 * indicator, enrollment progress bar, and a revenue summary.
 */

import { AlertTriangle, CalendarDays, Check, Clock, ExternalLink, MapPin, Users } from 'lucide-react';
import type { AdminWorkshopListItem } from '@/pages/api/admin/workshops';
import type { WorkshopStatus } from '@/lib/types/database';
import { computeStaticReadiness } from './readiness';

interface WorkshopCardProps {
  item: AdminWorkshopListItem;
  onOpen: () => void;
  onCreateOffering: () => void;
  creatingOffering: boolean;
}

const STATUS_STYLES: Record<WorkshopStatus, string> = {
  draft: 'bg-text-brand-gray-lightest text-gray-700 ring-gray-200',
  published: 'bg-green-100 text-green-700 ring-green-200',
  cancelled: 'bg-red-100 text-red-700 ring-red-200',
  completed: 'bg-blue-100 text-blue-700 ring-blue-200',
  archived: 'bg-text-brand-gray-lightest text-brand-gray-medium ring-gray-200 line-through',
};

function formatTimeRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const trim = (t: string | null) => (t ? t.slice(0, 5) : '—');
  return `${trim(start)}–${trim(end)}`;
}

export function WorkshopCard({ item, onOpen, onCreateOffering, creatingOffering }: WorkshopCardProps) {
  const offering = item.offering;
  const speakerName = item.speakerName ?? 'Unknown instructor';

  if (!offering) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Not configured
            </div>
            <div className="mt-1 truncate font-semibold text-black">{item.submissionTitle}</div>
            <div className="text-xs text-gray-600">{speakerName}</div>
          </div>
          <button
            onClick={onCreateOffering}
            disabled={creatingOffering}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingOffering ? 'Creating…' : 'Create offering'}
          </button>
        </div>
      </div>
    );
  }

  const staticReadiness = computeStaticReadiness({ offering });
  const openStaticItems = staticReadiness.filter((r) => !r.ok).length;
  const capacity = offering.capacity ?? 0;
  const enrolled = offering.enrolled_count ?? 0;
  const capacityPct = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
  const timeRange = formatTimeRange(offering.start_time, offering.end_time);
  const publicPageSlug = item.sessionSlug;

  return (
    <div className="group rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button
        onClick={onOpen}
        className="block w-full text-left cursor-pointer"
        aria-label={`Edit workshop ${item.submissionTitle}`}
      >
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-medium text-gray-600">{speakerName}</span>
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${STATUS_STYLES[offering.status]}`}
                >
                  {offering.status}
                </span>
              </div>
              <div className="mt-1 font-semibold text-black line-clamp-2">
                {item.submissionTitle}
              </div>
            </div>

            <ReadinessBadge openItems={openStaticItems} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
            <MetaField
              icon={<CalendarDays className="size-3.5" />}
              label={offering.date ?? 'No date'}
              missing={!offering.date}
            />
            <MetaField
              icon={<Clock className="size-3.5" />}
              label={timeRange ?? 'No time'}
              missing={!timeRange}
            />
            <MetaField
              icon={<MapPin className="size-3.5" />}
              label={offering.room ?? 'No room'}
              missing={!offering.room}
            />
            <MetaField
              icon={<Users className="size-3.5" />}
              label={`${enrolled}/${capacity || '—'} seats`}
            />
          </div>

          {capacity > 0 && (
            <div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-text-brand-gray-lightest">
                <div
                  className={`h-full rounded-full transition-all ${
                    capacityPct >= 100
                      ? 'bg-red-500'
                      : capacityPct >= 80
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
            </div>
          )}

          {item.revenueByCurrency.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
              <span className="font-medium text-gray-700">Revenue:</span>
              {item.revenueByCurrency.map((rev) => (
                <span key={rev.currency} className="tabular-nums">
                  {(rev.grossCents / 100).toFixed(0)} {rev.currency}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>

      {publicPageSlug && offering.status === 'published' && (
        <div className="flex items-center justify-between border-t border-text-brand-gray-lightest px-4 py-2 text-xs">
          <a
            href={`/workshops/${publicPageSlug}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-brand-gray-medium hover:text-black"
          >
            <ExternalLink className="size-3" /> View public page
          </a>
        </div>
      )}
    </div>
  );
}

function ReadinessBadge({ openItems }: { openItems: number }) {
  if (openItems === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold uppercase text-green-700">
        <Check className="size-3" /> Ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase text-amber-700">
      <AlertTriangle className="size-3" /> {openItems} to fix
    </span>
  );
}

function MetaField({
  icon,
  label,
  missing = false,
}: {
  icon: React.ReactNode;
  label: string;
  missing?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${missing ? 'text-amber-700' : 'text-gray-600'}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}
