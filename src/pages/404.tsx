/**
 * Custom 404 Page
 * A fun JavaScript-themed "Page Not Found" experience
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SEO } from '@/components/SEO';
import { Logo, Heading, Kicker } from '@/components/atoms';
import { ShapedSection, DynamicSiteFooter, SectionContainer } from '@/components/organisms';
import { BackgroundMedia } from '@/components/molecules';

// Fun JavaScript error messages
const errorMessages = [
  "TypeError: Cannot read property 'page' of undefined",
  "ReferenceError: page is not defined",
  "Error: ENOENT: no such file or directory",
  "SyntaxError: Unexpected token '404'",
  "Promise rejected: PageNotFoundError",
];

// Console-style typing animation component
function TypedCode({ code, delay = 0 }: { code: string; delay?: number }) {
  const [displayedCode, setDisplayedCode] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let index = 0;
      const interval = setInterval(() => {
        if (index <= code.length) {
          setDisplayedCode(code.slice(0, index));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 40);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [code, delay]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <span>
      {displayedCode}
      <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity`}>|</span>
    </span>
  );
}

export default function Custom404() {
  const [errorMessage] = useState(() =>
    errorMessages[Math.floor(Math.random() * errorMessages.length)]
  );
  const [attempts, setAttempts] = useState(0);

  const handleRetry = () => {
    setAttempts((prev) => prev + 1);
  };

  return (
    <>
      <SEO
        title="404 - Page Not Found | ZurichJS Conf"
        description="Oops! This page seems to have thrown an uncaught exception."
        noindex
      />

      <main className="min-h-screen">
        <ShapedSection shape="tighten" variant="dark" dropTop disableContainer>
          <BackgroundMedia
            posterSrc="/images/technopark.png"
            overlayOpacity={0.85}
            fadeOut={true}
          />

          <SectionContainer>
            {/* Logo */}
            <div className="relative z-10 my-20">
              <Link href="/">
                <Logo width={180} height={48} />
              </Link>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              {/* Error Code */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mb-6"
              >
                <span className="text-[120px] sm:text-[180px] font-bold text-brand-primary leading-none select-none">
                  404
                </span>
              </motion.div>

              <Kicker className="text-brand-primary mb-4">
                Uncaught Exception
              </Kicker>

              <Heading level="h1" className="text-white mb-6 max-w-2xl text-3xl sm:text-4xl">
                Page Not Found
              </Heading>

              {/* Code Block */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="w-full max-w-2xl mb-8"
              >
                <div className="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl border border-white/10">
                  {/* Terminal Header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#2d2d2d] border-b border-white/10">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
                    <span className="ml-2 text-white/40 text-xs font-mono">console</span>
                  </div>

                  {/* Terminal Content */}
                  <div className="p-4 font-mono text-sm text-left space-y-2 min-h-[140px]">
                    <div className="text-[#f14c4c]">
                      <TypedCode code={`> ${errorMessage}`} delay={500} />
                    </div>
                    <div className="text-white/50">
                      <TypedCode code="    at Router.navigate (next/router.js:42:15)" delay={2000} />
                    </div>
                    <div className="text-white/50">
                      <TypedCode code="    at ZurichJS.findPage (awesome.js:404:1)" delay={2800} />
                    </div>
                    <div className="text-[#4fc1ff] mt-4">
                      <TypedCode code={`> console.log("Don't worry, we've got you covered!");`} delay={3600} />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Fun Message */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-white/70 text-lg max-w-xl mb-8"
              >
                Looks like this route threw an exception.
                {attempts > 0 && (
                  <span className="text-brand-primary">
                    {' '}({attempts} retry attempt{attempts > 1 ? 's' : ''} - still 404)
                  </span>
                )}
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 items-center"
              >
                <Link
                  href="/"
                  className="px-6 py-3 bg-brand-primary text-black font-semibold rounded-lg hover:bg-[#e8d95e] transition-all hover:scale-105 active:scale-95"
                >
                  return home;
                </Link>
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 border border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  retry();
                </button>
                <Link
                  href="/#tickets"
                  className="px-6 py-3 border border-brand-primary/50 text-brand-primary font-semibold rounded-lg hover:bg-brand-primary/10 transition-all hover:scale-105 active:scale-95"
                >
                  getTickets()
                </Link>
              </motion.div>

              {/* Easter Egg Counter */}
              {attempts >= 3 && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 text-sm text-white/50 font-mono"
                >
                  console.warn(&quot;Einstein said: Insanity is doing the same thing over and over...&quot;);
                </motion.p>
              )}

              {attempts >= 5 && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-2 text-sm text-brand-primary font-mono"
                >
                  Okay, we admire your persistence. Here&apos;s a virtual high-five!
                </motion.p>
              )}

              {/* Helpful Links */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-12 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 max-w-md"
              >
                <h3 className="text-white font-semibold mb-3">Maybe you were looking for:</h3>
                <ul className="space-y-2 text-left">
                  <li>
                    <Link href="/#schedule" className="text-brand-primary hover:text-white transition-colors text-sm flex items-center gap-2">
                      <span className="text-white/50">→</span> Conference Schedule
                    </Link>
                  </li>
                  <li>
                    <Link href="/#tickets" className="text-brand-primary hover:text-white transition-colors text-sm flex items-center gap-2">
                      <span className="text-white/50">→</span> Get Your Tickets
                    </Link>
                  </li>
                  <li>
                    <Link href="/#faq" className="text-brand-primary hover:text-white transition-colors text-sm flex items-center gap-2">
                      <span className="text-white/50">→</span> Frequently Asked Questions
                    </Link>
                  </li>
                  <li>
                    <Link href="/info/code-of-conduct" className="text-brand-primary hover:text-white transition-colors text-sm flex items-center gap-2">
                      <span className="text-white/50">→</span> Code of Conduct
                    </Link>
                  </li>
                </ul>
              </motion.div>
            </div>
          </SectionContainer>
        </ShapedSection>

        <ShapedSection shape="widen" variant="dark" dropBottom>
          <DynamicSiteFooter />
        </ShapedSection>
      </main>
    </>
  );
}
