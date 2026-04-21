/**
 * Small form primitives shared within the workshop edit drawer.
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
    <section className="mt-6 first:mt-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
        {collapsible && (
          <button
            onClick={onToggle}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 cursor-pointer"
            aria-label={collapsed ? 'Expand section' : 'Collapse section'}
          >
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        )}
      </div>
      {(!collapsible || !collapsed) && <div className="mt-3">{children}</div>}
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
            hintTone === 'error' ? 'text-red-600' : 'text-gray-500'
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
