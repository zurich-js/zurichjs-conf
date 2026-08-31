import React from 'react';
import { AlertCircle } from 'lucide-react';
import { DOOR_ROLE_LABELS } from '@/lib/types/checkin';
import type { DoorStationStat, DoorVolunteerStat } from '@/lib/checkin/dashboard';

export interface DoorStationListProps {
  stations: DoorStationStat[];
  volunteers: DoorVolunteerStat[];
  /** How long without an action before a station is called quiet. */
  quietAfterMs?: number;
  className?: string;
}

const DEFAULT_QUIET_AFTER_MS = 10 * 60 * 1000;

/**
 * Per-station and per-volunteer activity.
 *
 * The column that matters is "last seen". A station with a recent action is
 * working; one silent for ten minutes may have a flat battery, a lost session or
 * a volunteer who wandered off — and a cumulative admitted count cannot tell
 * those apart from a lane that is simply between attendees.
 *
 * Volunteer figures exist to spot someone who needs help, not to rank anyone,
 * so they are labelled that way and carry no ordering prize.
 */
export const DoorStationList: React.FC<DoorStationListProps> = ({
  stations,
  volunteers,
  quietAfterMs = DEFAULT_QUIET_AFTER_MS,
  className = '',
}) => {
  if (stations.length === 0 && volunteers.length === 0) {
    return (
      <p className={`rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 ${className}`}>
        No door activity recorded yet for this day.
      </p>
    );
  }

  return (
    <div className={`grid gap-4 lg:grid-cols-2 ${className}`}>
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-600">
          Lanes
        </h2>
        <ul className="space-y-2">
          {stations.map((station) => {
            const quiet = isQuiet(station.lastSeenAt, quietAfterMs);
            return (
              <li
                key={station.station}
                className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-black">{station.station}</p>
                  <p className="text-xs text-gray-600">
                    {station.admitted} admitted
                    {station.refusals > 0 ? ` · ${station.refusals} refused` : ''}
                    {station.duplicates > 0 ? ` · ${station.duplicates} second scans` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {quiet ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Quiet
                    </span>
                  ) : null}
                  <p className="text-xs tabular-nums text-gray-500">
                    {station.lastSeenAt ? formatClock(station.lastSeenAt) : '—'}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-600">
          Volunteers
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          For spotting someone who needs a hand, not a leaderboard.
        </p>
        <ul className="space-y-2">
          {volunteers.map((volunteer) => (
            <li
              key={volunteer.staffEmail}
              className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-black">{volunteer.staffEmail}</p>
                <p className="text-xs text-gray-600">
                  {DOOR_ROLE_LABELS[volunteer.staffRole] ?? volunteer.staffRole}
                  {volunteer.manualAdmits > 0 ? ` · ${volunteer.manualAdmits} manual` : ''}
                  {volunteer.refusals > 0 ? ` · ${volunteer.refusals} refused` : ''}
                </p>
              </div>
              <p className="shrink-0 text-lg font-bold tabular-nums text-black">
                {volunteer.admitted}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

function isQuiet(lastSeenAt: string | null, quietAfterMs: number): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() > quietAfterMs;
}

function formatClock(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zurich',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}
