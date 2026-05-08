/**
 * Quote Option Editor
 * Editable card for a single quote option: tickets, workshops, custom items, discounts
 */

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Ticket,
  GraduationCap,
  Plus,
  Trash2,
  Crown,
} from 'lucide-react';
import type {
  B2BQuoteOption,
  WorkshopQuoteLine,
  CustomQuoteLine,
  CustomDiscountLine,
  QuoteOptionBreakdown,
  QuoteCurrency,
} from '@/lib/types/b2b-quote';
import { formatQuoteAmount } from '@/lib/b2b/quote-calculations';

export interface AvailableWorkshop {
  id: string;
  title: string;
  slug: string;
  unitAmountCents: number;
  durationMinutes: number | null;
}

interface QuoteOptionEditorProps {
  option: B2BQuoteOption;
  breakdown: QuoteOptionBreakdown;
  currency: QuoteCurrency;
  canRemove: boolean;
  availableWorkshops: AvailableWorkshop[];
  onUpdate: (updated: B2BQuoteOption) => void;
  onRemove: () => void;
}

// ---------------------------------------------------------------------------
// Inline input helpers
// ---------------------------------------------------------------------------

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary focus:outline-none';
const numberCls = 'w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-black text-right focus:ring-2 focus:ring-brand-primary focus:outline-none';
const smallInputCls = 'w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:outline-none';

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

