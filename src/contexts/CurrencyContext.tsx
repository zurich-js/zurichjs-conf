/**
 * Currency Context
 * Provides detected currency throughout the application
 * Automatically detects user location via IP geolocation API on first visit
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { DEFAULT_CURRENCY, getCurrencyFromCountry, type SupportedCurrency } from '@/config/currency';

/**
 * Currency context value
 */
interface CurrencyContextValue {
  /** The detected currency for the current user */
  currency: SupportedCurrency;
  /** Whether geo detection is still in progress */
  isDetecting: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

/**
 * Check if we have a detected-country cookie
 */
function getCountryCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(/(?:^|;\s*)detected-country=([^;]*)/);
  return match ? match[1] : null;
}

/**
 * Props for CurrencyProvider
 */
interface CurrencyProviderProps {
  children: ReactNode;
  /** Initial currency from server-side detection (if available) */
  currency?: SupportedCurrency;
}

/**
 * Provides currency context to the application
 * On first visit, automatically calls /api/geo/detect to determine user's country
 *
 * @example
 * // In _app.tsx
 * <CurrencyProvider currency={pageProps.detectedCurrency}>
 *   <Component {...pageProps} />
 * </CurrencyProvider>
 */
export function CurrencyProvider({ children, currency: initialCurrency }: CurrencyProviderProps) {
  const [currency, setCurrency] = useState<SupportedCurrency>(initialCurrency ?? DEFAULT_CURRENCY);
  const [isDetecting, setIsDetecting] = useState(!initialCurrency);

  // Sync currency state with initialCurrency prop from server-side detection
  // This ensures server-detected currency is always used when available
  useEffect(() => {
    if (initialCurrency) {
      setCurrency(initialCurrency);
    }
  }, [initialCurrency]);

  useEffect(() => {
    // If we already have a valid currency from server-side, no need to detect
    if (initialCurrency) {
      setIsDetecting(false);
      return;
    }

    // Check if we already have a country cookie (from previous visit)
    const existingCountry = getCountryCookie();
    if (existingCountry) {
      const detectedCurrency = getCurrencyFromCountry(existingCountry);
      setCurrency(detectedCurrency);
      setIsDetecting(false);
      return;
    }

    // No cookie - call the geo detection API
    const detectGeo = async () => {
      try {
        const response = await fetch('/api/geo/detect');
        if (response.ok) {
          const data = await response.json();
          if (data.country) {
            const detectedCurrency = getCurrencyFromCountry(data.country);
            setCurrency(detectedCurrency);
            console.log(`[Geo] Detected country: ${data.country}, currency: ${detectedCurrency}`);
          }
        }
      } catch (error) {
        console.error('[Geo] Failed to detect country:', error);
      } finally {
        setIsDetecting(false);
      }
    };

    detectGeo();
  }, [initialCurrency]);

  return (
    <CurrencyContext.Provider value={{ currency, isDetecting }}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Hook to access the current currency
 * Must be used within a CurrencyProvider
 *
 * @example
 * const { currency, isDetecting } = useCurrency();
 * // currency is 'CHF' or 'EUR'
 * // isDetecting is true while geo detection is in progress
 */
export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);

  if (!context) {
    // Return default currency instead of throwing
    // This allows the hook to be used in components that may render
    // before the provider is mounted (e.g., during static generation)
    return { currency: DEFAULT_CURRENCY, isDetecting: false };
  }

  return context;
}

/**
 * Export the context for advanced use cases
 */
export { CurrencyContext };
