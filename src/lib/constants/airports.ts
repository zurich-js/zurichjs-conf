/**
 * Airports list using data from @nwpr/airport-codes package
 * Data sourced from OpenFlights.org
 */
import { airports as airportsData } from '@nwpr/airport-codes';

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

/**
 * Filter to major airports with IATA codes (excludes small/private airfields)
 */
export const AIRPORTS: Airport[] = airportsData
  .filter((airport): airport is typeof airport & { iata: string; name: string; city: string; country: string } =>
    Boolean(airport.iata && airport.iata.length === 3 && airport.name && airport.city && airport.country)
  )
  .map((airport) => ({
    iata: airport.iata,
    name: airport.name,
    city: airport.city,
    country: airport.country,
  }))
  .sort((a, b) => a.city.localeCompare(b.city));

/**
 * Get formatted airport options for dropdown
 * Format: "IATA - City, Country (Airport Name)"
 */
export const AIRPORT_OPTIONS: string[] = AIRPORTS.map(
  (airport) => `${airport.iata} - ${airport.city}, ${airport.country}`
);

/**
 * Get airport details from formatted option string
 */
export function getAirportFromOption(option: string): Airport | undefined {
  const iata = option.split(' - ')[0];
  return AIRPORTS.find((a) => a.iata === iata);
}

/**
 * Search airports by query (IATA code, city, or country)
 */
export function searchAirports(query: string): Airport[] {
  const q = query.toLowerCase();
  return AIRPORTS.filter(
    (airport) =>
      airport.iata.toLowerCase().includes(q) ||
      airport.city.toLowerCase().includes(q) ||
      airport.country.toLowerCase().includes(q) ||
      airport.name.toLowerCase().includes(q)
  ).slice(0, 50); // Limit results for performance
}

/**
 * Get popular European airports (for suggestions)
 */
export const POPULAR_EUROPEAN_AIRPORTS: Airport[] = [
  'ZRH', // Zurich
  'LHR', // London Heathrow
  'CDG', // Paris CDG
  'FRA', // Frankfurt
  'AMS', // Amsterdam
  'MUC', // Munich
  'BCN', // Barcelona
  'VIE', // Vienna
  'BER', // Berlin
  'CPH', // Copenhagen
].map((iata) => AIRPORTS.find((a) => a.iata === iata)).filter((a): a is Airport => a !== undefined);
