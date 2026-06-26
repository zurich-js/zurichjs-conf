/**
 * Volunteer Landing Page
 *
 * Recruits volunteers for ZurichJS Conf 2026. Applications are handled through
 * an external Google Form (we no longer run an in-house application flow), so
 * this page is purely informational + a strong call-to-action that links out.
 */

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Trophy,
  Ticket,
  Shirt,
  Sandwich,
  Handshake,
  Camera,
  ClipboardCheck,
  Mic,
  DoorOpen,
  Users,
  Building2,
  Boxes,
  CheckCircle2,
  CalendarDays,
  Mail,
} from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Heading, Kicker } from '@/components/atoms';
import { ShapedSection, SectionContainer, SiteFooter } from '@/components/organisms';
import { SectionSplitView } from '@/components/organisms/SectionSplitView';
import { BackgroundMedia, Countdown } from '@/components/molecules';
import { useMotion } from '@/contexts/MotionContext';

/**
 * Application deadline for volunteering. Static ISO string (Europe/Zurich,
 * CEST = +02:00) to stay hydration-safe — never compute with `new Date()`
 * during render.
 */
const VOLUNTEER_APPLICATION_DEADLINE = '2026-08-31T23:59:59+02:00';

/** External Google Form that collects volunteer applications. */
const VOLUNTEER_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSd2e5j_IyhTspnpWBOFKhkmM3cAsT7OzNFxTWw04E_k9Vb-yA/viewform';

const SUPPORT_EMAIL = 'hello@zurichjs.com';

/** LinkedIn post announcing the OSS Awards "highest impact community" win. */
const OSS_AWARD_POST_URL =
  'https://www.linkedin.com/posts/farisaziz12_last-week-zurichjs-won-the-highest-impact-activity-7473961759595384833-2blE';

const VOLUNTEER_BENEFITS = [
  {
    icon: Ticket,
    title: 'Conference access',
    description: 'Access opportunities for volunteers based on your role and shifts.*',
  },
  {
    icon: Shirt,
    title: 'Exclusive merch',
    description: 'Limited-edition ZurichJS volunteer merchandise, just for the crew.',
  },
  {
    icon: Sandwich,
    title: 'Food & drinks',
    description: 'Complimentary food and drinks to keep you fuelled during your shift.',
  },
  {
    icon: Handshake,
    title: 'Networking',
    description: 'Meet speakers, attendees, and sponsors from across the ecosystem.',
  },
  {
    icon: Camera,
    title: 'Behind the scenes',
    description: 'See exactly how a leading community conference comes together.',
  },
] as const;

const VOLUNTEER_ROLES = [
  {
    icon: ClipboardCheck,
    title: 'Registration & Check-in',
    description: 'Welcome attendees, scan tickets, and set the tone for a friendly day.',
  },
  {
    icon: Mic,
    title: 'Speaker Support',
    description: 'Help speakers feel at home — green room, mics, timing, and logistics.',
  },
  {
    icon: DoorOpen,
    title: 'Room Monitoring',
    description: 'Keep sessions running smoothly and capacity safe inside the rooms.',
  },
  {
    icon: Users,
    title: 'Attendee Support',
    description: 'Be the go-to person for questions, directions, and a warm welcome.',
  },
  {
    icon: Building2,
    title: 'Sponsor Area Support',
    description: 'Help our partners shine and connect them with the community.',
  },
  {
    icon: Camera,
    title: 'Social Media & Photography',
    description: 'Capture the energy of the day and share it with the world.',
  },
  {
    icon: Boxes,
    title: 'Logistics & Setup',
    description: 'Bring the venue to life — setup, teardown, and everything between.',
  },
] as const;

const VOLUNTEER_REQUIREMENTS = [
  'You are 18 years or older.',
  'You are comfortable communicating in English.',
  'You are available for at least one volunteer shift during the conference.',
  'You are reliable, positive, and eager to help — even when a Swiss-train-tight schedule meets the occasional surprise.',
] as const;

const VOLUNTEER_DAYS = [
  {
    date: 'Sep 10',
    label: 'Workshop Day',
    description: 'Hands-on workshops — help facilitators and attendees get the most out of the day.',
  },
  {
    date: 'Sep 11',
    label: 'Conference Day',
    description: 'The main event at Technopark Zürich. All hands on deck for talks and networking.',
  },
] as const;

