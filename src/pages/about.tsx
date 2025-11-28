import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/atoms/Logo";
import { SocialIcon } from "@/components/atoms/SocialIcon";
import { Button } from "@/components/atoms/Button";
import { SectionContainer } from "@/components/organisms/SectionContainer";
import { AboutHeroSection } from "@/components/organisms/AboutHeroSection";
import { AboutMissionSection } from "@/components/organisms/AboutMissionSection";
import { AboutStatsSection } from "@/components/organisms/AboutStatsSection";
import { AboutTeamSection } from "@/components/organisms/AboutTeamSection";
import { AboutVenueSection } from "@/components/organisms/AboutVenueSection";
import { AboutValuesSection } from "@/components/organisms/AboutValuesSection";
import { AboutCTASection } from "@/components/organisms/AboutCTASection";
import { aboutPageData } from "@/data/about-us";

export default function AboutUs() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <>
      <Head>
        <title>{`About Us | ZurichJS Conference 2026`}</title>
        <meta
          name="description"
          content="Learn more about ZurichJS and our mission to bring the JavaScript community together"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className="bg-black sticky top-0 z-40">
        <SectionContainer>
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="cursor-pointer">
              <Logo width={140} height={38} />
            </Link>
            <Link href="/#tickets">
              <Button variant="primary" size="sm">
                Render ticket
              </Button>
            </Link>
          </div>
        </SectionContainer>
      </header>
      <main className="min-h-screen bg-white">
        <div className="max-w-[800px] mx-auto px-4">
          <div className="py-16 md:py-24">
            <AboutHeroSection data={aboutPageData.hero} />
            <AboutMissionSection data={aboutPageData.mission} />
          </div>
        </div>

        <AboutStatsSection data={aboutPageData.stats} />

        <div className="max-w-[800px] mx-auto px-4">
          <AboutTeamSection data={aboutPageData.team} />
        </div>

        <AboutVenueSection data={aboutPageData.venue} />

        <div className="max-w-[800px] mx-auto px-4 mb-16">
          <AboutValuesSection data={aboutPageData.values} />
        </div>

        <AboutCTASection data={aboutPageData.ctaSlides} />
      </main>
      <footer
        className="relative text-white"
        style={{
          marginLeft: "calc(-50vw + 50%)",
          marginRight: "calc(-50vw + 50%)",
          width: "100vw",
        }}
      >
        {/* Parallelogram Background */}
        <div
          className="absolute inset-0 bg-black"
          style={{
            transform: "skewY(3deg)",
          }}
          aria-hidden="true"
        />

        <div className="relative py-16 md:py-24">
          <SectionContainer>
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="space-y-12"
            >
              <motion.div variants={item} className="space-y-4">
                <p className="text-brand-gray-light text-sm font-semibold uppercase tracking-wider">
                  Get in touch
                </p>
                <h2 className="text-4xl md:text-5xl font-bold">
                  Questions or feedback?
                </h2>
              </motion.div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
                <motion.div variants={item} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-brand-white-light font-semibold mb-1">
                        General Inquiries
                      </p>
                      <a
                        href="mailto:hello@zurichjs.com"
                        className="text-brand-gray-light hover:underline  text-base"
                      >
                        hello@zurichjs.com
                      </a>
                    </div>
                    <div>
                      <p className="text-sm text-brand-white-light font-semibold mb-1">
                        Ticket Support
                      </p>
                      <a
                        href="mailto:tickets@zurichjs.com"
                        className=" text-brand-gray-light hover:underline font-semibold text-base"
                      >
                        tickets@zurichjs.com
                      </a>
                    </div>
                    <div>
                      <p className="text-sm text-brand-white-light font-semibold mb-1">
                        Sponsorship
                      </p>
                      <a
                        href="mailto:sponsors@zurichjs.com"
                        className="hover:underline text-brand-gray-light text-base"
                      >
                        sponsors@zurichjs.com
                      </a>
                    </div>
                  </div>
                </motion.div>
                <motion.div variants={item} className="space-y-6">
                  <p className="text-brand-gray-light text-base">
                    We would love to hear from you! Whether you have questions
                    about the conference, want to become a sponsor, or are
                    interested in speaking, our team is here to help.
                  </p>
                  <a
                    href="mailto:hello@zurichjs.com?subject=Contact from ZurichJS Conf 2026"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full md:w-auto"
                    >
                      Contact Us
                    </Button>
                  </a>
                </motion.div>
              </div>
              <motion.div
                variants={item}
                className="pt-12 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex flex-col items-center md:items-start gap-2">
                  <Logo width={160} height={43} />
                  <p className="text-sm text-brand-gray-light">
                    ZurichJS Conference 2026
                  </p>
                </div>
                <div className="flex gap-3">
                  <SocialIcon
                    kind="linkedin"
                    href="https://www.linkedin.com/company/zurichjs"
                    label="Follow ZurichJS on LinkedIn"
                  />
                  <SocialIcon
                    kind="instagram"
                    href="https://www.instagram.com/zurich.js"
                    label="Follow ZurichJS on Instagram"
                  />
                </div>
              </motion.div>
            </motion.div>
          </SectionContainer>
        </div>
      </footer>
    </>
  );
}
