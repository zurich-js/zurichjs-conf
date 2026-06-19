import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import type { DehydratedState } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { GetServerSideProps } from 'next';
import { Download, Copy, Check, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { Button } from '@/components/atoms';
import { SpeakerCard } from '@/components/molecules';
import { ProgramScheduleItemCard } from '@/components/scheduling';
import { SEO } from '@/components/SEO';
import { getQueryClient } from '@/lib/query-client';
import { createPrefetch } from '@/lib/prefetch';
import { publicSpeakersQueryOptions } from '@/lib/queries/speakers';
import { createWorkshopsScheduleQueryOptions } from '@/lib/queries/workshops';
import { useCurrency } from '@/contexts/CurrencyContext';
import { aboutPageData } from '@/data/about-us';
import { conferenceBlurbs, keyFacts, topics } from '@/data/partner-assets';
import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';

interface PartnerAssetsPageProps {
  dehydratedState: DehydratedState;
}

const WORKSHOP_DAY = '2026-09-10';

const tocItems = [
  { id: 'logos', label: 'Logos' },
  { id: 'blurbs', label: 'About the Conference' },
  { id: 'speakers', label: 'Speakers' },
  { id: 'workshops', label: 'Workshops' },
  { id: 'after-party', label: 'After Party' },
  { id: 'facts', label: 'Key Facts' },
  { id: 'contact', label: 'Contact' },
];

function AfterPartyCarousel() {
  const images = aboutPageData.afterParty.images;
  const [current, setCurrent] = useState(0);
  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-brand-gray-darkest group">
      {images.map((img, i) => (
        <Image
          key={img.src}
          src={img.src}
          alt={img.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={`object-cover transition-opacity duration-500 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          priority={i === 0}
        />
      ))}
      {images.length > 1 && (
        <>
          <button onClick={prev} aria-label="Previous image" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft size={20} />
          </button>
          <button onClick={next} aria-label="Next image" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`Go to image ${i + 1}`} className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CopyButton({ text, label, variant = 'light' }: { text: string; label: string; variant?: 'light' | 'dark' }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const styles = variant === 'dark'
    ? 'text-brand-gray-light hover:text-white border-white/20 hover:border-white/40'
    : 'text-brand-gray-dark hover:text-brand-black border-brand-gray-light hover:border-brand-gray-dark';

  return (
    <button onClick={handleCopy} className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors cursor-pointer ${styles}`}>
      {copied ? (<><Check className="w-4 h-4 text-green-400" />Copied!</>) : (<><Copy className="w-4 h-4" />{label}</>)}
    </button>
  );
}

type LogoCardTheme = 'dark' | 'neutral' | 'yellow';

const logoCardThemeStyles: Record<LogoCardTheme, { preview: string; titleNote: string }> = {
  dark: { preview: 'bg-brand-black', titleNote: 'dark' },
  neutral: { preview: 'bg-brand-gray-lightest', titleNote: 'neutral' },
  yellow: { preview: 'bg-brand-yellow-main', titleNote: 'yellow' },
};

function LogoCard({
  title,
  description,
  imageSrc,
  theme,
  imageClassName = '',
}: {
  title: string; description: string; imageSrc: string; theme?: LogoCardTheme; imageClassName?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const pngSrc = imageSrc.replace(/\.svg$/i, '.png');
  const assetName = imageSrc.split('/').pop()?.replace(/\.svg$/i, '') ?? 'zurichjs-logo';
  const themeStyle = theme ? logoCardThemeStyles[theme] : undefined;
  const previewBackground = themeStyle?.preview ?? 'bg-white';

  const copySvg = async () => {
    const response = await fetch(imageSrc);
    const svgText = await response.text();
    await navigator.clipboard.writeText(svgText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-brand-gray-light rounded-xl overflow-hidden flex flex-col h-full">
      <div className={`${previewBackground} flex h-56 shrink-0 items-center justify-center px-6 py-10 md:h-60`}>
        <Image src={imageSrc} alt={title} width={520} height={220}
          className={`h-auto w-auto max-h-[160px] max-w-full object-contain ${imageClassName}`}
          unoptimized={imageSrc.endsWith('.svg') || imageSrc.endsWith('.gif')} />
      </div>
      <div className="flex flex-1 flex-col bg-white p-6">
        <h3 className="text-md font-semibold text-brand-black mb-2">
          {title}
          {themeStyle ? <small className="ml-1 text-xs font-medium text-brand-gray-dark">({themeStyle.titleNote})</small> : null}
        </h3>
        <p className="mb-6 text-sm text-brand-gray-dark">{description}</p>
        <div className="mt-auto flex flex-wrap gap-2">
          <Menu as="div" className="relative">
            <MenuButton className="inline-flex items-center gap-2 px-3 py-2 bg-brand-black text-white text-sm font-medium rounded-lg hover:bg-brand-gray-darkest transition-colors cursor-pointer">
              <Download className="w-4 h-4" />Download
            </MenuButton>
            <MenuItems
              anchor="bottom start"
              className="z-30 mt-1 w-40 rounded-xl border border-brand-gray-dark bg-brand-black p-2 shadow-[0_20px_50px_rgba(0,0,0,0.22)] outline-none"
            >
              <MenuItem>
                <a
                  href={pngSrc}
                  download={`${assetName}.png`}
                  className="block cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors data-[focus]:bg-brand-gray-darkest"
                >
                  PNG
                </a>
              </MenuItem>
              <MenuItem>
                <a
                  href={imageSrc}
                  download={`${assetName}.svg`}
                  className="block cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors data-[focus]:bg-brand-gray-darkest"
                >
                  SVG
                </a>
              </MenuItem>
            </MenuItems>
          </Menu>
          <button type="button" onClick={copySvg} className="inline-flex items-center gap-2 px-3 py-2 border border-brand-gray-light text-brand-gray-dark text-sm font-medium rounded-lg hover:border-brand-gray-dark hover:text-brand-black transition-colors cursor-pointer">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy SVG'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BlurbCard({ title, text, wordCount }: { title: string; text: string; wordCount: string }) {
  return (
    <div className="border border-brand-gray-light rounded-xl p-6 bg-white">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-brand-black">{title}</h3>
          <p className="text-sm text-brand-gray-dark">{wordCount}</p>
        </div>
        <CopyButton text={text} label="Copy" />
      </div>
      <p className="text-brand-gray-dark text-sm leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  );
}

function getWorkshopItems(items: PublicProgramScheduleItem[]) {
  return items
    .filter((item) => item.date === WORKSHOP_DAY && item.type !== 'break' && item.type !== 'event')
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export default function PartnerAssetsPage() {
  const { data: speakerData, isLoading: speakersLoading } = useQuery(publicSpeakersQueryOptions());
  const speakers = speakerData?.speakers ?? [];
  const programSpeakerCount = speakerData?.programSpeakerCount ?? 0;
  const placeholderCount = Math.max(0, programSpeakerCount - speakers.length);

  const { currency } = useCurrency();
  const workshopQueryOptions = useMemo(() => createWorkshopsScheduleQueryOptions(currency), [currency]);
  const { data: workshopData, isLoading: workshopsLoading } = useQuery(workshopQueryOptions);
  const workshopItems = useMemo(() => workshopData ? getWorkshopItems(workshopData.items) : [], [workshopData]);

  const speakerListText = speakers
    .map((s) => {
      const name = [s.first_name, s.last_name].filter(Boolean).join(' ');
      const title = [s.job_title, s.company].filter(Boolean).join(' @ ');
      return `${name} — ${title}`;
    })
    .join('\n');

  const afterParty = aboutPageData.afterParty;

  return (
    <>
      <SEO
        title="Partner Toolkit | ZurichJS Conference 2026"
        description="Download ZurichJS Conference logos, brand assets, and promotional materials. Find speakers, workshops, and official descriptions for partners."
        canonical="/partners/assets"
        ogType="website"
        keywords="zurichjs partner assets, zurichjs logo, zurichjs partnership, javascript conference assets, zurichjs brand, zurichjs speakers"
      />

      <main className="min-h-screen">
        {/* Hero Section */}
        <ShapedSection shape="widen" variant="light" dropTop id="hero">
          <div className="pt-40 pb-12 md:pb-20">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-brand-yellow-dark uppercase tracking-wider mb-4">
                Partner Resources
              </p>
              <h1 className="text-2xl lg:text-3xl font-bold text-brand-black mb-6">
                Partner Toolkit
              </h1>
              <p className="text-lg md:text-xl text-brand-gray-dark leading-relaxed mb-10">
                Everything you need to promote ZurichJS Conference 2026.
                Logos, copy-ready blurbs, speaker lineup, workshop details, and key facts.
              </p>
              <nav aria-label="Table of contents">
                <p className="text-sm text-brand-gray-dark mb-3">
                  Click any section below to jump straight to the details.
                </p>
                <div className="flex flex-wrap gap-2">
                  {tocItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="px-4 py-2 text-sm font-medium bg-brand-black text-white rounded-full hover:bg-brand-gray-darkest transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </ShapedSection>

        {/* Logos Section */}
        <ShapedSection shape="tighten" variant="gray-light" id="logos">
          <div className="py-12 md:py-16">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-brand-black mb-4">Logos</h2>
              <p className="text-brand-gray-dark max-w-2xl">
                Use the <b>ZurichJS Conf 2026 wordmark</b> when promoting the conference. Use the
                ZurichJS wordmark for community or organizer references, and use the square logo
                when horizontal space is limited, as long as the wordmark is used somewhere else.
                <b>Please do not modify the assets. If you need a better fit, reach out to us at media@zurichjs.com</b>
              </p>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
              <LogoCard
                title="Conference Wordmark"
                description="Use this version for ZurichJS Conf 2026 promotion on light backgrounds."
                imageSrc="/images/logo/wordmark-conf.svg"
              />
              <LogoCard
                title="Conference Wordmark"
                description="Use this version for ZurichJS Conf 2026 promotion on dark backgrounds."
                imageSrc="/images/logo/wordmark-conf-white.svg"
                theme="dark"
              />
              <LogoCard
                title="ZurichJS Wordmark"
                description="Use this version when referencing ZurichJS as the community or event organizer on light backgrounds."
                imageSrc="/images/logo/wordmark.svg"
              />
              <LogoCard
                title="ZurichJS Wordmark"
                description="Use this version when referencing ZurichJS as the community or event organizer on dark backgrounds."
                imageSrc="/images/logo/wordmark-white.svg"
                theme="dark"
              />
              <LogoCard
                title="Square Logo"
                description="Use this compact mark when the wordmark does not fit, such as icons, avatars, or very small placements."
                imageSrc="/images/logo/square.svg"
                theme="neutral"
              />
              <LogoCard
                title="Square Logo for Circle Inscription"
                description="Use this adjusted square when placing the mark inside a circular crop or badge."
                imageSrc="/images/logo/square-circle.svg"
                theme="neutral"
              />
              <LogoCard
                title="Square Logo Transparent"
                description="Use this version on ZurichJS brand-gradient backgrounds to keep enough contrast."
                imageSrc="/images/logo/square-no-yellow.svg"
                theme="yellow"
              />
              <LogoCard
                title="Swag Lockup"
                description="Use this lockup for merchandise when the ZurichJS name should sit below the square mark."
                imageSrc="/images/logo/swag.svg"
                theme="neutral"
              />
              <LogoCard
                title="Swag Lockup"
                description="Use this lockup for dark merchandise or other dark-background applications."
                imageSrc="/images/logo/swag-white.svg"
                theme="dark"
              />
            </div>
          </div>
        </ShapedSection>

        {/* Blurbs Section */}
        <ShapedSection shape="widen" variant="light" id="blurbs">
          <div className="py-12 md:py-16">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-brand-black mb-4">About the Conference</h2>
              <p className="text-brand-gray-dark max-w-2xl">
                Official descriptions you can use in articles, social posts, newsletters, or
                anywhere else you&apos;re writing about ZurichJS Conference 2026.
              </p>
            </div>
            <div className="space-y-6">
              <BlurbCard title="Short Description" text={conferenceBlurbs.short} wordCount="~50 words" />
              <BlurbCard title="Medium Description" text={conferenceBlurbs.medium} wordCount="~110 words" />
              <BlurbCard title="Full Description" text={conferenceBlurbs.full} wordCount="~250 words" />
            </div>
          </div>
        </ShapedSection>

        {/* Speakers Section */}
        <ShapedSection shape="tighten" variant="dark" id="speakers">
          <div className="py-12 md:py-16">
            <div className="flex items-start justify-between gap-4 mb-10 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-sm font-semibold text-brand-yellow-main uppercase tracking-wider">Speaker Lineup</p>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  {programSpeakerCount || 20} Speakers from World-Class Companies
                </h2>
                <p className="text-brand-gray-light max-w-2xl">
                  Our lineup includes maintainers of major open-source projects, developer advocates,
                  and engineering leaders from across the JavaScript ecosystem.
                </p>
              </div>
              {speakers.length > 0 && <CopyButton text={speakerListText} label="Copy list" variant="dark" />}
            </div>

            {speakersLoading ? (
              <div className="grid min-h-64 place-items-center rounded-3xl bg-white/5">
                <div className="flex items-center gap-3 text-sm font-medium text-brand-gray-light">
                  <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Loading speakers...
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] auto-rows-fr gap-4 text-brand-black">
                {speakers.map((speaker) => (
                  <SpeakerCard
                    key={speaker.id}
                    variant="compact"
                    avatar={speaker.profile_image_url}
                    name={[speaker.first_name, speaker.last_name].filter(Boolean).join(' ')}
                    title={[speaker.job_title, speaker.company].filter(Boolean).join(' @')}
                    footer={speaker.sessions?.[0]?.title || 'To be announced'}
                    to={`/speakers/${speaker.slug}`}
                  />
                ))}
                {Array.from({ length: placeholderCount }).map((_, index) => (
                  <SpeakerCard key={`placeholder-${index}`} variant="compact" name="To be announced" placeholder />
                ))}
              </div>
            )}
          </div>
        </ShapedSection>

        {/* Workshops Section */}
        <ShapedSection shape="widen" variant="light" id="workshops">
          <div className="py-12 md:py-16">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <p className="text-sm font-semibold text-brand-yellow-dark uppercase tracking-wider">Zurich Engineering Day</p>
              </div>
              <h2 className="text-2xl font-bold text-brand-black mb-4">
                Hands-On Workshops - September 10th, 2026
              </h2>
              <p className="text-brand-gray-dark max-w-2xl">
                A full day of workshops for software engineers from all domains.
                Morning sessions run 09:00–13:00, afternoon sessions 14:00–18:00, with a lunch break in between.
                Affordable pricing with limited seats per workshop.
              </p>
            </div>

            {workshopsLoading ? (
              <div className="flex flex-col gap-4" aria-busy="true">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border border-brand-gray-lightest bg-brand-gray-lightest p-5 animate-pulse">
                    <div className="h-3 w-20 rounded bg-brand-gray-light/60" />
                    <div className="mt-3 h-5 w-3/4 rounded bg-brand-gray-light/70" />
                    <div className="mt-4 flex gap-3">
                      <div className="h-3 w-28 rounded bg-brand-gray-light/50" />
                      <div className="h-3 w-24 rounded bg-brand-gray-light/50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : workshopItems.length > 0 ? (
              <div className="flex flex-col gap-4">
                {workshopItems.map((item) => (
                  <ProgramScheduleItemCard
                    key={item.id}
                    item={item}
                    expandableSessions
                    offeringsBySubmissionId={workshopData?.offeringsBySubmissionId}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-brand-gray-lightest bg-brand-white p-6 text-center text-sm text-brand-gray-dark">
                Workshop schedule coming soon — check back for updates.
              </p>
            )}
          </div>
        </ShapedSection>

        {/* VIP After Party Section */}
        <ShapedSection shape="tighten" variant="dark" id="after-party">
          <div className="py-12 md:py-16">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <p className="text-sm font-semibold text-brand-yellow-main uppercase tracking-wider">{afterParty.kicker}</p>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">{afterParty.title}</h2>
              <p className="text-brand-gray-light text-base max-w-3xl">{afterParty.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
              <div className="space-y-4">
                {afterParty.description.map((text, index) => (
                  <p key={index} className="text-brand-white leading-relaxed text-base">{text}</p>
                ))}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button variant="outline" asChild href={afterParty.websiteUrl}>
                    {afterParty.websiteLabel}
                    <ExternalLink size={14} />
                  </Button>
                </div>
              </div>
              <AfterPartyCarousel />
            </div>
          </div>
        </ShapedSection>

        {/* Key Facts Section */}
        <ShapedSection shape="widen" variant="gray-light" id="facts">
          <div className="py-12 md:py-16">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-brand-black mb-4">Key Facts</h2>
              <p className="text-brand-black/70 max-w-2xl">Quick reference information for your promotional materials.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {keyFacts.map((fact) => (
                <div key={fact.label + fact.value} className="bg-brand-black/10 rounded-xl p-6">
                  <p className="text-sm font-semibold text-brand-black/70 mb-1">{fact.label}</p>
                  <p className="text-xl font-bold text-brand-black">{fact.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 p-6 bg-brand-black/10 rounded-xl">
              <h3 className="text-lg font-semibold text-brand-black mb-3">Topics Covered</h3>
              <div className="flex flex-wrap gap-1.5">
                {topics.map((topic) => (
                  <span key={topic} className="px-3 py-1 bg-brand-gray-dark text-white text-xs font-medium rounded-sm">{topic}</span>
                ))}
              </div>
            </div>
          </div>
        </ShapedSection>

        {/* Contact Section */}
        <ShapedSection shape="tighten" variant="dark" id="contact">
          <div className="py-12 md:py-16">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Need Something Else?</h2>
              <p className="text-brand-gray-light mb-8">
                Need high-resolution assets, custom materials, or additional information?
                We&apos;re happy to help our partners succeed.
              </p>
              <a href="mailto:partners@zurichjs.com?subject=Partner Assets Request - ZurichJS Conference 2026">
                <Button variant="primary" size="lg">Contact Us</Button>
              </a>
            </div>
          </div>
        </ShapedSection>
      </main>
      <ShapedSection
          shape="straight"
          variant="dark"
          compactTop={true}
      >
        <SiteFooter showContactLinks />
      </ShapedSection>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PartnerAssetsPageProps> = async () => {
  const queryClient = getQueryClient();
  const { optionalQuery, dehydrate } = createPrefetch(queryClient);

  await Promise.all([
    optionalQuery(publicSpeakersQueryOptions()),
    optionalQuery(createWorkshopsScheduleQueryOptions()),
  ]);

  return {
    props: {
      dehydratedState: dehydrate(),
    },
  };
};
