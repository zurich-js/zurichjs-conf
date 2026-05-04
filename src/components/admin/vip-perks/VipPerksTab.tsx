/**
 * VIP Perks Tab
 * Main tab component for VIP perk management on the admin dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { StatsCards } from './StatsCards';
import { ConfigPanel } from './ConfigPanel';
import { PerksTable } from './PerksTable';
import { BackfillPanel } from './BackfillPanel';
import { SendEmailModal } from './SendEmailModal';
import { useUpdateVipPerkConfig, useBackfillVipPerks, useSendVipPerkEmail, useDeactivateVipPerk } from './hooks';
import { fetchVipPerks, fetchVipPerkConfig, fetchVipPerkProducts } from './api';
import type { VipPerkWithTicket, VipPerksStats, VipPerkConfig, StripeProductInfo, BackfillVipPerksResponse } from './types';

export function VipPerksTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [perks, setPerks] = useState<VipPerkWithTicket[]>([]);
  const [stats, setStats] = useState<VipPerksStats>({
    total_vip_tickets: 0,
    perks_created: 0,
    perks_redeemed: 0,
    emails_sent: 0,
    pending: 0,
  });
  const [config, setConfig] = useState<VipPerkConfig | null>(null);
  const [products, setProducts] = useState<StripeProductInfo[]>([]);
  const [emailModalPerk, setEmailModalPerk] = useState<VipPerkWithTicket | null>(null);

  const updateConfigMutation = useUpdateVipPerkConfig();
  const backfillMutation = useBackfillVipPerks();
  const sendEmailMutation = useSendVipPerkEmail();
  const deactivateMutation = useDeactivateVipPerk();

  const loadData = useCallback(async () => {
    try {
      const [perksData, configData, productsData] = await Promise.all([
        fetchVipPerks(),
        fetchVipPerkConfig(),
        fetchVipPerkProducts(),
      ]);
      setPerks(perksData.perks);
      setStats(perksData.stats);
      setConfig(configData);
      setProducts(productsData);
    } catch (err) {
      console.error('Failed to load VIP perks data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveConfig = async (updates: Parameters<typeof updateConfigMutation.mutateAsync>[0]) => {
    const result = await updateConfigMutation.mutateAsync(updates);
    setConfig(result);
  };

  const handleBackfill = async (data: { dry_run?: boolean; send_emails?: boolean; custom_message?: string }): Promise<BackfillVipPerksResponse> => {
    const result = await backfillMutation.mutateAsync(data);
    // Reload data after backfill
    if (!data.dry_run) {
      await loadData();
    }
    return result;
  };

  const handleSendEmail = async (customMessage?: string) => {
    if (!emailModalPerk) return;
    await sendEmailMutation.mutateAsync({
      perkId: emailModalPerk.id,
      customMessage,
    });
    await loadData();
  };

  const handleDeactivate = async (perkId: string) => {
    if (!confirm('Are you sure you want to deactivate this VIP perk? The Stripe coupon will be deleted.')) return;
    await deactivateMutation.mutateAsync(perkId);
    await loadData();
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
