/**
 * SearchableSelect Component
 * A searchable dropdown using Headless UI Combobox
 */

import { useState, useMemo } from 'react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  error,
  disabled,
  id,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (query === '') {
      return options;
    }
    return options.filter((option) =>
      option.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query]);

  return (
    <Combobox
      value={value}
      onChange={(val) => {
        onChange(val || '');
        setQuery('');
      }}
      disabled={disabled}
    >
      <div className="relative">
        <div className="relative">
          <ComboboxInput
            id={id}
            className={`w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 transition-all ${
              error ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-brand-primary'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            placeholder={placeholder}
            displayValue={(option: string) => option}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown
              className="h-5 w-5 text-brand-gray-medium"
              aria-hidden="true"
            />
          </ComboboxButton>
        </div>

        <ComboboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-brand-gray-dark border border-brand-gray-medium py-1 shadow-lg focus:outline-none">
          {filteredOptions.length === 0 && query !== '' ? (
            <div className="px-4 py-2 text-brand-gray-medium text-sm">
              No results found
            </div>
          ) : (
            filteredOptions.map((option) => (
              <ComboboxOption
                key={option}
                value={option}
                className={({ focus, selected }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    focus ? 'bg-brand-gray-medium text-white' : 'text-brand-gray-light'
                  } ${selected ? 'bg-brand-primary/10' : ''}`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium text-white' : ''}`}>
                      {option}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand-primary">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </Combobox>
  );
}
