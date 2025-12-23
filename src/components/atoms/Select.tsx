/**
 * Select Component
 * Reusable HeadlessUI Listbox wrapper with consistent styling
 */

import React from 'react';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Available options */
  options: SelectOption[];
  /** Optional label */
  label?: string;
  /** Placeholder when no value selected */
  placeholder?: string;
  /** Visual variant */
  variant?: 'default' | 'dark';
  /** Size variant */
  size?: 'sm' | 'md';
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Additional class name for the button */
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select an option',
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
}: SelectProps) {
  const isDark = variant === 'dark';
  const selectedOption = options.find((opt) => opt.value === value);

  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm';

  return (
    <div className={className}>
      {label && (
        <label
          className={`block text-xs font-medium mb-1.5 ${
            isDark ? 'text-brand-gray-light' : 'text-gray-700'
          }`}
        >
          {label}
        </label>
      )}
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <ListboxButton
            className={`relative w-full rounded-lg ${sizeClasses} text-left focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-2 ${
              isDark
                ? 'bg-brand-gray-darkest text-white hover:bg-brand-gray-dark'
                : 'bg-white border border-gray-300 text-black hover:bg-gray-50'
            }`}
          >
            <span className={`block truncate ${!selectedOption?.label ? 'text-gray-400' : ''}`}>
              {selectedOption?.label || placeholder}
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform ui-open:rotate-180 ${
                isDark ? 'text-brand-gray-light' : 'text-gray-500'
              }`}
            />
          </ListboxButton>

          <ListboxOptions
            className={`absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg py-1 shadow-lg focus:outline-none ${
              isDark ? 'bg-brand-gray-dark border border-brand-gray-medium' : 'bg-white border border-gray-200'
            }`}
          >
            {options.map((option) => (
              <ListboxOption
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={`relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors ${
                  isDark
                    ? 'text-white ui-active:bg-brand-gray-medium ui-selected:bg-brand-primary/20 ui-disabled:text-brand-gray-medium ui-disabled:cursor-not-allowed'
                    : 'text-black ui-active:bg-gray-100 ui-selected:bg-brand-primary/10 ui-disabled:text-gray-400 ui-disabled:cursor-not-allowed'
                }`}
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {option.label}
                    </span>
                    {option.description && (
                      <span
                        className={`block truncate text-xs mt-0.5 ${
                          isDark ? 'text-brand-gray-light' : 'text-gray-500'
                        }`}
                      >
                        {option.description}
                      </span>
                    )}
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand-primary">
                        <Check className="w-4 h-4" />
                      </span>
                    )}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  );
}
