import type { NextApiRequest, NextApiResponse } from 'next';
import { renderCollectionOg } from '@/lib/og/program-images';
import { sendOgImage } from '@/lib/og/runtime-node';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { speakers } = await fetchPublicSpeakers();
    await sendOgImage(res, renderCollectionOg({ kind: 'talks', speakers }));
  } catch (error) {
    console.error('[OG] Failed to render talks image:', error);
    res.status(500).json({ error: 'Failed to render OG image' });
  }
}
