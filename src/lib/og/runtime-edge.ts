import { ImageResponse } from 'next/og';
import { OG_WIDTH, OG_HEIGHT } from './program-images';

const FALLBACK_PATH = '/images/og-default.png';
const CACHE_HEADER = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

const figtreeFontPromises = new Map<number, Promise<ArrayBuffer>>();

function loadFigtreeFont(weight: 400 | 700 | 800): Promise<ArrayBuffer> {
  if (!figtreeFontPromises.has(weight)) {
    figtreeFontPromises.set(
      weight,
      fetch(new URL(`../../../public/fonts/figtree-${weight}.ttf`, import.meta.url)).then((res) => {
        if (!res.ok) throw new Error(`Failed to load Figtree-${weight}: ${res.status}`);
        return res.arrayBuffer();
      }),
    );
  }
  return figtreeFontPromises.get(weight)!;
}

export async function renderOgResponse(
  element: React.ReactElement,
  opts: { fallbackUrl?: string } = {},
): Promise<Response> {
  const fallbackUrl = opts.fallbackUrl ?? FALLBACK_PATH;

  const render = async (withFonts: boolean) =>
    new ImageResponse(element, {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: withFonts
        ? [
            { name: 'Figtree', data: await loadFigtreeFont(400), style: 'normal', weight: 400 },
            { name: 'Figtree', data: await loadFigtreeFont(700), style: 'normal', weight: 700 },
            { name: 'Figtree', data: await loadFigtreeFont(800), style: 'normal', weight: 800 },
          ]
        : [],
    });

  const renderToBuffer = async (withFonts: boolean) => {
    const response = await render(withFonts);
    return response.arrayBuffer();
  };

  try {
    const buffer = await renderToBuffer(true);
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': CACHE_HEADER,
      },
    });
  } catch (error) {
    console.error('[OG-Edge] render with fonts failed, retrying without fonts:', error);
    try {
      const buffer = await renderToBuffer(false);
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': CACHE_HEADER,
        },
      });
    } catch (fallbackError) {
      console.error('[OG-Edge] dynamic render failed, redirecting to static fallback:', fallbackError);
      const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';
      return Response.redirect(`${base}${fallbackUrl}`, 302);
    }
  }
}
