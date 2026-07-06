/**
 * Workshop Items Editor - Add/edit workshop seat line items on a B2B invoice
 * Used by CreateInvoiceModal and the invoice details edit form.
 */

import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import type { WorkshopItemInput } from '@/lib/types/b2b';
import type { B2BAvailableWorkshopsResponse, B2BAvailableWorkshop } from '@/pages/api/admin/b2b-invoices/workshops';
import { formatAmount } from './types';

interface WorkshopItemsEditorProps {
  items: WorkshopItemInput[];
  onChange: (items: WorkshopItemInput[]) => void;
}

async function fetchAvailableWorkshops(): Promise<B2BAvailableWorkshop[]> {
  const response = await fetch('/api/admin/b2b-invoices/workshops');
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || 'Failed to load workshops');
  }
  const data = (await response.json()) as B2BAvailableWorkshopsResponse;
  return data.workshops;
}

export function WorkshopItemsEditor({ items, onChange }: WorkshopItemsEditorProps) {
  const { data: available, isLoading, isError } = useQuery({
    queryKey: ['admin', 'b2b-invoice-workshops'],
    queryFn: fetchAvailableWorkshops,
    staleTime: 5 * 60 * 1000,
  });

  const availableById = new Map((available ?? []).map((w) => [w.id, w]));
  const unused = (available ?? []).filter(
    (w) => !items.some((item) => item.workshopId === w.id)
  );

  const addWorkshop = (workshop: B2BAvailableWorkshop) => {
    onChange([
      ...items,
      {
        workshopId: workshop.id,
        title: workshop.title,
        quantity: 1,
        unitPrice: workshop.unitPrice ?? 0,
      },
    ]);
  };

  const updateItem = (index: number, partial: Partial<WorkshopItemInput>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...partial } : item)));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      {isLoading && <p className="text-xs text-gray-500">Loading workshops...</p>}
      {isError && <p className="text-xs text-red-600">Failed to load workshops.</p>}

      {/* Picker for workshops not yet on the invoice */}
      {unused.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">Add a workshop:</p>
          <div className="flex flex-wrap gap-2">
            {unused.map((workshop) => (
              <button
                key={workshop.id}
                type="button"
                onClick={() => addWorkshop(workshop)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:border-brand-primary hover:bg-brand-primary/5 hover:text-black transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>{workshop.title}</span>
                {workshop.unitPrice !== null && (
                  <span className="text-gray-400">· {formatAmount(workshop.unitPrice)}</span>
                )}
                <span className="text-gray-400">· {workshop.capacityRemaining} seats left</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!isLoading && items.length === 0 && unused.length === 0 && (
        <p className="text-xs text-gray-400">No published workshops available</p>
      )}
      {items.length === 0 && unused.length > 0 && (
        <p className="text-xs text-gray-400">No workshops on this invoice</p>
      )}

      {/* Selected workshop lines */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const capacityRemaining = availableById.get(item.workshopId)?.capacityRemaining;
          const overCapacity =
            capacityRemaining !== undefined && item.quantity > capacityRemaining;
          return (
            <div key={item.workshopId} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[140px]">
                  <span className="block text-xs text-gray-500 mb-1">
                    <GraduationCap className="w-3 h-3 inline mr-1" aria-hidden="true" />
                    Workshop
                  </span>
                  <span className="block text-sm font-medium text-gray-900">{item.title}</span>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Seats</label>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 text-right focus:ring-2 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Seat price (CHF)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice / 100}
                    onChange={(e) =>
                      updateItem(index, {
                        unitPrice: Math.max(0, Math.round(parseFloat(e.target.value) * 100) || 0),
                      })
                    }
                    className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 text-right focus:ring-2 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
                <div className="text-xs text-gray-500 pb-2">
                  = {formatAmount(item.unitPrice * item.quantity)}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Remove workshop"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="sr-only">Remove {item.title}</span>
                </button>
              </div>
              {overCapacity && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                  Only {capacityRemaining} seat(s) remaining for this workshop — payment will fail
                  unless capacity is increased.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
