import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { SpeakerGuideView } from '@/components/speaker-guide';
import { logger } from '@/lib/logger';
import {
  loadPersonalizedSpeakerGuide,
  PersonalizedGuideDataLoadError,
} from '@/lib/speaker-guide/server';

const log = logger.scope('Speaker Guide Page');

type PersonalizedGuide = NonNullable<
  Awaited<ReturnType<typeof loadPersonalizedSpeakerGuide>>
>['guide'];

interface PersonalizedGuidePageProps {
  guide: PersonalizedGuide;
  accessCode: string;
}

export default function PersonalizedGuidePage({
  guide,
  accessCode,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <SpeakerGuideView
      guide={guide}
      chatHref={`/speaker-guide/${accessCode}/chat`}
    />
  );
}

export const getServerSideProps: GetServerSideProps<
  PersonalizedGuidePageProps
> = async ({ params, res }) => {
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

  return {
    props: {
      guide: personalized.guide,
      accessCode: code,
    },
  };
};
