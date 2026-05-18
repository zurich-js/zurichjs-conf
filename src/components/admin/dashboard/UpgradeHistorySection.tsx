/**
 * UpgradeHistorySection - Shows VIP upgrade history for a ticket
 */

import type { TicketUpgrade, UpgradeStatus, UpgradeMode } from '@/lib/types/ticket-upgrade';

interface UpgradeHistorySectionProps {
  upgrades: TicketUpgrade[];
  isLoading: boolean;
}

const statusConfig: Record<UpgradeStatus, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  pending_payment: { label: 'Pending Payment', className: 'bg-yellow-100 text-yellow-800' },
  pending_bank_transfer: { label: 'Pending Transfer', className: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600' },
};

const modeLabels: Record<UpgradeMode, string> = {
  complimentary: 'Complimentary',
  stripe: 'Stripe',
  bank_transfer: 'Bank Transfer',
};

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatCurrency(cents: number | null, currency: string | null): string {
  if (!cents || cents === 0) return 'Complimentary';
  return `${(cents / 100).toFixed(2)} ${currency?.toUpperCase() || 'CHF'}`;
}

function LoadingSkeleton() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="h-3 w-36 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="h-16 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

export function UpgradeHistorySection({ upgrades, isLoading }: UpgradeHistorySectionProps) {
  if (isLoading) return <LoadingSkeleton />;
  if (upgrades.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        VIP Upgrade History
      </h4>
      <div className="space-y-3">
        {upgrades.map((upgrade) => {
          const status = statusConfig[upgrade.status];
          return (
            <div
              key={upgrade.id}
              className={`rounded-lg border p-3 ${
                upgrade.status === 'cancelled' ? 'border-gray-200 bg-white opacity-60' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-black capitalize">
                    {upgrade.from_tier} → {upgrade.to_tier}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.className}`}>
                    {status.label}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400">Amount: </span>
                  <span className="font-medium text-black">
                    {formatCurrency(upgrade.amount, upgrade.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Method: </span>
                  <span className="font-medium text-black">{modeLabels[upgrade.upgrade_mode]}</span>
                </div>
                <div>
                  <span className="text-gray-400">Initiated: </span>
                  <span>{formatDate(upgrade.created_at)}</span>
                </div>
                {upgrade.completed_at && (
                  <div>
                    <span className="text-gray-400">Completed: </span>
                    <span>{formatDate(upgrade.completed_at)}</span>
                  </div>
                )}
              </div>
              {upgrade.admin_note && (
                <p className="mt-2 text-xs text-gray-500 italic">Note: {upgrade.admin_note}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
