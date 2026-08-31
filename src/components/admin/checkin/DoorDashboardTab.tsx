import React, { useState } from 'react';
import { Activity, Gift, Pause, Play, Users } from 'lucide-react';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import {
  DOOR_DASHBOARD_BUSY_POLL_MS,
  DOOR_DASHBOARD_POLL_MS,
  useDoorDashboard,
} from '@/hooks/checkin/useDoorDashboard';
import { DOOR_OCCASION_LABELS, type DoorOccasion } from '@/lib/types/checkin';
import { DoorStatTile } from './DoorStatTile';
import { DoorStationList } from './DoorStationList';

export interface DoorDashboardTabProps {
  className?: string;
}

/**
 * The live door view for an organiser.
 *
 * Polled, not socket-driven: there is no Supabase Realtime in this repo, so
 * sockets would be new surface for one screen. Each tick is a single aggregate
 * call returning a fixed sub-2KB payload, so the cost is bounded regardless of
 * how busy the door is.
 *
 * The question this screen answers is "is the queue moving right now", so the
 * 5-minute throughput figure is given the same prominence as the totals. A
 * cumulative count tells you how the morning went; it does not tell you that
 * lane 2 died four minutes ago.
 */
export const DoorDashboardTab: React.FC<DoorDashboardTabProps> = ({ className = '' }) => {
  const [occasion, setOccasion] = useState<DoorOccasion | undefined>(undefined);
  const [fast, setFast] = useState(false);
  const [paused, setPaused] = useState(false);

  const pollMs = paused ? 0 : fast ? DOOR_DASHBOARD_BUSY_POLL_MS : DOOR_DASHBOARD_POLL_MS;
  const { data, isError, isLoading, refetch, dataUpdatedAt } = useDoorDashboard({
    occasion,
    pollMs,
  });

  if (isError) {
    return (
      <AdminErrorState message="Could not load the door dashboard" onRetry={() => void refetch()} />
    );
  }

  const arrivedPct =
    data && data.expected > 0 ? Math.round((data.arrived / data.expected) * 100) : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="door-occasion" className="text-sm font-medium text-black">
            Day
          </label>
          <select
            id="door-occasion"
            value={occasion ?? ''}
            onChange={(e) => setOccasion((e.target.value || undefined) as DoorOccasion | undefined)}
            className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="">Today (server)</option>
            <option value="workshop_day">{DOOR_OCCASION_LABELS.workshop_day}</option>
            <option value="conference_day">{DOOR_OCCASION_LABELS.conference_day}</option>
          </select>
        </div>

        {/* Polling is visible and controllable rather than hidden: an organiser
            should be able to see that the number is live, and stop it. */}
        <div className="flex items-center gap-2">
          <span aria-live="polite" className="text-xs text-gray-600">
            {paused
              ? 'Paused'
              : `Updating every ${Math.round(pollMs / 1000)}s`}
            {dataUpdatedAt ? ` · last ${formatClock(dataUpdatedAt)}` : ''}
          </span>
          <button
            type="button"
            onClick={() => setFast((v) => !v)}
            disabled={paused}
            className="cursor-pointer rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
          >
            {fast ? 'Normal' : 'Faster'}
          </button>
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100"
          >
            {paused ? (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                Pause
              </>
            )}
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <p className="py-8 text-center text-sm text-gray-600">Loading the door…</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DoorStatTile
              label="Arrived"
              value={data.arrived}
              secondary={`of ${data.expected} · ${arrivedPct}%`}
              icon={Users}
              tone="ok"
            />
            <DoorStatTile
              label="Last 5 min"
              value={data.arrivalsLast5Min}
              secondary={`${data.arrivalsLast15Min} in 15 min`}
              icon={Activity}
              // Zero throughput is the signal a lead is watching for, but only
              // once some people have arrived — before doors open it is normal.
              tone={data.arrivalsLast5Min === 0 && data.arrived > 0 ? 'warn' : 'neutral'}
            />
            <DoorStatTile label="Still to arrive" value={data.remaining} tone="neutral" />
            <DoorStatTile
              label="Goodie bags"
              value={data.goodieHandedOver}
              icon={Gift}
              tone="neutral"
            />
          </div>

          <DoorStationList stations={data.stations} volunteers={data.volunteers} />

          <section>
            <h2 className="mb-3 text-lg font-semibold text-black">Worth a look</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <DoorStatTile
                label="Manual admissions"
                value={data.anomalies.manualAdmits}
                secondary="expected — blank badges have no code"
                tone="neutral"
              />
              <DoorStatTile
                label="Refused"
                value={data.anomalies.refusals}
                secondary="a run can mean a bad batch of codes"
                tone={data.anomalies.refusals > 0 ? 'warn' : 'neutral'}
              />
              <DoorStatTile
                label="Unrecognised codes"
                value={data.anomalies.notFound}
                tone="neutral"
              />
              <DoorStatTile
                label="Second scans"
                value={data.anomalies.duplicates}
                secondary="nobody was let in twice"
                tone="neutral"
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};

/** Wall-clock in the venue's timezone, for "last updated". */
function formatClock(ms: number): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Zurich',
    }).format(new Date(ms));
  } catch {
    return '';
  }
}
