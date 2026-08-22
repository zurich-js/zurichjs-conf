import { describe, expect, it } from 'vitest';
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
  getSessionCalendarLocation,
  getSessionLocation,
  isMapsUrlWithoutVenue,
} from '../session-location';

describe('getSessionLocation', () => {
  it('returns null when no venue fields are set', () => {
    expect(getSessionLocation(null)).toBeNull();
    expect(getSessionLocation(undefined)).toBeNull();
    expect(getSessionLocation({})).toBeNull();
    expect(getSessionLocation({ location_name: '  ', location_address: '' })).toBeNull();
  });

  it('returns null for a room alone (main venue rooms need no directions)', () => {
    expect(getSessionLocation({ room: 'Headline' })).toBeNull();
  });

  it('builds a full location from name, address and room', () => {
    const location = getSessionLocation({
      location_name: 'livingdocs AG Zürich',
      location_address: 'Förrlibuckstrasse 70, 8005 Zürich',
      room: 'Headline',
    });

    expect(location).not.toBeNull();
    expect(location?.name).toBe('livingdocs AG Zürich');
    expect(location?.address).toBe('Förrlibuckstrasse 70, 8005 Zürich');
    expect(location?.room).toBe('Headline');
    expect(location?.label).toBe('livingdocs AG Zürich, Room "Headline"');
    expect(location?.mapsUrl).toBe(
      buildGoogleMapsSearchUrl('livingdocs AG Zürich, Förrlibuckstrasse 70, 8005 Zürich')
    );
    expect(location?.mapsEmbedUrl).toBe(
      buildGoogleMapsEmbedUrl('livingdocs AG Zürich, Förrlibuckstrasse 70, 8005 Zürich')
    );
  });

  it('uses the address as label when no name is set', () => {
    const location = getSessionLocation({
      location_address: 'Förrlibuckstrasse 70, 8005 Zürich',
    });

    expect(location?.label).toBe('Förrlibuckstrasse 70, 8005 Zürich');
    expect(location?.mapsUrl).toContain('google.com/maps/search');
  });

  it('prefers an explicit maps URL over the derived search link', () => {
    const location = getSessionLocation({
      location_name: 'livingdocs AG Zürich',
      location_maps_url: 'https://maps.app.goo.gl/abc123',
    });

    expect(location?.mapsUrl).toBe('https://maps.app.goo.gl/abc123');
    // Embed still derives from the name so the inline map renders.
    expect(location?.mapsEmbedUrl).toBe(buildGoogleMapsEmbedUrl('livingdocs AG Zürich'));
  });

  it('ignores a maps URL without a venue name or address', () => {
    // Without a name/address there is nothing to label the venue with — the
    // record is incomplete, so it is treated as "no venue set".
    expect(getSessionLocation({ location_maps_url: 'https://maps.app.goo.gl/abc123' })).toBeNull();
  });

  it('encodes the maps query', () => {
    expect(buildGoogleMapsSearchUrl('a b & c')).toBe(
      'https://www.google.com/maps/search/?api=1&query=a%20b%20%26%20c'
    );
  });
});

describe('isMapsUrlWithoutVenue', () => {
  it('flags a maps URL with no venue name or address', () => {
    expect(isMapsUrlWithoutVenue({ location_maps_url: 'https://maps.app.goo.gl/abc123' })).toBe(true);
    expect(
      isMapsUrlWithoutVenue({
        location_maps_url: 'https://maps.app.goo.gl/abc123',
        location_name: '  ',
        location_address: '',
      })
    ).toBe(true);
  });

  it('accepts a maps URL alongside a venue name or address', () => {
    expect(
      isMapsUrlWithoutVenue({
        location_maps_url: 'https://maps.app.goo.gl/abc123',
        location_name: 'livingdocs AG Zürich',
      })
    ).toBe(false);
    expect(
      isMapsUrlWithoutVenue({
        location_maps_url: 'https://maps.app.goo.gl/abc123',
        location_address: 'Förrlibuckstrasse 70, 8005 Zürich',
      })
    ).toBe(false);
  });

  it('accepts records without a maps URL', () => {
    expect(isMapsUrlWithoutVenue({})).toBe(false);
    expect(isMapsUrlWithoutVenue({ location_name: 'livingdocs AG Zürich' })).toBe(false);
  });
});

describe('getSessionCalendarLocation', () => {
  it('falls back to the main venue', () => {
    expect(getSessionCalendarLocation(null, 'Technopark Zurich')).toBe('Technopark Zurich');
    expect(getSessionCalendarLocation({}, 'Technopark Zurich')).toBe('Technopark Zurich');
  });

  it('appends the room to the fallback venue', () => {
    expect(getSessionCalendarLocation({ room: 'Headline' }, 'Technopark Zurich')).toBe(
      'Technopark Zurich - Headline'
    );
  });

  it('uses the custom venue name and address when set', () => {
    expect(
      getSessionCalendarLocation(
        {
          location_name: 'livingdocs AG Zürich',
          location_address: 'Förrlibuckstrasse 70, 8005 Zürich',
          room: 'Headline',
        },
        'Technopark Zurich'
      )
    ).toBe('livingdocs AG Zürich, Förrlibuckstrasse 70, 8005 Zürich - Headline');
  });
});
