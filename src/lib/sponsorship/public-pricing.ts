/**
 * Public sponsorship pricing presentation helpers.
 */

import type { SupportedCurrency } from '@/config/currency';
import type { SponsorshipTiersData } from '@/data/sponsorship';
import { convertChfMinorToCurrency } from '@/lib/sponsorship/currency-math';
import type { ExchangeRatesResult } from '@/lib/sponsorship/currency';

export interface PublicSponsorshipPricing {
  tiers: SponsorshipTiersData;
  availableCurrencies: SupportedCurrency[];
  rateDate: string | null;
  rateSource: string | null;
  ratesStale: boolean;
}

const DISPLAY_CURRENCIES: SupportedCurrency[] = ['CHF', 'EUR', 'GBP', 'USD'];

function convertUnits(
  chfUnits: number,
  currency: SupportedCurrency,
  rates: ExchangeRatesResult | null,
): number {
  if (currency === 'CHF') return chfUnits;
  if (!rates) return chfUnits;
  return convertChfMinorToCurrency(chfUnits * 100, currency, rates.rates, 100) / 100;
}

export function buildPublicSponsorshipPricing(
  tiers: SponsorshipTiersData,
  rates: ExchangeRatesResult | null,
): PublicSponsorshipPricing {
  const availableCurrencies: SupportedCurrency[] = rates
    ? DISPLAY_CURRENCIES
    : ['CHF'];

  return {
    tiers: {
      ...tiers,
      tiers: tiers.tiers.map((tier) => ({
        ...tier,
        price: Object.fromEntries(
          availableCurrencies.map((currency) => [
            currency,
            convertUnits(tier.price.CHF, currency, rates),
          ]),
        ) as Record<SupportedCurrency, number>,
        benefits: tier.benefits.map((benefit) => {
          if (!benefit.addOnCredit) return benefit;
          return {
            ...benefit,
            addOnCredit: Object.fromEntries(
              availableCurrencies.map((currency) => [
                currency,
                convertUnits(benefit.addOnCredit?.CHF ?? 0, currency, rates),
              ]),
            ) as Record<SupportedCurrency, number>,
          };
        }),
      })),
    },
    availableCurrencies,
    rateDate: rates?.date ?? null,
    rateSource: rates?.source ?? null,
    ratesStale: rates?.isStale ?? false,
  };
}
