import { ArrowUpRight } from 'lucide-react';
import type { SpeakerNpmImpact } from '@/lib/npm';

export interface SpeakerOpenSourceImpactProps {
  speakerFirstName: string;
  impact: SpeakerNpmImpact;
}

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const FULL_NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

function formatCompact(value: number): string {
  if (value < 1000) return FULL_NUMBER_FORMATTER.format(value);
  return COMPACT_NUMBER_FORMATTER.format(value);
}

export function SpeakerOpenSourceImpact({ speakerFirstName, impact }: SpeakerOpenSourceImpactProps) {
  if (impact.packages.length === 0) {
    return null;
  }

  const totalWeekly = impact.totals.weekly_downloads;
  const topPackages = impact.top_packages;
  const maintainedCount = impact.packages.filter((pkg) => pkg.is_maintained).length;
  const contributedCount = impact.packages.length - maintainedCount;

  return (
    <section
      aria-labelledby="speaker-oss-impact-heading"
      className="rounded-xl border border-brand-gray-lightest bg-white p-4 text-brand-gray-darkest"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="speaker-oss-impact-heading"
          className="text-sm font-semibold text-brand-black"
        >
          Open source footprint
        </h2>
        <a
          href={`https://www.npmjs.com/~${impact.npm_username}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-xs text-brand-gray-medium underline-offset-2 hover:text-brand-black hover:underline"
        >
          @{impact.npm_username}
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </a>
      </header>

      <p className="mt-1 text-xs text-brand-gray-medium">
        <span className="font-semibold text-brand-black">{formatCompact(totalWeekly)}</span> weekly npm downloads across{' '}
        <span className="font-semibold text-brand-black">{impact.totals.package_count}</span> packages
        {speakerFirstName ? ` ${speakerFirstName} ships` : ''}
        {contributedCount > 0 ? ` (incl. ${contributedCount} contributing)` : ''}
        {maintainedCount > 0 && contributedCount === 0 ? '.' : ''}
      </p>

      <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {topPackages.map((pkg) => (
          <li key={pkg.name}>
            <a
              href={pkg.npm_url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-2 rounded-md border border-brand-gray-lightest bg-brand-gray-lightest/40 px-2.5 py-1.5 transition-colors hover:border-brand-black hover:bg-white"
              title={pkg.description ?? pkg.name}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-mono text-[11px] font-medium text-brand-black">{pkg.name}</span>
                {!pkg.is_maintained ? (
                  <span className="shrink-0 rounded-sm bg-brand-gray-lightest px-1 text-[9px] uppercase tracking-wider text-brand-gray-medium">
                    contrib
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-brand-gray-darkest">
                {formatCompact(pkg.weekly_downloads)}
                <span className="ml-0.5 text-brand-gray-medium">/wk</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      {impact.packages.length > topPackages.length ? (
        <p className="mt-2 text-[11px] text-brand-gray-medium">
          +{impact.packages.length - topPackages.length} more on npm.
        </p>
      ) : null}
    </section>
  );
}
