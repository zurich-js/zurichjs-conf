import type { NextRequest } from 'next/server';
import { getVisibleSpeakerBySlugForOg } from '@/lib/cfp/speakers';
import { renderSpeakerDetailOg } from '@/lib/og/program-images';
import { renderOgResponse } from '@/lib/og/runtime-edge';

export const config = { runtime: 'edge' };

export default async function handler(req: NextRequest): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const slug = segments[segments.length - 1] ?? '';

  if (!slug) {
    return new Response('Missing slug', { status: 400 });
  }

  try {
    const speaker = await getVisibleSpeakerBySlugForOg(slug);
    if (!speaker) {
      return new Response('Speaker not found', { status: 404 });
    }

    return renderOgResponse(renderSpeakerDetailOg({ speaker }));
  } catch (error) {
    console.error('[OG-Edge] Failed to render speaker detail image:', error);
    return new Response('Failed to render OG image', { status: 500 });
  }
}
