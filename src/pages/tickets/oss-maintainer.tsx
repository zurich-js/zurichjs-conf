/**
 * OSS Maintainer Ticket Application Page
 *
 * Standalone /tickets/oss-maintainer page. Renders the transparent tier table,
 * eligibility floor, and the application form (OssMaintainerApplyForm).
 *
 * Page intentionally has no data dependencies — pricing is server-resolved
 * when the admin approves, so we don't fetch Stripe prices here.
 */

import React from 'react';
import { Github, Package, ShieldCheck, Star, Users, Clock } from 'lucide-react';
import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { NavBar } from '@/components/organisms/NavBar';
import { SiteFooter, ShapedSection } from '@/components/organisms';
import { Heading } from '@/components/atoms/Heading';
import { Kicker } from '@/components/atoms/Kicker';
import { OssMaintainerApplyForm } from '@/components/molecules';

interface TierRow {
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  discount: string;
  label: string;
  reach: string;
  tenure: string;
  activity: string;
  accent: string;
}

const TIER_ROWS: readonly TierRow[] = [
  {
    tier: 'T1',
    discount: '80% off',
    label: 'Core maintainer',
    reach: '≥10k stars OR ≥100k weekly npm downloads',
    tenure: '≥3 years on the project',
    activity: 'Active in last 6 months',
    accent: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200',
  },
  {
    tier: 'T2',
    discount: '60% off',
    label: 'Established maintainer',
    reach: '≥2k stars OR ≥10k weekly npm downloads',
    tenure: '≥2 years on the project',
    activity: 'Active in last 6 months',
    accent: 'bg-sky-500/10 border-sky-500/40 text-sky-200',
  },
  {
    tier: 'T3',
    discount: '40% off',
    label: 'Growing maintainer',
    reach: '≥500 stars OR ≥1k weekly npm downloads',
    tenure: '≥1 year on the project',
    activity: 'Active in last 6 months',
    accent: 'bg-violet-500/10 border-violet-500/40 text-violet-200',
  },
  {
    tier: 'T4',
    discount: '20% off',
    label: 'Emerging maintainer',
    reach: '≥500 stars OR ≥1k weekly npm downloads',
    tenure: 'Less than 1 year — but real activity',
    activity: 'Recent commits',
    accent: 'bg-amber-500/10 border-amber-500/40 text-amber-200',
  },
] as const;

