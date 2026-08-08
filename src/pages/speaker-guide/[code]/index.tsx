import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { SpeakerGuideView } from '@/components/speaker-guide';
import { loadPersonalizedSpeakerGuide } from '@/lib/speaker-guide/server';

type PersonalizedGuidePageProps = NonNullable<
  Awaited<ReturnType<typeof loadPersonalizedSpeakerGuide>>
>;

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
  PersonalizedGuidePageProps & { accessCode: string }
> = async ({ params, res }) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const code = typeof params?.code === 'string' ? params.code : '';
  if (!/^[A-Za-z0-9_-]{18}$/.test(code)) return { notFound: true };

  const personalized = await loadPersonalizedSpeakerGuide(code);
  if (!personalized) return { notFound: true };

  return {
    props: {
      ...personalized,
      accessCode: code,
    },
  };
};
