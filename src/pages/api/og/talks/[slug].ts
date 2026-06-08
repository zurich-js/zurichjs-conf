import type { NextApiRequest, NextApiResponse } from 'next';
import { renderSessionDetailOg } from '@/lib/og/program-images';
import { sendOgImage } from '@/lib/og/runtime-node';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug : '';

  try {
    const { speakers } = await fetchPublicSpeakers();
    const speaker = speakers.find((entry) =>
      entry.sessions.some((session) => session.type !== 'workshop' && session.slug === slug)
    );
    const session = speaker?.sessions.find((entry) => entry.type !== 'workshop' && entry.slug === slug);

    if (!speaker || !session) {
      res.status(404).json({ error: 'Talk not found' });
      return;
    }

    await sendOgImage(res, renderSessionDetailOg({
      session,
      kind: 'talk',
      speaker: {
        name: [speaker.first_name, speaker.last_name].filter(Boolean).join(' '),
        role: [speaker.job_title, speaker.company].filter(Boolean).join(' @ ') || null,
        avatarUrl: speaker.profile_image_url,
        slug: speaker.slug,
      },
    }));
  } catch (error) {
    console.error('[OG] Failed to render talk detail image:', error);
    res.status(500).json({ error: 'Failed to render OG image' });
  }
}
