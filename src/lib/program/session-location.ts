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
  mapsEmbedUrl: string | null;
  /** One-line label, e.g. `livingdocs AG Zürich, Room "Headline"`. */
  label: string;
}

function trimmedOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Query string used to pin the venue on Google Maps (name + address). */
function buildMapsQuery(name: string | null, address: string | null): string | null {
  const query = [name, address].filter(Boolean).join(', ');
  return query || null;
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
 * special directions. A room alone does not make a location: rooms at the
 * main venue are covered by on-site signage.
 */
export function getSessionLocation(source: SessionLocationSource | null | undefined): SessionLocation | null {
  if (!source) return null;

  const name = trimmedOrNull(source.location_name);
  const address = trimmedOrNull(source.location_address);
  const explicitMapsUrl = trimmedOrNull(source.location_maps_url);
  const room = trimmedOrNull(source.room);

  if (!name && !address && !explicitMapsUrl) {
    return null;
  }

  const query = buildMapsQuery(name, address);
  const mapsUrl = explicitMapsUrl ?? (query ? buildGoogleMapsSearchUrl(query) : null);
  if (!mapsUrl) {
    return null;
  }

  const label = [name ?? address, room ? `Room "${room}"` : null]
    .filter(Boolean)
    .join(', ');

  return {
    name,
    address,
    room,
    mapsUrl,
    mapsEmbedUrl: query ? buildGoogleMapsEmbedUrl(query) : null,
    label,
  };
}

/**
 * Location string for calendar entries (Google/Outlook/ICS). Falls back to
 * the main conference venue when no per-session venue is set. For map-only
 * locations (only maps_url set, no name or address), returns null to signal
 * the caller should use the fallback venue.
 */
export function getSessionCalendarLocation(
  source: SessionLocationSource | null | undefined,
  fallbackVenue: string
): string {
  const room = trimmedOrNull(source?.room);
  const name = trimmedOrNull(source?.location_name);
  const address = trimmedOrNull(source?.location_address);

  // If only a maps URL is set without name or address, treat as main venue
  // (map-only is valid for UI rendering but not meaningful for calendar)
  if (!name && !address) {
    const venue = fallbackVenue;
    return room ? `${venue} - ${room}` : venue;
  }

  const venue = [name, address].filter(Boolean).join(', ');
  return room ? `${venue} - ${room}` : venue;
}
