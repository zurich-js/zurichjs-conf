/**
 * VIP Perks Tab
 * Main tab component for VIP perk management on the admin dashboard
 */

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { StatsCards } from './StatsCards';
import { ConfigPanel } from './ConfigPanel';
import { PerksTable } from './PerksTable';
import { BackfillPanel } from './BackfillPanel';
import { SendEmailModal } from './SendEmailModal';
import {
  useVipPerks,
  useVipPerkConfig,
  useVipPerkProducts,
  useUpdateVipPerkConfig,
  useBackfillVipPerks,
  useSendVipPerkEmail,
  useDeactivateVipPerk,
} from './hooks';
import type { VipPerkWithTicket, VipPerksStats, BackfillVipPerksResponse } from './types';

const EMPTY_STATS: VipPerksStats = {
  total_vip_tickets: 0,
  perks_created: 0,
  perks_redeemed: 0,
  emails_sent: 0,
  pending: 0,
};

export function VipPerksTab() {
  const [emailModalPerk, setEmailModalPerk] = useState<VipPerkWithTicket | null>(null);

  const perksQuery = useVipPerks();
  const configQuery = useVipPerkConfig();
  const productsQuery = useVipPerkProducts();

  const updateConfigMutation = useUpdateVipPerkConfig();
  const backfillMutation = useBackfillVipPerks();
  const sendEmailMutation = useSendVipPerkEmail();
  const deactivateMutation = useDeactivateVipPerk();

  const perks = perksQuery.data?.perks ?? [];
  const stats = perksQuery.data?.stats ?? EMPTY_STATS;
  const config = configQuery.data ?? null;
  const products = productsQuery.data ?? [];

  const isLoading = perksQuery.isLoading || configQuery.isLoading || productsQuery.isLoading;

  const handleSaveConfig = async (updates: Parameters<typeof updateConfigMutation.mutateAsync>[0]) => {
    await updateConfigMutation.mutateAsync(updates);
  };

  const handleBackfill = (data: { dry_run?: boolean; send_emails?: boolean; custom_message?: string }): Promise<BackfillVipPerksResponse> =>
    backfillMutation.mutateAsync(data);

  const handleSendEmail = async (customMessage?: string) => {
    if (!emailModalPerk) return;
    await sendEmailMutation.mutateAsync({
      perkId: emailModalPerk.id,
      customMessage,
    });
  };

  const handleDeactivate = async (perkId: string) => {
    if (!confirm('Are you sure you want to deactivate this VIP perk? The Stripe coupon will be deleted.')) return;
    await deactivateMutation.mutateAsync(perkId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      <StatsCards stats={stats} />

      {config && (
        <ConfigPanel
          config={config}
          products={products}
          onSave={handleSaveConfig}
          isSaving={updateConfigMutation.isPending}
        />
      )}

      <PerksTable
        perks={perks}
        onSendEmail={setEmailModalPerk}
        onDeactivate={handleDeactivate}
      />

      {config && (
        <BackfillPanel
          config={config}
          pendingCount={stats.pending}
          onBackfill={handleBackfill}
          isRunning={backfillMutation.isPending}
        />
      )}

      {emailModalPerk && (
        <SendEmailModal
          perk={emailModalPerk}
          isOpen={!!emailModalPerk}
          onClose={() => setEmailModalPerk(null)}
          onSend={handleSendEmail}
        />
      )}
    </div>
  );
}
