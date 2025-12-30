import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Linkedin, Download, Copy, Check } from 'lucide-react';
import {
  ShapedSection,
  DynamicSiteFooter,
  PageHeader,
} from '@/components/organisms';
import { Button } from '@/components/atoms';
import { SEO } from '@/components/SEO';

const HeaderSocialLinks = () => (
  <div className="flex items-center gap-4">
    <Link
      href="mailto:hello@zurichjs.com"
      className="px-5 py-2 bg-brand-yellow-main text-brand-black text-sm font-medium rounded-full hover:bg-brand-yellow-dark transition-colors"
    >
      Contact us
    </Link>
    <Link
      href="https://linkedin.com/company/zurichjs"
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-white hover:text-brand-white/80 transition-colors"
      aria-label="LinkedIn"
    >
      <Linkedin className="w-6 h-6" />
    </Link>
    <Link
      href="https://instagram.com/zurichjs"
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-white hover:text-brand-white/80 transition-colors"
      aria-label="Instagram"
    >
      <Instagram className="w-6 h-6" />
    </Link>
  </div>
);

const conferenceBlurbs = {
  short: `ZurichJS Conference 2026 is Switzerland's premier JavaScript event, taking place September 11, 2026 at Technopark Zurich. Join 300+ developers, engineers, and tech leaders for multiple days of learning, networking, and community building.`,
  medium: `ZurichJS Conference 2026 is Switzerland's premier JavaScript event, taking place September 9-12, 2026 at Technopark Zurich. The event kicks off with a warm-up meetup on September 9th, followed by a workshop day on September 10th, the main conference day on September 11th, and VIP/speaker activities on September 12th. With around 15 speakers from around the world, ZurichJS Conf covers the latest in JavaScript, TypeScript, React, Node.js, and the broader web ecosystem. Join us to learn from industry experts, connect with the Swiss tech community, and be part of the growing ZurichJS movement.`,
  full: `ZurichJS Conference 2026 is Switzerland's premier JavaScript event, organized by the ZurichJS community—a thriving meetup group that has been bringing together JavaScript enthusiasts in Zurich since 2012. Taking place September 9-12, 2026 at the iconic Technopark Zurich, this multi-day event brings together 300+ developers, engineers, and tech leaders from across Switzerland and Europe.

The event begins with a warm-up meetup on September 9th, followed by hands-on workshops on September 10th, and culminates with the main conference day on September 11th featuring around 15 speakers from leading companies and the open-source community. September 12th offers exclusive VIP and speaker activities. Topics include JavaScript, TypeScript, React, Vue, Node.js, serverless architectures, AI/ML in web development, and emerging web technologies.

Beyond the talks, ZurichJS Conference is about community. With dedicated networking sessions, sponsor booths, and an afterparty, it's the perfect opportunity to connect with fellow developers, discover new tools and frameworks, and be part of the Swiss JavaScript ecosystem.`,
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-brand-gray-dark hover:text-brand-black border border-brand-gray-light rounded-lg hover:border-brand-gray-dark transition-colors cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          {label}
        </>
      )}
    </button>
  );
}

function LogoCard({
  title,
  description,
  imageSrc,
  downloadHref,
  downloadName,
  bgColor = 'bg-brand-gray-lightest',
  isWide = false,
}: {
  title: string;
  description: string;
  imageSrc: string;
  downloadHref: string;
  downloadName: string;
  bgColor?: string;
  isWide?: boolean;
}) {
  return (
    <div className="border border-brand-gray-light rounded-xl overflow-hidden flex flex-col h-full">
      <div className={`${bgColor} ${isWide ? 'px-6 py-10 md:py-12' : 'p-8'} flex items-center justify-center flex-1 min-h-[200px] ${isWide ? 'md:min-h-[240px] lg:min-h-[260px]' : ''}`}>
        <Image
          src={imageSrc}
          alt={title}
          width={isWide ? 500 : 200}
          height={isWide ? 160 : 200}
          className={`w-auto h-auto object-contain ${isWide ? 'w-full max-h-[120px] md:max-h-[160px] lg:max-h-[180px]' : 'max-w-[160px] max-h-[160px]'}`}
        />
      </div>
      <div className="p-6 bg-white">
        <h3 className="text-lg font-semibold text-brand-black mb-2">{title}</h3>
        <p className="text-sm text-brand-gray-dark mb-4">{description}</p>
        <a
          href={downloadHref}
          download={downloadName}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-black text-white text-sm font-medium rounded-lg hover:bg-brand-gray-darkest transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download
        </a>
      </div>
    </div>
  );
}

function BlurbCard({
  title,
  text,
  wordCount,
}: {
  title: string;
  text: string;
  wordCount: string;
}) {
  return (
    <div className="border border-brand-gray-light rounded-xl p-6 bg-white">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-brand-black">{title}</h3>
          <p className="text-sm text-brand-gray-dark">{wordCount}</p>
        </div>
        <CopyButton text={text} label="Copy" />
      </div>
      <p className="text-brand-gray-dark text-sm leading-relaxed whitespace-pre-line">
        {text}
      </p>
    </div>
  );
}

