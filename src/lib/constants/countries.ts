/**
 * Countries list using ISO 3166-1 data from countries-list package
 * Data is maintained by the library, ensuring accuracy
 */
import { countries } from 'countries-list';

/**
 * Get sorted list of country names for dropdown
 */
export const COUNTRIES = Object.values(countries)
  .map((country) => country.name)
  .sort((a, b) => a.localeCompare(b));

/**
 * Country data with codes (for future use if needed)
 */
export const COUNTRIES_WITH_CODES = Object.entries(countries)
  .map(([code, data]) => ({
    code,
    name: data.name,
    native: data.native,
    continent: data.continent,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Get country code from name
 */
export function getCountryCode(name: string): string | undefined {
  const entry = Object.entries(countries).find(
    ([, data]) => data.name.toLowerCase() === name.toLowerCase()
  );
  return entry?.[0];
}

/**
 * Check if a country is in Europe (for travel budget messaging)
 */
export function isEuropeanCountry(countryName: string): boolean {
  const entry = Object.entries(countries).find(
    ([, data]) => data.name.toLowerCase() === countryName.toLowerCase()
  );
  return entry?.[1].continent === 'EU';
}

export type Country = string;
