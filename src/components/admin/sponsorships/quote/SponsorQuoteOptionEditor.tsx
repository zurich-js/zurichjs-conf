/**
 * Sponsor Quote Option Editor
 * Editable card for a single sponsor quote option with tier picker,
 * add-on budget tracking, exclusivity, and per-proposal highlights.
 */

import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Lock,
  Package,
  Star,
  Wallet,
  ToggleRight,
} from 'lucide-react';
import type {
  SponsorQuoteCurrency,
  SponsorQuoteOption,
  SponsorQuoteItem,
  SponsorQuoteDiscountLine,
  SponsorQuoteOptionBreakdown,
} from '@/lib/types/sponsor-quote';
import { formatQuoteAmount } from '@/lib/sponsor/quote-calculations';
import { TIER_TEMPLATES, ADD_ON_CATALOG, getAddOnsByCategory, itemsFromTier, convertCHFToCurrency } from '@/lib/sponsor/quote-catalog';
import type { ExchangeRates } from '@/lib/trip-cost/use-exchange-rate';

interface SponsorQuoteOptionEditorProps {
  option: SponsorQuoteOption;
  breakdown: SponsorQuoteOptionBreakdown;
  currency: SponsorQuoteCurrency;
  rates: ExchangeRates;
  canRemove: boolean;
  isRecommended: boolean;
  onToggleRecommended: () => void;
  onUpdate: (updated: SponsorQuoteOption) => void;
  onRemove: () => void;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none';
const numberCls = 'w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-black text-right focus:ring-2 focus:ring-brand-primary focus:outline-none';
const smallInputCls = 'w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:outline-none';

function centsToDisplay(cents: number): string { return (cents / 100).toFixed(2); }

let nextId = 1;
function uid(): string { return `si-${Date.now()}-${nextId++}`; }

function MoneyInput({ cents, onChange, className }: { cents: number; onChange: (c: number) => void; className?: string }) {
  const [draft, setDraft] = useState<string>(() => centsToDisplay(cents));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(centsToDisplay(cents)); }, [cents]);
  const commit = () => {
    const n = parseFloat(draft.replace(',', '.'));
    const next = isNaN(n) ? 0 : Math.max(0, Math.round(n * 100));
    onChange(next);
    setDraft(centsToDisplay(next));
  };
  return (
    <input type="text" inputMode="decimal" value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => { focused.current = true; e.target.select(); }}
      onBlur={() => { focused.current = false; commit(); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={className ?? smallInputCls}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SponsorQuoteOptionEditor({
  option, breakdown, currency, rates, canRemove,
  isRecommended, onToggleRecommended, onUpdate, onRemove,
}: SponsorQuoteOptionEditorProps) {
  const [collapsed, setCollapsed] = useState(false);

  const updateItem = (idx: number, patch: Partial<SponsorQuoteItem>) => {
    onUpdate({ ...option, items: option.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  };
  const removeItem = (idx: number) => {
    onUpdate({ ...option, items: option.items.filter((_, i) => i !== idx) });
  };

  // Tier picker — items always store CHF amounts
  const applyTier = (tierId: string) => {
    const tier = TIER_TEMPLATES.find((t) => t.id === tierId);
    if (!tier) return;
    const items = itemsFromTier(tier, 'CHF', {});
    onUpdate({
      ...option,
      title: option.title || `${tier.name} Package`,
      addOnBudgetCents: tier.addOnBudgetCHF,
      items,
    });
  };

  // Add-on item from catalog — always CHF
  const addAddOn = (addOnId: string) => {
    const cat = ADD_ON_CATALOG.find((c) => c.id === addOnId);
    if (!cat) return;
    const item: SponsorQuoteItem = {
      id: uid(), category: cat.category, label: cat.label,
      quantity: 1, unitPriceCents: cat.priceCHF, discountPercent: 0,
      includedInTier: false, forgoneQty: 0, forgoneValuePerUnitCents: 0, exclusive: false,
      exclusivityPremiumType: 'fixed', exclusivityPremiumValue: cat.suggestedExclusivityPremiumCHF,
      exclusivityToggleable: false, optional: false, optionalDefault: true,
    };
    onUpdate({ ...option, items: [...option.items, item] });
  };

  const addCustomItem = () => {
    const item: SponsorQuoteItem = {
      id: uid(), category: 'Custom', label: '', quantity: 1, unitPriceCents: 0,
      discountPercent: 0, includedInTier: false, forgoneQty: 0, forgoneValuePerUnitCents: 0,
      exclusive: false, exclusivityPremiumType: 'fixed', exclusivityPremiumValue: 0,
      exclusivityToggleable: false, optional: false, optionalDefault: true,
    };
    onUpdate({ ...option, items: [...option.items, item] });
  };

  // Discounts
  const addDiscount = () => {
    onUpdate({ ...option, customDiscounts: [...option.customDiscounts, { id: uid(), label: '', type: 'percent', value: 0 }] });
  };
  const updateDiscount = (idx: number, patch: Partial<SponsorQuoteDiscountLine>) => {
    onUpdate({ ...option, customDiscounts: option.customDiscounts.map((d, i) => (i === idx ? { ...d, ...patch } : d)) });
  };
  const removeDiscount = (idx: number) => {
    onUpdate({ ...option, customDiscounts: option.customDiscounts.filter((_, i) => i !== idx) });
  };

  // Highlights
  const addHighlight = () => onUpdate({ ...option, highlights: [...(option.highlights ?? []), ''] });
  const updateHighlight = (idx: number, v: string) => {
    const next = [...(option.highlights ?? [])]; next[idx] = v;
    onUpdate({ ...option, highlights: next });
  };
  const removeHighlight = (idx: number) => onUpdate({ ...option, highlights: (option.highlights ?? []).filter((_, i) => i !== idx) });

  const categories = [...new Set(option.items.map((i) => i.category))];
  const addOnsByCategory = getAddOnsByCategory();
  const hasTierBase = option.items.some((i) => i.category === 'Sponsorship Tier');

  return (
    <section className={`border rounded-2xl overflow-hidden ${isRecommended ? 'border-2 border-brand-primary' : 'border-gray-200'}`}>
      {/* Header */}
      <div className={`px-5 sm:px-6 py-4 flex items-center justify-between ${isRecommended ? 'bg-brand-primary/10' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isRecommended ? 'bg-brand-primary text-black' : 'bg-gray-200 text-gray-600'}`}>
            <Package className="w-4 h-4" />
          </div>
          <input type="text" value={option.title}
            onChange={(e) => onUpdate({ ...option, title: e.target.value })}
            placeholder="Proposal title (e.g. Gold Package)"
            className="flex-1 bg-transparent text-base font-semibold text-gray-900 placeholder-gray-400 focus:outline-none min-w-0"
          />
        </div>
        <div className="flex items-center gap-2 ml-2">
          <button type="button" onClick={onToggleRecommended}
            title={isRecommended ? 'Remove recommendation' : 'Mark as recommended'}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${isRecommended ? 'text-brand-primary bg-brand-primary/20' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}>
            <Star className={`w-4 h-4 ${isRecommended ? 'fill-current' : ''}`} />
          </button>
          {canRemove && (
            <button type="button" onClick={onRemove} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-5 sm:px-6 py-5 space-y-6">

          {/* Tier Picker */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {hasTierBase ? 'Change Tier' : 'Select a Tier'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {TIER_TEMPLATES.map((tier) => (
                <button key={tier.id} type="button" onClick={() => applyTier(tier.id)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-brand-primary/20 hover:text-black transition-colors cursor-pointer">
                  {tier.name} — {formatQuoteAmount(tier.basePriceCHF, 'CHF')}
                </button>
              ))}
            </div>
          </div>

          {/* Add-on Budget */}
          {hasTierBase && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Add-on Budget</span>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs text-blue-700 mb-1">Total budget (CHF)</label>
                  <MoneyInput cents={option.addOnBudgetCents}
                    onChange={(c) => onUpdate({ ...option, addOnBudgetCents: c })}
                    className={`${smallInputCls} border-blue-300 focus:ring-blue-500`} />
                </div>
                <div className="text-sm">
                  <span className="text-blue-700">Spent: </span>
                  <span className="font-medium text-blue-900">{formatQuoteAmount(breakdown.addOnSpentCents, 'CHF')}</span>
                </div>
                <div className="text-sm">
                  <span className={breakdown.addOnRemainingCents < 0 ? 'text-red-600' : 'text-blue-700'}>Remaining: </span>
                  <span className={`font-medium ${breakdown.addOnRemainingCents < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {formatQuoteAmount(breakdown.addOnRemainingCents, 'CHF')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Items grouped by category */}
          {categories.map((category) => {
            const categoryItems = option.items.map((item, idx) => ({ item, idx })).filter(({ item }) => item.category === category);
            return (
              <div key={category}>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{category}</h4>
                <div className="space-y-3">
                  {categoryItems.map(({ item, idx }) => (
                    <div key={item.id} className={`border rounded-xl p-4 space-y-3 ${item.includedInTier ? 'border-gray-100 bg-gray-50/50' : 'border-gray-200'}`}>
                      {/* Label + badges + remove */}
                      <div className="flex items-center gap-2">
                        {item.exclusive && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        <input type="text" value={item.label}
                          onChange={(e) => updateItem(idx, { label: e.target.value })}
                          placeholder="Item label" className={`flex-1 ${inputCls}`} />
                        {item.includedInTier && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                            item.forgoneQty >= item.quantity ? 'bg-orange-100 text-orange-700' : item.forgoneQty > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {item.forgoneQty >= item.quantity ? 'Forgone' : item.forgoneQty > 0 ? `${item.quantity - item.forgoneQty} kept` : 'Included'}
                          </span>
                        )}
                        <button type="button" onClick={() => removeItem(idx)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Partial forgone for included items */}
                      {item.includedInTier && item.quantity > 0 && (
                        <div className={`rounded-lg p-3 -mx-1 ${item.forgoneQty > 0 ? 'bg-orange-50 border border-orange-200' : ''}`}>
                          <div className="flex flex-wrap items-end gap-3">
                            <div>
                              <label className="block text-xs text-orange-700 mb-1">Forgone qty (of {item.quantity})</label>
                              <input type="number" min={0} max={item.quantity}
                                value={item.forgoneQty}
                                onChange={(e) => updateItem(idx, { forgoneQty: Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0)) })}
                                className={`${numberCls} ${item.forgoneQty > 0 ? 'border-orange-300' : ''}`} />
                            </div>
                            {item.forgoneQty > 0 && (
                              <>
                                <div>
                                  <label className="block text-xs text-orange-700 mb-1">Credit per unit (CHF)</label>
                                  <MoneyInput cents={item.forgoneValuePerUnitCents}
                                    onChange={(c) => updateItem(idx, { forgoneValuePerUnitCents: c })}
                                    className={`${smallInputCls} border-orange-300 focus:ring-orange-500`} />
                                </div>
                                <span className="text-xs text-orange-600 pb-1.5">
                                  = {formatQuoteAmount(item.forgoneQty * item.forgoneValuePerUnitCents, 'CHF')} add-on credit
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Qty, Price, Discount — hidden for forgone items */}
                      {!(item.includedInTier && item.forgoneQty >= item.quantity) && (
                        <>
                          <div className="flex flex-wrap items-end gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Qty</label>
                              <input type="number" min={1} value={item.quantity}
                                onChange={(e) => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                className={numberCls} />
                            </div>
                            {!item.includedInTier && (
                              <>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Unit price (CHF)</label>
                                  <MoneyInput cents={item.unitPriceCents} onChange={(c) => updateItem(idx, { unitPriceCents: c })} />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Discount %</label>
                                  <input type="number" min={0} max={100} value={item.discountPercent}
                                    onChange={(e) => updateItem(idx, { discountPercent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                                    className={numberCls} />
                                </div>
                                <div className="text-right">
                                  <label className="block text-xs text-gray-500 mb-1">Net</label>
                                  <span className="text-sm font-medium text-gray-900">
                                    {formatQuoteAmount(breakdown.items.find((b) => b.id === item.id)?.netCents ?? 0, 'CHF')}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Exclusivity (not for included items) */}
                          {!item.includedInTier && (
                            <>
                              <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={item.exclusive}
                                    onChange={(e) => updateItem(idx, { exclusive: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                                  <span className="text-sm text-gray-700">Exclusive</span>
                                </label>
                                {item.exclusive && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                    <Lock className="w-3 h-3" /> Exclusive
                                  </span>
                                )}
                              </div>
                              {item.exclusive && (
                                <div className="pl-6 flex flex-wrap items-end gap-3 bg-amber-50/50 rounded-lg p-3 -mx-1">
                                  <div>
                                    <label className="block text-xs text-amber-700 mb-1">Premium type</label>
                                    <select value={item.exclusivityPremiumType}
                                      onChange={(e) => updateItem(idx, { exclusivityPremiumType: e.target.value as 'fixed' | 'percent' })}
                                      className="px-2 py-1.5 border border-amber-300 rounded-lg text-sm text-black bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none">
                                      <option value="fixed">Fixed (CHF)</option>
                                      <option value="percent">Percentage (%)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-amber-700 mb-1">
                                      {item.exclusivityPremiumType === 'fixed' ? 'Premium (CHF)' : 'Premium %'}
                                    </label>
                                    {item.exclusivityPremiumType === 'fixed' ? (
                                      <MoneyInput cents={item.exclusivityPremiumValue}
                                        onChange={(c) => updateItem(idx, { exclusivityPremiumValue: c })}
                                        className={`${smallInputCls} border-amber-300 focus:ring-amber-500`} />
                                    ) : (
                                      <input type="number" min={0} max={100} value={item.exclusivityPremiumValue}
                                        onChange={(e) => updateItem(idx, { exclusivityPremiumValue: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                                        className={`${numberCls} border-amber-300 focus:ring-amber-500`} />
                                    )}
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={item.exclusivityToggleable}
                                      onChange={(e) => updateItem(idx, { exclusivityToggleable: e.target.checked })}
                                      className="w-4 h-4 rounded border-amber-300 text-amber-500 focus:ring-amber-500" />
                                    <span className="text-xs text-amber-700">Sponsor can toggle</span>
                                  </label>
                                  {item.exclusivityToggleable && (
                                    <span className="text-xs text-amber-600">
                                      Default: {item.exclusive ? 'exclusive (opt-out)' : 'non-exclusive (opt-in)'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          )}

                          {/* Optional — sponsor can toggle this item on/off */}
                          {!item.includedInTier && (
                            <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={item.optional}
                                  onChange={(e) => updateItem(idx, { optional: e.target.checked })}
                                  className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500" />
                                <span className="text-sm text-gray-700">Optional for sponsor</span>
                              </label>
                              {item.optional && (
                                <>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                                    <ToggleRight className="w-3 h-3" /> Toggleable
                                  </span>
                                  <label className="flex items-center gap-2 cursor-pointer ml-2">
                                    <input type="checkbox" checked={item.optionalDefault}
                                      onChange={(e) => updateItem(idx, { optionalDefault: e.target.checked })}
                                      className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500" />
                                    <span className="text-xs text-purple-700">Included by default</span>
                                  </label>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Add-on items from catalog */}
          {hasTierBase && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add Items (uses add-on budget)</h4>
              <div className="space-y-3">
                {Object.entries(addOnsByCategory).map(([category, items]) => (
                  <div key={category}>
                    <span className="text-xs text-gray-400 mb-1 block">{category}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((c) => (
                        <button key={c.id} type="button" onClick={() => addAddOn(c.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700 hover:bg-brand-primary/20 hover:text-black transition-colors cursor-pointer">
                          <Plus className="w-3 h-3" />
                          {c.label} ({formatQuoteAmount(c.priceCHF, 'CHF')})
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add custom item */}
          <button type="button" onClick={addCustomItem}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-black transition-colors cursor-pointer">
            <Plus className="w-4 h-4" /> Add custom item
          </button>

          {/* Custom Discounts */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Custom Discounts</h4>
              <button type="button" onClick={addDiscount}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-black transition-colors cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {option.customDiscounts.length === 0 && (
              <p className="text-xs text-gray-400">No custom discounts</p>
            )}
            <div className="space-y-2">
              {option.customDiscounts.map((d, idx) => (
                <div key={d.id} className="flex items-end gap-2">
                  <div className="flex-1">
                    <input type="text" value={d.label} onChange={(e) => updateDiscount(idx, { label: e.target.value })}
                      placeholder="Discount label" className={inputCls} />
                  </div>
                  <select value={d.type} onChange={(e) => updateDiscount(idx, { type: e.target.value as 'fixed' | 'percent' })}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-black bg-white focus:ring-2 focus:ring-brand-primary focus:outline-none">
                    <option value="percent">%</option>
                    <option value="fixed">Fixed</option>
                  </select>
                  {d.type === 'percent' ? (
                    <input type="number" min={0} max={100} value={d.value}
                      onChange={(e) => updateDiscount(idx, { value: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                      className={numberCls} />
                  ) : (
                    <MoneyInput cents={d.value} onChange={(c) => updateDiscount(idx, { value: c })} />
                  )}
                  <button type="button" onClick={() => removeDiscount(idx)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Per-proposal Highlights */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Highlights</h4>
              <button type="button" onClick={addHighlight}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-black transition-colors cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {(option.highlights ?? []).length === 0 && (
              <p className="text-xs text-gray-400">e.g. &quot;Dedicated account manager&quot; — shown on this proposal only</p>
            )}
            <div className="space-y-2">
              {(option.highlights ?? []).map((h, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="text" value={h} onChange={(e) => updateHighlight(idx, e.target.value)}
                    placeholder="e.g. Priority booth placement" className={`flex-1 ${inputCls}`} />
                  <button type="button" onClick={() => removeHighlight(idx)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
