import React from "react";
import { Clock, MapPin, ExternalLink } from "lucide-react";
import { SEO, organizationSchema, generateBreadcrumbSchema } from "@/components/SEO";
import { aboutPageData } from "@/data/about-us";
import { SiteFooter, ShapedSection, AboutCTASection} from "@/components/organisms";
import {Button, Heading, Kicker} from "@/components/atoms";
import {TeamMemberCard} from "@/components/molecules/TeamMemberCard";
import {ValueCard} from "@/components/molecules/ValueCard";

export default function AboutUs() {
  // Breadcrumb schema for about page
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'About', url: '/about' },
  ]);

  return (
    <>
      <SEO
        title="About ZurichJS Conference | Team, Venue & Mission"
        description="Meet the team behind ZurichJS Conference 2026. Learn about our mission to unite the JavaScript community at Technopark Zürich. 300 attendees, ~15 speakers, 5+ workshops."
        canonical="/about"
        keywords="zurichjs team, javascript community zurich, swiss javascript group, technopark zurich conference"
        jsonLd={[organizationSchema, breadcrumbSchema]}
      />
      <main className="min-h-screen">
        <ShapedSection
          shape="down"
          dropTop
          variant="light"
        >
          <Heading level="h1" variant="light" className="text-2xl lg:text-3xl font-bold mt-40 mb-20">
        {aboutPageData.hero.title}
      </Heading>
        <Kicker variant="light" className="mb-4">
          {aboutPageData.mission.kicker}
        </Kicker>
        <Heading level="h2" variant="light" className="mb-8 text-xl font-bold">
          {aboutPageData.mission.title}
        </Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-4">
            {aboutPageData.mission.leftColumn.map((text, index) => (
              <p
                key={index}
                className="text-gray-700 leading-relaxed text-base"
                dangerouslySetInnerHTML={{ __html: text }}
              />
            ))}
          </div>
          <div className="space-y-4">
            {aboutPageData.mission.rightColumn.map((text, index) => (
              <p
                key={index}
                className="text-gray-700 leading-relaxed text-base"
                dangerouslySetInnerHTML={{ __html: text }}
              />
            ))}
          </div>
        </div>
    </ShapedSection>

      <ShapedSection
        shape="down"
        variant="gray"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {aboutPageData.stats.map((stat, index) => (
            <div className="text-center" key={index}>
              <p className="text-5xl md:text-6xl font-bold mb-2">
                {stat.value}
              </p>
              <p className="text-base">{stat.label}</p>
            </div>
          ))}
        </div>
      </ShapedSection>

      <ShapedSection
        shape="down"
        variant="light"
      >
        <Kicker variant="light" className="mb-4">
          {aboutPageData.team.kicker}
        </Kicker>
        <Heading level="h2" variant="light" className="mb-6 text-xl font-bold">
          {aboutPageData.team.title}
        </Heading>
        <p className="text-base text-gray-700 leading-relaxed mb-12 max-w-3xl">
          {aboutPageData.team.description}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-8">
          {aboutPageData.team.members.map((member, index) => (
            <TeamMemberCard
              key={index}
              imageSrc={member.imageSrc}
              imageAlt={member.imageAlt}
              name={member.name}
              role={member.role}
            />
          ))}
        </div>
        <div className="mt-16">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {aboutPageData.team.volunteersTitle}
          </h3>
          <p className="text-base text-gray-700 leading-relaxed mb-8 max-w-3xl">
            {aboutPageData.team.volunteersDescription}
          </p>
          <div className="flex flex-wrap gap-4">
            {aboutPageData.team.volunteers.map((name, index) => (
              <div key={index} className=" bg-brand-gray-lightest rounded-lg p-2 px-4 text-brand-gray-darkest leading-relaxed flex items-center">
                <p className="font-medium">{name}</p>
              </div>
            ))}
          </div>
        </div>
    </ShapedSection>

      <ShapedSection
        shape="down"
        variant="medium"
      >
        <div className="rich-text-renderer" id={"venue"}>
          <Kicker variant="dark" className="mb-4">
            {aboutPageData.venue.kicker}
          </Kicker>
          <Heading level="h2" variant="dark" className="mb-8 text-xl font-bold">
            {aboutPageData.venue.title}
          </Heading>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              {aboutPageData.venue.description.map((text, index) => (
                <p
                  key={index}
                  className="text-white leading-relaxed text-base"
                  dangerouslySetInnerHTML={{ __html: text }}
                />
              ))}
            </div>
            <div>
              <div className="mb-6 w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
                <iframe
                  src={aboutPageData.venue.mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${aboutPageData.venue.title} location`}
                />
              </div>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  asChild
                  href={aboutPageData.venue.directionsUrl}
                >
                  Get Directions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  asChild
                  href={aboutPageData.venue.websiteUrl}
                >
                  Visit Website
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ShapedSection>

      <ShapedSection
        shape="down"
        variant="dark"
      >
        <div id="after-party" className="rich-text-renderer">
          <Kicker variant="dark" className="mb-4">
            {aboutPageData.afterParty.kicker}
          </Kicker>
          <Heading level="h2" variant="dark" className="mb-3 text-xl font-bold">
            {aboutPageData.afterParty.title}
          </Heading>
          <p className="text-brand-gray-light text-base mb-8 max-w-3xl">
            {aboutPageData.afterParty.subtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
            <div className="space-y-4">
              {aboutPageData.afterParty.description.map((text, index) => (
                <p
                  key={index}
                  className="text-brand-white leading-relaxed text-base"
                >
                  {text}
                </p>
              ))}

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2" role="list">
                {aboutPageData.afterParty.highlights.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-start gap-2.5 bg-brand-gray-darkest/60 rounded-xl p-3 text-sm text-brand-white"
                  >
                    <Icon size={18} className="text-brand-yellow-main shrink-0 mt-0.5" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  variant="accent"
                  asChild
                  href={aboutPageData.afterParty.ctaUrl}
                >
                  {aboutPageData.afterParty.ctaLabel}
                </Button>
                <Button
                  variant="outline"
                  asChild
                  href={aboutPageData.afterParty.websiteUrl}
                >
                  {aboutPageData.afterParty.websiteLabel}
                  <ExternalLink size={14} />
                </Button>
              </div>
            </div>

            <div>
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-brand-gray-darkest">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aboutPageData.afterParty.imageSrc}
                  alt={aboutPageData.afterParty.imageAlt}
                  className="size-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black/70 via-brand-black/30 to-brand-black/10" />
              </div>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-brand-gray-light">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand-yellow-main" />
                  {aboutPageData.afterParty.address}
                </span>
                <span className="hidden sm:inline text-brand-gray-medium">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-brand-yellow-main" />
                  {aboutPageData.afterParty.schedule}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ShapedSection>

      <ShapedSection
        shape="down"
        variant="light"
      >
        <Kicker variant="light" className="mb-4">
          {aboutPageData.values.kicker}
        </Kicker>
        <Heading level="h2" variant="light" className="mb-12 text-xl font-bold">
          {aboutPageData.values.title}
        </Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {aboutPageData.values.values.map((value, index) => (
            <ValueCard
              key={index}
              icon={value.icon}
              title={value.title}
              description={value.description}
            />
          ))}
        </div>
      </ShapedSection>

      <ShapedSection
        shape="down"
        variant="yellow"
      >
        <AboutCTASection data={aboutPageData.ctaSlides} />

      </ShapedSection>

      <ShapedSection
        shape="tighten"
        variant="dark"
        compactTop={true}
        dropBottom={true}
      >
        <SiteFooter />
      </ShapedSection>
    </main>
  </>
  );
}
