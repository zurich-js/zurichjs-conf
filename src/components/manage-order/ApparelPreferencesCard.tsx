/**
 * Apparel Preferences Card
 * Lets ticket holders pick their conference t-shirt size (and hoodie size for VIPs)
 */

import React from 'react';
import { Shirt, Sparkles, Check } from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Select } from '@/components/atoms';
import { APPAREL_SIZES } from '@/lib/types/ticket-constants';
import type { ApparelPreferences, ApparelPreferencesData } from './types';

const SIZE_OPTIONS = APPAREL_SIZES.map((size) => ({ value: size, label: size }));

interface ApparelPreferencesCardProps {
  isVip: boolean;
  preferences?: ApparelPreferences | null;
  mutation: UseMutationResult<unknown, Error, ApparelPreferencesData>;
}

export function ApparelPreferencesCard({ isVip, preferences, mutation }: ApparelPreferencesCardProps) {
  const [tshirtSize, setTshirtSize] = React.useState<string>(preferences?.tshirtSize ?? '');
  const [hoodieSize, setHoodieSize] = React.useState<string>(preferences?.hoodieSize ?? '');

  const handleSave = () => {
    mutation.mutate({
      tshirtSize: tshirtSize || null,
      hoodieSize: isVip ? hoodieSize || null : null,
    });
  };

  return (
    <div className="bg-black rounded-2xl p-8 mb-8">
      <div className="flex items-center gap-3 mb-2">
        <Shirt className="w-6 h-6 text-brand-primary" aria-hidden="true" />
        <h2 className="text-xl font-bold text-brand-primary">Apparel Preferences</h2>
      </div>
      <p className="text-gray-200 mb-6">
        Every attendee receives a limited edition conference t-shirt. Tell us your preferred size so we can plan ahead.
      </p>

      <div className="space-y-6">
        <Select
          label="T-shirt size"
          value={tshirtSize}
          onChange={setTshirtSize}
          options={SIZE_OPTIONS}
          placeholder="Select your t-shirt size..."
          variant="dark"
          disabled={mutation.isPending}
        />

        {isVip && (
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <h3 className="text-amber-400 font-semibold text-sm">VIP Package Hoodie</h3>
            </div>
            <p className="text-gray-300 text-sm mb-3">
              Your VIP package includes an exclusive conference hoodie. Feel free to pick a different size than your
              t-shirt — hoodies often fit differently.
            </p>
            <Select
              label="Hoodie size"
              value={hoodieSize}
              onChange={setHoodieSize}
              options={SIZE_OPTIONS}
              placeholder="Select your hoodie size..."
              variant="dark"
              disabled={mutation.isPending}
            />
          </div>
        )}

        <p className="text-gray-400 text-sm">
          Please note: our apparel comes in standard unisex sizing and, while we do our best, we cannot guarantee a
          perfect fit for every body type. Sizes are subject to availability.
        </p>

        {mutation.error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
            {mutation.error instanceof Error ? mutation.error.message : 'Failed to save your preferences'}
          </div>
        )}

        {mutation.isSuccess && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>Your apparel preferences have been saved.</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={mutation.isPending || !tshirtSize}
          className="w-full bg-brand-primary text-black font-semibold py-3 px-6 rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
