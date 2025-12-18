/**
 * Currency Context
 * Provides detected currency throughout the application
 */

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_CURRENCY, type SupportedCurrency } from '@/config/currency';

/**
 * Currency context value
 */
interface CurrencyContextValue {
  /** The detected currency for the current user */
  currency: SupportedCurrency;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

/**
 * Props for CurrencyProvider
 */
interface CurrencyProviderProps {
  children: ReactNode;
  /** The currency to provide to the app */
  currency: SupportedCurrency;
}

/**
 * Provides currency context to the application
 * Currency is determined server-side via geo-detection and passed through props
 *
 * @example
 * // In _app.tsx
 * <CurrencyProvider currency={pageProps.detectedCurrency ?? 'CHF'}>
 *   <Component {...pageProps} />
 * </CurrencyProvider>
 */
export function CurrencyProvider({ children, currency }: CurrencyProviderProps) {
  return (
    <CurrencyContext.Provider value={{ currency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Hook to access the current currency
 * Must be used within a CurrencyProvider
 *
 * @example
 * const { currency } = useCurrency();
 * // currency is 'CHF' or 'EUR'
 */
export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);

  if (!context) {
    // Return default currency instead of throwing
    // This allows the hook to be used in components that may render
    // before the provider is mounted (e.g., during static generation)
    return { currency: DEFAULT_CURRENCY };
  }

  return context;
}

/**
 * Export the context for advanced use cases
 */
export { CurrencyContext };
