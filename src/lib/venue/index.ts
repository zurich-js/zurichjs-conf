/**
 * Venue Utilities
 * Generates venue map URLs and location information
 */

export interface VenueInfo {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
}

/**
 * ZurichJS Conference 2026 Venue
 */
export const ZURICHJS_VENUE: VenueInfo = {
  name: 'Technopark Zürich',
  address: 'Technoparkstrasse 1',
  city: 'Zürich',
  postalCode: '8005',
  country: 'Switzerland',
  latitude: 47.3887,
  longitude: 8.5174,
};

/**
 * Generate Google Maps URL for a venue
 */
export function generateGoogleMapsUrl(venue: VenueInfo): string {
  const query = encodeURIComponent(
    `${venue.name}, ${venue.address}, ${venue.postalCode} ${venue.city}, ${venue.country}`
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Generate Google Maps URL with coordinates
 */
export function generateGoogleMapsUrlWithCoordinates(venue: VenueInfo): string {
  return `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`;
}

/**
 * Generate Apple Maps URL for a venue
 */
export function generateAppleMapsUrl(venue: VenueInfo): string {
  const query = encodeURIComponent(
    `${venue.name}, ${venue.address}, ${venue.postalCode} ${venue.city}`
  );
  return `http://maps.apple.com/?q=${query}&ll=${venue.latitude},${venue.longitude}`;
}

/**
 * Generate a universal map URL that works for both mobile and desktop
 * On mobile, it will open the native maps app
 * On desktop, it will open Google Maps
 */
export function generateUniversalMapUrl(venue: VenueInfo): string {
  // Use Google Maps as it has good universal support
  return generateGoogleMapsUrl(venue);
}

/**
 * Get formatted address string
 */
export function getFormattedAddress(venue: VenueInfo): string {
  return `${venue.address}, ${venue.postalCode} ${venue.city}, ${venue.country}`;
}

/**
 * Generate venue map URL for ZurichJS Conference
 */
export function getZurichJSVenueMapUrl(): string {
  return generateUniversalMapUrl(ZURICHJS_VENUE);
}