export default function PartnerAssetsPage() {
  return (
    <>
      <SEO
        title="Partner Assets | ZurichJS Conference 2026"
        description="Download ZurichJS Conference logos, brand assets, and promotional materials. Find official descriptions and resources for partners."
        canonical="/partners/assets"
        ogType="website"
        keywords="zurichjs partner assets, zurichjs logo, zurichjs partnership, javascript conference assets, zurichjs brand"
      />

      <PageHeader rightContent={<HeaderSocialLinks />} />

      <main className="min-h-screen">
        {/* Hero Section */}
        <ShapedSection shape="widen" variant="light" dropTop id="hero">
          <div className="py-12 md:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-brand-yellow-dark uppercase tracking-wider mb-4">
                Partner Resources
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-black mb-6">
                Brand Assets
              </h1>
              <p className="text-lg md:text-xl text-brand-gray-dark leading-relaxed">
                Everything you need to promote ZurichJS Conference 2026.
                Download our logos, grab a blurb, and help spread the word about
                Switzerland&apos;s premier JavaScript event.
              </p>
            </div>
          </div>
        </ShapedSection>

        {/* Logos Section */}
        <ShapedSection shape="tighten" variant="light" className="!bg-[#EDEDEF]" id="logos">
          <div className="py-12 md:py-16">
            <div className="mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-brand-black mb-4">
                Logos
              </h2>
              <p className="text-brand-gray-dark max-w-2xl">
                Use these official logos when promoting or writing about ZurichJS Conference.
                Please don&apos;t modify, distort, or recolor the logos.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <LogoCard
                title="Square Logo (Primary)"
                description="Our primary logo. Use this for most applications including web, print, social media, and profile pictures."
                imageSrc="/images/logo/zurichjs-square.png"
                downloadHref="/images/logo/zurichjs-square.png"
                downloadName="zurichjs-square-logo.png"
                bgColor="bg-brand-black"
              />
              <LogoCard
                title="Full Logo"
                description="Extended horizontal logo with wordmark. Use against contrasting backgrounds when the square logo doesn't fit the layout."
                imageSrc="/images/logo/zurichjs-full.svg"
                downloadHref="/images/logo/zurichjs-full.svg"
                downloadName="zurichjs-full-logo.svg"
                bgColor="bg-brand-black"
                isWide={true}
              />
            </div>
          </div>
        </ShapedSection>

        {/* Blurbs Section */}
        <ShapedSection shape="widen" variant="light" id="blurbs">
          <div className="py-12 md:py-16">
            <div className="mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-brand-black mb-4">
                About the Conference
              </h2>
              <p className="text-brand-gray-dark max-w-2xl">
                Official descriptions you can use in articles, social posts, newsletters, or
                anywhere else you&apos;re writing about ZurichJS Conference 2026.
              </p>
            </div>

            <div className="space-y-6">
              <BlurbCard
                title="Short Description"
                text={conferenceBlurbs.short}
                wordCount="~40 words"
              />
              <BlurbCard
                title="Medium Description"
                text={conferenceBlurbs.medium}
                wordCount="~100 words"
              />
              <BlurbCard
                title="Full Description"
                text={conferenceBlurbs.full}
                wordCount="~250 words"
              />
            </div>
          </div>
        </ShapedSection>

        {/* Key Facts Section */}
        <ShapedSection shape="tighten" variant="yellow" id="facts">
          <div className="py-12 md:py-16">
            <div className="mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-brand-black mb-4">
                Key Facts
              </h2>
              <p className="text-brand-black/70 max-w-2xl">
                Quick reference information for your promotional materials.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Main Conference', value: 'September 11, 2026' },
                { label: 'Location', value: 'Technopark Zurich' },
                { label: 'Expected Attendees', value: '300+' },
                { label: 'Speakers', value: '~15' },
              ].map((fact) => (
                <div key={fact.label} className="bg-brand-black/10 rounded-xl p-6">
                  <p className="text-sm font-semibold text-brand-black/70 mb-1">
                    {fact.label}
                  </p>
                  <p className="text-xl font-bold text-brand-black">{fact.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 p-6 bg-brand-black/10 rounded-xl">
              <h3 className="text-lg font-semibold text-brand-black mb-3">
                Topics Covered
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'JavaScript',
                  'TypeScript',
                  'React',
                  'Vue',
                  'Node.js',
                  'Serverless',
                  'Web Performance',
                  'AI/ML',
                  'Testing',
                  'DevOps',
                ].map((topic) => (
                  <span
                    key={topic}
                    className="px-3 py-1 bg-brand-black text-white text-sm font-medium rounded-full"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </ShapedSection>

        {/* Contact Section */}
        <ShapedSection shape="widen" variant="dark" id="contact">
          <div className="py-12 md:py-16">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Need Something Else?
              </h2>
              <p className="text-brand-gray-light mb-8">
                Need high-resolution assets, custom materials, or additional information?
                We&apos;re happy to help our partners succeed.
              </p>
              <a href="mailto:hello@zurichjs.com?subject=Partner Assets Request - ZurichJS Conference 2026">
                <Button variant="primary" size="lg">
                  Contact Us
                </Button>
              </a>
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
