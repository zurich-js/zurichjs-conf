import type { NextApiRequest, NextApiResponse } from 'next';
import {
  LONG_OG_CACHE_CONTROL,
  prefetchImageDataUri,
  renderSpeakerDetailOg,
  sendOgImage,
} from '@/lib/og/program-images';
import { getSpeakerOgSummaryBySlug } from '@/lib/cfp/speakers';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug : '';

  try {
    const speaker = await getSpeakerOgSummaryBySlug(slug);

    if (!speaker) {
      res.status(404).json({ error: 'Speaker not found' });
      return;
    }

    const avatarSrc = await prefetchImageDataUri(speaker.profile_image_url);

    await sendOgImage(res, renderSpeakerDetailOg({ speaker, avatarSrc }), LONG_OG_CACHE_CONTROL);
  } catch (error) {
    console.error('[OG] Failed to render speaker detail image:', error);
    res.status(500).json({ error: 'Failed to render OG image' });
  }
}
