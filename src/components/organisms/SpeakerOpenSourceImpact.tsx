import { ArrowUpRight, Download, Package } from 'lucide-react';
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

function formatFull(value: number): string {
  return FULL_NUMBER_FORMATTER.format(value);
}

export function SpeakerOpenSourceImpact({ speakerFirstName, impact }: SpeakerOpenSourceImpactProps) {
  if (impact.packages.length === 0) {
    return null;
  }

  const totalWeekly = impact.totals.weekly_downloads;
  const totalAnnualized = totalWeekly * 52;
  const topPackages = impact.top_packages;
  const maintainedCount = impact.packages.filter((pkg) => pkg.is_maintained).length;
  const contributedCount = impact.packages.length - maintainedCount;

  return (
    <section
      aria-labelledby="speaker-oss-impact-heading"
      className="rounded-3xl border border-brand-gray-lightest bg-brand-gray-darkest p-6 text-brand-white shadow-[0_24px_70px_rgba(0,0,0,0.18)] md:p-10"
    >
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-yellow-main">
            Open source footprint
          </span>
          <h2
            id="speaker-oss-impact-heading"
            className="text-2xl font-bold leading-tight text-brand-white md:text-3xl"
          >
            {speakerFirstName}&rsquo;s code runs everywhere
          </h2>
        </div>
        <a
          href={`https://www.npmjs.com/~${impact.npm_username}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 self-start text-sm font-medium text-brand-yellow-main underline-offset-4 hover:underline md:self-end"
        >
          @{impact.npm_username} on npm
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </header>

      <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-brand-gray-dark p-5">
          <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-brand-gray-light">
            <Download className="size-3.5" aria-hidden="true" /> Weekly downloads
          </dt>
          <dd className="mt-2 text-3xl font-bold leading-none md:text-4xl">
            {formatCompact(totalWeekly)}
            <span className="ml-1 text-base font-medium text-brand-gray-light">/ week</span>
          </dd>
          <p className="mt-2 text-xs text-brand-gray-light">
            <span aria-hidden="true">≈</span>{' '}
            <span className="sr-only">approximately </span>
            {formatCompact(totalAnnualized)} / year
          </p>
        </div>

        <div className="rounded-2xl bg-brand-gray-dark p-5">
          <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-brand-gray-light">
            <Package className="size-3.5" aria-hidden="true" /> Packages
          </dt>
          <dd className="mt-2 text-3xl font-bold leading-none md:text-4xl">
            {formatFull(impact.totals.package_count)}
          </dd>
          <p className="mt-2 text-xs text-brand-gray-light">
            {maintainedCount} maintained
            {contributedCount > 0 ? ` · ${contributedCount} contributing` : null}
          </p>
        </div>

        <div className="rounded-2xl bg-brand-yellow-main p-5 text-brand-black">
          <dt className="text-xs font-medium uppercase tracking-wider text-brand-gray-darkest">
            Most-used package
          </dt>
          <dd className="mt-2 text-2xl font-bold leading-tight md:text-3xl">
            {topPackages[0]?.name ?? '—'}
          </dd>
          <p className="mt-2 text-xs text-brand-gray-darkest">
            {topPackages[0]
              ? `${formatCompact(topPackages[0].weekly_downloads)} weekly downloads`
              : null}
          </p>
        </div>
      </dl>

      <ul className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
        {topPackages.map((pkg) => (
          <li key={pkg.name}>
            <a
              href={pkg.npm_url}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full flex-col justify-between gap-2 rounded-2xl border border-brand-gray-dark bg-brand-gray-dark/60 p-4 transition-colors hover:border-brand-yellow-main hover:bg-brand-gray-dark"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-sm font-semibold text-brand-white">{pkg.name}</span>
                <ArrowUpRight
                  className="size-4 shrink-0 text-brand-gray-light transition-colors group-hover:text-brand-yellow-main"
                  aria-hidden="true"
                />
              </div>
              {pkg.description ? (
                <p className="line-clamp-2 text-xs text-brand-gray-light">{pkg.description}</p>
              ) : null}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-brand-yellow-main">
                  {formatCompact(pkg.weekly_downloads)}
                  <span className="ml-1 text-brand-gray-light">/wk</span>
                </span>
                {!pkg.is_maintained ? (
                  <span className="rounded-full bg-brand-gray-darkest px-2 py-0.5 text-[10px] uppercase tracking-wider text-brand-gray-light">
                    Contributor
                  </span>
                ) : null}
              </div>
            </a>
          </li>
        ))}
      </ul>

      {impact.packages.length > topPackages.length ? (
        <p className="mt-6 text-xs text-brand-gray-light">
          +{impact.packages.length - topPackages.length} more packages on npm.
        </p>
      ) : null}

      {impact.is_stale ? (
        <p className="mt-4 text-[11px] text-brand-gray-medium">
          Cached snapshot — refreshes every 6 hours.
        </p>
      ) : null}
    </section>
  );
}
