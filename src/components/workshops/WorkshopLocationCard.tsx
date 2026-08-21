/**
 * WorkshopLocationCard
 * Shows where a workshop takes place when it runs outside the main venue:
 * venue name, room within the building, street address, a Google Maps link,
 * and an embedded map so attendees can find their way at a glance.
 */

import { DoorOpen, ExternalLink, MapPin } from 'lucide-react';
import { getSessionLocation, type SessionLocationSource } from '@/lib/program/session-location';

export interface WorkshopLocationCardProps {
  schedule: SessionLocationSource | null | undefined;
  className?: string;
}

export function WorkshopLocationCard({ schedule, className }: WorkshopLocationCardProps) {
  const location = getSessionLocation(schedule);
  if (!location) return null;

  return (
    <section aria-labelledby="workshop-location-heading" className={className}>
      <div className="rounded-2xl border border-brand-gray-lightest bg-brand-gray-lightest p-5">
        <h2 id="workshop-location-heading" className="text-lg font-bold leading-tight text-brand-black">
          Location &amp; getting there
        </h2>

        <dl className="mt-4 space-y-2 text-sm text-brand-black">
          {location.name || location.address ? (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-gray-medium" aria-hidden="true" />
              <div>
                <dt className="sr-only">Venue</dt>
                <dd>
                  {location.name ? <strong>{location.name}</strong> : null}
                  {location.address ? (
                    <span className="text-brand-gray-medium">
                      {location.name ? ' — ' : ''}
                      {location.address}
                    </span>
                  ) : null}
                </dd>
              </div>
            </div>
          ) : null}
          {location.room ? (
            <div className="flex items-start gap-2">
              <DoorOpen className="mt-0.5 size-4 shrink-0 text-brand-gray-medium" aria-hidden="true" />
              <div>
                <dt className="sr-only">Room</dt>
                <dd>
                  <strong>Room:</strong> <span className="text-brand-gray-medium">&ldquo;{location.room}&rdquo;</span>
                </dd>
              </div>
            </div>
          ) : null}
        </dl>

        <a
          href={location.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-black underline underline-offset-4 transition-colors hover:text-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-blue rounded-sm"
        >
          Open in Google Maps
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>

        {location.mapsEmbedUrl ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-brand-gray-light">
            <iframe
              src={location.mapsEmbedUrl}
              title={`Map showing ${location.name ?? location.address ?? 'the workshop venue'}`}
              className="h-64 w-full sm:h-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
