/**
 * CFP Landing Page
 * Main entry point for the Call for Papers system
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Heading, Kicker, IconButton, Logo } from '@/components/atoms';
import { ShapedSection, DynamicSiteFooter, SectionContainer } from '@/components/organisms';
import { SectionSplitView } from '@/components/organisms/SectionSplitView';
import { BackgroundMedia } from '@/components/molecules';
import { useMotion } from '@/contexts/MotionContext';
import { withCfpGate } from '@/components/cfp/CfpGate';
import { timelineData } from '@/data';

const SUBMISSION_TYPES = [
  {
    type: 'Lightning Talk',
    duration: '15 min',
    description: 'Quick, focused presentations that pack a punch. Perfect for introducing a concept or sharing a discovery.',
  },
  {
    type: 'Standard Talk',
    duration: '30 min',
    description: 'The classic conference format. Dive deep into a topic with context, examples, and actionable takeaways.',
  },
  {
    type: 'Workshop',
    duration: '2–8 hours',
    description: 'Hands-on sessions where attendees learn by doing. Interactive coding exercises and real-world projects.',
  },
];

const SPEAKER_BENEFITS = [
  { title: 'Conference Ticket', description: 'Full access to all sessions' },
  { title: 'Hotel Accommodation', description: '2 nights in Zurich' },
  { title: 'Travel Support', description: 'Flight reimbursement available' },
  { title: 'Speaker Activities', description: 'Exclusive dinner & networking' },
];

// Derive CFP-specific timeline items from centralized timeline data
const CFP_TIMELINE_IDS = ['cfp-starts', 'cfp-ends', 'speaker-review', 'conference-events'] as const;

function formatTimelineDate(dateISO: string): string {
  const date = new Date(dateISO);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TIMELINE_ITEMS = timelineData.entries
  .filter((entry) => CFP_TIMELINE_IDS.includes(entry.id as (typeof CFP_TIMELINE_IDS)[number]))
  .map((entry) => {
    const today = new Date();
    const entryDate = new Date(entry.dateISO);
    const isActive = entryDate <= today && (!entry.toDateISO || new Date(entry.toDateISO) >= today);

    // Map timeline entry to CFP-friendly labels
    const labelMap: Record<string, string> = {
      'cfp-starts': 'CFP Opens',
      'cfp-ends': 'CFP Closes',
      'speaker-review': 'Speakers Notified',
      'conference-events': 'Conference Day',
    };

    const descriptionMap: Record<string, string> = {
      'cfp-starts': 'Start submitting your proposals',
      'cfp-ends': 'Final deadline for submissions',
      'speaker-review': 'Decisions sent via email',
      'conference-events': 'ZurichJS Conf 2026',
    };

    return {
      date: formatTimelineDate(entry.dateISO),
      label: labelMap[entry.id] || entry.title,
      description: descriptionMap[entry.id] || entry.body?.split('\n')[0] || '',
      active: isActive,
    };
  });

function CfpLanding() {
  const { shouldAnimate } = useMotion();

  const handleCtaClick = () => {
    window.location.href = '/cfp/login';
  };

  return (
    <>
      <SEO
        title="Call for Papers | ZurichJS Conf 2026"
        description="Submit your talk proposal for ZurichJS Conf 2026. We're looking for lightning talks, standard talks, and workshops on JavaScript, TypeScript, and web development."
        canonical="/cfp"
        keywords="cfp, call for papers, submit talk, javascript conference speaker, zurich conference speaker, tech conference speaker"
      />

      <main className="min-h-screen">
        {/* Hero Section */}
        <ShapedSection shape="tighten" variant="dark" dropTop disableContainer>
          <BackgroundMedia
            posterSrc="/images/technopark.png"
            overlayOpacity={0.7}
            fadeOut={true}
          />
          <SectionContainer>
            <div className="relative z-10 my-20">
              <Link href="/">
                <Logo width={180} height={48} />
              </Link>
            </div>

            <div className="relative z-10 flex flex-col">
              <div className="space-y-3">
                <Kicker animate={shouldAnimate} delay={0.1} className="text-base md:text-md text-brand-white font-semibold">
                  Call for Papers
                </Kicker>

                <Heading
                  level="h1"
                  animate={shouldAnimate}
                  delay={0.2}
                  className="text-2xl xs:text-3xl xl:text-4xl leading-tight mb-4 md:mb-6 lg:mb-8"
                >
                  Share Your Knowledge with 300+ Developers
                </Heading>
              </div>

              <div className="flex flex-col lg:flex-row lg:justify-between lg:w-full gap-4 md:gap-8">
                <motion.div
                  className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8"
                  initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                  animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="space-y-1">
                    <p className="text-md text-brand-white">
                      September 11, 2026
                    </p>
                    <p className="text-base text-brand-gray-light">
                      Technopark, Zurich
                    </p>
                  </div>

                  <IconButton
                    onClick={handleCtaClick}
                    icon={
                      <div className="relative w-14 h-14">
                        <div className="absolute inset-0 rounded-full border border-brand-gray-light" />
                        <div className="absolute inset-3 rounded-full bg-brand-yellow-main flex items-center justify-center">
                          <ArrowRight size={16} strokeWidth={2} className="text-black" />
                        </div>
                      </div>
                    }
                  >
                    Submit a Proposal
                  </IconButton>
                </motion.div>

                <motion.div
                  className="flex items-center gap-4"
                  initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                  animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href="/cfp/login"
                    className="text-brand-gray-light hover:text-white transition-colors text-sm"
                  >
                    Already have an account? Sign in
                  </Link>
                </motion.div>
              </div>
            </div>
          </SectionContainer>
        </ShapedSection>

        {/* What We're Looking For */}
        <ShapedSection shape="widen" variant="light" id="topics">
          <SectionSplitView
            kicker="Topics"
            title="What We're Looking For"
            subtitle="We welcome speakers of all experience levels. First-time speakers are especially encouraged to apply."
            variant="light"
          >
            <div className="grid gap-6 pt-8">
              <TopicCard
                title="Cutting-Edge Topics"
                description="New frameworks, libraries, tools, and techniques in the JavaScript ecosystem. What's next for the web?"
              />
              <TopicCard
                title="Real-World Lessons"
                description="Case studies, production war stories, and lessons learned from building at scale. Share what you've shipped."
              />
              <TopicCard
                title="Community & Career"
                description="Open source contributions, career development, and building inclusive tech communities."
              />
            </div>
          </SectionSplitView>
        </ShapedSection>

        {/* Submission Types */}
        <ShapedSection shape="tighten" variant="medium" id="formats">
          <SectionSplitView
            kicker="Formats"
            title="Submission Types"
            subtitle="Choose the format that best fits your content. You can submit up to 5 proposals."
            variant="dark"
          >
            <div className="grid md:grid-cols-3 gap-6 pt-8">
              {SUBMISSION_TYPES.map((item) => (
                <div key={item.type} className="bg-brand-gray-dark/50 rounded-2xl p-6">
                  <span className="inline-block px-3 py-1 bg-brand-primary/20 text-brand-primary text-sm font-semibold rounded-full mb-4">
                    {item.duration}
                  </span>
                  <h3 className="text-lg font-bold text-white mb-2">{item.type}</h3>
                  <p className="text-brand-gray-light text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </SectionSplitView>
        </ShapedSection>

        {/* What We Provide */}
        <ShapedSection shape="widen" variant="yellow" id="benefits">
          <SectionSplitView
            kicker="Benefits"
            title="What We Provide"
            subtitle="We want to make speaking at ZurichJS Conf as easy as possible for you."
            variant="light"
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
              {SPEAKER_BENEFITS.map((benefit) => (
                <div key={benefit.title} className="text-center">
                  <div className="w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CheckIcon />
                  </div>
                  <h3 className="font-semibold text-black mb-1">{benefit.title}</h3>
                  <p className="text-black/70 text-sm">{benefit.description}</p>
                </div>
              ))}
            </div>
          </SectionSplitView>
        </ShapedSection>

        {/* Timeline */}
        <ShapedSection shape="tighten" variant="dark" id="timeline">
          <SectionSplitView
            kicker="Timeline"
            title="Important Dates"
            subtitle="Mark your calendar for these key milestones."
            variant="dark"
          >
            <div className="space-y-6 pt-8">
              {TIMELINE_ITEMS.map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-20 flex-shrink-0 text-right">
                    <span className={`font-bold ${item.active ? 'text-brand-primary' : 'text-brand-gray-medium'}`}>
                      {item.date}
                    </span>
                  </div>
                  <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${item.active ? 'bg-brand-primary' : 'bg-brand-gray-medium'}`} />
                  <div>
                    <h3 className="text-white font-semibold">{item.label}</h3>
                    <p className="text-brand-gray-light text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionSplitView>
        </ShapedSection>

        {/* CTA Section */}
        <ShapedSection shape="widen" variant="light" id="cta">
          <div className="text-center max-w-2xl mx-auto">
            <Kicker variant="light" className="mb-4">Ready?</Kicker>
            <Heading level="h2" variant="light" className="text-xl md:text-2xl mb-4">
              Share Your Expertise
            </Heading>
            <p className="text-brand-gray-medium mb-8">
              Whether you&apos;re a first-time speaker or a conference veteran, we&apos;d love to hear from you.
              Our review process is blind, so your proposal is judged purely on content.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/cfp/login"
                className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-gray-darkest transition-colors"
              >
                Start Your Submission
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </ShapedSection>

        {/* Footer */}
        <ShapedSection shape="tighten" variant="dark" dropBottom>
          <DynamicSiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}

function TopicCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-bold text-black mb-1">{title}</h3>
        <p className="text-brand-gray-medium text-sm">{description}</p>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default withCfpGate(CfpLanding);
