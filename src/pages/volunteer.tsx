import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  Boxes,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  Handshake,
  Mail,
  Mic,
  Sandwich,
  Shirt,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Heading, Kicker } from '@/components/atoms';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { analytics } from '@/lib/analytics/client';

const VOLUNTEER_APPLICATION_DEADLINE = '2026-08-31T23:59:59+02:00';

const VOLUNTEER_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSd2e5j_IyhTspnpWBOFKhkmM3cAsT7OzNFxTWw04E_k9Vb-yA/viewform';

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
    description: 'See how a leading community conference comes together.',
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
    description: 'Help speakers feel at home with green room, mics, timing, and logistics.',
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
    description: 'Bring the venue to life through setup, teardown, and everything between.',
  },
] as const;

const VOLUNTEER_REQUIREMENTS = [
  'You are 18 years or older.',
  'You are comfortable communicating in English.',
  'You are available for at least one volunteer shift during the conference.',
  'You are reliable, positive, and ready to help when plans change.',
] as const;

const VOLUNTEER_DAYS = [
  {
    date: 'Sep 9',
    label: 'Meetup Day',
    description: 'Community meetup arrivals and distributed attendee check-in before the conference program begins.',
  },
  {
    date: 'Sep 10',
    label: 'Workshop Day',
    description: 'Hands-on workshops, facilitator support, and distributed attendee check-in throughout the day.',
  },
  {
    date: 'Sep 11',
    label: 'Conference Day',
    description: 'The main event at Technopark Zürich with talks, partners, networking, and attendee check-in.',
  },
] as const;

const PROCESS_STEPS = [
  {
    title: 'Submit your application',
    description: 'Tell us about yourself, your preferred roles, and your availability.',
  },
  {
    title: 'We review applications',
    description: 'We aim to start responding during August, if not earlier.',
  },
  {
    title: 'Selected volunteers are contacted',
    description: "We'll confirm roles and shifts by email. Applying does not guarantee a spot.",
  },
] as const;

