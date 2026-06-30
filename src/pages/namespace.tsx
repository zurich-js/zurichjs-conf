import React from 'react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { Button, Heading, Kicker } from '@/components/atoms';
import { SEO } from '@/components/SEO';
import { Countdown } from '@/components/molecules';
import { ShapedSection, SiteFooter } from '@/components/organisms';
import { NamespaceStudentSponsorshipForm } from '@/components/organisms/namespace';

const googleFormFallbackUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLScpq-Orha6BeQ4SCSQ5XSeowrFybb-jg8Q7Xh1oh8hZnxc0-w/viewform';
const submissionDeadline = '2026-07-19T23:59:59+02:00';

const namespaceFeatures = [
  {
    title: 'Faster GitHub Actions runners',
    description:
      'Run build and test pipelines on high-performance runners with caching and snapshotting built in.',
  },
  {
    title: 'Cloud Devboxes',
    description:
      'Start isolated development environments for developers and coding agents without tying up a local machine.',
  },
  {
    title: 'Build and cache infrastructure',
    description:
      'Speed up Docker builds, reuse cache volumes, and keep CI workflows easier to observe.',
  },
] as const;

const participationSteps = [
  {
    title: 'Share your code',
    description: 'Add a GitHub repo, gist, sandbox, demo, or another public link.',
  },
  {
    title: 'Explain how to run it',
    description: 'Include setup notes or point reviewers to the relevant README.',
  },
  {
    title: 'Tell us why it matters',
    description:
      'Tell us what you solved, what you learned, and why this project matters to you.',
  },
] as const;

export default function NamespacePage() {
  return (
    <>
      <SEO
        title="Win a ZurichJS Conf Ticket with Namespace"
        description="Namespace is sponsoring students at ZurichJS Conf 2026. Submit a project you are proud of for a chance to win a free conference ticket."
        canonical="/namespace"
        ogImage="/images/og/namespace-student-sponsorship.png"
        ogType="website"
        keywords="Namespace ZurichJS, student sponsorship, ZurichJS student ticket, Namespace challenge, student coding challenge, JavaScript conference student ticket"
      />

      <main className="min-h-screen">
        <ShapedSection
          shape="down"
          variant="light"
          dropTop
          id="hero"
          className="bg-[url('/images/namespace-bkg.png')] bg-cover bg-center"
        >
          <div className="pt-24 md:pt-32 lg:pt-36">
            <Kicker variant="light" className="mb-4">
              Namespace Student Sponsorship
            </Kicker>
            <Heading
              level="h1"
              variant="light"
              className="max-w-4xl text-[3rem] leading-tight sm:text-2xl lg:text-3xl"
            >
              Win a ZurichJS Conf ticket
            </Heading>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-brand-gray-dark md:text-md">
              Namespace, our Platinum Sponsor, are giving away a limited number of tickets for ZurichJS Conf 2026
              to university students graduating in 2026 who impress them most with their code.
            </p>

            <div className="mt-8 flex flex-col-reverse items-center gap-6 lg:flex-row lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button href="#apply" asChild variant="blue">
                  Participate
                </Button>
              </div>

              <div className="lg:shrink-0 lg:pb-1 xl:mr-4">
                <Countdown
                  targetDate={submissionDeadline}
                  kicker="Submissions close in"
                  variant="light"
                />
              </div>
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="tighten" variant="gray-light" id="namespace">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
            <div>
              <Kicker variant="light" className="mb-4">
                Platinum sponsor
              </Kicker>
              <Heading level="h2" variant="light" className="text-xl font-bold">
                What Namespace does
              </Heading>
              <p className="mt-5 text-base leading-relaxed text-brand-gray-dark">
                Namespace is a fast-growing US startup with presence in Zurich.
              </p>
              <p className="mt-5 text-base leading-relaxed text-brand-gray-dark">
                They are the compute and code primitive layer for AI-first companies, redefining modern developer infrastructure.
              </p>
              <div className="flex gap-6 items-center mt-7">
                <Image
                    src="/images/namespace-logo.svg"
                    alt="Namespace"
                    width={180}
                    height={42}
                    className="h-auto w-44"
                />
                <Button
                    href="https://namespace.so"
                    asChild
                    variant="ghost"
                    forceDark={true}
                    size="sm"
                >
                  Visit Namespace
                  <ExternalLink className="size-3" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="space-y-6 mt-12 md:border-l md:border-black/15 md:pl-10">
              {namespaceFeatures.map((feature) => (
                <section key={feature.title}>
                  <h3 className="text-md font-bold text-brand-black">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-gray-dark">
                    {feature.description}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </ShapedSection>

        <ShapedSection shape="widen" variant="light" id="participate">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
            <div>
              <Kicker variant="light" className="mb-4">
                How to participate
              </Kicker>
              <Heading level="h2" variant="light" className="text-xl font-bold">
                Submit a project you are proud of
              </Heading>
              <p className="mt-5 text-base leading-relaxed text-brand-gray-dark">
                <strong className="font-bold text-brand-black">
                  Are you graduating in 2026?
                </strong>
                {' '}
                Send a public link to something you built and a short explanation.
                It does not need to be polished; it needs to be yours and easy to
                review.
              </p>

              <dl className="mt-8 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xxs font-semibold uppercase tracking-widest text-brand-gray-medium">
                    Deadline
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-brand-black">
                    July 19, 2026
                  </dd>
                </div>
                <div>
                  <dt className="text-xxs font-semibold uppercase tracking-widest text-brand-gray-medium">
                    Winners notified
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-brand-black">
                    July 27, 2026
                  </dd>
                </div>
              </dl>
            </div>

            <ol className="space-y-6 mt-12 md:border-l md:border-black/15 md:pl-10">
              {participationSteps.map((criterion, index) => (
                <li key={criterion.title} className="grid grid-cols-[2.5rem_1fr] gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-black text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-md font-bold text-brand-black">{criterion.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-brand-gray-dark">
                      {criterion.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </ShapedSection>

        <ShapedSection shape="tighten" variant="gray-light" id="apply">
          <div className="mx-auto max-w-4xl">
            <NamespaceStudentSponsorshipForm fallbackUrl={googleFormFallbackUrl} />
          </div>
        </ShapedSection>

        <ShapedSection shape="widen" variant="dark" compactTop dropBottom>
          <SiteFooter showContactLinks />
        </ShapedSection>
      </main>
    </>
  );
}
