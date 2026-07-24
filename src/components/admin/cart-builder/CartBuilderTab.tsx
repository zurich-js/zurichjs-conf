/**
 * CartBuilderTab - Build a cart for a customer and generate a prefilled /cart link.
 *
 * Lets an admin pick a currency, add tickets/workshops (including sold-out
 * items — the generated link bypasses client-side stock gating, which is the
 * sanctioned case-by-case escape hatch), and copy a shareable checkout link.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, Copy, ExternalLink, Link2, Minus, Plus, ShoppingCart } from 'lucide-react';
import { encodeCartState } from '@/lib/cart-url-state';
import type { Cart, CartItem } from '@/types/cart';
import type { SupportedCurrency } from '@/config/currency';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { adminKeys } from '@/lib/admin/query-keys';

const CURRENCIES: SupportedCurrency[] = ['CHF', 'EUR', 'GBP', 'USD'];

interface StockInfo {
  remaining: number | null;
  total: number | null;
  soldOut: boolean;
}

interface CatalogTicket {
  id: string;
  title: string;
  /** Minor units (cents/centimes). */
  price: number;
  currency: string;
  priceId: string;
  stage: string;
  stock: StockInfo;
}

interface CatalogWorkshop {
  workshopId: string;
  title: string;
  /** Minor units (cents/centimes). */
  price: number;
  currency: string;
  priceId: string;
  capacityRemaining: number;
  soldOut: boolean;
  room: string | null;
  durationMinutes: number | null;
}

interface CartBuilderCatalog {
  currency: SupportedCurrency;
  currentStage: string;
  stageDisplayName: string;
  tickets: CatalogTicket[];
  workshops: CatalogWorkshop[];
  error?: string;
}

const fetchCatalog = async (
  currency: SupportedCurrency,
  signal?: AbortSignal
): Promise<CartBuilderCatalog> => {
  const response = await fetch(`/api/admin/cart-builder/catalog?currency=${currency}`, { signal });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load catalog');
  }
  return data;
};

const formatPrice = (minorUnits: number, currency: string): string =>
  `${(minorUnits / 100).toFixed(2)} ${currency}`;

