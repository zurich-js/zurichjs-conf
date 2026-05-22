import { ArrowUpRight, Star } from 'lucide-react';
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
  const [heroPackage, ...restPackages] = impact.top_packages;
  const visibleRest = restPackages.slice(0, 5);
  const maintainedCount = impact.packages.filter((pkg) => pkg.is_maintained).length;
  const contributedCount = impact.packages.length - maintainedCount;
  const hiddenCount = impact.packages.length - impact.top_packages.length;

  return (
    <section
      aria-labelledby="speaker-oss-impact-heading"
      className="overflow-hidden rounded-xl border border-brand-gray-lightest bg-brand-white"
    >
      <div className="h-1 bg-brand-yellow-main" aria-hidden="true" />

      <div className="p-4 md:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-yellow-secondary">
            Open source impact
          </p>
          <a
            href={`https://www.npmjs.com/~${impact.npm_username}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-gray-medium underline-offset-2 hover:text-brand-black hover:underline"
          >
            @{impact.npm_username} on npm
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        </div>

        <h2
          id="speaker-oss-impact-heading"
          className="mt-1.5 text-xl font-bold leading-tight text-brand-black md:text-2xl"
        >
          {formatCompact(totalWeekly)}+ weekly npm downloads
        </h2>
        <p className="mt-1 text-sm leading-snug text-brand-gray-medium">
          Across{' '}
          <span className="font-semibold text-brand-black">
            {impact.totals.package_count} package{impact.totals.package_count === 1 ? '' : 's'}
          </span>{' '}
          {speakerFirstName} {maintainedCount > 0 ? 'maintains' : 'ships'}
          {contributedCount > 0 ? ` (+${contributedCount} contributing)` : ''}
          . You&rsquo;ll hear from them on the ZurichJS Conf stage.
        </p>

        {heroPackage ? (
          <a
            href={heroPackage.npm_url}
            target="_blank"
            rel="noreferrer"
            className="group mt-3 block rounded-lg border border-brand-yellow-main/40 bg-brand-yellow-main/10 p-3 transition-colors hover:border-brand-yellow-main hover:bg-brand-yellow-main/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Star className="size-3.5 fill-brand-yellow-secondary text-brand-yellow-secondary" aria-hidden="true" />
                  <span className="font-mono text-sm font-semibold text-brand-black">{heroPackage.name}</span>
                </div>
                {heroPackage.description ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-brand-gray-darkest">
                    {heroPackage.description}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-base font-bold leading-none tabular-nums text-brand-black">
                  {formatCompact(heroPackage.weekly_downloads)}
                </div>
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-gray-medium">
                  per week
                </div>
              </div>
            </div>
          </a>
        ) : null}

        {visibleRest.length > 0 ? (
          <>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-gray-medium">
              Also ships
            </p>
            <ul className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleRest.map((pkg) => (
                <li key={pkg.name}>
                  <a
                    href={pkg.npm_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-2 rounded-md border border-brand-gray-lightest bg-brand-gray-lightest/30 px-2.5 py-1.5 transition-colors hover:border-brand-yellow-main hover:bg-brand-yellow-main/10"
                    title={pkg.description ?? pkg.name}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-mono text-[11px] font-medium text-brand-black">
                        {pkg.name}
                      </span>
                      {!pkg.is_maintained ? (
                        <span className="shrink-0 rounded-sm bg-brand-gray-lightest px-1 text-[9px] uppercase tracking-wider text-brand-gray-medium">
                          contrib
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-brand-gray-darkest">
                      {formatCompact(pkg.weekly_downloads)}
                      <span className="ml-0.5 font-normal text-brand-gray-medium">/wk</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {hiddenCount > 0 ? (
          <p className="mt-2.5 text-[11px] text-brand-gray-medium">
            +{hiddenCount} more package{hiddenCount === 1 ? '' : 's'} on npm.
          </p>
        ) : null}
      </div>
    </section>
  );
}
