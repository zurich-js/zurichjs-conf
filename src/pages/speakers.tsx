import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DehydratedState } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { SpeakerCard } from '@/components/molecules';
import { SectionContainer, ShapedSection, SiteFooter } from '@/components/organisms';
import { analytics } from '@/lib/analytics';
import { getQueryClient } from '@/lib/query-client';
import { createPrefetch } from '@/lib/prefetch';
import { publicSpeakersQueryOptions } from '@/lib/queries/speakers';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ArrowDownAZ, ArrowUpAZ, ArrowUpDown, Filter } from 'lucide-react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import Link from "next/link";

type ViewMode = 'compact' | 'default' | 'full';
type SortMode = 'none' | 'asc' | 'desc';

interface SpeakersPageProps {
  dehydratedState: DehydratedState;
}

function TagFilter({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (nextValue: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => option.toLowerCase().includes(normalizedQuery))
    : options;

  return (
    <Combobox
      value={value}
      onChange={(nextValue: string[]) => {
        onChange(nextValue);
        setQuery('');
      }}
      multiple
    >
      <div className="w-full relative min-w-0">
        <div className="flex min-h-12 w-full flex-wrap items-center gap-2 rounded-2xl border border-brand-gray-light bg-brand-white px-4 py-2 pr-11 text-sm text-brand-black shadow-[0_20px_50px_rgba(0,0,0,0.08)] focus-within:border-brand-gray-medium">
          {value.length > 0 ? (
            <span className="grid size-5 place-items-center rounded-full bg-brand-yellow-main text-xs font-semibold text-brand-black">
              {value.length}
            </span>
          ) : null}

          <ComboboxInput
            className="min-w-[140px] flex-1 bg-transparent text-sm text-brand-black placeholder:text-brand-gray-medium outline-none"
            displayValue={() => ''}
            onChange={(event) => setQuery(event.target.value)}
            onBlur={() => setQuery('')}
            placeholder={value.length > 0 ? 'Add another tag...' : 'Search or select tags...'}
            aria-label="Filter speakers by tags"
          />
        </div>

        <ComboboxButton className="absolute top-4 right-0 flex items-center pr-4 text-brand-gray-medium">
          <ChevronDown className="size-4" />
        </ComboboxButton>

        <ComboboxOptions className="mt-3 max-h-64 overflow-auto rounded-2xl border border-brand-gray-light bg-brand-white py-2 shadow-[0_20px_50px_rgba(0,0,0,0.14)] outline-none">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-brand-gray-medium">No matching tags</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = value.includes(option);

              return (
                <ComboboxOption
                  key={option}
                  value={option}
                  className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm text-brand-black transition-colors data-[focus]:bg-brand-gray-lightest"
                >
                  <span className={cn(isSelected && 'font-semibold')}>{option}</span>
                  {isSelected ? <Check className="size-4 text-brand-blue" /> : null}
                </ComboboxOption>
              );
            })
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}

