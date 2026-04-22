/**
 * Publish-readiness checklist rendered at the top of the edit modal.
 */

import { AlertTriangle, Check } from 'lucide-react';
import type { computeFullReadiness } from './readiness';

export function ReadinessChecklist({
  items,
  isReady,
  openItems,
}: {
  items: ReturnType<typeof computeFullReadiness>['items'];
  isReady: boolean;
  openItems: number;
}) {
  return (
    <div
      className={`rounded-lg border p-3 sm:p-4 ${
        isReady ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50/60'
      }`}
    >
      <div className="flex items-center gap-2">
        {isReady ? (
          <Check className="size-4 text-green-700" />
        ) : (
          <AlertTriangle className="size-4 text-amber-700" />
        )}
        <span className="text-sm font-semibold">
          {isReady
            ? 'Ready to publish'
            : `${openItems} ${openItems === 1 ? 'item' : 'items'} still open`}
        </span>
      </div>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full ${
                item.ok ? 'bg-green-100 text-green-700' : 'bg-amber-200 text-amber-800'
              }`}
            >
              {item.ok ? <Check className="size-3" /> : <AlertTriangle className="size-2.5" />}
            </span>
            <div>
              <span className={item.ok ? 'text-gray-700' : 'text-gray-900 font-medium'}>
                {item.label}
              </span>
              {!item.ok && item.hint && (
                <span className="block text-gray-500">{item.hint}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