export function CartBuilderTab() {
  const [currency, setCurrency] = useState<SupportedCurrency>('CHF');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: catalog, isLoading, error, refetch } = useQuery({
    queryKey: adminKeys.cartBuilderCatalog(currency),
    queryFn: ({ signal }) => fetchCatalog(currency, signal),
    // Stripe prices + published workshops are stable reference data.
    staleTime: 5 * 60_000,
  });

  const setQuantity = (key: string, quantity: number) => {
    setQuantities((prev) => ({ ...prev, [key]: Math.max(0, Math.min(20, quantity)) }));
    setGeneratedLink(null);
    setCopied(false);
  };

  const handleCurrencyChange = (next: SupportedCurrency) => {
    setCurrency(next);
    setGeneratedLink(null);
    setCopied(false);
  };

  const buildCartItems = (): CartItem[] => {
    if (!catalog) return [];
    const items: CartItem[] = [];

    for (const ticket of catalog.tickets) {
      const quantity = quantities[`ticket:${ticket.id}`] ?? 0;
      if (quantity <= 0) continue;
      items.push({
        id: ticket.id,
        title: ticket.title,
        price: ticket.price / 100,
        currency: ticket.currency,
        quantity,
        priceId: ticket.priceId,
        variant: ticket.id === 'vip' ? 'vip' : 'standard',
      });
    }

    for (const workshop of catalog.workshops) {
      const quantity = quantities[`workshop:${workshop.workshopId}`] ?? 0;
      if (quantity <= 0) continue;
      items.push({
        id: `workshop_${workshop.workshopId}`,
        kind: 'workshop',
        workshopId: workshop.workshopId,
        title: workshop.title,
        price: workshop.price / 100,
        currency: workshop.currency,
        quantity,
        priceId: workshop.priceId,
        workshopRoom: workshop.room,
        workshopDurationMinutes: workshop.durationMinutes,
      });
    }

    return items;
  };

  const selectedItems = buildCartItems();
  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const hasSoldOutSelection = Boolean(
    catalog && (
      catalog.tickets.some((t) => t.stock.soldOut && (quantities[`ticket:${t.id}`] ?? 0) > 0) ||
      catalog.workshops.some((w) => w.soldOut && (quantities[`workshop:${w.workshopId}`] ?? 0) > 0)
    )
  );

  const handleGenerateLink = () => {
    const items = buildCartItems();
    if (items.length === 0) return;

    const cart: Cart = {
      items,
      totalItems,
      totalPrice,
      currency,
    };

    const encoded = encodeCartState(cart);
    setGeneratedLink(`${window.location.origin}/cart?cart=${encoded}`);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
    } catch {
      // Clipboard unavailable — the link stays visible for manual copying.
    }
  };

  if (error) {
    return (
      <AdminErrorState
        message={error instanceof Error ? error.message : 'Failed to load catalog'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-black">Cart Link Builder</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Build a cart for a customer and send them a prefilled checkout link.
              Sold-out items can be included — the link bypasses stock limits.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Currency */}
        <div>
          <label className="block text-sm font-bold text-black mb-3">Currency</label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Currency">
            {CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleCurrencyChange(code)}
                aria-pressed={currency === code}
                className={`px-5 py-2.5 rounded-lg border-2 text-sm font-bold transition-all cursor-pointer ${
                  currency === code
                    ? 'border-brand-primary bg-brand-primary/10 text-black'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
          {catalog && (
            <p className="mt-2 text-xs text-gray-500">
              Current pricing stage: <span className="font-medium text-gray-700">{catalog.stageDisplayName}</span>
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading catalog…</div>
        ) : catalog ? (
          <>
            <CatalogSection title="Tickets">
              {catalog.tickets.length === 0 && (
                <p className="text-sm text-gray-500">No ticket prices found for {currency}.</p>
              )}
              {catalog.tickets.map((ticket) => (
                <CatalogRow
                  key={ticket.id}
                  title={ticket.title}
                  subtitle={formatPrice(ticket.price, ticket.currency)}
                  soldOut={ticket.stock.soldOut}
                  remaining={ticket.stock.remaining}
                  quantity={quantities[`ticket:${ticket.id}`] ?? 0}
                  onQuantityChange={(quantity) => setQuantity(`ticket:${ticket.id}`, quantity)}
                />
              ))}
            </CatalogSection>

            <CatalogSection title="Workshops">
              {catalog.workshops.length === 0 && (
                <p className="text-sm text-gray-500">No published workshops with {currency} pricing.</p>
              )}
              {catalog.workshops.map((workshop) => (
                <CatalogRow
                  key={workshop.workshopId}
                  title={workshop.title}
                  subtitle={[
                    formatPrice(workshop.price, workshop.currency),
                    workshop.room ?? undefined,
                    workshop.durationMinutes ? `${workshop.durationMinutes} min` : undefined,
                  ].filter(Boolean).join(' · ')}
                  soldOut={workshop.soldOut}
                  remaining={workshop.capacityRemaining}
                  quantity={quantities[`workshop:${workshop.workshopId}`] ?? 0}
                  onQuantityChange={(quantity) => setQuantity(`workshop:${workshop.workshopId}`, quantity)}
                />
              ))}
            </CatalogSection>

            {/* Summary + generate */}
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {totalItems === 0
                    ? 'No items selected yet'
                    : `${totalItems} item${totalItems === 1 ? '' : 's'} selected`}
                </p>
                {totalItems > 0 && (
                  <p className="text-lg font-bold text-black">{totalPrice.toFixed(2)} {currency}</p>
                )}
              </div>

              {hasSoldOutSelection && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" aria-hidden="true" />
                  <p className="text-sm text-amber-800">
                    This cart includes sold-out items. The generated link lets the customer
                    purchase them anyway — share it only with the intended person.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={totalItems === 0}
                className="w-full sm:w-auto px-8 py-3 bg-brand-primary text-black rounded-lg text-base font-medium hover:bg-[#e8d95e] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" aria-hidden="true" />
                Generate cart link
              </button>

              {generatedLink && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Shareable link</p>
                  <p className="text-sm text-black break-all font-mono bg-white border border-gray-200 rounded-lg p-3">
                    {generatedLink}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-4 py-2 bg-black text-brand-white rounded-lg text-sm font-medium hover:bg-black/80 transition-colors cursor-pointer inline-flex items-center gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>
                    <a
                      href={generatedLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gray-200 text-black rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors inline-flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      Preview
                    </a>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function CatalogSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-black mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

interface CatalogRowProps {
  title: string;
  subtitle: string;
  soldOut: boolean;
  remaining: number | null;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

function CatalogRow({ title, subtitle, soldOut, remaining, quantity, onQuantityChange }: CatalogRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 sm:p-4 ${
        quantity > 0 ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-200'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-black truncate">{title}</p>
          {soldOut ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              Sold out
            </span>
          ) : remaining !== null ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {remaining} left
            </span>
          ) : null}
        </div>
        <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onQuantityChange(quantity - 1)}
          disabled={quantity === 0}
          aria-label={`Decrease quantity of ${title}`}
          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4" aria-hidden="true" />
        </button>
        <span className="w-8 text-center font-bold text-black" aria-live="polite">{quantity}</span>
        <button
          type="button"
          onClick={() => onQuantityChange(quantity + 1)}
          aria-label={`Increase quantity of ${title}`}
          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-black hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
