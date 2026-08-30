/**
 * Discount Config Tab
 * Admin configuration for the discount popup: the single live offer (the former
 * aggressive-20 experiment winner, stored in the ab_* columns). Replaces the
 * DISCOUNT_* env vars (which remain as fallback only). The retired variant and
 * eligibility-gating columns still exist in the DB but are no longer read or
 * editable.
 */

import { useState, useEffect } from 'react';
import { Percent, Save, Info } from 'lucide-react';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { useDiscountConfig, useUpdateDiscountConfig } from './hooks';
import type { DiscountConfigRow } from './types';

interface FieldProps {
  label: string;
  suffix: string;
  min: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}

function NumberField({ label, suffix, min, max, step, value, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step ?? 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
        />
        <span className="text-sm text-gray-500">{suffix}</span>
      </div>
    </div>
  );
}

interface ConfigFormProps {
  config: DiscountConfigRow;
  onSave: (updates: Partial<DiscountConfigRow>) => void;
  isSaving: boolean;
}

function ConfigForm({ config, onSave, isSaving }: ConfigFormProps) {
  const [abPercentOff, setAbPercentOff] = useState(config.ab_percent_off);
  const [abDurationMinutes, setAbDurationMinutes] = useState(config.ab_duration_minutes);
  const [abcPercentOff, setAbcPercentOff] = useState(config.abc_percent_off);
  const [abcDurationMinutes, setAbcDurationMinutes] = useState(config.abc_duration_minutes);
  const [recurringMinVisits, setRecurringMinVisits] = useState(config.recurring_min_visits);

  // Sync when config changes externally
  useEffect(() => {
    setAbPercentOff(config.ab_percent_off);
    setAbDurationMinutes(config.ab_duration_minutes);
    setAbcPercentOff(config.abc_percent_off);
    setAbcDurationMinutes(config.abc_duration_minutes);
    setRecurringMinVisits(config.recurring_min_visits);
  }, [config]);

  const handleSave = () => {
    onSave({
      ab_percent_off: abPercentOff,
      ab_duration_minutes: abDurationMinutes,
      abc_percent_off: abcPercentOff,
      abc_duration_minutes: abcDurationMinutes,
      recurring_min_visits: recurringMinVisits,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Percent className="h-5 w-5 text-gray-600" aria-hidden="true" />
        <h3 className="text-base font-semibold text-gray-900">Discount Popup Configuration</h3>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm text-blue-800">
          Changes take effect within about a minute (server cache + CDN). The offer is
          resolved server-side — the client never controls percentages or durations.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Popup offer</h4>
          <p className="text-xs text-gray-500 mb-3">
            Every visitor who unlocks the popup with their email gets this offer.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberField
              label="Discount"
              suffix="%"
              min={1}
              max={100}
              value={abPercentOff}
              onChange={setAbPercentOff}
            />
            <NumberField
              label="Validity"
              suffix="minutes"
              min={1}
              value={abDurationMinutes}
              onChange={setAbDurationMinutes}
            />
          </div>
        </section>

        <section>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Recurring-visitor offer
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            A visitor who keeps coming back without buying is hesitating, so they get
            this offer instead — shown immediately rather than after the usual
            15-second delay. Set the discount equal to the standard offer to switch the
            behaviour off.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberField
              label="Kicks in on visit"
              suffix="visits"
              min={2}
              max={50}
              value={recurringMinVisits}
              onChange={setRecurringMinVisits}
            />
            <NumberField
              label="Discount"
              suffix="%"
              min={1}
              max={100}
              value={abcPercentOff}
              onChange={setAbcPercentOff}
            />
            <NumberField
              label="Validity"
              suffix="minutes"
              min={1}
              value={abcDurationMinutes}
              onChange={setAbcDurationMinutes}
            />
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-brand-primary text-black font-medium rounded-lg hover:bg-[#E5D665] disabled:opacity-50 flex items-center gap-2 cursor-pointer text-sm"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

export function DiscountConfigTab() {
  const { data: config, isLoading, isError, refetch } = useDiscountConfig();
  const updateMutation = useUpdateDiscountConfig();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" role="status">
          <span className="sr-only">Loading discount config...</span>
        </div>
      </div>
    );
  }

  if (isError || !config) {
    return (
      <AdminErrorState
        message="Failed to load the discount configuration"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <ConfigForm
      config={config}
      onSave={(updates) => updateMutation.mutate(updates)}
      isSaving={updateMutation.isPending}
    />
  );
}
