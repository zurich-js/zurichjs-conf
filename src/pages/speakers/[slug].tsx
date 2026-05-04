import { useState } from 'react';
import type { GetStaticPaths, GetStaticProps } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Button, Heading, SocialIcon } from '@/components/atoms';
import { DayTabs, SpeakerActionSlider } from '@/components/molecules';
import { SectionContainer, ShapedSection, SiteFooter } from '@/components/organisms';
import { SessionCard } from '@/components/scheduling';
import { addConferenceReminder } from '@/components/scheduling/session-actions';
import { analytics } from '@/lib/analytics';
import { shareNatively } from '@/lib/native-share';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicSession, PublicSpeaker } from '@/lib/types/cfp';
import { BellPlus, ChevronLeft, Share2 } from 'lucide-react';

type SessionTabId = 'talks' | 'workshops' | 'sessions';

interface SpeakerDetailPageProps {
    speaker: PublicSpeaker;
}

interface SessionTab {
    id: SessionTabId;
    label: string;
    summary: string;
    disabled: boolean;
    sessions: PublicSession[];
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';

type SpeakerSocialLink = {
    kind: 'linkedin' | 'github' | 'x' | 'bluesky' | 'mastodon';
    href: string;
    label: string;
};

interface SpeakerHeroDetailsProps {
    speaker: PublicSpeaker;
    fullName: string;
    role: string;
    socialLinks: SpeakerSocialLink[];
    avatarUrl?: string | null;
    showAvatar?: boolean;
    className?: string;
}

function sortSessions(sessions: PublicSession[]) {
    return [...sessions].sort((left, right) => {
        const leftDate = `${left.schedule?.date ?? '9999-12-31'}T${left.schedule?.start_time ?? '23:59:59'}`;
        const rightDate = `${right.schedule?.date ?? '9999-12-31'}T${right.schedule?.start_time ?? '23:59:59'}`;

        if (leftDate !== rightDate) {
            return leftDate.localeCompare(rightDate);
        }

        return left.title.localeCompare(right.title);
    });
}

function isSessionTabId(tabId: string): tabId is SessionTabId {
    return tabId === 'talks' || tabId === 'workshops' || tabId === 'sessions';
}

function getSpeakerSocialLinks(speaker: PublicSpeaker): SpeakerSocialLink[] {
    const links: SpeakerSocialLink[] = [];

    if (speaker.socials.linkedin_url) {
        const linkedinUrl = speaker.socials.linkedin_url.trim();
        links.push({
            kind: 'linkedin',
            href: linkedinUrl.startsWith('http') ? linkedinUrl : `https://linkedin.com/in/${linkedinUrl.replace(/^@/, '')}`,
            label: 'LinkedIn',
        });
    }

    if (speaker.socials.github_url) {
        const githubUrl = speaker.socials.github_url.trim();
        links.push({
            kind: 'github',
            href: githubUrl.startsWith('http') ? githubUrl : `https://github.com/${githubUrl.replace(/^@/, '')}`,
            label: 'GitHub',
        });
    }

    if (speaker.socials.twitter_handle) {
        links.push({
            kind: 'x',
            href: `https://x.com/${speaker.socials.twitter_handle.replace(/^@/, '')}`,
            label: 'X',
        });
    }

    if (speaker.socials.bluesky_handle) {
        links.push({
            kind: 'bluesky',
            href: `https://bsky.app/profile/${speaker.socials.bluesky_handle.replace(/^@/, '')}`,
            label: 'Bluesky',
        });
    }

    if (speaker.socials.mastodon_handle) {
        const mastodonHandle = speaker.socials.mastodon_handle.replace(/^@/, '');
        const [user, host] = mastodonHandle.split('@');
        const href = mastodonHandle.startsWith('http')
            ? mastodonHandle
            : user && host
                ? `https://${host}/@${user}`
                : `https://mastodon.social/@${mastodonHandle}`;

        links.push({ kind: 'mastodon', href, label: 'Mastodon' });
    }

    return links;
}

function SpeakerHeroDetails({
    speaker,
    fullName,
    role,
    socialLinks,
    avatarUrl,
    showAvatar = false,
    className = '',
}: SpeakerHeroDetailsProps) {
    return (
        <div className={`flex flex-col items-start gap-5 text-left text-brand-black md:items-end md:text-right ${socialLinks.length === 0 ? 'pb-6 md:pb-8' : ''} ${className}`}>
            {showAvatar ? (
                avatarUrl ? (
                    <div className="size-24 overflow-hidden rounded-full bg-brand-gray-dark">
                        <Image
                            src={avatarUrl}
                            alt={fullName}
                            width={144}
                            height={144}
                            priority
                            className="h-full w-full object-cover"
                            sizes="96px"
                        />
                    </div>
                ) : (
                    <div className="flex size-24 items-center justify-center rounded-full bg-brand-black text-2xl font-bold text-brand-white">
                        {speaker.first_name[0]}
                        {speaker.last_name[0]}
                    </div>
                )
            ) : null}

            <div className="flex flex-col gap-3">
                <Heading level="h1" variant="light" className="text-xl md:text-2xl font-bold leading-none">
                    {fullName}
                </Heading>
                {speaker.job_title ? (
                    <p className="text-lg md:text-xl font-bold leading-tight">{speaker.job_title}</p>
                ) : null}
                {speaker.company ? (
                    <p className="text-lg leading-tight">@{speaker.company}</p>
                ) : null}
                {!speaker.job_title && role ? (
                    <p className="text-lg md:text-xl font-bold leading-tight">{role}</p>
                ) : null}
            </div>

            {socialLinks.length > 0 ? (
                <div className="flex min-h-6 flex-wrap items-center justify-start gap-2 md:justify-end">
                    {socialLinks.map((link) => {
                        return (
                            <SocialIcon
                                key={link.kind}
                                kind={link.kind}
                                href={link.href}
                                label={`${fullName} on ${link.label}`}
                                tone="dark"
                                className="size-6!"
                            />
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

function UnannouncedSessionNotice() {
  return (
    <article aria-disabled="true">
      <h3 className="text-lg font-bold leading-tight">To be announced</h3>
    </article>
  );
}

function McProfileNotice({ firstName }: { firstName: string }) {
  return (
    <article>
      <h2 className="text-lg font-bold leading-tight">{firstName} is hosting the day</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7">
        As MC, {firstName} will guide the room, introduce speakers, and keep the ZurichJS Conf program moving.
      </p>
    </article>
  );
}

export default function SpeakerDetailPage({ speaker }: SpeakerDetailPageProps) {
    const fullName = [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
    const role = [speaker.job_title, speaker.company].filter(Boolean).join(' @ ');
    const heroForegroundUrl = speaker.portrait_foreground_url?.trim() || null;
    const heroBackgroundUrl = speaker.portrait_background_url?.trim() || null;
    const hasSplitPortraitHero = Boolean(heroForegroundUrl);
    const avatarUrl = speaker.profile_image_url;
    const socialLinks = getSpeakerSocialLinks(speaker);
    const isMc = speaker.speaker_role === 'mc';
    const talks = sortSessions(speaker.sessions.filter((session) => session.type === 'standard' || session.type === 'lightning'));
    const workshops = sortSessions(speaker.sessions.filter((session) => session.type === 'workshop'));
    const hasAssignedTalks = speaker.assigned_session_kinds.talks || talks.length > 0;
    const hasAssignedWorkshops = speaker.assigned_session_kinds.workshops || workshops.length > 0;
    const hasKnownSessionConnection = hasAssignedTalks || hasAssignedWorkshops;
    const sessionTabs: SessionTab[] = hasKnownSessionConnection ? [
        {
            id: 'workshops',
            label: `${speaker.first_name}'s workshops`,
            summary: 'September 10, 2026',
            disabled: !hasAssignedWorkshops,
            sessions: workshops,
        },
        {
            id: 'talks',
            label: `${speaker.first_name}'s talks`,
            summary: 'September 11, 2026',
            disabled: !hasAssignedTalks,
            sessions: talks,
        },
    ] : [
        {
            id: 'sessions',
            label: `${speaker.first_name}'s sessions`,
            summary: 'To be announced',
            disabled: false,
            sessions: [],
        },
    ];
  const initialSessionTab = hasAssignedTalks ? 'talks' : hasAssignedWorkshops ? 'workshops' : 'sessions';
  const [activeTab, setActiveTab] = useState<SessionTabId>(initialSessionTab);
  const currentTab = sessionTabs.find((tab) => tab.id === activeTab) ?? sessionTabs.find((tab) => !tab.disabled) ?? sessionTabs[0] ?? null;
  const profileUrl = `${BASE_URL}/speakers/${speaker.slug}`;
  const handleDisabledTabClick = (tabId: string) => {
    try {
      analytics.getInstance().capture('speaker_session_tab_unavailable_clicked', {
        speaker_slug: speaker.slug,
        speaker_name: fullName,
        requested_tab: tabId,
      });
    } catch {
      // Ignore analytics failures.
    }
  };
  const handleShare = async () => {
    await shareNatively({
      title: `${fullName} at ZurichJS Conference`,
      text: speaker.bio || `${fullName} is speaking at ZurichJS Conference.`,
      url: profileUrl,
    });
  };
  const handleReminder = () => {
    addConferenceReminder();
  };

    return (
        <>
            <SEO
                title={fullName}
                description={speaker.bio || `${fullName} at ZurichJS Conf 2026.`}
                canonical={`/speakers/${speaker.slug}`}
                ogImage={`/api/og/speakers/${speaker.slug}`}
                keywords={`zurichjs conf speaker, ${fullName}`}
            />

            <main className="min-h-screen bg-brand-white">
                <section className="relative isolate overflow-hidden bg-brand-yellow-main">
                    <div className="absolute inset-0" aria-hidden="true">
                        {hasSplitPortraitHero || heroBackgroundUrl ? (
                            <div className="absolute inset-y-0 left-0 hidden md:block md:w-[58%]">
                                {heroBackgroundUrl ? (
                                    <>
                                        <Image
                                            src={heroBackgroundUrl}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            sizes="58vw"
                                        />
                                        <div className="absolute inset-0 bg-brand-white/20" />
                                    </>
                                ) : (
                                    <div className="h-full w-full bg-brand-white" />
                                )}
                            </div>
                        ) : (
                            <div className="absolute inset-y-0 left-0 hidden bg-brand-gray-darkest md:block md:w-[58%]" />
                        )}
                        <div className="absolute inset-y-0 right-0 hidden bg-brand-yellow-main md:block md:w-[64%] md:[clip-path:polygon(28%_0,100%_0,100%_100%,0_100%)]" />
                    </div>

                    <SectionContainer className="relative py-14 md:py-0 md:pt-20 max-md:mt-20">
                        <div className="mx-auto max-w-screen-lg md:hidden">
                            <SpeakerHeroDetails
                                speaker={speaker}
                                fullName={fullName}
                                role={role}
                                socialLinks={socialLinks}
                                avatarUrl={avatarUrl}
                                showAvatar
                            />
                        </div>

                        <div className="mx-auto hidden max-w-screen-lg items-end gap-6 md:grid md:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)] lg:gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                            <div className="relative flex h-[480px] max-h-[480px] items-end justify-start py-10 md:-ml-8 lg:ml-0">
                                {heroForegroundUrl ? (
                                    <>
                                        <div className="pointer-events-none absolute left-[48%] top-[22%] z-0 h-28 w-[390px] -translate-x-1/2" aria-hidden="true">
                                            <span className="absolute left-[4%] top-0 block h-8 w-[82%] -rotate-8 rounded-full bg-brand-yellow-main" />
                                            <span className="absolute left-[18%] top-9 block h-8 w-[78%] -rotate-8 rounded-full bg-brand-blue" />
                                            <span className="absolute left-[0%] top-21 block h-8 w-[90%] -rotate-8 rounded-full bg-brand-white" />
                                        </div>
                                        <Image
                                            src={heroForegroundUrl}
                                            alt={fullName}
                                            fill
                                            priority
                                            className="z-10 h-[400px] object-contain object-bottom"
                                            sizes="420px"
                                        />
                                    </>
                                ) : avatarUrl ? (
                                    <div className="size-64 overflow-hidden rounded-full border-4 border-brand-yellow-main bg-brand-gray-dark shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
                                        <Image
                                            src={avatarUrl}
                                            alt={fullName}
                                            width={320}
                                            height={320}
                                            priority
                                            className="h-full w-full object-cover"
                                            sizes="256px"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex size-64 items-center justify-center rounded-full border-4 border-brand-yellow-main bg-brand-black text-4xl font-bold text-brand-white">
                                        {speaker.first_name[0]}
                                        {speaker.last_name[0]}
                                    </div>
                                )}
                            </div>

                            <SpeakerHeroDetails
                                speaker={speaker}
                                fullName={fullName}
                                role={role}
                                socialLinks={socialLinks}
                                className="justify-self-auto py-5"
                            />
                        </div>
                    </SectionContainer>
                </section>

                <SectionContainer className="py-16 md:py-20">
                    <div className="mx-auto max-w-screen-lg">
                        <Link
                            href="/speakers"
                            className="mb-5 inline-flex items-center gap-1 text-xs font-medium text-brand-gray-medium transition-colors hover:text-brand-black"
                        >
                            <ChevronLeft className="size-3.5" aria-hidden="true" />
                            All speakers
                        </Link>
                        <p className="text-base leading-8 text-brand-gray-darkest sm:text-lg">
                            {speaker.bio || `${fullName} is part of the ZurichJS Conf lineup. Session details will be announced soon.`}
                        </p>

                        <section id={isMc ? 'speaker-role' : 'speaker-sessions'} className="mt-14">
                            {isMc ? (
                                <McProfileNotice firstName={speaker.first_name} />
                            ) : (
                                <>
                            <DayTabs
                                tabs={sessionTabs.map((tab) => ({
                                    id: tab.id,
                                    label: tab.label,
                                    date: tab.summary,
                                    disabled: tab.disabled,
                                }))}
                                activeTab={currentTab?.id ?? activeTab}
                                onTabChange={(tabId) => {
                                    if (isSessionTabId(tabId)) {
                                        setActiveTab(tabId);
                                    }
                                }}
                                onDisabledTabClick={handleDisabledTabClick}
                                className="pt-0"
                            />

                            {currentTab && currentTab.sessions.length > 0 ? (
                                <div className="mt-8 space-y-5">
                                    {currentTab.sessions.map((session) => (
                                        <SessionCard
                                            key={session.id}
                                            id={`session-${session.id}`}
                                            session={session}
                                            speakers={session.speakers}
                                            href={session.type === 'workshop' ? `/workshops/${session.slug}` : session.type === 'panel' ? undefined : `/talks/${session.slug}`}
                                            showDuration
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-8">
                                    <UnannouncedSessionNotice />
                                </div>
                            )}
                                </>
                            )}
                        </section>
                    </div>
                </SectionContainer>

                <SectionContainer className="pb-16 md:pb-20">
                    <div className="mx-auto max-w-2xl">
                        <SpeakerActionSlider>
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-brand-black">
                                    Wanna make sure you get to talk to {speaker.first_name}?
                                </h2>
                                <div className="mt-6 text-sm leading-7 text-brand-gray-darkest">
                                    <p>
                                        VIP ticket holders get exclusive goodies and exclusive access to the after-party.
                                        There are still VIP tickets available, <b>get yours</b>!
                                    </p>
                                </div>
                                <div className="flex flex-col items-center gap-4 mt-6">
                                    <Button variant="primary" size="md" asChild href="/#tickets">
                                        Get VIP
                                    </Button>
                                    <p className="text-sm text-brand-gray-darkest">... or</p>
                                    <div className="flex flex-col gap-2.5 items-center justify-center xs:flex-row">
                                        <Button variant="outline" size="md" onClick={handleReminder} forceDark>
                                            <BellPlus className="size-5" /> Set reminder
                                        </Button>
                                        <Button variant="outline" size="md" onClick={handleShare} forceDark>
                                            <Share2 className="size-5" /> Share with...
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-brand-black">
                                    Got your ticket yet?
                                </h2>
                                <div className="flex flex-col items-center gap-4 mt-6">
                                    <Button variant="primary" size="md" asChild href="/#tickets">
                                        Join the conference
                                    </Button>
                                </div>
                            </div>
                        </SpeakerActionSlider>
                    </div>
                </SectionContainer>

                <ShapedSection shape="straight" variant="dark" compactTop>
                    <SiteFooter showContactLinks />
                </ShapedSection>
            </main>
        </>
    );
}

export const getStaticPaths: GetStaticPaths = async () => {
    const { speakers } = await fetchPublicSpeakers();
    return {
        paths: speakers.map((s) => ({ params: { slug: s.slug } })),
        fallback: 'blocking',
    };
};

export const getStaticProps: GetStaticProps<SpeakerDetailPageProps> = async ({ params }) => {
    const slug = typeof params?.slug === 'string' ? params.slug : '';
    const { speakers } = await fetchPublicSpeakers();
    const speaker = speakers.find((entry) => entry.slug === slug);

    if (!speaker) {
        return { notFound: true, revalidate: 60 };
    }

    return {
        props: {
            speaker,
        },
        revalidate: 300,
    };
};
