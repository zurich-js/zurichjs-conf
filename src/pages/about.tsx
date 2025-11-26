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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed text-base">
                    Zurich JS Conf is the premier JavaScript conference in
                    Switzerland, bringing together developers, designers, and
                    technology enthusiasts from around the world. Our mission is
                    to foster innovation, share knowledge, and build a stronger
                    JavaScript community.
                  </p>
                  <p className="text-gray-700 leading-relaxed text-base">
                    Since its inception, Zurich JS Conf has been dedicated to
                    showcasing the latest trends, best practices, and
                    cutting-edge technologies in the JavaScript ecosystem. From
                    frontend frameworks to backend solutions, we cover it all.
                  </p>
                </div>
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed text-base">
                    We believe in the power of community-driven learning and
                    collaboration. Through engaging talks, hands-on workshops,
                    and networking opportunities, we create an environment where
                    ideas flourish and connections are made.
                  </p>
                  <p className="text-gray-700 leading-relaxed text-base">
                    Join us for three days of inspiration, learning, and
                    connection as we explore the future of web development
                    together.
                  </p>
                </div>
              </div>
            </div>
            <div
              className="relative my-16"
              style={{
                marginLeft: "calc(-50vw + 50%)",
                marginRight: "calc(-50vw + 50%)",
                width: "100vw",
              }}
            >
              <div
                className="absolute inset-0 bg-gray-100"
                style={{
                  transform: "skewY(2deg)",
                }}
                aria-hidden="true"
              />
              <div className="relative py-16 max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                  <div className="text-center">
                    <p className="text-5xl md:text-6xl font-bold text-gray-900 mb-2">
                      300
                    </p>
                    <p className="text-base text-gray-600">attendees</p>
                  </div>
                  <div className="text-center">
                    <p className="text-5xl md:text-6xl font-bold text-gray-900 mb-2">
                      30+
                    </p>
                    <p className="text-base text-gray-600">speakers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-5xl md:text-6xl font-bold text-gray-900 mb-2">
                      3
                    </p>
                    <p className="text-base text-gray-600">days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-5xl md:text-6xl font-bold text-gray-900 mb-2">
                      10+
                    </p>
                    <p className="text-base text-gray-600">workshops</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-16">
              <Kicker variant="light" className="mb-4">
                the team
              </Kicker>
              <Heading
                level="h2"
                variant="light"
                className="mb-6 text-xl font-bold"
              >
                Meet the team
              </Heading>
              <p className="text-lg text-gray-700 leading-relaxed mb-12 max-w-3xl">
                Our passionate team of organizers and volunteers work tirelessly
                to bring you the best JavaScript conference experience.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div>
                  <div
                    className="mb-4 bg-gray-200 rounded-lg overflow-hidden"
                    style={{ width: "290px", height: "210px" }}
                  >
                    <img
                      src="/placeholder-team-1.jpg"
                      alt="Team member 1"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Faris Aziz
                  </h3>
                  <p className="text-base text-gray-600">Role / Position</p>
                </div>

                <div>
                  <div
                    className="mb-4 bg-gray-200 rounded-lg overflow-hidden"
                    style={{ width: "290px", height: "210px" }}
                  >
                    <img
                      src="/placeholder-team-2.jpg"
                      alt="Team member 2"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Nadja Hesselbjerg
                  </h3>
                  <p className="text-base text-gray-600">Role / Position</p>
                </div>

                <div>
                  <div
                    className="mb-4 bg-gray-200 rounded-lg overflow-hidden"
                    style={{ width: "290px", height: "210px" }}
                  >
                    <img
                      src="/placeholder-team-3.jpg"
                      alt="Team member 3"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Bogdan Mihai Ilie
                  </h3>
                  <p className="text-base text-gray-600">Role / Position</p>
                </div>
              </div>
              <div className="mt-16">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  And our amazing volunteers
                </h3>
                <p className="text-base text-gray-700 leading-relaxed mb-8 max-w-3xl">
                  None of this would be possible without our incredible
                  volunteers who dedicate their time and energy to make this
                  conference a success.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="text-gray-900">
                    <p className="font-medium">Volunteer Name</p>
                  </div>
                  <div className="text-gray-900">
                    <p className="font-medium">Volunteer Name</p>
                  </div>
                  <div className="text-gray-900">
                    <p className="font-medium">Volunteer Name</p>
                  </div>
                  <div className="text-gray-900">
                    <p className="font-medium">Volunteer Name</p>
                  </div>
                  <div className="text-gray-900">
                    <p className="font-medium">Volunteer Name</p>
                  </div>
                  <div className="text-gray-900">
                    <p className="font-medium">Volunteer Name</p>
                  </div>
                  <div className="text-gray-900">
                    <p className="font-medium">Volunteer Name</p>
                  </div>
                  <div className="text-gray-900">
                    <p className="font-medium">Volunteer Name</p>
                  </div>
                  <div className="text-gray-900">
                    <p className="font-medium">Volunteer Name</p>
                  </div>
                  <div className="text-gray-900">
                    <p className="font-medium">Volunteer Name</p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="relative my-16"
              style={{
                marginLeft: "calc(-50vw + 50%)",
                marginRight: "calc(-50vw + 50%)",
                width: "100vw",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: "#19191B",
                  transform: "skewY(2deg)",
                }}
                aria-hidden="true"
              />

              <div className="relative py-16 max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
                <Kicker variant="dark" className="mb-4">
                  the venue
                </Kicker>
                <Heading
                  level="h2"
                  variant="dark"
                  className="mb-8 text-xl font-bold"
                >
                  Technopark Zürich
                </Heading>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  {/* Left Column - Text */}
                  <div className="space-y-4">
                    <p className="text-white leading-relaxed text-base">
                      Technopark Zürich is Switzerland&apos;s largest technology
                      center, located in the heart of Zurich&apos;s innovation
                      district. This modern facility provides the perfect
                      backdrop for our conference.
                    </p>
                    <p className="text-white leading-relaxed text-base">
                      With state-of-the-art facilities and excellent
                      transportation connections, Technopark offers an inspiring
                      environment for learning, networking, and collaboration.
                    </p>
                    <p className="text-white leading-relaxed text-base">
                      The venue features modern conference rooms, comfortable
                      seating, and all the amenities needed for a world-class
                      technology conference.
                    </p>
                    <p className="text-white leading-relaxed text-base">
                      Located just minutes from Zurich&apos;s main train station, the
                      venue is easily accessible by public transportation and
                      offers parking facilities for those arriving by car.
                    </p>
                  </div>
                  <div>
                    <div className="mb-6 w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
                      <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2701.234567890123!2d8.5167!3d47.3833!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDfCsDIyJzU5LjkiTiA4wrAzMScwMC4xIkU!5e0!3m2!1sen!2sch!4v1234567890123"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Technopark Zürich location"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-white leading-relaxed text-base">
                          Technoparkstrasse 1<br />
                          8005 Zürich
                          <br />
                          Switzerland
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          asChild
                          href="https://maps.google.com"
                        >
                          Get Directions
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          asChild
                          href="https://technopark.ch"
                        >
                          Visit Website
                        </Button>
                      </div>
                    </div>
                  </div>
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
                  <Button variant="dark" size="sm" className="w-full md:w-auto">
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
