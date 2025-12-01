/**
 * Schedule Page
 * Full conference agenda with proper SEO schema
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Logo } from '@/components/atoms/Logo';
import { Button } from '@/components/atoms/Button';
import { SocialIcon } from '@/components/atoms/SocialIcon';
import { Heading, Kicker } from '@/components/atoms';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import { SEO, organizationSchema, eventSchema, generateBreadcrumbSchema } from '@/components/SEO';
import { scheduleData } from '@/data';

export default function SchedulePage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Schedule', url: '/schedule' },
  ]);

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

  const [activeDay, setActiveDay] = React.useState(scheduleData.days[0]?.id || 'community');

  const currentDay = scheduleData.days.find((day) => day.id === activeDay);

  return (
    <>
      <SEO
        title="Conference Schedule | Full Agenda & Timeline"
        description="ZurichJS Conference 2026 full schedule. 4 days of JavaScript talks, workshops, networking. Sep 9-12, 2026. Community day, workshops, main conference, VIP activities."
        canonical="/schedule"
        keywords="zurichjs schedule, javascript conference agenda, tech conference timeline, zurich conference 2026 program"
        jsonLd={[organizationSchema, eventSchema, breadcrumbSchema]}
      />

      {/* Header */}
      <header className="bg-black sticky top-0 z-40">
        <SectionContainer>
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="cursor-pointer">
              <Logo width={140} height={38} />
            </Link>
            <Link href="/#tickets">
              <Button variant="primary" size="sm">
                Get Tickets
              </Button>
            </Link>
          </div>
        </SectionContainer>
      </header>

      {/* Main Content */}
      <main className="min-h-screen bg-white">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="py-16 md:py-24">
            {/* Page Header */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="mb-12"
            >
              <motion.div variants={item}>
                <Kicker variant="light" className="mb-4">
                  September 9-12, 2026
                </Kicker>
              </motion.div>
              <motion.div variants={item}>
                <Heading level="h1" variant="light" className="mb-6">
                  Conference Schedule
                </Heading>
              </motion.div>
              <motion.p variants={item} className="text-lg text-gray-600 max-w-3xl">
                {scheduleData.subtitle}
              </motion.p>
            </motion.div>

            {/* Travel Notes */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="mb-12 p-6 bg-gray-50 rounded-lg"
            >
              <motion.div variants={item} className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✈️</span>
                  <div>
                    <h3 className="font-semibold mb-1">Travel Recommendation</h3>
                    <p className="text-gray-600 text-sm">{scheduleData.travelNote}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🏨</span>
                  <div>
                    <h3 className="font-semibold mb-1">Accommodation</h3>
                    <p className="text-gray-600 text-sm">{scheduleData.accommodationNote}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Day Tabs */}
            <div className="mb-8 flex flex-wrap gap-2">
              {scheduleData.days.map((day) => (
                <button
                  key={day.id}
                  onClick={() => setActiveDay(day.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeDay === day.id
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>

            {/* Day Content */}
            {currentDay && (
              <motion.div
                key={currentDay.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Day Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-2">{currentDay.label}</h2>
                  <p className="text-brand-yellow font-medium mb-2">{currentDay.date}</p>
                  <p className="text-gray-600">{currentDay.description}</p>
                </div>

                {/* Events List */}
                <div className="space-y-4">
                  {currentDay.events.map((event, index) => (
                    <div
                      key={index}
                      className="border-l-4 border-brand-yellow pl-6 py-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
                        <span className="text-sm font-mono text-gray-500 md:w-32 shrink-0">
                          {event.time}
                        </span>
                        <div>
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          <p className="text-gray-600 mt-1">{event.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-16">
        <SectionContainer>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center md:items-start gap-2">
              <Logo width={140} height={38} />
              <p className="text-sm text-gray-400">ZurichJS Conference 2026</p>
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
          </div>
        </SectionContainer>
      </footer>
    </>
  );
}
