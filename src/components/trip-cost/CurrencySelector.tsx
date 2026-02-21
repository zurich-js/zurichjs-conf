/**
 * Trip Cost Calculator — Currency Selector
 * Simple dropdown with grouped currencies and detected country display
 */

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { countries } from 'countries-list';
import {
  DISPLAY_CURRENCIES,
  CURRENCY_META,
  type DisplayCurrency,
} from '@/config/trip-cost';

interface CurrencySelectorProps {
  value: DisplayCurrency;
  onChange: (currency: DisplayCurrency) => void;
  detectedCountryCode: string | null;
}

function getCountryName(code: string | null): string | null {
  if (!code) return null;
  const country = (countries as Record<string, { name: string }>)[code.toUpperCase()];
  return country?.name ?? null;
}

const NATIVE_CURRENCIES = DISPLAY_CURRENCIES.filter((c) => CURRENCY_META[c].hasNativePricing);
const CONVERTED_CURRENCIES = DISPLAY_CURRENCIES.filter((c) => !CURRENCY_META[c].hasNativePricing);

export function CurrencySelector({ value, onChange, detectedCountryCode }: CurrencySelectorProps) {
  const countryName = getCountryName(detectedCountryCode);

  return (
    <div className="flex flex-col items-center gap-2">
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <ListboxButton className="cursor-pointer flex items-center gap-1.5 rounded-full border border-gray-300 bg-white pl-3.5 pr-2.5 py-1.5 shadow-sm hover:border-gray-400 transition-colors">
            <span className="text-sm font-semibold text-gray-900">
              {value} ({CURRENCY_META[value].symbol})
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </ListboxButton>

          <ListboxOptions className="absolute z-50 mt-1 w-56 overflow-auto rounded-xl bg-white border border-gray-200 shadow-lg py-1 focus:outline-none left-1/2 -translate-x-1/2">
            {NATIVE_CURRENCIES.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Supported currencies
                </div>
                {NATIVE_CURRENCIES.map((c) => (
                  <CurrencyOption key={c} currency={c} />
                ))}
              </>
            )}
            {CONVERTED_CURRENCIES.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1 border-t border-gray-100 pt-2">
                  Converted (~approximate)
                </div>
                {CONVERTED_CURRENCIES.map((c) => (
                  <CurrencyOption key={c} currency={c} />
                ))}
              </>
            )}
          </ListboxOptions>
        </div>
      </Listbox>

      {countryName && (
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Globe className="w-3 h-3" />
          Detected: {countryName}
        </span>
      )}
    </div>
  );
}

function CurrencyOption({ currency }: { currency: DisplayCurrency }) {
  const meta = CURRENCY_META[currency];
  return (
    <ListboxOption
      value={currency}
      className="cursor-pointer flex items-center justify-between gap-2 px-3 py-2 text-sm select-none data-[focus]:bg-gray-100"
    >
      {({ selected }) => (
        <>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{currency}</span>
            <span className="text-gray-500">{meta.label}</span>
          </div>
          {selected && <Check className="w-4 h-4 text-gray-900" />}
        </>
      )}
    </ListboxOption>
  );
}
