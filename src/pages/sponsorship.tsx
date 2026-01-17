import React, { useState } from 'react';
import {
  ShapedSection,
  DynamicSiteFooter,
  SponsorshipHeroSection,
  SponsorshipMissionSection,
  SponsorshipAudienceSection,
  SponsorshipValuesSection,
  SponsorshipTiersSection,
  SponsorshipContactSection,
} from '@/components/organisms';
import { SponsorshipInquiryModal } from '@/components/molecules';
import { SEO } from '@/components/SEO';
import { sponsorshipPageData } from '@/data/sponsorship';
import { detectCountryFromRequest } from '@/lib/geo/detect-country';
import { getCurrencyFromCountry, type SupportedCurrency } from '@/config/currency';
import type { GetServerSideProps } from 'next';

interface SponsorshipPageProps {
  detectedCurrency: SupportedCurrency;
}

export default function SponsorshipPage({ detectedCurrency }: SponsorshipPageProps) {
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);

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
            data={sponsorshipPageData.tiers}
            initialCurrency={detectedCurrency}
            onBecomeSponsor={() => setIsInquiryModalOpen(true)}
          />
        </ShapedSection>

        {/* Contact Section - Dark background */}
        <ShapedSection shape="widen" variant="dark" id="contact">
          <SponsorshipContactSection data={sponsorshipPageData.contact} />
        </ShapedSection>

        {/* Footer */}
        <ShapedSection shape="tighten" variant="dark" dropBottom>
          <DynamicSiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}

/**
 * Server-side currency detection
 */
export const getServerSideProps: GetServerSideProps<SponsorshipPageProps> = async (context) => {
  const countryCode = detectCountryFromRequest(context.req);
  const detectedCurrency = getCurrencyFromCountry(countryCode);

  return {
    props: {
      detectedCurrency,
    },
  };
};
