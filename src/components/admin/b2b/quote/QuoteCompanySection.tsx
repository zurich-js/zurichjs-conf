/**
 * Quote Company Section
 * Company/contact info inputs for the quote builder
 */

import { Building2, Plus, Trash2 } from 'lucide-react';
import type { B2BQuoteState, QuoteCurrency } from '@/lib/types/b2b-quote';

interface QuoteCompanySectionProps {
  state: B2BQuoteState;
  onUpdate: (partial: Partial<B2BQuoteState>) => void;
}

const CURRENCY_OPTIONS: { value: QuoteCurrency; label: string }[] = [
  { value: 'CHF', label: 'CHF — Swiss Franc' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'USD', label: 'USD — US Dollar' },
];

export function QuoteCompanySection({ state, onUpdate }: QuoteCompanySectionProps) {
  return (
    <section className="border border-gray-200 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
          <Building2 className="w-4 h-4" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Company & Contact</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
          <input
            type="text"
            value={state.companyName}
            onChange={(e) => onUpdate({ companyName: e.target.value })}
            placeholder="Acme Corp"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact name</label>
          <input
            type="text"
            value={state.contactName}
            onChange={(e) => onUpdate({ contactName: e.target.value })}
            placeholder="Mark Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact email</label>
          <input
            type="email"
            value={state.contactEmail}
            onChange={(e) => onUpdate({ contactEmail: e.target.value })}
            placeholder="mark@acme.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={state.currency}
            onChange={(e) => onUpdate({ currency: e.target.value as QuoteCurrency })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black bg-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none"
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valid until</label>
          <input
            type="date"
            value={state.validUntil}
            onChange={(e) => onUpdate({ validUntil: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Internal notes</label>
          <textarea
            value={state.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Internal notes (not shown to client)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none resize-none"
          />
        </div>
        {/* Highlights — applies to all options */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Highlights</label>
            <button
              type="button"
              onClick={() => onUpdate({ highlights: [...(state.highlights ?? []), ''] })}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-black transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {(state.highlights ?? []).length === 0 && (
            <p className="text-xs text-gray-400">e.g. &quot;Single invoice&quot;, &quot;Logistics support&quot; — shown on all options</p>
          )}
          <div className="space-y-2">
            {(state.highlights ?? []).map((h, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={h}
                  onChange={(e) => {
                    const next = [...(state.highlights ?? [])];
                    next[idx] = e.target.value;
                    onUpdate({ highlights: next });
                  }}
                  placeholder="e.g. Single invoice"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onUpdate({ highlights: (state.highlights ?? []).filter((_, i) => i !== idx) })}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