export default function VolunteerLanding() {
  const [mounted, setMounted] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsClosed(Date.now() > new Date(VOLUNTEER_APPLICATION_DEADLINE).getTime());
  }, []);

  const applicationsOpen = !mounted || !isClosed;

  const trackApplyClick = (location: 'intro' | 'bottom_cta') => {
    analytics.track('link_clicked', {
      link_text: 'Apply to Volunteer',
      link_url: VOLUNTEER_FORM_URL,
      link_type: 'external',
      link_location: `volunteer:${location}`,
    });
  };

  return (
    <>
      <SEO
        title="Volunteer"
        description="Volunteer at ZurichJS Conf 2026. Join the crew behind Switzerland's leading JavaScript conference, meet speakers, gain event experience, and help create a welcoming community."
        canonical="/volunteer"
        keywords="zurichjs volunteer, volunteer javascript conference, conference volunteer zurich, tech event volunteer switzerland"
      />

      <main className="min-h-screen">
        <ShapedSection shape="down" dropTop variant="light">
          <Heading level="h1" variant="light" className="text-2xl lg:text-3xl font-bold mt-40 mb-20">
            Volunteer at ZurichJS Conf
          </Heading>
          <Kicker variant="light" className="mb-4">
            Join the crew
          </Kicker>
          <Heading level="h2" variant="light" className="mb-8 text-xl font-bold">
            Help create a warm, well-run conference experience
          </Heading>
          <div className="flex flex-col gap-8 max-w-4xl">
            <div className="space-y-4 max-w-3xl">
              <p className="text-gray-700 leading-relaxed text-base">
                ZurichJS Conf is built by the community for the community. You, the volunteers are the
                ones who make the day feel organized, welcoming, and human from the first check-in
                to the last conversation. You&apos;ll help attendees, speakers, sponsors, and organizers move
                through the event smoothly while getting a behind-the-scenes look at one of Switzerland&apos;s
                most awaited JS conferences.
              </p>
            </div>
            <div className="space-y-4 max-w-3xl">
              <p className="text-gray-700 leading-relaxed text-base">
                The event spans September 9 through 11, 2026. You can tell us when you are available,
                whether helping with distributed check-in across all days, workshop day support, or
                at the conference day itself.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {applicationsOpen ? (
                  <a
                    href={VOLUNTEER_FORM_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackApplyClick('intro')}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-yellow-main px-5 py-2.5 font-bold text-brand-black transition-colors hover:bg-brand-yellow-secondary focus:ring-4 focus:ring-brand-blue focus:outline-none"
                  >
                    Apply to Volunteer
                    <ArrowRight size={16} aria-hidden="true" />
                  </a>
                ) : (
                  <p className="font-semibold text-brand-black">Volunteer applications are closed.</p>
                )}
              </div>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="down" variant="gray">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12 items-center">
            <div className="relative size-full pt-12">
              <Image
                src="/images/oss-award.jpg"
                alt="ZurichJS receiving the highest impact community globally award at the OSS Awards during JSNation"
                fill
                className="relative! flex-1 object-cover rounded-2xl size-full"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="space-y-5">
              <Kicker variant="light">
                <span className="inline-flex items-center gap-2 rounded-full">
                  <Trophy className="w-4 h-4 " aria-hidden="true" />
                  <span className="text-xs font-semibold ">OSS Awards · JSNation</span>
                </span>
              </Kicker>
              <Heading level="h2" variant="light" className="text-xl leading-tight font-bold">
                You&apos;d be joining an award-winning community
              </Heading>
              <p className="leading-relaxed text-base">
                ZurichJS won the highest impact community globally award at the OSS Awards during
                JSNation. In under two years we&apos;ve grown from a single meetup to monthly
                events, international partnerships, and speakers ranging from local emerging talent
                to web superstars. This conference is us taking that impact to the next level, and
                volunteers are a huge part of making it happen.
              </p>
              <p className="leading-relaxed text-sm italic">
                We&apos;re a registered non-profit and don&apos;t make a single penny doing this. We
                do it because we love giving back to the community.
              </p>
              <a
                href="/blog/how-zurichjs-got-here"
                className="inline-flex items-center gap-2 font-semibold  underline underline-offset-4 transition-colors hover:text-brand-yellow-main"
              >
                Read the full story
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="down" variant="light" id="benefits">
          <Kicker variant="light" className="mb-4">
            Volunteer benefits
          </Kicker>
          <Heading level="h2" variant="light" className="mb-12 text-xl font-bold">
            What you get out of it
          </Heading>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
            {VOLUNTEER_BENEFITS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-brand-gray-lightest rounded-lg p-5">
                <Icon className="w-6 h-6 text-brand-black mb-4" aria-hidden="true" />
                <h3 className="text-base font-bold text-brand-black mb-2">{title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mt-6 max-w-3xl">
            *Volunteer benefits and conference access are allocated based on responsibilities, shift
            commitments, and event needs. Complimentary conference access cannot be guaranteed for
            every role, but we&apos;ll always try to offer the maximum we reasonably can.
          </p>
        </ShapedSection>

        <ShapedSection shape="down" variant="medium" id="roles">
          <Kicker variant="dark" className="mb-4">
            Roles
          </Kicker>
          <Heading level="h2" variant="dark" className="mb-6 text-xl font-bold">
            Where you could help
          </Heading>
          <p className="text-base text-brand-gray-light leading-relaxed mb-12 max-w-3xl">
            Tell us which roles interest you most in the application. We&apos;ll match volunteers
            based on experience, availability, and the event&apos;s needs.
          </p>
          <div className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {VOLUNTEER_ROLES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="rounded-lg bg-brand-gray-dark p-3">
                  <Icon className="h-5 w-5 text-brand-yellow-main" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="mb-1 text-base font-bold text-brand-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-brand-gray-light">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </ShapedSection>

        <ShapedSection shape="down" variant="light" id="availability">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <Kicker variant="light" className="mb-4">
                Availability
              </Kicker>
              <Heading level="h2" variant="light" className="mb-6 text-xl font-bold">
                When we need you
              </Heading>
              <p className="max-w-2xl text-base leading-relaxed text-brand-black/75">
                Volunteer for one day or all three. Distributed attendee check-in happens across
                the meetup, workshop, and conference days.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {VOLUNTEER_DAYS.map((day) => (
                <div key={day.label}>
                    <p className="mb-1 text-sm font-bold text-brand-black/75">{day.date}</p>
                    <h3 className="mb-2 text-base font-bold text-brand-black">{day.label}</h3>
                    <p className="text-sm leading-relaxed text-brand-black/75">{day.description}</p>
                </div>
              ))}
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="down" variant="dark" id="process">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <Kicker variant="dark" className="mb-4">
                Requirements
              </Kicker>
              <Heading level="h2" variant="dark" className="mb-8 text-xl font-bold">
                What we ask of you
              </Heading>
              <div className="space-y-4">
                {VOLUNTEER_REQUIREMENTS.map((requirement) => (
                  <div key={requirement} className="flex gap-3 items-start">
                    <CheckCircle2
                      className="w-5 h-5 text-brand-yellow-main mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <p className="text-brand-gray-light leading-relaxed text-base">{requirement}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Kicker variant="dark" className="mb-4">
                What happens next
              </Kicker>
              <Heading level="h2" variant="dark" className="mb-8 text-xl font-bold">
                The process
              </Heading>
              <div className="space-y-6">
                {PROCESS_STEPS.map((step, index) => (
                  <div key={step.title} className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-brand-yellow-main text-brand-black font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-brand-white mb-1">{step.title}</h3>
                      <p className="text-brand-gray-light leading-relaxed text-base">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="down" variant="yellow" id="apply">
          <div className="text-center max-w-2xl mx-auto">
            <Kicker variant="light" className="mb-4">
              Ready to join the crew?
            </Kicker>
            <Heading level="h2" variant="light" className="text-xl font-bold mb-4">
              Become a ZurichJS Conf volunteer
            </Heading>
            <p className="mb-8 text-base leading-relaxed">
              You&apos;ll meet great people, gain real event experience, and help shape one of
              Europe&apos;s strongest JavaScript community conferences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {applicationsOpen ? (
                <a
                  href={VOLUNTEER_FORM_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackApplyClick('bottom_cta')}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-black px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-gray-darkest focus:ring-4 focus:ring-brand-blue focus:outline-none"
                >
                  Apply to Volunteer
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              ) : (
                <p className="font-semibold">Volunteer applications are now closed. Thank you!</p>
              )}
              <a
                href="/contact?type=inquiry"
                className="inline-flex items-center justify-center gap-2 font-semibold text-brand-black hover:underline"
              >
                <Mail size={16} aria-hidden="true" />
                Ask a question
              </a>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="tighten" variant="dark" dropBottom compactTop>
          <SiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}
