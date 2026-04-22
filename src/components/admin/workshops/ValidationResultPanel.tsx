/**
 * Inline Stripe validation result inside the modal's Pricing section.
 */

import type { StripeValidation } from './readiness';

export function ValidationResultPanel({
  validation,
}: {
  validation: StripeValidation & { productMismatch: boolean; missing: string[] };
}) {
  return (
    <div
      className={`rounded-md border p-2.5 text-xs ${
        validation.valid ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className={`font-medium ${validation.valid ? 'text-green-800' : 'text-amber-800'}`}>
        {validation.valid
          ? 'All CHF + EUR + GBP prices resolve to the same Stripe product.'
          : 'Some prices are missing or belong to a different product.'}
      </div>
      <ul className="mt-2 space-y-1 font-mono text-[11px] text-gray-700">
        {validation.results.map((r) => (
          <li key={r.lookupKey}>
            <span className={r.priceId ? 'text-green-700' : 'text-amber-700'}>
              {r.priceId ? '✓' : '✗'}
            </span>{' '}
            {r.lookupKey}
            {r.priceId ? ` — ${r.currency}` : ' — NOT FOUND'}
          </li>
        ))}
      </ul>
      {validation.productMismatch && (
        <p className="mt-2 text-amber-800">
          Product ids differ across currencies. All three prices must belong to one Stripe product.
        </p>
      )}
    </div>
  );
}
