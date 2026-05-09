/**
 * Sponsor Quote Builder
 * Main orchestrator for the sponsor quote generator.
 * Manages quote state, computes breakdowns, and wires child components.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { Plus, Share2, Check, ArrowRight } from 'lucide-react';
import type { SponsorQuoteState, SponsorQuoteOption } from '@/lib/types/sponsor-quote';
import {
  createDefaultSponsorQuoteState,
  createDefaultSponsorOption,
  computeSponsorQuoteBreakdown,
  encodeSponsorQuoteToUrl,
  decodeSponsorQuoteFromUrl,
  formatQuoteAmount,
} from '@/lib/sponsor/quote-calculations';
import { useExchangeRate } from '@/lib/trip-cost/use-exchange-rate';
import { SponsorQuoteCompanySection } from './SponsorQuoteCompanySection';
import { SponsorQuoteOptionEditor } from './SponsorQuoteOptionEditor';
import { SponsorQuoteSummaryCard } from './SponsorQuoteSummaryCard';
import { SponsorQuoteOptionComparison } from './SponsorQuoteOptionComparison';

const MAX_OPTIONS = 3;

let nextOptId = 1;
function newOptionId(): string {
  return `sopt-${Date.now()}-${nextOptId++}`;
}

function getInitialState(): SponsorQuoteState {
  if (typeof window === 'undefined') return createDefaultSponsorQuoteState();
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    const decoded = decodeSponsorQuoteFromUrl(q);
    if (decoded) return decoded;
  }
  return createDefaultSponsorQuoteState();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SponsorQuoteBuilder() {
  const [state, setState] = useState<SponsorQuoteState>(getInitialState);
  const [copied, setCopied] = useState(false);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const breakdownRef = useRef<HTMLDivElement>(null);

  // Sync URL on state changes
  const syncUrl = useCallback((next: SponsorQuoteState) => {
    const encoded = encodeSponsorQuoteToUrl(next);
    if (encoded) {
      const url = new URL(window.location.href);
      url.searchParams.set('q', encoded);
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  const updateState = useCallback(
    (partial: Partial<SponsorQuoteState>) => {
      setState((prev) => {
        const next = { ...prev, ...partial };
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  const updateOption = useCallback(
    (idx: number, updated: SponsorQuoteOption) => {
      setState((prev) => {
        const next = { ...prev, options: prev.options.map((o, i) => (i === idx ? updated : o)) };
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  const addOption = useCallback(() => {
    setState((prev) => {
      if (prev.options.length >= MAX_OPTIONS) return prev;
      const next = { ...prev, options: [...prev.options, createDefaultSponsorOption(newOptionId())] };
      syncUrl(next);
      return next;
    });
  }, [syncUrl]);

  const removeOption = useCallback(
    (idx: number) => {
      setState((prev) => {
        if (prev.options.length <= 1) return prev;
        const next = { ...prev, options: prev.options.filter((_, i) => i !== idx) };
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  // FX rates for currency conversion
  const { rates } = useExchangeRate();

  // Compute breakdown
  const breakdown = useMemo(() => computeSponsorQuoteBreakdown(state), [state]);

  // Intersection observer for mobile sticky bar
  const observerRef = useRef<IntersectionObserver | null>(null);
  const setBreakdownRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!el) return;
      (breakdownRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      observerRef.current = new IntersectionObserver(
        ([entry]) => setBreakdownVisible(entry.isIntersecting),
        { threshold: 0.1 },
      );
      observerRef.current.observe(el);
    },
    [],
  );

  // Share URL — points to the public /sponsor-quote page
  const handleShare = useCallback(async () => {
    if (state.options.length > 1 && !state.recommendedOptionId) {
      const ok = window.confirm(
        'No option is marked as recommended. The quote will be shared without a highlighted recommendation.\n\nContinue anyway?',
      );
      if (!ok) return;
    }
    const encoded = encodeSponsorQuoteToUrl(state);
    const url = `${window.location.origin}/sponsor-quote?q=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy this link:', url);
    }
  }, [state]);

  const firstOption = breakdown.options[0];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sponsor Quote Builder</h2>
          <p className="text-sm text-gray-700 mt-1">
            Configure up to {MAX_OPTIONS} sponsor quote options. Share via URL.
          </p>
        </div>

        {/* Main grid: editor left, summary right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12">
          {/* Editor column */}
          <div className="lg:col-span-3 space-y-6">
            <SponsorQuoteCompanySection state={state} onUpdate={updateState} />

            {state.options.map((option, idx) => (
              <SponsorQuoteOptionEditor
                key={option.id}
                option={option}
                breakdown={breakdown.options[idx]}
                currency={state.currency}
                rates={rates}
                canRemove={state.options.length > 1}
                isRecommended={state.recommendedOptionId === option.id}
                onToggleRecommended={() => {
                  updateState({
                    recommendedOptionId: state.recommendedOptionId === option.id ? '' : option.id,
                  });
                }}
                onUpdate={(updated) => updateOption(idx, updated)}
                onRemove={() => removeOption(idx)}
              />
            ))}

            {state.options.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={addOption}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Quote Option ({state.options.length}/{MAX_OPTIONS})
              </button>
            )}
          </div>

          {/* Summary column */}
          <div className="lg:col-span-2" ref={setBreakdownRef}>
            <SponsorQuoteSummaryCard
              breakdown={breakdown}
              rates={rates}
              companyName={state.companyName}
              validUntil={state.validUntil}
              copied={copied}
              onShare={handleShare}
            />
          </div>
        </div>

        {/* Comparison section */}
        <SponsorQuoteOptionComparison breakdown={breakdown} />
      </div>

      {/* Sticky mobile total bar */}
      {firstOption && (
        <div
          className={`fixed bottom-0 inset-x-0 z-40 lg:hidden bg-black border-t border-brand-gray-dark px-4 py-3 transition-transform duration-300 ${
            breakdownVisible ? 'translate-y-full' : 'translate-y-0'
          }`}
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="block text-[11px] text-brand-gray-light">
                {breakdown.options.length === 1 ? 'Total' : `${breakdown.options.length} options`}
              </span>
              <span className="block text-lg font-bold text-white">
                {formatQuoteAmount(firstOption.totalCents, 'CHF')}
              </span>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-black rounded-lg text-sm font-medium hover:bg-[#e6d766] transition-colors cursor-pointer"
            >
              {copied ? (
                <><Check className="w-4 h-4" />Copied</>
              ) : (
                <><Share2 className="w-4 h-4" />Share</>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
