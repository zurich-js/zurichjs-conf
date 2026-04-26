/**
 * Overview Tab Component
 * Actionable operational cards for travel management
 */

import type { ReimbursementWithSpeaker, TransportWithSpeaker } from '@/lib/cfp/admin-travel';
import { formatDate, formatDateTime, formatTime, getTimestamp, isTodayInZurich } from './format';

interface OverviewTabProps {
  isLoading: boolean;
  reimbursements: ReimbursementWithSpeaker[];
  transportation: TransportWithSpeaker[];
  onOpenReimbursement: (id: string) => void;
  onOpenTransportation: (speakerId: string) => void;
}

type OverviewItem = {
  id: string;
  primary: string;
  secondary: string;
  meta: string;
  emphasis?: string;
  onClick: () => void;
};

export function OverviewTab({
  isLoading,
  reimbursements,
  transportation,
  onOpenReimbursement,
  onOpenTransportation,
}: OverviewTabProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border border-brand-gray-lightest bg-white p-6 shadow-sm animate-pulse">
            <div className="mb-4 h-5 w-32 rounded bg-brand-gray-lightest" />
            <div className="space-y-3">
              {[...Array(3)].map((__, j) => (
                <div key={j} className="h-14 rounded bg-text-brand-gray-lightest" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const pendingReimbursements: OverviewItem[] = reimbursements
    .filter((item) => item.status === 'pending')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      primary: `${item.speaker.first_name} ${item.speaker.last_name}`,
      secondary: `${item.expense_type} · ${item.currency} ${(item.amount / 100).toFixed(2)}`,
      meta: formatDate(item.created_at),
      onClick: () => onOpenReimbursement(item.id),
    }));

  const arrivalItems = selectCriticalTransportationItems(transportation, 'inbound')
    .map((item) => ({
      id: item.id,
      primary: `${item.speaker.first_name} ${item.speaker.last_name}`,
      secondary: `${item.provider || item.transport_mode} ${item.reference_code || ''}`.trim(),
      meta: item.arrival_time || item.departure_time ? formatDateTime(item.arrival_time || item.departure_time) : 'TBD',
      emphasis: item.transport_status === 'delayed' ? 'Delayed' : formatTime(item.arrival_time),
      onClick: () => onOpenTransportation(item.speaker.id),
    }));

  const departureItems = selectCriticalTransportationItems(transportation, 'outbound')
    .map((item) => ({
      id: item.id,
      primary: `${item.speaker.first_name} ${item.speaker.last_name}`,
      secondary: `${item.provider || item.transport_mode} ${item.reference_code || ''}`.trim(),
      meta: item.departure_time || item.arrival_time ? formatDateTime(item.departure_time || item.arrival_time) : 'TBD',
      emphasis: item.transport_status === 'delayed' ? 'Delayed' : formatTime(item.departure_time),
      onClick: () => onOpenTransportation(item.speaker.id),
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ActionCard title="Pending reimbursements" emptyLabel="No pending reimbursements" items={pendingReimbursements} />
      <ActionCard title="Scheduled arrivals" emptyLabel="No critical arrivals right now" items={arrivalItems} />
      <ActionCard title="Scheduled departures" emptyLabel="No critical departures right now" items={departureItems} />
    </div>
  );
}

function ActionCard({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: OverviewItem[];
  emptyLabel: string;
}) {
  return (
    <div className="@container rounded-lg border border-brand-gray-lightest bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-black">{title}</h2>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-6 text-sm text-brand-gray-medium">
            {emptyLabel}
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="w-full rounded-lg border border-brand-gray-lightest bg-gray-50 px-3 py-3 text-left transition-colors hover:border-gray-300 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-black">{item.primary}</div>
                  <div className="mt-1 truncate text-sm text-brand-gray-dark">{item.secondary}</div>
                </div>
                {item.emphasis ? (
                  <div className="shrink-0 text-right text-xs font-semibold text-black">
                    {item.emphasis}
                  </div>
                ) : null}
              </div>
              <div className="mt-2 text-xs text-brand-gray-medium @[18rem]:flex @[18rem]:items-center @[18rem]:justify-between @[18rem]:gap-3">
                <span className="block truncate">{item.meta}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function selectCriticalTransportationItems(
  items: TransportWithSpeaker[],
  direction: 'inbound' | 'outbound'
) {
  const now = Date.now();
  const fiveHoursFromNow = now + 5 * 60 * 60 * 1000;
  const getRelevantTimestamp = (item: TransportWithSpeaker) =>
    getTimestamp(direction === 'inbound' ? item.arrival_time || item.departure_time : item.departure_time || item.arrival_time);

  const datedItems = items
    .filter((item) => item.direction === direction)
    .filter((item) => {
      return getRelevantTimestamp(item) !== null;
    })
    .sort((a, b) => {
      const aTs = getRelevantTimestamp(a) || 0;
      const bTs = getRelevantTimestamp(b) || 0;
      return aTs - bTs;
    });

  const upcoming = datedItems.filter((item) => {
    const ts = getRelevantTimestamp(item);
    return ts !== null && ts >= now;
  });

  const withinFiveHours = upcoming.filter((item) => {
    const ts = getRelevantTimestamp(item);
    return ts !== null && ts <= fiveHoursFromNow;
  });

  if (withinFiveHours.length >= 5) {
    return withinFiveHours.slice(0, 5);
  }

  const todayItems = upcoming.filter((item) =>
    isTodayInZurich(direction === 'inbound' ? item.arrival_time || item.departure_time : item.departure_time || item.arrival_time)
  );

  if (withinFiveHours.length > 0) {
    const result = [...withinFiveHours];

    for (const item of todayItems) {
      if (result.some((existing) => existing.id === item.id)) continue;
      result.push(item);
      if (result.length >= 5) break;
    }

    if (result.length < 5) {
      for (const item of upcoming) {
        if (result.some((existing) => existing.id === item.id)) continue;
        result.push(item);
        if (result.length >= 5) break;
      }
    }

    return result.slice(0, 5);
  }

  if (todayItems.length > 0) {
    const result = [...todayItems];
    for (const item of upcoming) {
      if (result.some((existing) => existing.id === item.id)) continue;
      result.push(item);
      if (result.length >= 5) break;
    }

    return result.slice(0, 5);
  }

  return upcoming.slice(0, 5);
}
