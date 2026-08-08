import React from "react";
import Link from "next/link";
import { ArrowLeft, Mountain } from "lucide-react";
import { Heading } from "@/components/atoms";
import { SEO } from "@/components/SEO";
import { GuideChat } from "@/components/speaker-guide";
import { speakerGuide } from "@/data/speaker-guide";
import { speakerGuideChatContext } from "@/data/speaker-guide-chat";

/**
 * Unlisted full-page chat over the speaker guide (Faru). Linked from the
 * top of /speaker-guide; noindex and disallowed in robots.txt via the
 * /speaker-guide prefix rule.
 */
const SpeakerGuideChatPage: React.FC = () => {
  return (
    <>
      <SEO
        title="Faru — Speaker Guide Chat"
        description="Chat with Faru, the ZurichJS Conf 2026 speaker guide assistant."
        noindex
      />
      <main className="h-screen bg-white flex flex-col">
        <div className="max-w-screen-md w-full mx-auto px-4 flex-1 min-h-0 flex flex-col pt-24 md:pt-28 pb-4 md:pb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Mountain className="w-6 h-6 text-gray-800 flex-shrink-0" aria-hidden="true" />
              <Heading level="h1" variant="light" className="text-xl font-bold">
                Faru
              </Heading>
            </div>
            <Link
              href="/speaker-guide"
              className="flex items-center gap-1.5 text-sm text-gray-600 flex-shrink-0 hover:text-gray-900 underline"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to the guide
            </Link>
          </div>
          <GuideChat
            sections={speakerGuide.sections}
            context={speakerGuideChatContext}
          />
        </div>
      </main>
    </>
  );
};

export default SpeakerGuideChatPage;
