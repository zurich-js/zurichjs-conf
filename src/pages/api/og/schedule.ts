import type { NextApiRequest, NextApiResponse } from 'next';
import { renderScheduleOg } from '@/lib/og/program-images';
import { sendOgImage } from '@/lib/og/runtime-node';
import { buildPublicProgramScheduleItems, getPublicScheduleRows } from '@/lib/program/schedule';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { speakers } = await fetchPublicSpeakers();
    const rows = await getPublicScheduleRows();
    const items = buildPublicProgramScheduleItems(rows, speakers);

    await sendOgImage(res, renderScheduleOg({
      counts: {
        community: items.filter((item) => item.date === '2026-09-09').length,
        workshops: items.filter((item) => item.date === '2026-09-10').length,
        talks: items.filter((item) => item.date === '2026-09-11').length,
        weekend: items.filter((item) => item.date === '2026-09-12').length,
      },
    }));
  } catch (error) {
    console.error('[OG] Failed to render schedule image:', error);
    res.status(500).json({ error: 'Failed to render OG image' });
  }
}
