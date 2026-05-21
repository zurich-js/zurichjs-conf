import React, { useState } from 'react';
import {
    ShapedSection,
    SponsorshipHeroSection,
    SponsorshipMissionSection,
    SponsorshipAudienceSection,
    SponsorshipValuesSection,
    SponsorshipTiersSection,
    SiteFooter,
} from '@/components/organisms';
import { SponsorshipInquiryModal } from '@/components/molecules';
import { SEO } from '@/components/SEO';
import { sponsorshipPageData } from '@/data/sponsorship';
import { detectCountryFromRequest } from '@/lib/geo/detect-country';
import { getCurrencyFromCountry, type SupportedCurrency } from '@/config/currency';
import type { GetServerSideProps } from 'next';
import { buildPublicSponsorshipPricing, type PublicSponsorshipPricing } from '@/lib/sponsorship/public-pricing';
import type { ExchangeRatesResult } from '@/lib/sponsorship/currency';
import type { ProspectusAsset } from '@/lib/sponsorship/prospectus';

interface SponsorshipPageProps {
  detectedCurrency: SupportedCurrency;
  pricing: PublicSponsorshipPricing;
  prospectusAssets: ProspectusAsset[];
}

export default function SponsorshipPage({ detectedCurrency, pricing, prospectusAssets }: SponsorshipPageProps) {
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(
    pricing.availableCurrencies.includes(detectedCurrency) ? detectedCurrency : 'CHF',
  );
  const availableProspectus = prospectusAssets.filter((asset) => asset.exists && asset.currency === selectedCurrency);

  return (
    <>
      <SponsorshipInquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
      />

      <SEO
        title="Sponsorship | Partner with ZurichJS Conference 2026"
        description="Become a sponsor of ZurichJS Conference 2026. Connect with 300+ JavaScript developers, showcase your brand, and support the Swiss tech community. Sponsorship packages from CHF 1,000."
        canonical="/sponsorship"
        ogType="website"
        keywords="zurichjs sponsorship, javascript conference sponsor, tech conference sponsorship switzerland, developer conference sponsorship, zurich tech sponsor"
      />

      <main className="min-h-screen">
        {/* Hero + Mission Section - Light background (combined to reduce spacing) */}
        <ShapedSection shape="widen" variant="light" dropTop id="hero" className="mt-8!">
          <SponsorshipHeroSection data={sponsorshipPageData.hero} />
          <SponsorshipMissionSection data={sponsorshipPageData.mission} />
        </ShapedSection>

        {/* Audience Section - Light gray background */}
        <ShapedSection shape="tighten" variant="light" className="!bg-[#EDEDEF]" id="audience">
          <SponsorshipAudienceSection data={sponsorshipPageData.audience} />
        </ShapedSection>

        {/* Values Section - Dark background */}
        <ShapedSection shape="widen" variant="dark" id="values">
          <SponsorshipValuesSection data={sponsorshipPageData.values} />
        </ShapedSection>

        {/* Tiers Section - Yellow background */}
        <ShapedSection shape="tighten" variant="yellow" id="tiers">
          <SponsorshipTiersSection
            data={pricing.tiers}
            initialCurrency={detectedCurrency}
            availableCurrencies={pricing.availableCurrencies}
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            rateDate={pricing.rateDate}
            rateSource={pricing.rateSource}
            ratesStale={pricing.ratesStale}
            onBecomeSponsor={() => setIsInquiryModalOpen(true)}
          />
          {availableProspectus.length > 0 && (
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {availableProspectus.map((asset) => (
                <a
                  key={asset.category}
                  href={`/api/sponsorship/prospectus/${selectedCurrency}/${asset.category}`}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-black px-5 py-3 text-sm font-semibold capitalize text-brand-white transition-colors hover:bg-brand-gray-dark sm:w-auto"
                >
                  Download {asset.category} prospectus ({selectedCurrency})
                </a>
              ))}
            </div>
          )}
        </ShapedSection>

          <ShapedSection
              shape="widen"
              variant="dark"
              dropBottom={true}
          >
              <SiteFooter showContactLinks />
          </ShapedSection>
      </main>
    </>
  );
}

/**
 * Server-side currency detection
 */
export const getServerSideProps: GetServerSideProps<SponsorshipPageProps> = async (context) => {
  const { getExchangeRates } = await import('@/lib/sponsorship/currency');
  const { listProspectusAssets } = await import('@/lib/sponsorship/prospectus');
  const { logger } = await import('@/lib/logger');
  const log = logger.scope('Sponsorship Page');
  const countryCode = detectCountryFromRequest(context.req);
  const detectedCurrency = getCurrencyFromCountry(countryCode);
  let rates: ExchangeRatesResult | null = null;
  let prospectusAssets: ProspectusAsset[] = [];

  try {
    rates = await getExchangeRates('CHF', ['EUR', 'GBP', 'USD']);
  } catch (error) {
    log.error('Failed to load sponsorship exchange rates', error);
  }

  try {
    prospectusAssets = await listProspectusAssets();
  } catch (error) {
    log.error('Failed to load sponsorship prospectus assets', error);
  }

  return {
    props: {
      detectedCurrency,
      pricing: buildPublicSponsorshipPricing(sponsorshipPageData.tiers, rates),
      prospectusAssets,
    },
  };
};