function VolunteerLanding() {
  const { shouldAnimate } = useMotion();

  // Compute the closed state on the client only to avoid SSR/client mismatch.
  // Defaults to "open" until mounted so the CTA renders for crawlers.
  const [mounted, setMounted] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsClosed(Date.now() > new Date(VOLUNTEER_APPLICATION_DEADLINE).getTime());
  }, []);

  const applicationsOpen = !mounted || !isClosed;

  return (
    <>
      <SEO
        title="Volunteer"
        description="Volunteer at ZurichJS Conf 2026. Join the crew behind Switzerland's leading JavaScript conference — meet speakers, gain event experience, and help create a welcoming community. Applications close August 31, 2026."
        canonical="/volunteer"
        keywords="zurichjs volunteer, volunteer javascript conference, conference volunteer zurich, tech event volunteer switzerland"
      />

      <main className="min-h-screen">
        {/* Hero */}
        <ShapedSection shape="tighten" variant="dark" dropTop disableContainer>
          <BackgroundMedia posterSrc="/images/technopark.png" overlayOpacity={0.7} fadeOut />
          <SectionContainer>
            <div className="relative z-10 flex flex-col mt-40">
              <div className="space-y-3">
                <Kicker
                  animate={shouldAnimate}
                  delay={0.1}
                  className="text-base md:text-md text-brand-white font-semibold"
                >
                  Volunteer
                </Kicker>

                <Heading
                  level="h1"
                  animate={shouldAnimate}
                  delay={0.2}
                  className="text-base xs:text-lg xl:text-xl leading-tight mb-4 md:mb-6 lg:mb-8"
                >
                  Help Build One of Europe&apos;s Best Community Conferences
                </Heading>

                <p className="max-w-2xl text-base md:text-md text-brand-gray-light">
                  Our volunteers are at the heart of ZurichJS Conf. You&apos;ll help create a
                  welcoming, memorable experience for attendees, speakers, and sponsors — and be
                  part of one of Switzerland&apos;s leading JavaScript conferences.
                </p>
              </div>

              <div className="flex flex-col lg:flex-row lg:justify-between lg:w-full gap-4 md:gap-8 mt-6">
                <motion.div
                  className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8"
                  initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                  animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="space-y-1">
                    <p className="text-md text-brand-white">September 10–11, 2026</p>
                    <p className="text-base text-brand-gray-light">Technopark, Zurich</p>
                  </div>

                  {applicationsOpen && (
                    <a
                      href={VOLUNTEER_FORM_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-brand-yellow-main text-brand-black px-6 py-3 rounded-full font-bold hover:bg-brand-yellow-secondary transition-colors"
                    >
                      Apply to Volunteer
                      <ArrowRight size={16} />
                    </a>
                  )}
                </motion.div>

                <div className="lg:shrink-0 lg:pb-2">
                  {applicationsOpen ? (
                    <Countdown
                      targetDate={VOLUNTEER_APPLICATION_DEADLINE}
                      kicker="Applications close in"
                    />
                  ) : (
                    <div className="rounded-2xl border border-brand-gray-medium bg-black/40 p-4 md:p-5 max-w-xs">
                      <p className="font-semibold text-white mb-1">Applications are closed.</p>
                      <p className="text-xs text-brand-gray-light">
                        Thanks for your interest! Reach us at{' '}
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-primary underline">
                          {SUPPORT_EMAIL}
                        </a>{' '}
                        if you&apos;d still like to help.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionContainer>
        </ShapedSection>

        {/* Community of the year */}
        <ShapedSection shape="widen" variant="yellow" id="award">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
            <div className="w-full lg:w-2/5 flex-shrink-0">
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10">
                <Image
                  src="/images/oss-award.jpg"
                  alt="ZurichJS receiving the highest impact community globally award at the OSS Awards during JSNation"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-black/10 px-3 py-1">
                <Trophy className="w-4 h-4 text-brand-black" aria-hidden="true" />
                <span className="text-xs font-semibold text-brand-black">OSS Awards · JSNation</span>
              </div>
              <Kicker variant="light">Highest impact community, globally</Kicker>
              <Heading level="h2" variant="light" className="text-xl md:text-2xl leading-tight">
                You&apos;d be joining an award-winning community
              </Heading>
              <p className="max-w-3xl">
                ZurichJS won the highest impact community globally award at the OSS Awards during
                JSNation. In under two years we&apos;ve grown from a single meetup to monthly events,
                international partnerships, and speakers ranging from local emerging talent to web
                superstars. This conference is us taking that impact to the next level — and
                volunteers are a huge part of making it happen.
              </p>
              <p className="max-w-3xl text-sm text-brand-black/70 italic">
                We&apos;re a registered non-profit and don&apos;t make a single penny doing this. We
                do it because we love giving back to the community.
              </p>
              <a
                href={OSS_AWARD_POST_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-semibold text-brand-black underline underline-offset-4 hover:text-brand-black/70 transition-colors"
              >
                Read the full story
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
        </ShapedSection>

        {/* Benefits */}
        <ShapedSection shape="tighten" variant="dark" id="benefits">
          <SectionSplitView
            kicker="Volunteer Benefits"
            title="What You Get Out of It"
            subtitle="As a community-run non-profit, we give every volunteer the most we reasonably can to thank you for your support."
            variant="dark"
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
              {VOLUNTEER_BENEFITS.map(({ icon: BenefitIcon, title, description }) => (
                <div key={title} className="bg-brand-gray-dark/50 rounded-2xl p-6">
                  <div className="w-12 h-12 rounded-xl bg-brand-primary/20 flex items-center justify-center mb-4">
                    <BenefitIcon className="w-6 h-6 text-brand-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{title}</h3>
                  <p className="text-brand-gray-light text-sm">{description}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-brand-gray-medium mt-6 max-w-2xl">
              *As a community-run non-profit event, volunteer benefits and conference access are
              allocated based on responsibilities, shift commitments, and event needs. Complimentary
              conference access cannot be guaranteed for every role, but we&apos;ll always try our
              best to give you the maximum we can reasonably offer.
            </p>
          </SectionSplitView>
        </ShapedSection>

        {/* Roles */}
        <ShapedSection shape="widen" variant="light" id="roles">
          <SectionSplitView
            kicker="Roles"
            title="Where You Could Help"
            subtitle="Tell us which roles interest you most in the application — we'll match you based on your experience and the event's needs."
            variant="light"
          >
            <div className="grid sm:grid-cols-2 gap-6 pt-8">
              {VOLUNTEER_ROLES.map(({ icon: RoleIcon, title, description }) => (
                <div key={title} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center flex-shrink-0">
                    <RoleIcon className="w-5 h-5 text-black" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-black mb-1">{title}</h3>
                    <p className="text-brand-gray-medium text-sm">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionSplitView>
        </ShapedSection>

        {/* Availability */}
        <ShapedSection shape="tighten" variant="medium" id="availability">
          <SectionSplitView
            kicker="Availability"
            title="When We Need You"
            subtitle="Volunteer for one day or both — just let us know your availability in the form."
            variant="dark"
          >
            <div className="grid sm:grid-cols-2 gap-6 pt-8">
              {VOLUNTEER_DAYS.map((day) => (
                <div key={day.label} className="bg-brand-gray-dark/50 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CalendarDays className="w-5 h-5 text-brand-primary" aria-hidden="true" />
                    <span className="text-brand-primary font-bold">{day.date}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{day.label}</h3>
                  <p className="text-brand-gray-light text-sm">{day.description}</p>
                </div>
              ))}
            </div>
          </SectionSplitView>
        </ShapedSection>

        {/* Requirements */}
        <ShapedSection shape="widen" variant="light" id="requirements">
          <SectionSplitView
            kicker="Requirements"
            title="What We Ask of You"
            subtitle="Conferences are a lot of fun — but they take real coordination. It means a great deal when we can count on you for timely responses and swift action on behalf of the ZurichJS brand."
            variant="light"
          >
            <div className="space-y-4 pt-8">
              {VOLUNTEER_REQUIREMENTS.map((requirement) => (
                <div key={requirement} className="flex gap-3 items-start">
                  <CheckCircle2
                    className="w-5 h-5 text-brand-primary mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-brand-gray-medium">{requirement}</p>
                </div>
              ))}
            </div>
          </SectionSplitView>
        </ShapedSection>

        {/* How it works */}
        <ShapedSection shape="tighten" variant="dark" id="process">
          <SectionSplitView
            kicker="What Happens Next"
            title="The Process"
            subtitle="Here's what to expect after you apply."
            variant="dark"
          >
            <div className="space-y-6 pt-8 max-w-2xl">
              <ProcessStep
                step={1}
                title="Submit your application"
                description="Fill in the form with your details, the roles you're interested in, and your availability."
              />
              <ProcessStep
                step={2}
                title="We review applications"
                description="We aim to start responding to volunteer applications during August, if not earlier. It's entirely normal that responses take some time — we're heads-down bringing the event to life."
              />
              <ProcessStep
                step={3}
                title="Selected volunteers are contacted"
                description="We'll reach out by email to confirm your role and shifts. Submitting an application doesn't guarantee a volunteer position."
              />
            </div>
          </SectionSplitView>
        </ShapedSection>

        {/* CTA */}
        <ShapedSection shape="tighten" variant="yellow" id="apply">
          <div className="text-center max-w-2xl mx-auto">
            <Kicker variant="light" className="mb-4">
              Ready to join the crew?
            </Kicker>
            <Heading level="h2" variant="light" className="text-xl md:text-2xl mb-4">
              Become a ZurichJS Conf Volunteer
            </Heading>
            <p className="mb-8">
              You&apos;ll meet amazing people, gain real event experience, and help shape one of
              Europe&apos;s best community conferences. We can&apos;t wait to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {applicationsOpen ? (
                <a
                  href={VOLUNTEER_FORM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-brand-black text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-gray-darkest transition-colors"
                >
                  Apply to Volunteer
                  <ArrowRight size={16} />
                </a>
              ) : (
                <p className="text-sm">Volunteer applications are now closed. Thank you!</p>
              )}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center justify-center gap-2 text-brand-black font-semibold hover:underline"
              >
                <Mail size={16} aria-hidden="true" />
                Questions? {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="widen" variant="dark" dropBottom compactTop>
          <SiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}

function ProcessStep({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-full bg-brand-primary/20 text-brand-primary font-bold flex items-center justify-center flex-shrink-0">
        {step}
      </div>
      <div className="space-y-1">
        <h3 className="text-white font-semibold">{title}</h3>
        <p className="text-brand-gray-light text-sm">{description}</p>
      </div>
    </div>
  );
}

export default VolunteerLanding;
