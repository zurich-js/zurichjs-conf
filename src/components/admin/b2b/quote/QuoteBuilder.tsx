/**
 * Quote Builder
 * Main orchestrator for the B2B quote generator.
 * Manages quote state, computes breakdowns, and wires child components.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Share2, Check, ArrowRight } from 'lucide-react';
import type { B2BQuoteState, B2BQuoteOption } from '@/lib/types/b2b-quote';
import { createWorkshopsScheduleQueryOptions } from '@/lib/queries/workshops';
import {
  createDefaultQuoteState,
  createDefaultOption,
  computeQuoteBreakdown,
  encodeQuoteToUrl,
  decodeQuoteFromUrl,
  formatQuoteAmount,
} from '@/lib/b2b/quote-calculations';
import { QuoteCompanySection } from './QuoteCompanySection';
import { QuoteOptionEditor } from './QuoteOptionEditor';
import { QuoteSummaryCard } from './QuoteSummaryCard';
import { QuoteOptionComparison } from './QuoteOptionComparison';

const MAX_OPTIONS = 3;

let nextOptId = 1;
function newOptionId(): string {
  return `opt-${Date.now()}-${nextOptId++}`;
}

function getInitialState(): B2BQuoteState {
  if (typeof window === 'undefined') return createDefaultQuoteState();
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    const decoded = decodeQuoteFromUrl(q);
    if (decoded) return decoded;
  }
  return createDefaultQuoteState();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuoteBuilder() {
  const [state, setState] = useState<B2BQuoteState>(getInitialState);
  const [copied, setCopied] = useState(false);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const breakdownRef = useRef<HTMLDivElement>(null);

  // Sync URL on state changes
  const syncUrl = useCallback((next: B2BQuoteState) => {
    const encoded = encodeQuoteToUrl(next);
    if (encoded) {
      const url = new URL(window.location.href);
      url.searchParams.set('q', encoded);
      // Preserve the tab param
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  const updateState = useCallback(
    (partial: Partial<B2BQuoteState>) => {
      setState((prev) => {
        const next = { ...prev, ...partial };
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  const updateOption = useCallback(
    (idx: number, updated: B2BQuoteOption) => {
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
      const next = { ...prev, options: [...prev.options, createDefaultOption(newOptionId())] };
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

  // Compute breakdown
  const breakdown = useMemo(() => computeQuoteBreakdown(state), [state]);

  // Fetch available workshops
  const workshopsQuery = useQuery(createWorkshopsScheduleQueryOptions('CHF'));
  const availableWorkshops = useMemo(() => {
    if (!workshopsQuery.data) return [];
    const { items, offeringsBySubmissionId } = workshopsQuery.data;
    return items
      .filter((item) => item.session_kind === 'workshop' && item.session)
      .map((item) => {
        const session = item.session!;
        const offering = session.cfp_submission_id
          ? offeringsBySubmissionId[session.cfp_submission_id]
          : undefined;
        return {
          id: session.id,
          title: session.title,
          slug: session.slug,
          unitAmountCents: offering?.unitAmount ?? 0,
          durationMinutes: offering?.durationMinutes ?? item.duration_minutes ?? null,
        };
      });
  }, [workshopsQuery.data]);

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

  // Share URL — points to the public /quote page, not the admin page
  const handleShare = useCallback(async () => {
    const encoded = encodeQuoteToUrl(state);
    const url = `${window.location.origin}/quote?q=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy this link:', url);
    }
  }, [state]);

  // Computed total across all options (first option for mobile bar)
  const firstOption = breakdown.options[0];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Quote Builder</h2>
          <p className="text-sm text-gray-700 mt-1">
            Configure up to {MAX_OPTIONS} quote options for a B2B lead. Share via URL.
          </p>
        </div>

        {/* Main grid: editor left, summary right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12">
          {/* Editor column */}
          <div className="lg:col-span-3 space-y-6">
            <QuoteCompanySection state={state} onUpdate={updateState} />

            {state.options.map((option, idx) => (
              <QuoteOptionEditor
                key={option.id}
                option={option}
                breakdown={breakdown.options[idx]}
                currency={state.currency}
                canRemove={state.options.length > 1}
                availableWorkshops={availableWorkshops}
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
            <QuoteSummaryCard
              breakdown={breakdown}
              companyName={state.companyName}
              validUntil={state.validUntil}
              copied={copied}
              onShare={handleShare}
            />
          </div>
        </div>

        {/* Comparison section — full width below the grid */}
        <QuoteOptionComparison breakdown={breakdown} />
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
                {formatQuoteAmount(firstOption.totalCents, state.currency)}
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
