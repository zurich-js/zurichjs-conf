/**
 * Labeled form field wrappers for the dark speaker-logistics form
 * (label + Input/Textarea atom + error line)
 */

import React from 'react';
import { Input, Textarea } from '@/components/atoms';

interface BaseFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  children,
}: Pick<BaseFieldProps, 'id' | 'label' | 'hint' | 'error' | 'required'> & { children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-white mb-2">
        {label} {required && <span className="text-red-400" aria-hidden="true">*</span>}
      </label>
      {hint && <p className="text-gray-400 text-sm mb-2">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-red-400 text-sm mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email';
  placeholder?: string;
  autoComplete?: string;
}

export function TextField({
  id,
  label,
  hint,
  error,
  required,
  disabled,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
}: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <Input
        data-mask
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
      />
    </FieldShell>
  );
}

export interface TextAreaFieldProps extends BaseFieldProps {
  placeholder?: string;
  rows?: number;
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  required,
  disabled,
  value,
  onChange,
  placeholder,
  rows = 3,
}: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <Textarea
        data-mask
        id={id}
        value={value}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
      />
    </FieldShell>
  );
}
