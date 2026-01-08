/**
 * AirportInput Component
 * Search-as-you-type input for selecting airports with keyboard navigation
 */

import { useState, useRef, useEffect, useDeferredValue, useMemo } from 'react';
import { Search, X, Plane } from 'lucide-react';
import { searchAirports, type Airport, POPULAR_EUROPEAN_AIRPORTS } from '@/lib/constants/airports';

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

function useAirportSearch(query: string, isOpen: boolean) {
  const deferredQuery = useDeferredValue(query);

  return useMemo(() => {
    if (deferredQuery.length >= 2) {
      return searchAirports(deferredQuery).slice(0, 15);
    }
    if (deferredQuery.length === 0 && isOpen) {
      return POPULAR_EUROPEAN_AIRPORTS.slice(0, 10);
    }
    return [];
  }, [deferredQuery, isOpen]);
}

function useKeyboardNavigation(
  results: Airport[],
  isOpen: boolean,
  onSelect: (airport: Airport) => void,
  onClose: () => void
) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const prevResultsRef = useRef(results);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`) as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    // Reset highlight if results changed
    if (prevResultsRef.current !== results) {
      setHighlightedIndex(-1);
      prevResultsRef.current = results;
    }

    const handlers: Record<string, () => void> = {
      ArrowDown: () => setHighlightedIndex(i => Math.min(i + 1, results.length - 1)),
      ArrowUp: () => setHighlightedIndex(i => Math.max(i - 1, 0)),
      Enter: () => highlightedIndex >= 0 && onSelect(results[highlightedIndex]),
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

interface AirportBadgeProps {
  iata: string;
  variant?: 'selected' | 'list';
}

function AirportBadge({ iata, variant = 'list' }: AirportBadgeProps) {
  const bg = variant === 'selected' ? 'bg-brand-primary/20' : 'bg-brand-gray-medium';
  return (
    <div className={`flex items-center justify-center w-10 h-10 ${bg} rounded-lg flex-shrink-0`}>
      <span className="text-brand-primary font-bold text-sm">{iata}</span>
    </div>
  );
}

interface SelectedAirportProps {
  airport: Airport;
  error?: string;
  disabled?: boolean;
  onEdit: () => void;
  onClear: () => void;
}

function SelectedAirport({ airport, error, disabled, onEdit, onClear }: SelectedAirportProps) {
  return (
    <div
      className={`w-full bg-brand-gray-darkest text-white rounded-lg px-4 py-3 pr-10 flex items-center gap-3 ${
        error ? 'ring-2 ring-red-500' : ''
      } ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-brand-gray-dark'}`}
      onClick={() => !disabled && onEdit()}
    >
      <AirportBadge iata={airport.iata} variant="selected" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{airport.city}</div>
        <div className="text-xs text-brand-gray-medium truncate">{airport.name}</div>
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute right-3 p-1.5 hover:bg-brand-gray-darkest rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 text-brand-gray-medium hover:text-white" />
        </button>
      )}
    </div>
  );
}

interface AirportListItemProps {
  airport: Airport;
  index: number;
  isHighlighted: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function AirportListItem({ airport, index, isHighlighted, onSelect, onHover }: AirportListItemProps) {
  return (
    <button
      type="button"
      data-index={index}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`w-full px-3 py-2 flex items-center gap-3 transition-colors text-left cursor-pointer ${
        isHighlighted ? 'bg-brand-gray-darkest' : 'hover:bg-brand-gray-darkest'
      }`}
    >
      <AirportBadge iata={airport.iata} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{airport.city}, {airport.country}</div>
        <div className="text-xs text-brand-gray-medium truncate">{airport.name}</div>
      </div>
      <Plane className="w-4 h-4 text-brand-gray-medium flex-shrink-0" />
    </button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface AirportInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
}

export function AirportInput({
  value,
  onChange,
  placeholder = 'Type to search airports...',
  error,
  disabled,
  id,
}: AirportInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse selected airport from value
  const selectedAirport = useMemo(() => {
    if (!value) return null;
    const iata = value.split(' - ')[0];
    return searchAirports(iata).find(a => a.iata === iata) ?? null;
  }, [value]);

  // Search with deferred value
  const results = useAirportSearch(query, isOpen);

  // Close on click outside
  useClickOutside(containerRef, () => {
    setIsOpen(false);
    setQuery('');
  });

  const handleSelect = (airport: Airport) => {
    onChange(`${airport.iata} - ${airport.city}, ${airport.country}`);
    setQuery('');
    setIsOpen(false);
  };

  // Keyboard navigation
  const { highlightedIndex, setHighlightedIndex, listRef, handleKeyDown } = useKeyboardNavigation(
    results,
    isOpen,
    (airport) => handleSelect(airport),
    () => { setIsOpen(false); setQuery(''); }
  );

  const handleClear = () => {
    onChange(null);
    setQuery('');
    inputRef.current?.focus();
  };

  const showInput = !selectedAirport || isOpen;

  return (
    <div ref={containerRef} className="relative">
      {!showInput && selectedAirport ? (
        <SelectedAirport
          airport={selectedAirport}
          error={error}
          disabled={disabled}
          onEdit={() => setIsOpen(true)}
          onClear={handleClear}
        />
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-medium pointer-events-none" />
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className={`w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 transition-all ${
              error ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-brand-primary'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-brand-gray-dark border border-brand-gray-medium rounded-lg shadow-lg overflow-hidden">
          {query.length > 0 && query.length < 2 ? (
            <div className="px-4 py-3 text-sm text-brand-gray-medium">
              Type at least 2 characters to search...
            </div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-brand-gray-medium">
              No airports found for &quot;{query}&quot;
            </div>
          ) : (
            <>
              {query.length === 0 && (
                <div className="px-3 py-2 text-xs text-brand-gray-medium uppercase tracking-wide bg-brand-gray-darkest">
                  Popular Airports
                </div>
              )}
              <div ref={listRef} className="max-h-64 overflow-y-auto">
                {results.map((airport, index) => (
                  <AirportListItem
                    key={airport.iata}
                    airport={airport}
                    index={index}
                    isHighlighted={highlightedIndex === index}
                    onSelect={() => handleSelect(airport)}
                    onHover={() => setHighlightedIndex(index)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
