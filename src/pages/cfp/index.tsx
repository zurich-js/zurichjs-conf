/**
 * CFP Landing Page
 * Main entry point for the Call for Papers system
 */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Eye, BarChart3 } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Heading, Kicker, IconButton } from '@/components/atoms';
import { ShapedSection, DynamicSiteFooter, SectionContainer } from '@/components/organisms';
import { SectionSplitView } from '@/components/organisms/SectionSplitView';
import { BackgroundMedia, Countdown } from '@/components/molecules';
import { useMotion } from '@/contexts/MotionContext';
import { timelineData } from '@/data';

// Get CFP close date from centralized timeline data
const cfpCloseDate = timelineData.entries.find(entry => entry.id === 'cfp-ends')?.dateISO || '2026-04-01';

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
  const router = useRouter();

  const handleCtaClick = () => {
    router.push('/cfp/login');
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
            <div className="relative z-10 flex flex-col mt-40">
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

                <div className="lg:shrink-0 lg:pb-2 xl:scale-110 2xl:scale-125 xl:mr-4 2xl:mr-8">
                  <Countdown targetDate={cfpCloseDate} kicker="CFP closes in" />
                </div>
              </div>

              <motion.div
                className="flex flex-wrap items-center gap-4 mt-4"
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href="#review-process"
                  className="inline-flex items-center gap-2 bg-brand-orange text-white px-5 py-2.5 rounded-full font-semibold hover:bg-brand-orange/90 transition-colors text-sm"
                >
                  How We Review
                  <ArrowRight size={14} />
                </Link>
              </motion.div>
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

              <div className="mt-4 bg-black/5 rounded-2xl p-6 space-y-3">
                <h3 className="text-base font-bold text-black">What tends to resonate with our audience</h3>
                <p className="text-sm text-brand-gray-medium">
                  Zurich has a high concentration of experienced engineers, so we tend to prioritize advanced, senior-level content.
                  Cutting-edge topics work especially well when they include practical, near-term takeaways — patterns, tradeoffs,
                  code-level techniques, architectural decisions, or tooling insights that attendees can apply the same day.
                </p>
                <p className="text-sm text-brand-gray-medium">
                  Softer or more narrative-driven talks are welcome too. In a one-day, single-track format with limited slots,
                  these tend to be more competitive — but a strong proposal can absolutely stand out.
                </p>
                <p className="text-sm text-brand-gray-medium italic">
                  These are observations based on past events, not strict rules. You know your content best.
                </p>
              </div>
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

        {/* How Our CFP Review Works */}
        <ShapedSection shape="widen" variant="light" id="review-process">
          <SectionSplitView
            kicker="Review Process"
            title="How Our CFP Review Works"
            subtitle="We want the process to be transparent, so here's how we evaluate proposals."
            variant="light"
          >
            <div className="space-y-8 pt-8">
              {/* Anonymous Review */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center flex-shrink-0">
                  <Eye className="w-5 h-5 text-black" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-black">Anonymous first stage</h3>
                  <p className="text-sm text-brand-gray-medium">
                    We have 10+ reviewers from different companies, backgrounds, and specialties.
                    The first stage of review is anonymous — reviewers evaluate your proposal based
                    primarily on the title and abstract, similar to how attendees scan a conference schedule.
                  </p>
                  <p className="text-sm text-brand-gray-medium">
                    When attendees browse a schedule, they usually see only the title and the first lines
                    of the abstract. We mirror that experience in early review rounds to reduce bias and
                    focus on the strength of the session itself.
                  </p>
                </div>
              </div>

              {/* Links and Materials */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-black" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-black">Where to place links and materials</h3>
                  <p className="text-sm text-brand-gray-medium">
                    You&apos;re welcome to share links to slides, recordings, or additional context that
                    supports your proposal. To preserve the anonymous review stage, we recommend avoiding
                    links or identifying material directly in the abstract.
                  </p>
                  <p className="text-sm text-brand-gray-medium">
                    Instead, place supporting links in the <span className="font-semibold text-black">&ldquo;Notes for Reviewers&rdquo;</span> section
                    of the CFP form. Those materials are typically reviewed in later stages when we consider
                    the full picture.
                  </p>
                </div>
              </div>

              {/* Later Considerations */}
              <div className="bg-black/5 rounded-2xl p-6 space-y-3">
                <h3 className="text-base font-bold text-black">What we consider in later stages</h3>
                <p className="text-sm text-brand-gray-medium">
                  Once proposals advance past the anonymous stage, we also look at:
                </p>
                <ul className="text-sm text-brand-gray-medium space-y-1.5 ml-4">
                  <li className="flex gap-2"><span className="text-black">·</span> Speaker-topic alignment and relevant experience</li>
                  <li className="flex gap-2"><span className="text-black">·</span> Code of conduct considerations</li>
                  <li className="flex gap-2"><span className="text-black">·</span> Program balance across topics and backgrounds</li>
                  <li className="flex gap-2"><span className="text-black">·</span> Representation and diversity across the lineup</li>
                  <li className="flex gap-2"><span className="text-black">·</span> Practical constraints such as budget or travel requirements</li>
                </ul>
              </div>

              {/* How We Score */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-black" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-black">How we score proposals</h3>
                  <p className="text-sm text-brand-gray-medium">
                    We score proposals on a 1–4 scale (not 1–5). The four-point scale encourages reviewers
                    to lean in a direction rather than defaulting to a neutral middle score. We evaluate
                    clarity, technical depth, originality, and relevance.
                  </p>
                  <p className="text-sm text-brand-gray-medium">
                    Reviewers are encouraged to leave notes alongside their scores. We aim to share
                    feedback with speakers where possible, though we can&apos;t guarantee it for every submission.
                  </p>
                  <p className="text-sm text-brand-gray-medium italic">
                    Across the committee, we aim to spend meaningful time on each proposal — often adding up
                    to roughly an hour of total reviewer time per session across reviewers. This is an
                    intention we hold ourselves to, not a promise we can always keep.
                  </p>
                </div>
              </div>
            </div>
          </SectionSplitView>
        </ShapedSection>

        {/* What We Provide */}
        <ShapedSection shape="tighten" variant="dark" id="benefits">
          <SectionSplitView
            kicker="Benefits"
            title="What We Provide"
            subtitle="We want to make speaking at ZurichJS Conf as easy as possible for you."
            variant="dark"
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
              {SPEAKER_BENEFITS.map((benefit) => (
                <div key={benefit.title} className="text-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CheckIcon className="text-white" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                  <p className="text-brand-gray-light text-sm">{benefit.description}</p>
                </div>
              ))}
            </div>
          </SectionSplitView>
        </ShapedSection>

        {/* Timeline */}
        <ShapedSection shape="widen" variant="dark" id="timeline">
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
        <ShapedSection shape="tighten" variant="yellow" id="cta">
          <div className="text-center max-w-2xl mx-auto">
            <Kicker variant="light" className="mb-4">Ready?</Kicker>
            <Heading level="h2" variant="light" className="text-xl md:text-2xl mb-4">
              Share Your Expertise
            </Heading>
            <p className=" mb-8">
              Whether you&apos;re a first-time speaker or a conference veteran, we&apos;d love to hear from you.
              Our first review stage is anonymous — your proposal is judged on the strength of the content.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/cfp/login"
                className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-gray-darkest transition-colors"
              >
                Start Your Submission
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </ShapedSection>

        {/* Footer */}
        <ShapedSection shape="widen" variant="dark" dropBottom>
          <DynamicSiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}

function TopicCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function CheckIcon({ className = 'text-black' }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default CfpLanding;