export default function SpeakersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [sortMode, setSortMode] = useState<SortMode>('none');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { data, isLoading } = useQuery(publicSpeakersQueryOptions);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.matchMedia('(max-width: 767px)').matches) {
      setViewMode('full');
    }
  }, []);

  const speakers = data?.speakers ?? [];
  const availableTags = Array.from(
    new Set(speakers.flatMap((speaker) => speaker.sessions.flatMap((session) => session.tags)))
  ).sort();
  let visibleSpeakers = [...speakers];

  if (selectedTags.length > 0) {
    visibleSpeakers = visibleSpeakers.filter((speaker) =>
      speaker.sessions.some((session) => session.tags.some((tag) => selectedTags.includes(tag)))
    );
  }

  if (sortMode !== 'none') {
    visibleSpeakers.sort((left, right) => {
      const leftName = `${left.first_name} ${left.last_name}`.trim().toLowerCase();
      const rightName = `${right.first_name} ${right.last_name}`.trim().toLowerCase();
      return sortMode === 'asc' ? leftName.localeCompare(rightName) : rightName.localeCompare(leftName);
    });
  }

  const showNoMatches = selectedTags.length > 0 && visibleSpeakers.length === 0;
  const sortLabel = sortMode === 'none' ? 'Default' : sortMode === 'asc' ? 'Name A-Z' : 'Name Z-A';
  const cardSize = viewMode === 'compact' ? '12rem' : viewMode === 'default' ? '15rem' : '17rem';
  const gridStyle = { '--card-size': cardSize } as CSSProperties;
  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === viewMode) {
      return;
    }

    setViewMode(mode);

    try {
      analytics.getInstance().capture('speakers_grid_view_selected', {
        view_mode: mode,
      });
    } catch {
      // Ignore analytics failures.
    }
  };

  return (
    <>
      <SEO
        title="Speakers"
        description="Explore the public speakers lineup for ZurichJS Conference."
        canonical="/speakers"
        keywords="zurichjs speakers, conference speakers, public speaker lineup"
      />
      <main className="min-h-screen bg-brand-white">
        <ShapedSection shape="straight" variant="dark" dropTop dropBottom>
            <Kicker variant="dark" className="mb-4">
              September 11, 2026
            </Kicker>
            <Heading level="h1" variant="dark" className="text-3xl font-bold leading-none">
              ZurichJS Conf Speakers
            </Heading>
            {/* TODO(feature/speakers-grid): Replace this placeholder intro once public speaker messaging is finalized. */}
            <p className="mt-6 max-w-screen-md text-lg text-brand-gray-light">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nisl eget aliquam tincidunt, nunc nisl aliquam nisl, eget aliquam nisl nisl eget nisl.
            </p>
        </ShapedSection>

        <SectionContainer>
          <div className="py-16 md:py-20">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col justify-between sm:items-end gap-5 sm:flex-row">
                <div>
                  <p className="mb-2.5 px-4 text-sm">Grid view</p>
                  <div className="inline-flex rounded-full border border-brand-black bg-brand-white p-1">
                    {(['compact', 'default', 'full'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleViewModeChange(mode)}
                        className={cn(
                          'rounded-full px-5 py-2 text-sm font-semibold transition-colors cursor-pointer',
                          viewMode === mode
                            ? 'bg-brand-black text-brand-white'
                            : 'text-brand-black hover:bg-brand-gray-lightest'
                        )}
                      >
                        {mode === 'compact' ? 'Compact' : mode === 'default' ? 'Default' : 'Full'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSortMode((current) => {
                        if (current === 'none') return 'asc';
                        if (current === 'asc') return 'desc';
                        return 'none';
                      });
                    }}
                    forceDark
                  >
                    {sortMode === 'none' ? <ArrowUpDown className="size-4" /> : sortMode === 'asc' ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />}
                    Sort: {sortLabel}
                  </Button>

                  <Popover as="div" className="relative">
                    <PopoverButton
                      as={Button}
                      variant="ghost"
                      size="sm"
                      className={cn(
                          '!text-brand-black',
                        selectedTags.length > 0
                          ? 'border-brand-black bg-brand-black text-brand-white hover:bg-brand-black hover:text-brand-white'
                          : 'border-brand-gray-light bg-brand-white text-brand-black hover:bg-brand-gray-lightest hover:text-brand-black'
                      )}
                    >
                      <Filter className="size-4" />
                      Filter
                      {selectedTags.length > 0 ? ` (${selectedTags.length})` : ''}
                    </PopoverButton>

                    <PopoverPanel
                      anchor="bottom end"
                      className="z-20 mt-3 overflow-visible rounded-3xl border border-brand-gray-light bg-brand-white p-4 shadow-2xl outline-none"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-brand-black">Filter by tags</p>
                          {selectedTags.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedTags([])}
                              className="text-sm font-medium text-brand-blue transition-colors hover:text-brand-black"
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>

                        <TagFilter options={availableTags} value={selectedTags} onChange={setSelectedTags} />
                      </div>
                    </PopoverPanel>
                  </Popover>
                </div>
              </div>

              {isLoading ? (
                <div className="grid min-h-64 place-items-center rounded-3xl bg-brand-gray-lightest">
                  <div className="flex items-center gap-3 text-sm font-medium text-brand-gray-darkest">
                    <span className="size-4 animate-spin rounded-full border-2 border-brand-gray-light border-t-brand-black" />
                    Loading speakers...
                  </div>
                </div>
              ) : !showNoMatches ? (
                <div
                  className="grid gap-8"
                  style={gridStyle}
                >
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(var(--card-size),1fr))] auto-rows-fr gap-4">
                    {visibleSpeakers.map((speaker) => (
                      <SpeakerCard
                        key={speaker.id}
                        variant={viewMode}
                        header={speaker.header_image_url || undefined}
                        avatar={speaker.profile_image_url}
                        name={[speaker.first_name, speaker.last_name].filter(Boolean).join(' ')}
                        title={[speaker.job_title, speaker.company].filter(Boolean).join(' @')}
                        footer={speaker.sessions?.[0]?.title}
                        to={`/speakers/${speaker.slug}`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl bg-brand-gray-lightest px-6 py-12 text-center">
                  <Heading level="h2" variant="light" className="text-lg font-bold">
                    No speakers match these filters
                  </Heading>
                  <p className="mt-3 text-brand-gray-darkest">Try removing one or more selected tags to see the full lineup again.</p>
                  {selectedTags.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedTags([])}
                      className="mt-6 inline-flex cursor-pointer rounded-full border border-brand-black px-4 py-2 text-sm font-semibold text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              )}
            </div>

              <div className="mt-20">
                  <p className="mb-4">This view doesn&#39;t work for you?</p>
                  <ul className="flex flex-col w-fit ml-6 list-disc gap-2">
                      <li>
                          <Link className="text-brand-blue font-bold underline decoration-dotted hover:text-brand-black transition-all duration-200" href="/talks">
                              See the full list of talks
                          </Link>
                      </li>
                      <li>
                          <Link className="text-brand-blue font-bold underline decoration-dotted hover:text-brand-black transition-all duration-200" href="/workshops">
                              Explore the workshops
                          </Link>
                      </li>
                      <li>
                          <Link className="text-brand-blue font-bold underline decoration-dotted hover:text-brand-black transition-all duration-200" href="/schedule">
                              Check out the full schedule
                          </Link>
                      </li>
                  </ul>
              </div>
          </div>
        </SectionContainer>


        <ShapedSection shape="straight" variant="medium">
          <div className="mx-auto max-w-screen-lg">
            <Kicker variant="dark" className="mb-4">
              Join The Crowd
            </Kicker>
            <Heading level="h2" variant="dark" className="text-lg sm:text-2xl font-bold leading-tight">
              Want to hang out more with the speakers?
            </Heading>
            <p className="mt-6 max-w-2xl text-base leading-8 text-brand-gray-light">
              The VIP ticket includes conference access, but you also get to take part in speaker activities, such as the after-party and city tour.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="black" asChild href="/#tickets">
                Get your ticket
              </Button>
            <Button variant="primary" asChild href="/#tickets">
                Get VIP
            </Button>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="straight" variant="dark" compactTop>
          <SiteFooter showContactLinks />
        </ShapedSection>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SpeakersPageProps> = async () => {
  const queryClient = getQueryClient();
  const { optionalQuery, dehydrate } = createPrefetch(queryClient);

  await optionalQuery(publicSpeakersQueryOptions);

  return {
    props: {
      dehydratedState: dehydrate(),
    },
  };
};
