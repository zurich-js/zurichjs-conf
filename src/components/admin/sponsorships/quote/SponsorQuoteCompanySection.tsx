/**
 * Sponsor Quote Company Section
 * Company/contact info inputs for the sponsor quote builder
 */

import { Building2 } from 'lucide-react';
import type { SponsorQuoteState, SponsorQuoteCurrency } from '@/lib/types/sponsor-quote';

interface SponsorQuoteCompanySectionProps {
  state: SponsorQuoteState;
  onUpdate: (partial: Partial<SponsorQuoteState>) => void;
}

const CURRENCY_OPTIONS: { value: SponsorQuoteCurrency; label: string }[] = [
  { value: 'CHF', label: 'CHF — Swiss Franc' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'USD', label: 'USD — US Dollar' },
];

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none';

export function SponsorQuoteCompanySection({ state, onUpdate }: SponsorQuoteCompanySectionProps) {
  return (
    <section className="border border-gray-200 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
          <Building2 className="w-4 h-4" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Sponsor & Contact</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
          <input
            type="text"
            value={state.companyName}
            onChange={(e) => onUpdate({ companyName: e.target.value })}
            placeholder="Acme Corp"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact name</label>
          <input
            type="text"
            value={state.contactName}
            onChange={(e) => onUpdate({ contactName: e.target.value })}
            placeholder="Mark Smith"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact email</label>
          <input
            type="email"
            value={state.contactEmail}
            onChange={(e) => onUpdate({ contactEmail: e.target.value })}
            placeholder="mark@acme.com"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={state.currency}
            onChange={(e) => onUpdate({ currency: e.target.value as SponsorQuoteCurrency })}
            className={`${inputCls} bg-white`}
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
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Internal notes</label>
          <textarea
            value={state.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Internal notes (not shown to sponsor)"
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>
    </section>
  );
}
