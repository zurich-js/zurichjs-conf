/**
 * Corporate Access Section
 *
 * Mints a link that stops the discount popup for a corporate buyer's browser.
 * Send it to the enterprise contact; anyone opening it books at the standard
 * rate without being offered money off.
 */

import React, { useState } from 'react';
import { Building2, Copy, Check } from 'lucide-react';
import { useCreateCorporateLink } from './hooks';

export function CorporateAccessSection() {
  const [label, setLabel] = useState('');
  const [validDays, setValidDays] = useState(90);
  const [copied, setCopied] = useState(false);
  const { mutate: createLink, data, isPending } = useCreateCorporateLink();

  const trimmedLabel = label.trim();

  const handleCreate = () => {
    if (!trimmedLabel) return;
    setCopied(false);
    createLink({ label: trimmedLabel, validDays });
  };

  const handleCopy = async () => {
    if (!data?.url) return;
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-gray-600" aria-hidden="true" />
        <h3 className="text-base font-semibold text-gray-900">Corporate access link</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Teams buying on a training budget aren&apos;t price sensitive. Send this link to
        the contact and the discount popup stops appearing on any browser that opens
        it — no code for them to enter, nothing to remember.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div>
          <label
            htmlFor="corporate-label"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Organisation
          </label>
          <input
            id="corporate-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Acme AG"
            maxLength={80}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-brand-primary focus:border-brand-primary"
          />
        </div>
        <div>
          <label
            htmlFor="corporate-valid-days"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Valid for
          </label>
          <div className="flex items-center gap-2">
            <input
              id="corporate-valid-days"
              type="number"
              min={1}
              max={365}
              value={validDays}
              onChange={(e) => setValidDays(Number(e.target.value))}
              className="w-20 rounded border border-gray-300 px-3 py-2 text-sm focus:ring-brand-primary focus:border-brand-primary"
            />
            <span className="text-sm text-gray-500">days</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !trimmedLabel}
          className="rounded bg-brand-primary px-4 py-2 text-sm font-bold text-brand-black disabled:opacity-50"
        >
          {isPending ? 'Creating…' : 'Create link'}
        </button>
      </div>

      {data && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Link for {data.label}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="break-all font-mono text-xs text-gray-700">{data.url}</p>
          <p className="mt-2 text-xs text-gray-500">
            Links can&apos;t be revoked individually — they simply expire. Keep the
            validity short if you&apos;re unsure.
          </p>
        </div>
      )}
    </div>
  );
}
