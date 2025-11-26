import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/atoms/Logo";
import { SocialIcon } from "@/components/atoms/SocialIcon";
import { Button } from "@/components/atoms/Button";
import { Kicker, Heading } from "@/components/atoms";
import { SectionContainer } from "@/components/organisms/SectionContainer";

export default function AboutUs() {
  // Animation variants for footer (same as info pages)
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
                Order Ticket
              </Button>
            </Link>
          </div>
        </SectionContainer>
      </header>
      <main className="min-h-screen bg-white">
        <SectionContainer>
          <div className="py-16 md:py-24">
            {/* Hero Section */}
            <div className="mb-16">
                <Heading
                  level="h1"
                  variant="light"
                  className="text-2xl font-bold"
                >
                  This is ZurichJS.
                </Heading>
              </div>

              {/* Mission Section */}
              <div className="mb-16">
                <Kicker variant="light" className="mb-4">
                  Our Mission
                </Kicker>
                <Heading
                  level="h2"
                  variant="light"
                  className="mb-8 text-xl font-bold"
                >
                  Building the future of Javascript together
                </Heading>

                {/* Two Column Text */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  <div>
                    <p className="text-gray-700 leading-relaxed text-base">
                      Zurich JS Conf is the premier JavaScript conference in
                      Switzerland, bringing together developers, designers, and
                      technology enthusiasts from around the world. Our mission
                      is to foster innovation, share knowledge, and build a
                      stronger JavaScript community.
                    </p>
                    <p className="text-gray-700 leading-relaxed text-base">
                      Since its inception, Zurich JS Conf has been dedicated to
                      showcasing the latest trends, best practices, and
                      cutting-edge technologies in the JavaScript ecosystem.
                      From frontend frameworks to backend solutions, we cover it
                      all.
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-700 leading-relaxed text-base">
                      We believe in the power of community-driven learning and
                      collaboration. Through engaging talks, hands-on workshops,
                      and networking opportunities, we create an environment
                      where ideas flourish and connections are made.
                    </p>
                    <p className="text-gray-700 leading-relaxed text-base">
                      Join us for three days of inspiration, learning, and
                      connection as we explore the future of web development
                      together.
                    </p>
                  </div>
                </div>
              </div>
          </div>
        </SectionContainer>
      </main>
      <footer className="bg-black text-white py-16 md:py-24">
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
                    variant="dark"
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
      </footer>
    </>
  );
}
