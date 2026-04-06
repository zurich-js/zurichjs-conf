import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import Image from 'next/image';
import { SEO } from '@/components/SEO';
import { Button, Heading, Kicker } from '@/components/atoms';
import { DayTabs, SpeakerActionSlider } from '@/components/molecules';
import { SectionContainer, ShapedSection, SiteFooter } from '@/components/organisms';
import { SessionCard } from '@/components/scheduling';
import { useToast } from '@/contexts/ToastContext';
import { analytics } from '@/lib/analytics';
import { shareNatively } from '@/lib/native-share';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import type { PublicSession, PublicSpeaker } from '@/lib/types/cfp';
import { Share2 } from 'lucide-react';

type SessionTabId = 'talks' | 'workshops';

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

export default function SpeakerDetailPage({ speaker }: SpeakerDetailPageProps) {
    const toast = useToast();
    const fullName = [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
    const role = [speaker.job_title, speaker.company].filter(Boolean).join(' @ ');
    const talks = sortSessions(speaker.sessions.filter((session) => session.type !== 'workshop'));
    const workshops = sortSessions(speaker.sessions.filter((session) => session.type === 'workshop'));
    const sessionTabs: SessionTab[] = [
        {
            id: 'workshops',
            label: `${speaker.first_name}'s workshops`,
            summary: 'September 10, 2026',
            disabled: workshops.length === 0,
            sessions: workshops,
        },
        {
            id: 'talks',
            label: `${speaker.first_name}'s talks`,
            summary: 'September 11, 2026',
            disabled: talks.length === 0,
            sessions: talks,
        },
    ];
  const [activeTab, setActiveTab] = useState<SessionTabId>(talks.length > 0 ? 'talks' : 'workshops');
  const currentTab = sessionTabs.find((tab) => tab.id === activeTab) ?? sessionTabs[0] ?? null;
  const profileUrl = `${BASE_URL}/speakers/${speaker.slug}`;
  const handleDisabledTabClick = (tabId: string) => {
    const tabName = tabId === 'workshops' ? 'workshops' : 'talks';

    toast.info(
      `${fullName} has no public ${tabName} yet`,
      tabId === 'workshops'
        ? `If enough people are interested, we can use that signal to invite ${speaker.first_name} to lead one.`
        : `We are still finalizing which public sessions to announce for ${speaker.first_name}.`
    );

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

    return (
        <>
            <SEO
                title={fullName}
                description={speaker.bio || `${fullName} at ZurichJS Conf 2026.`}
                canonical={`/speakers/${speaker.slug}`}
                keywords={`zurichjs conf speaker, ${fullName}`}
            />

            <main className="min-h-screen bg-brand-white">
                <ShapedSection shape="straight" variant="dark" dropTop dropBottom>
                    <div className="flex gap-8">
                        <div className="justify-self-start lg:justify-self-end">
                            <div className="relative size-40 overflow-hidden rounded-[2rem] border border-brand-gray-dark bg-brand-gray-darkest shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:size-48">
                                {speaker.profile_image_url ? (
                                    <Image src={speaker.profile_image_url} alt={fullName} fill className="object-cover" sizes="12rem" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-4xl font-bold text-brand-white">
                                        {speaker.first_name[0]}
                                        {speaker.last_name[0]}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="max-w-screen-lg">
                            <Kicker variant="dark" className="mb-4">
                                Speaker Detail
                            </Kicker>
                            <Heading level="h1" variant="dark" className="text-3xl font-bold leading-none">
                                {fullName}
                            </Heading>
                            {role ? <p className="mt-5 max-w-2xl text-lg text-brand-gray-light">{role}</p> : null}
                            {/* TODO(feature/speakers-grid): Replace this temporary hero copy once the public speaker detail page content is designed. */}
                            <p className="mt-5 max-w-2xl text-sm leading-7 text-brand-gray-light">
                                The full hero treatment is still coming. For now, the session details and calls to action are in place so we can keep building the page from the inside out.
                            </p>
                        </div>

                    </div>
                </ShapedSection>

                <SectionContainer className="py-16 md:py-20">
                    <div className="mx-auto max-w-screen-lg">
                        <p className="text-base leading-8 text-brand-gray-darkest sm:text-lg">
                            {speaker.bio || `${fullName} is part of the ZurichJS Conf lineup. Session details are already available below while we finish the final hero composition.`}
                        </p>

                        <section id="speaker-sessions" className="mt-14">
                            {sessionTabs.length > 0 ? (
                                <DayTabs
                                    tabs={sessionTabs.map((tab) => ({
                                        id: tab.id,
                                        label: tab.label,
                                        date: tab.summary,
                                        disabled: tab.disabled,
                                    }))}
                                    activeTab={currentTab?.id ?? activeTab}
                                    onTabChange={(tabId) => setActiveTab(tabId as SessionTabId)}
                                    onDisabledTabClick={handleDisabledTabClick}
                                    className="pt-0"
                                />
                            ) : null}

                            {currentTab && currentTab.sessions.length > 0 ? (
                                <div className="mt-8 space-y-5">
                                    {currentTab.sessions.map((session) => (
                                        <SessionCard
                                            key={session.id}
                                            id={`session-${session.id}`}
                                            session={session}
                                            href={session.type === 'workshop' ? `/workshops/${session.slug}` : `/talks/${session.slug}`}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-8 rounded-[2rem] border border-dashed border-brand-gray-light bg-brand-gray-lightest/50 p-8">
                                    <Heading level="h2" variant="light" className="text-xl font-bold">
                                        Sessions coming soon
                                    </Heading>
                                    {/* TODO(feature/speakers-grid): Replace this temporary empty state once session publishing rules are finalized. */}
                                    <p className="mt-3 max-w-2xl text-base leading-7 text-brand-gray-darkest">
                                        This speaker is already live on the lineup, but their public sessions are still being finalized.
                                    </p>
                                    <Button variant="primary" size="sm" className="mt-6" asChild href="/#tickets">
                                        Get tickets anyway
                                    </Button>
                                </div>
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
                                        VIP ticket holders get exclusive goodies, and get to join speaker city tour and after-party.
                                        There are still VIP tickets available, <b>get yours</b>!
                                    </p>
                                </div>
                                <div className="flex flex-col items-center gap-4 mt-6">
                                    <Button variant="primary" size="md" asChild href="/#tickets">
                                        Get VIP
                                    </Button>
                                    <p className="text-sm text-brand-gray-darkest">... or</p>
                                    <div className="flex gap-2.5 items-center justify-center">
                                        {/* TODO(feature/speakers-grid): Re-enable the reminder CTA when the public conference reminder flow is finalized. */}
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

export const getServerSideProps: GetServerSideProps<SpeakerDetailPageProps> = async ({ params }) => {
    const slug = typeof params?.slug === 'string' ? params.slug : '';
    const { speakers } = await fetchPublicSpeakers();
    const speaker = speakers.find((entry) => entry.slug === slug);

    if (!speaker) {
        return { notFound: true };
    }

    return {
        props: {
            speaker,
        },
    };
};
