/**
 * VIP Perks Backfill Panel
 * Controls for running the VIP perks backfill operation
 */

import React, { useState } from 'react';
import { RefreshCw, Play, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { BackfillVipPerksResponse, VipPerkConfig } from './types';

interface BackfillPanelProps {
  config: VipPerkConfig;
  pendingCount: number;
  onBackfill: (data: { dry_run?: boolean; send_emails?: boolean; custom_message?: string }) => Promise<BackfillVipPerksResponse>;
  isRunning: boolean;
}

export function BackfillPanel({ config, pendingCount, onBackfill, isRunning }: BackfillPanelProps) {
  const [sendEmails, setSendEmails] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [dryRunResult, setDryRunResult] = useState<BackfillVipPerksResponse | null>(null);
  const [backfillResult, setBackfillResult] = useState<BackfillVipPerksResponse | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasNoProducts = config.restricted_product_ids.length === 0;

  const handleDryRun = async () => {
    setBackfillResult(null);
    const result = await onBackfill({ dry_run: true });
    setDryRunResult(result);
  };

  const handleBackfill = async () => {
    setShowConfirm(false);
    setDryRunResult(null);
    const result = await onBackfill({
      send_emails: sendEmails,
      custom_message: customMessage || undefined,
    });
    setBackfillResult(result);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw className="h-5 w-5 text-gray-600" />
        <h3 className="text-base font-semibold text-gray-900">Backfill VIP Perks</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Generate discount codes for existing VIP ticket holders who don&apos;t have one yet.
        {pendingCount > 0 && (
          <span className="font-medium text-amber-600"> {pendingCount} VIP ticket(s) pending.</span>
        )}
        {pendingCount === 0 && (
          <span className="font-medium text-green-600"> All VIP tickets have perks.</span>
        )}
      </p>

      {hasNoProducts && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Configure workshop products in the config above before running backfill.
          </p>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sendEmails}
            onChange={(e) => setSendEmails(e.target.checked)}
            className="rounded text-brand-primary focus:ring-brand-primary"
          />
          <span className="text-sm text-gray-700">Send emails after creating coupons</span>
        </label>

        {sendEmails && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Email Message (optional)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a message to include in all backfill emails..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleDryRun}
          disabled={isRunning || hasNoProducts || pendingCount === 0}
          className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2 cursor-pointer text-sm"
        >
          <Play className="h-4 w-4" />
          Dry Run
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isRunning || hasNoProducts || pendingCount === 0}
          className="px-4 py-2 bg-brand-primary text-black font-medium rounded-lg hover:bg-[#E5D665] disabled:opacity-50 flex items-center gap-2 cursor-pointer text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running...' : 'Run Backfill'}
        </button>
      </div>

      {/* Confirmation */}
      {showConfirm && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800 mb-2">
            This will create Stripe coupons for {pendingCount} VIP ticket(s).
            {sendEmails && ` Emails will be sent to each ticket holder.`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleBackfill}
              className="px-3 py-1.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 text-sm cursor-pointer"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 border border-gray-300 text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Dry Run Results */}
      {dryRunResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-blue-800 mb-1">Dry Run Results</p>
          <ul className="text-sm text-blue-700 space-y-0.5">
            <li>Total VIP tickets: {dryRunResult.total_vip_tickets}</li>
            <li>Already have perk: {dryRunResult.already_have_perk}</li>
            <li>Would create: {dryRunResult.total_vip_tickets - dryRunResult.already_have_perk}</li>
          </ul>
        </div>
      )}

      {/* Backfill Results */}
      {backfillResult && (
        <div className={`border rounded-lg p-3 ${backfillResult.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {backfillResult.failed > 0 ? (
              <XCircle className="h-4 w-4 text-amber-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <p className="text-sm font-medium text-gray-900">Backfill Complete</p>
          </div>
          <ul className="text-sm text-gray-700 space-y-0.5">
            <li>Created: {backfillResult.created}</li>
            <li>Failed: {backfillResult.failed}</li>
            <li>Emails sent: {backfillResult.emails_sent}</li>
          </ul>
          {backfillResult.failures.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-700">Failures:</p>
              {backfillResult.failures.map((f) => (
                <p key={f.ticket_id} className="text-xs text-red-600">
                  {f.ticket_id.substring(0, 8)}: {f.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
