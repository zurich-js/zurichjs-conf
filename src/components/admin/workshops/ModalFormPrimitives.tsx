/**
 * Small form primitives shared within the workshop admin modal.
 */

import { ChevronDown, ChevronUp } from 'lucide-react';

interface SectionProps {
  title: string;
  description?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

export function Section({
  title,
  description,
  collapsed = false,
  onToggle,
  children,
}: SectionProps) {
  const collapsible = typeof onToggle === 'function';

  return (
    <section className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white first:mt-0">
      <button
        type="button"
        onClick={onToggle}
        disabled={!collapsible}
        className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left ${
          collapsible ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
        }`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold uppercase tracking-wide text-gray-800">{title}</span>
          {description && <span className="mt-0.5 block text-xs text-brand-gray-medium">{description}</span>}
        </span>
        {collapsible && (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-white"
            aria-hidden="true"
          >
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </span>
        )}
      </button>
      {(!collapsible || !collapsed) && <div className="border-t border-text-brand-gray-lightest px-4 py-4">{children}</div>}
    </section>
  );
}

interface LabeledFieldProps {
  label: string;
  hint?: string;
  hintTone?: 'muted' | 'error';
  children: React.ReactNode;
}

export function LabeledField({
  label,
  hint,
  hintTone = 'muted',
  children,
}: LabeledFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-700">
        {label}
      </span>
      {children}
      {hint && (
        <span
          className={`mt-1 block text-[11px] ${
            hintTone === 'error' ? 'text-red-600' : 'text-brand-gray-medium'
          }`}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

export function IconButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-md border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 cursor-pointer"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
