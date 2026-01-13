/**
 * Currency configuration for multi-currency support
 */

/**
 * Supported currencies for ticket pricing
 */
export type SupportedCurrency = 'CHF' | 'EUR';

/**
 * ISO 3166-1 alpha-2 country codes for countries that should use EUR pricing
 * Includes Eurozone countries and select Balkan countries
 */
export const EUROZONE_COUNTRIES = [
  'AL', // Albania
  'AT', // Austria
  'BE', // Belgium
  'CY', // Cyprus
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LT', // Lithuania
  'LU', // Luxembourg
  'MK', // North Macedonia
  'MT', // Malta
  'NL', // Netherlands
  'PT', // Portugal
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
] as const;

export type EurozoneCountry = (typeof EUROZONE_COUNTRIES)[number];

/**
 * Default currency when country cannot be determined
 */
export const DEFAULT_CURRENCY: SupportedCurrency = 'CHF';

/**
 * Determine the appropriate currency based on country code
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'DE', 'CH')
 * @returns The currency to use for the given country
 */
export function getCurrencyFromCountry(countryCode: string | null | undefined): SupportedCurrency {
  if (!countryCode) {
    return DEFAULT_CURRENCY;
  }

  const upperCode = countryCode.toUpperCase();

  // Check if the country is in the Eurozone
  if (EUROZONE_COUNTRIES.includes(upperCode as EurozoneCountry)) {
    return 'EUR';
  }

  // Default to CHF for Switzerland and all other countries
  return 'CHF';
}

/**
 * Validate if a string is a supported currency
 */
export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return value === 'CHF' || value === 'EUR';
}

/**
 * Parse and validate currency from query parameter
 */
export function parseCurrencyParam(value: string | string[] | undefined): SupportedCurrency {
  const currency = Array.isArray(value) ? value[0] : value;
  return isSupportedCurrency(currency) ? currency : DEFAULT_CURRENCY;
}
