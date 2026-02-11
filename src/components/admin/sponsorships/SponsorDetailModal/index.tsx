/**
 * Sponsor Detail Modal Component
 * Displays and manages a sponsorship deal's details
 */

import { useState } from 'react';
import { X, Building2, DollarSign, CheckSquare, FileText } from 'lucide-react';
import Image from 'next/image';
import { StatusBadge } from '../StatusBadge';
import { LineItemsEditor } from '../LineItemsEditor';
import { PerksEditor } from '../PerksEditor';
import type { SponsorshipDealWithRelations, SponsorshipCurrency } from '../types';
import { DetailsTab } from './DetailsTab';
import { InvoiceTab } from './InvoiceTab';
import type { TabId } from './types';

interface SponsorDetailModalProps {
  deal: SponsorshipDealWithRelations;
  onClose: () => void;
  onUpdate: () => void;
}

const tabs = [
  { id: 'details' as const, label: 'Details', icon: Building2 },
  { id: 'pricing' as const, label: 'Pricing', icon: DollarSign },
  { id: 'perks' as const, label: 'Perks', icon: CheckSquare },
  { id: 'invoice' as const, label: 'Invoice', icon: FileText },
];

export function SponsorDetailModal({ deal, onClose, onUpdate }: SponsorDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sponsor, tier, line_items, perks } = deal;

  // Calculate totals
  const tierBase = line_items.filter(li => li.type === 'tier_base').reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const addons = line_items.filter(li => li.type === 'addon').reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const adjustments = line_items.filter(li => li.type === 'adjustment').reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const creditAvailable = deal.currency === 'CHF' ? tier.addon_credit_chf : tier.addon_credit_eur;
  const creditableAddons = line_items.filter(li => li.type === 'addon' && li.uses_credit).reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const creditApplied = Math.min(creditAvailable, creditableAddons);
  const subtotal = tierBase + addons;
  const total = Math.max(0, subtotal - creditApplied + adjustments);

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                {sponsor.logo_url ? (
                  <Image src={sponsor.logo_url} alt={sponsor.company_name} fill className="object-contain p-1" unoptimized={sponsor.logo_url.endsWith('.svg') || sponsor.logo_url.endsWith('.gif')} />
                ) : (
                  <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center"><Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" /></div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-gray-900 truncate">{sponsor.company_name}</h2>
                <p className="text-xs sm:text-sm text-gray-500 font-mono">{deal.deal_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <StatusBadge status={deal.status} size="sm" />
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="px-6 py-3 bg-red-50 border-b border-red-200"><p className="text-sm text-red-700">{error}</p></div>}

        {/* Tabs */}
        <div className="px-4 sm:px-6 py-2 sm:py-0 border-b border-gray-200">
          {/* Mobile: Segmented control */}
          <nav className="flex sm:hidden bg-gray-100 rounded-lg p-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-md text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="h-4 w-4" /><span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Desktop: Underline tabs */}
          <nav className="hidden sm:flex gap-6">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 py-4 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-[#F1E271] text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="h-4 w-4" /><span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'details' && (
            <DetailsTab deal={deal} onUpdate={onUpdate} isUpdating={isUpdating} setIsUpdating={setIsUpdating} setError={setError} />
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                <h3 className="text-sm font-medium text-gray-700">Line Items</h3>
                <div className="text-xs sm:text-sm text-gray-500">Tier Credit: {formatAmount(creditAvailable, deal.currency)}</div>
              </div>
              <LineItemsEditor dealId={deal.id} lineItems={line_items} currency={deal.currency as SponsorshipCurrency} tierCreditAvailable={creditAvailable} onUpdate={onUpdate} />
            </div>
          )}

          {activeTab === 'perks' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Perks Checklist</h3>
              <PerksEditor dealId={deal.id} perks={perks} onUpdate={onUpdate} />
            </div>
          )}

          {activeTab === 'invoice' && (
            <InvoiceTab deal={deal} total={total} onUpdate={onUpdate} isUpdating={isUpdating} setIsUpdating={setIsUpdating} setError={setError} />
          )}
        </div>
      </div>
    </div>
  );
}
