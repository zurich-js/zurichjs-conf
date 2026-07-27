/**
 * Yes/No Choice
 * Accessible radio pair styled as pill buttons, used for event RSVPs
 */

import React from 'react';

export interface YesNoChoiceProps {
  /** Unique field name — also used as the radio group name and anchor id */
  name: string;
  legend: string;
  value: boolean | null;
  yesLabel?: string;
  noLabel?: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

const OPTIONS: Array<{ label: 'yes' | 'no'; optionValue: boolean }> = [
  { label: 'yes', optionValue: true },
  { label: 'no', optionValue: false },
];

export function YesNoChoice({
  name,
  legend,
  value,
  yesLabel = 'Yes, I’ll be there',
  noLabel = 'No, I can’t make it',
  error,
  disabled = false,
  onChange,
}: YesNoChoiceProps) {
  return (
    <fieldset id={name} tabIndex={-1} className="focus:outline-none" aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-col sm:flex-row gap-2">
        {OPTIONS.map(({ label, optionValue }) => {
          const checked = value === optionValue;
          return (
            <label
              key={label}
              className={`flex-1 cursor-pointer rounded-lg border px-4 py-3 text-sm font-medium text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-primary ${
                checked
                  ? optionValue
                    ? 'border-brand-primary bg-brand-primary text-black'
                    : 'border-gray-400 bg-gray-200 text-gray-900'
                  : 'border-gray-600 bg-transparent text-gray-200 hover:border-gray-400'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name={name}
                value={label}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(optionValue)}
                className="sr-only"
              />
              {optionValue ? yesLabel : noLabel}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${name}-error`} className="text-red-400 text-sm mt-2" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