function displayToCents(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

let nextId = 1;
function uid(): string {
  return `item-${Date.now()}-${nextId++}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuoteOptionEditor({
  option,
  breakdown,
  currency,
  canRemove,
  availableWorkshops,
  onUpdate,
  onRemove,
}: QuoteOptionEditorProps) {
  const [collapsed, setCollapsed] = useState(false);

  const patch = (partial: Partial<B2BQuoteOption>) => onUpdate({ ...option, ...partial });

  // ---------------------------------------------------------------------------
  // Ticket helpers
  // ---------------------------------------------------------------------------

  const updateStandard = (field: string, value: number) =>
    patch({ standardTickets: { ...option.standardTickets, [field]: value } });

  const updateVip = (field: string, value: number) =>
    patch({ vipTickets: { ...option.vipTickets, [field]: value } });

  // ---------------------------------------------------------------------------
  // Workshop helpers
  // ---------------------------------------------------------------------------

  const addWorkshopById = (workshopId: string) => {
    const found = availableWorkshops.find((w) => w.id === workshopId);
    if (!found) return;
    const ws: WorkshopQuoteLine = {
      workshopId: found.id,
      title: found.title,
      slug: found.slug,
      quantity: 1,
      unitPriceCents: found.unitAmountCents,
      discountPercent: 0,
      linkedToVip: false,
    };
    patch({ workshops: [...option.workshops, ws] });
  };

  // Workshops not yet added to this option
  const unusedWorkshops = availableWorkshops.filter(
    (aw) => !option.workshops.some((w) => w.workshopId === aw.id),
  );

  const updateWorkshop = (idx: number, partial: Partial<WorkshopQuoteLine>) => {
    const next = option.workshops.map((w, i) => (i === idx ? { ...w, ...partial } : w));
    patch({ workshops: next });
  };

  const removeWorkshop = (idx: number) => {
    patch({ workshops: option.workshops.filter((_, i) => i !== idx) });
  };

  // ---------------------------------------------------------------------------
  // Custom line item helpers
  // ---------------------------------------------------------------------------

  const addCustomItem = () => {
    const item: CustomQuoteLine = { id: uid(), label: '', quantity: 1, unitPriceCents: 0 };
    patch({ customLineItems: [...option.customLineItems, item] });
  };

  const updateCustomItem = (idx: number, partial: Partial<CustomQuoteLine>) => {
    const next = option.customLineItems.map((c, i) => (i === idx ? { ...c, ...partial } : c));
    patch({ customLineItems: next });
  };

  const removeCustomItem = (idx: number) => {
    patch({ customLineItems: option.customLineItems.filter((_, i) => i !== idx) });
  };

  // ---------------------------------------------------------------------------
  // Custom discount helpers
  // ---------------------------------------------------------------------------

  const addCustomDiscount = () => {
    const d: CustomDiscountLine = { id: uid(), label: '', type: 'percent', value: 0 };
    patch({ customDiscounts: [...option.customDiscounts, d] });
  };

  const updateCustomDiscount = (idx: number, partial: Partial<CustomDiscountLine>) => {
    const next = option.customDiscounts.map((d, i) => (i === idx ? { ...d, ...partial } : d));
    patch({ customDiscounts: next });
  };

  const removeCustomDiscount = (idx: number) => {
    patch({ customDiscounts: option.customDiscounts.filter((_, i) => i !== idx) });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* Collapsible header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed(!collapsed)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(!collapsed); } }}
        className="w-full flex items-center justify-between px-5 sm:px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-700">
            <Ticket className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">
              {option.title || 'Untitled Option'}
            </h3>
            <span className="text-xs text-gray-500">
              {breakdown.totalPeople} people · {formatQuoteAmount(breakdown.totalCents, currency)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Remove option"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {!collapsed && (
        <div className="px-5 sm:px-6 py-5 space-y-6">
          {/* Option title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Option title</label>
            <input
              type="text"
              value={option.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="e.g. Standard Package"
              className={inputCls}
            />
          </div>

          {/* Standard tickets */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-medium text-gray-800">Standard Tickets</h4>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Qty</label>
                <input
                  type="number"
                  min={0}
                  value={option.standardTickets.quantity}
                  onChange={(e) => updateStandard('quantity', Math.max(0, parseInt(e.target.value) || 0))}
                  className={numberCls}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Unit price</label>
                <input
                  type="text"
                  value={centsToDisplay(option.standardTickets.unitPriceCents)}
                  onChange={(e) => updateStandard('unitPriceCents', displayToCents(e.target.value))}
                  className={smallInputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Discount %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={option.standardTickets.discountPercent}
                  onChange={(e) => updateStandard('discountPercent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className={numberCls}
                />
              </div>
              {option.standardTickets.quantity > 0 && (
                <div className="text-xs text-gray-500 mt-4">
                  = {formatQuoteAmount(breakdown.standardTickets.netCents, currency)}
                </div>
              )}
            </div>
          </div>

          {/* VIP tickets */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-medium text-gray-800">VIP Tickets</h4>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Qty</label>
                <input
                  type="number"
                  min={0}
                  value={option.vipTickets.quantity}
                  onChange={(e) => updateVip('quantity', Math.max(0, parseInt(e.target.value) || 0))}
                  className={numberCls}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Unit price</label>
                <input
                  type="text"
                  value={centsToDisplay(option.vipTickets.unitPriceCents)}
                  onChange={(e) => updateVip('unitPriceCents', displayToCents(e.target.value))}
                  className={smallInputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Discount %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={option.vipTickets.discountPercent}
                  onChange={(e) => updateVip('discountPercent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className={numberCls}
                />
              </div>
              {option.vipTickets.quantity > 0 && (
                <div className="text-xs text-gray-500 mt-4">
                  = {formatQuoteAmount(breakdown.vipTickets.netCents, currency)}
                </div>
              )}
            </div>
          </div>

          {/* Workshops */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-800">Workshops</h4>
              </div>
            </div>

            {/* Workshop picker */}
            {unusedWorkshops.length > 0 && (
              <div className="mb-3">
                <select
                  value=""
                  onChange={(e) => { if (e.target.value) addWorkshopById(e.target.value); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black bg-white focus:ring-2 focus:ring-brand-primary focus:outline-none"
                >
                  <option value="">+ Add a workshop...</option>
                  {unusedWorkshops.map((aw) => (
                    <option key={aw.id} value={aw.id}>
                      {aw.title}{aw.unitAmountCents > 0 ? ` — ${centsToDisplay(aw.unitAmountCents)} ${currency}` : ''}
                      {aw.durationMinutes ? ` (${aw.durationMinutes}min)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {option.workshops.length === 0 && unusedWorkshops.length === 0 && (
              <p className="text-xs text-gray-400">No workshops available</p>
            )}
            {option.workshops.length === 0 && unusedWorkshops.length > 0 && (
              <p className="text-xs text-gray-400">Select a workshop above to add it</p>
            )}
            <div className="space-y-3">
              {option.workshops.map((ws, idx) => (
                <div key={ws.workshopId} className="flex flex-wrap items-end gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs text-gray-500 mb-1">Workshop</label>
                    <span className="block text-sm font-medium text-gray-900 py-1.5">{ws.title}</span>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Qty</label>
                    <input
                      type="number"
                      min={0}
                      value={ws.quantity}
                      onChange={(e) => updateWorkshop(idx, { quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                      className={numberCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Price</label>
                    <input
                      type="text"
                      value={centsToDisplay(ws.unitPriceCents)}
                      onChange={(e) => updateWorkshop(idx, { unitPriceCents: displayToCents(e.target.value) })}
                      className={smallInputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Disc %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={ws.discountPercent}
                      onChange={(e) => updateWorkshop(idx, { discountPercent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                      className={numberCls}
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 pb-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ws.linkedToVip}
                      onChange={(e) => updateWorkshop(idx, { linkedToVip: e.target.checked })}
                      className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                    />
                    VIP benefit
                  </label>
                  <button
                    type="button"
                    onClick={() => removeWorkshop(idx)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove workshop"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Custom line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-800">Custom Line Items</h4>
              <button
                type="button"
                onClick={addCustomItem}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-black transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {option.customLineItems.length === 0 && (
              <p className="text-xs text-gray-400">No custom items</p>
            )}
            <div className="space-y-2">
              {option.customLineItems.map((item, idx) => (
                <div key={item.id} className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[140px]">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateCustomItem(idx, { label: e.target.value })}
                      placeholder="Label"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Qty</label>
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) => updateCustomItem(idx, { quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                      className={numberCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Price</label>
                    <input
                      type="text"
                      value={centsToDisplay(item.unitPriceCents)}
                      onChange={(e) => updateCustomItem(idx, { unitPriceCents: displayToCents(e.target.value) })}
                      className={smallInputCls}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomItem(idx)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Custom discounts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-800">Custom Discounts</h4>
              <button
                type="button"
                onClick={addCustomDiscount}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-black transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {option.customDiscounts.length === 0 && (
              <p className="text-xs text-gray-400">No custom discounts</p>
            )}
            <div className="space-y-2">
              {option.customDiscounts.map((d, idx) => (
                <div key={d.id} className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[120px]">
                    <input
                      type="text"
                      value={d.label}
                      onChange={(e) => updateCustomDiscount(idx, { label: e.target.value })}
                      placeholder="Discount label"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <select
                      value={d.type}
                      onChange={(e) => updateCustomDiscount(idx, { type: e.target.value as 'fixed' | 'percent' })}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-black bg-white focus:ring-2 focus:ring-brand-primary focus:outline-none"
                    >
                      <option value="percent">%</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {d.type === 'percent' ? 'Percent' : 'Amount'}
                    </label>
                    <input
                      type="text"
                      value={d.type === 'percent' ? String(d.value) : centsToDisplay(d.value)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val = d.type === 'percent'
                          ? Math.min(100, Math.max(0, parseFloat(raw) || 0))
                          : displayToCents(raw);
                        updateCustomDiscount(idx, { value: val });
                      }}
                      className={smallInputCls}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomDiscount(idx)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
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
