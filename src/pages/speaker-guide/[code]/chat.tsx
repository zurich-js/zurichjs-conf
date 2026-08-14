import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mountain } from 'lucide-react';
import { Heading } from '@/components/atoms';
import { GuideChat } from '@/components/speaker-guide';
import { SEO } from '@/components/SEO';
import { logger } from '@/lib/logger';
import {
  loadPersonalizedSpeakerGuide,
  PersonalizedGuideDataLoadError,
} from '@/lib/speaker-guide/server';

const log = logger.scope('Speaker Guide Chat Page');

type PersonalizedChatPageProps = NonNullable<
  Awaited<ReturnType<typeof loadPersonalizedSpeakerGuide>>
> & { accessCode: string };

export default function PersonalizedGuideChatPage({
  guide,
  chatContext,
  speakerName,
  accessCode,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const guideHref = `/speaker-guide/${accessCode}`;

  return (
    <>
      <SEO
        title={`Faru — ${speakerName}'s Speaker Guide`}
        description={`Personalized ZurichJS speaker guide chat for ${speakerName}.`}
        noindex
      />
      <main className="flex h-dvh flex-col bg-white">
        <div className="mx-auto flex min-h-0 w-full max-w-screen-md flex-1 flex-col px-4 pt-24 pb-4 md:pt-28 md:pb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Mountain className="size-6 shrink-0 text-gray-800" aria-hidden="true" />
              <Heading level="h1" variant="light" className="text-xl font-bold">Faru</Heading>
            </div>
            <Link href={guideHref} className="flex shrink-0 items-center gap-1.5 text-sm text-gray-600 underline hover:text-gray-900">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to your guide
            </Link>
          </div>
          <GuideChat
            sections={guide.sections}
            context={chatContext}
            sourceBaseHref={guideHref}
            speakerName={speakerName}
          />
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PersonalizedChatPageProps> = async ({ params, res }) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const code = typeof params?.code === 'string' ? params.code : '';
  if (!/^[A-Za-z0-9_-]{18}$/.test(code)) return { notFound: true };

  let personalized: Awaited<ReturnType<typeof loadPersonalizedSpeakerGuide>>;
  try {
    personalized = await loadPersonalizedSpeakerGuide(code);
  } catch (error) {
    if (error instanceof PersonalizedGuideDataLoadError) {
      // The fallback redirect hides the outage from speakers, so the log is
      // the only signal that personalization is down.
      log.error('Personalized speaker guide data load failed', error, {
        dataset: error.dataset,
      });
      return {
        redirect: { destination: '/speaker-guide', permanent: false },
      };
    }
    throw error;
  }
  if (!personalized) return { notFound: true };

  return { props: { ...personalized, accessCode: code } };
};
