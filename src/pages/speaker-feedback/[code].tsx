/**
 * Unlisted per-speaker feedback page.
 *
 * Reached only through the link an organiser copies from /admin/feedback. The
 * route parameter is `<name-slug>-<code>`; the code is the credential and is
 * verified against every speaker on the schedule in constant time. Anything
 * that does not resolve is a plain 404 — the page never confirms that a code
 * "almost" matched, and never lists speakers.
 *
 * Kept out of search results several ways over, because the page carries a
 * named speaker's ratings: `noindex` in the markup (via SEO), an
 * `X-Robots-Tag` response header (set both here and in next.config.ts, so the
 * page stays protected if either is edited), and a robots.txt disallow.
 */

import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { SpeakerFeedbackShareView } from '@/components/speaker-feedback';
import { logger } from '@/lib/logger';
import { parseSpeakerFeedbackShareParam } from '@/lib/feedback/share';
import { loadSpeakerFeedbackShare, SpeakerFeedbackShareLoadError } from '@/lib/feedback/share-server';
import type { SpeakerFeedbackShareData } from '@/lib/types/session-feedback';

const log = logger.scope('Speaker Feedback Share Page');

interface SpeakerFeedbackSharePageProps {
  data: SpeakerFeedbackShareData;
}

export default function SpeakerFeedbackSharePage({
  data,
}: InferGetServerSidePropsType<typeof getServerSideProps>): React.JSX.Element {
  return <SpeakerFeedbackShareView data={data} />;
}

export const getServerSideProps: GetServerSideProps<SpeakerFeedbackSharePageProps> = async ({ params, res }) => {
  // Named speakers' ratings and free-text comments — no shared cache may keep a copy
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  res.setHeader('Referrer-Policy', 'no-referrer');

  const param = typeof params?.code === 'string' ? params.code : '';
  const code = parseSpeakerFeedbackShareParam(param);
  if (!code) return { notFound: true };

  let data: SpeakerFeedbackShareData | null;
  try {
    data = await loadSpeakerFeedbackShare(code);
  } catch (error) {
    if (error instanceof SpeakerFeedbackShareLoadError) {
      log.error('Speaker feedback share data load failed', error, { dataset: error.dataset });
    } else {
      log.error('Unexpected error resolving speaker feedback share link', error);
    }
    throw error;
  }

  if (!data) return { notFound: true };

  return { props: { data } };
};
