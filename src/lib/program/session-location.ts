/**
 * Session location helpers
 * Pure functions that turn the venue fields on a schedule item / public
 * session (location name, address, explicit maps URL, room) into display
 * labels and Google Maps links. No DB access — testable in isolation.
 */

export interface SessionLocationSource {
  room?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  location_maps_url?: string | null;
}

export interface SessionLocation {
  /** Venue/building name, e.g. "livingdocs AG Zürich". */
  name: string | null;
  /** Street address of the venue. */
  address: string | null;
  /** Room within the building, e.g. "Headline". */
  room: string | null;
  /** Link out to Google Maps (explicit URL or derived search link). */
  mapsUrl: string;
  /** Keyless Google Maps embed URL for an iframe. */
  mapsEmbedUrl: string;
  /** One-line label, e.g. `livingdocs AG Zürich, Room "Headline"`. */
  label: string;
}

function trimmedOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/**
 * Resolve the venue for a session. Returns null when no venue was set —
 * i.e. the session happens at the main conference venue and needs no
 * special directions. A room alone does not make a location (rooms at the
 * main venue are covered by on-site signage), and neither does a maps URL
 * alone — without a name or address there is nothing to label the venue
 * with, so incomplete records are treated as "no venue set".
 */
export function getSessionLocation(source: SessionLocationSource | null | undefined): SessionLocation | null {
  if (!source) return null;

  const name = trimmedOrNull(source.location_name);
  const address = trimmedOrNull(source.location_address);
  const room = trimmedOrNull(source.room);

  if (!name && !address) {
    return null;
  }

  // Query string used to pin the venue on Google Maps (name + address).
  const query = [name, address].filter(Boolean).join(', ');
  const mapsUrl = trimmedOrNull(source.location_maps_url) ?? buildGoogleMapsSearchUrl(query);

  const label = [name ?? address, room ? `Room "${room}"` : null]
    .filter(Boolean)
    .join(', ');

  return {
    name,
    address,
    room,
    mapsUrl,
    mapsEmbedUrl: buildGoogleMapsEmbedUrl(query),
    label,
  };
}

/**
 * Location string for calendar entries (Google/Outlook/ICS). Falls back to
 * the main conference venue when no per-session venue name/address is set
 * (a maps URL alone doesn't name a venue, so it falls back too).
 */
export function getSessionCalendarLocation(
  source: SessionLocationSource | null | undefined,
  fallbackVenue: string
): string {
  const room = trimmedOrNull(source?.room);
  const name = trimmedOrNull(source?.location_name);
  const address = trimmedOrNull(source?.location_address);

  const venue = [name, address].filter(Boolean).join(', ') || fallbackVenue;
  return room ? `${venue} - ${room}` : venue;
}