export default function OssMaintainerPage() {
  return (
    <>
      <SEO
        title="OSS Maintainer Tickets — ZurichJS Conference 2026"
        description="Discounted ZurichJS 2026 tickets for active maintainers of open-source JavaScript libraries — up to 80% off."
      />
      <NavBar />
      <main className="min-h-screen bg-brand-black text-brand-white">
        <ShapedSection shape="straight" variant="dark">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <Kicker>For the people who keep our stack alive</Kicker>
            <Heading level="h1" className="mt-3 mb-4 text-4xl sm:text-5xl font-bold">
              OSS maintainer tickets
            </Heading>
            <p className="text-base sm:text-lg text-brand-gray-light max-w-2xl">
              ZurichJS runs on open source. If you maintain an actively-used JavaScript or
              TypeScript library, you can apply for a discounted ticket — up to{' '}
              <strong className="text-brand-primary">80% off</strong> standard or VIP. Tiers are
              transparent, evaluation is fast, and seats are limited.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
              <Stat icon={<Users className="w-5 h-5" />} label="Seats available" value="30 total" />
              <Stat icon={<ShieldCheck className="w-5 h-5" />} label="Review time" value="≤ 48h" />
              <Stat icon={<Star className="w-5 h-5" />} label="Max discount" value="80%" />
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="tighten" variant="medium" id="tiers">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <Kicker>The ladder</Kicker>
            <Heading level="h2" className="mt-3 mb-3 text-3xl sm:text-4xl font-bold">
              Pick your tier — they&apos;re public, not secret
            </Heading>
            <p className="text-sm sm:text-base text-brand-gray-light max-w-2xl mb-8">
              We check three things from your GitHub + npm presence: <strong>reach</strong>{' '}
              (people use it), <strong>tenure</strong> (you&apos;ve been at it a while), and{' '}
              <strong>activity</strong> (you still are). The strongest signal wins.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TIER_ROWS.map((row) => (
                <div
                  key={row.tier}
                  className={`rounded-2xl border p-5 ${row.accent}`}
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-xs font-semibold tracking-wider uppercase opacity-80">
                      {row.tier} — {row.label}
                    </span>
                    <span className="text-2xl font-bold">{row.discount}</span>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <dt className="shrink-0 opacity-70 w-20">Reach</dt>
                      <dd>{row.reach}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 opacity-70 w-20">Tenure</dt>
                      <dd>{row.tenure}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 opacity-70 w-20">Activity</dt>
                      <dd>{row.activity}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-brand-gray-medium bg-brand-black/40 p-5 mt-6 text-sm text-brand-gray-light">
              <h3 className="font-semibold text-brand-white mb-2">Floor: who doesn&apos;t qualify (yet)</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Projects with &lt; 500 GitHub stars and &lt; 1k weekly npm downloads.</li>
                <li>Brand-new GitHub accounts (under 2 years old).</li>
                <li>Forks without ≥ 50 commits ahead of upstream.</li>
                <li>npm packages first published less than 6 months ago.</li>
                <li>Submitters who aren&apos;t in the top 3 contributors or the repo owner.</li>
              </ul>
              <p className="mt-3">
                If you&apos;re close to the line but feel the data misses your project (e.g., niche
                framework with serious deploys), apply anyway — the &quot;anything else&quot; box on
                the form goes to a human reviewer.
              </p>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="tighten" variant="dark" id="apply">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <Kicker>Apply</Kicker>
            <Heading level="h2" className="mt-3 mb-3 text-3xl sm:text-4xl font-bold">
              Submit your maintainer application
            </Heading>
            <p className="text-sm sm:text-base text-brand-gray-light mb-8">
              Tell us which repos (and optionally npm packages) you maintain. We&apos;ll auto-check
              them, surface your tier, then have a human approve the discount and email you a
              payment link.
            </p>

            <div className="rounded-2xl border border-brand-gray-medium bg-brand-gray-darkest p-5 sm:p-7">
              <OssMaintainerApplyForm />
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-brand-gray-light">
              <div className="rounded-xl border border-brand-gray-medium bg-brand-black/30 p-4">
                <div className="flex items-center gap-2 text-brand-white font-semibold mb-2">
                  <Github className="w-4 h-4" aria-hidden="true" />
                  What we check on GitHub
                </div>
                <p>
                  Account age, repo stars, fork status, the user&apos;s commit count + first/last
                  commit date on the default branch, and the top-3 contributors list. Public API
                  only — no scraping.
                </p>
              </div>
              <div className="rounded-xl border border-brand-gray-medium bg-brand-black/30 p-4">
                <div className="flex items-center gap-2 text-brand-white font-semibold mb-2">
                  <Package className="w-4 h-4" aria-hidden="true" />
                  What we check on npm
                </div>
                <p>
                  Package maintainers list, first publish date, and weekly downloads from the
                  public registry. We never read your private packages or auth tokens.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-brand-gray-medium bg-brand-black/30 p-4 text-xs text-brand-gray-light">
              <div className="flex items-center gap-2 text-brand-white font-semibold mb-2">
                <Clock className="w-4 h-4" aria-hidden="true" />
                After you apply
              </div>
              <p>
                Within 48 hours a human reviews. Approvals come as an email with a Stripe payment
                link — discount pre-applied, no promo code typing. Your GitHub handle is locked to
                the ticket attendee and printed on the badge. Questions? Email{' '}
                <a href="mailto:hello@zurichjs.com" className="text-brand-primary underline">
                  hello@zurichjs.com
                </a>
                . Want regular pricing instead?{' '}
                <Link href="/#tickets" className="text-brand-primary underline">
                  See standard tickets
                </Link>
                .
              </p>
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-gray-medium bg-brand-gray-darkest px-4 py-3 flex items-center gap-3">
      <div className="text-brand-primary" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p className="text-xs text-brand-gray-light">{label}</p>
        <p className="text-base font-semibold text-brand-white">{value}</p>
      </div>
    </div>
  );
}
