/**
 * ProductMultiSelect Component
 * Searchable multi-select dropdown for selecting products
 * Based on AirportInput pattern but adapted for multi-select with admin styling
 */

import { useState, useRef, useEffect, useDeferredValue, useMemo } from 'react';
import { Search, X, Package, Check } from 'lucide-react';
import type { StripeProductInfo } from './types';

// ============================================
// HOOKS
// ============================================

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClickOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClickOutside();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClickOutside]);
}

function useProductSearch(products: StripeProductInfo[], query: string) {
  const deferredQuery = useDeferredValue(query);

  return useMemo(() => {
    if (deferredQuery.length === 0) {
      return products;
    }
    const lowerQuery = deferredQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowerQuery) ||
        product.id.toLowerCase().includes(lowerQuery)
    );
  }, [products, deferredQuery]);
}

function useKeyboardNavigation(
  results: StripeProductInfo[],
  isOpen: boolean,
  onToggle: (product: StripeProductInfo) => void,
  onClose: () => void
) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [results]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`) as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    const handlers: Record<string, () => void> = {
      ArrowDown: () => setHighlightedIndex((i) => Math.min(i + 1, results.length - 1)),
      ArrowUp: () => setHighlightedIndex((i) => Math.max(i - 1, 0)),
      Enter: () => highlightedIndex >= 0 && onToggle(results[highlightedIndex]),
      Escape: onClose,
    };

    if (handlers[e.key]) {
      e.preventDefault();
      handlers[e.key]();
    }
  };

  return { highlightedIndex, setHighlightedIndex, listRef, handleKeyDown };
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface SelectedProductBadgeProps {
  product: StripeProductInfo;
  onRemove: () => void;
}

function SelectedProductBadge({ product, onRemove }: SelectedProductBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F1E271]/20 border border-[#F1E271] rounded-md text-sm">
      <span className="truncate max-w-[150px]">{product.name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-0.5 hover:bg-[#F1E271]/30 rounded cursor-pointer"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

interface ProductListItemProps {
  product: StripeProductInfo;
  index: number;
  isHighlighted: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onHover: () => void;
}

function ProductListItem({
  product,
  index,
  isHighlighted,
  isSelected,
  onToggle,
  onHover,
}: ProductListItemProps) {
  return (
    <button
      type="button"
      data-index={index}
      onClick={onToggle}
      onMouseEnter={onHover}
      className={`w-full px-3 py-2 flex items-center gap-3 transition-colors text-left cursor-pointer ${
        isHighlighted ? 'bg-gray-100' : 'hover:bg-gray-50'
      }`}
    >
      <div
        className={`flex items-center justify-center w-5 h-5 rounded border ${
          isSelected
            ? 'bg-[#F1E271] border-[#F1E271]'
            : 'border-gray-300 bg-white'
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-black" />}
      </div>
      <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-black truncate">{product.name}</div>
        {product.description && (
          <div className="text-xs text-gray-500 truncate">{product.description}</div>
        )}
      </div>
    </button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface ProductMultiSelectProps {
  products: StripeProductInfo[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function ProductMultiSelect({
  products,
  selectedIds,
  onChange,
  placeholder = 'Search products...',
  error,
  disabled,
}: ProductMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected products
  const selectedProducts = useMemo(() => {
    return products.filter((p) => selectedIds.includes(p.id));
  }, [products, selectedIds]);

  // Search products
  const results = useProductSearch(products, query);

  // Close on click outside
  useClickOutside(containerRef, () => {
    setIsOpen(false);
    setQuery('');
  });

  // Toggle product selection
  const handleToggle = (product: StripeProductInfo) => {
    if (selectedIds.includes(product.id)) {
      onChange(selectedIds.filter((id) => id !== product.id));
    } else {
      onChange([...selectedIds, product.id]);
    }
  };

  // Keyboard navigation
  const { highlightedIndex, setHighlightedIndex, listRef, handleKeyDown } = useKeyboardNavigation(
    results,
    isOpen,
    handleToggle,
    () => {
      setIsOpen(false);
      setQuery('');
    }
  );

  const handleRemove = (productId: string) => {
    onChange(selectedIds.filter((id) => id !== productId));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected products */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedProducts.map((product) => (
            <SelectedProductBadge
              key={product.id}
              product={product}
              onRemove={() => handleRemove(product.id)}
            />
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full bg-white text-black placeholder-gray-500 border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-[#F1E271] focus:border-[#F1E271]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              {query.length > 0 ? `No products found for "${query}"` : 'No products available'}
            </div>
          ) : (
            <div ref={listRef} className="max-h-48 overflow-y-auto">
              {results.map((product, index) => (
                <ProductListItem
                  key={product.id}
                  product={product}
                  index={index}
                  isHighlighted={highlightedIndex === index}
                  isSelected={selectedIds.includes(product.id)}
                  onToggle={() => handleToggle(product)}
                  onHover={() => setHighlightedIndex(index)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
