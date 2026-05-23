/**
 * OSS Maintainer Ticket Application Page (/oss)
 *
 * Three sections: hero, tier table, apply form. Intentionally minimal —
 * the form is the deliverable.
 */

import React from 'react';
import { SEO } from '@/components/SEO';
import { NavBar } from '@/components/organisms/NavBar';
import { SiteFooter, ShapedSection } from '@/components/organisms';
import { Heading } from '@/components/atoms/Heading';
import { Kicker } from '@/components/atoms/Kicker';
import { OssMaintainerApplyForm } from '@/components/molecules';

const TIERS = [
  { name: 'T1', discount: '80%', requires: '≥10k stars or ≥100k weekly downloads · ≥3 years' },
  { name: 'T2', discount: '60%', requires: '≥2k stars or ≥10k weekly downloads · ≥2 years' },
  { name: 'T3', discount: '40%', requires: '≥500 stars or ≥1k weekly downloads · ≥1 year' },
  { name: 'T4', discount: '20%', requires: '≥500 stars or ≥1k weekly downloads · <1 year' },
] as const;

export default function OssPage() {
  return (
    <>
      <SEO
        title="OSS Maintainer Tickets — ZurichJS Conference 2026"
        description="Up to 80% off ZurichJS 2026 for active maintainers of open-source JavaScript libraries."
      />
      <NavBar />
      <main className="min-h-screen bg-brand-black text-brand-white">
        <ShapedSection shape="straight" variant="dark">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <Kicker>OSS maintainers</Kicker>
            <Heading level="h1" className="mt-3 mb-3 text-2xl sm:text-3xl">
              Up to 80% off, for the people who keep our stack alive
            </Heading>
            <p className="text-sm sm:text-base text-brand-gray-light">
              Maintain an actively-used JS or TS library? Apply below — we check your GitHub
              and npm signals, then email you a Stripe link with the discount pre-applied.
              30 seats, reviewed within 48h.
            </p>
          </div>
        </ShapedSection>

        <ShapedSection shape="tighten" variant="medium" id="tiers">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <Heading level="h2" className="mb-4 text-xl sm:text-2xl">
              Tiers
            </Heading>
            <ul className="divide-y divide-brand-gray-medium rounded-xl border border-brand-gray-medium overflow-hidden">
              {TIERS.map((t) => (
                <li
                  key={t.name}
                  className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-3 bg-brand-gray-darkest"
                >
                  <span className="shrink-0 inline-flex items-center gap-2 font-semibold">
                    <span className="text-brand-primary">{t.name}</span>
                    <span>{t.discount} off</span>
                  </span>
                  <span className="text-xs sm:text-sm text-brand-gray-light sm:ml-auto">
                    {t.requires}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-brand-gray-light mt-3">
              Floor: ≥500 stars or ≥1k weekly downloads, GitHub account ≥2 years old, and you&apos;re
              the owner or in the top 3 contributors. Discount applies to standard or VIP.
            </p>
          </div>
        </ShapedSection>

        <ShapedSection shape="tighten" variant="dark" id="apply">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <Heading level="h2" className="mb-4 text-xl sm:text-2xl">
              Apply
            </Heading>
            <div className="rounded-2xl border border-brand-gray-medium bg-brand-gray-darkest p-4 sm:p-6">
              <OssMaintainerApplyForm />
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="dark" compactTop>
          <SiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}
