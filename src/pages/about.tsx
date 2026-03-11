import React from "react";
import { SEO, organizationSchema, generateBreadcrumbSchema } from "@/components/SEO";
import { NavBar } from "@/components/organisms/NavBar";
import { AboutHeroSection } from "@/components/organisms/AboutHeroSection";
import { AboutMissionSection } from "@/components/organisms/AboutMissionSection";
import { AboutStatsSection } from "@/components/organisms/AboutStatsSection";
import { AboutTeamSection } from "@/components/organisms/AboutTeamSection";
import { AboutVenueSection } from "@/components/organisms/AboutVenueSection";
import { AboutValuesSection } from "@/components/organisms/AboutValuesSection";
import { AboutCTASection } from "@/components/organisms/AboutCTASection";
import { aboutPageData } from "@/data/about-us";
import {DynamicSiteFooter, ShapedSection} from "@/components/organisms";

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
      <NavBar />
      <main className="min-h-screen bg-white">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="py-16 md:py-24">
            <AboutHeroSection data={aboutPageData.hero} />
            <AboutMissionSection data={aboutPageData.mission} />
          </div>
        </div>

        <AboutStatsSection data={aboutPageData.stats} />

        <div className="max-w-screen-lg mx-auto px-4">
          <AboutTeamSection data={aboutPageData.team} />
        </div>

        <AboutVenueSection data={aboutPageData.venue} />

        <div className="max-w-screen-lg mx-auto px-4 mb-16">
          <AboutValuesSection data={aboutPageData.values} />
        </div>

        <AboutCTASection data={aboutPageData.ctaSlides} />

          {/*TODO(bugdan): change above to be shaped sections */}
          <ShapedSection
              shape="tighten"
              variant="dark"
              compactTop={true}
              dropBottom={true}
          >
              <DynamicSiteFooter />
          </ShapedSection>
      </main>
    </>
  );
}
