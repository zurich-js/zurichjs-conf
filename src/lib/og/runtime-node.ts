import type { NextApiResponse } from 'next';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { OG_WIDTH, OG_HEIGHT } from './program-images';

const figtreeFontPromises = new Map<number, Promise<ArrayBuffer>>();

async function getFigtreeFont(weight: 400 | 700 | 800) {
  if (!figtreeFontPromises.has(weight)) {
    figtreeFontPromises.set(
      weight,
      readFile(path.join(process.cwd(), `public/fonts/figtree-${weight}.ttf`)).then((buffer) =>
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      )
    );
  }

  return figtreeFontPromises.get(weight)!;
}

/**
 * Render an OG element to a PNG buffer, with the custom font set and graceful
 * degradation: retry without fonts, then fall back to the static default image.
 * Shared by the HTTP handler (`sendOgImage`) and the build-time generation
 * script (`scripts/generate-speaker-og.ts`).
 */
export async function renderOgToBuffer(element: React.ReactElement): Promise<Buffer> {
  const render = async (withFonts: boolean) => new ImageResponse(element, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: withFonts ? [
      {
        name: 'Figtree',
        data: await getFigtreeFont(400),
        style: 'normal',
        weight: 400,
      },
      {
        name: 'Figtree',
        data: await getFigtreeFont(700),
        style: 'normal',
        weight: 700,
      },
      {
        name: 'Figtree',
        data: await getFigtreeFont(800),
        style: 'normal',
        weight: 800,
      },
    ] : [],
  });

  try {
    const response = await render(true);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error('[OG] Failed to render with custom fonts, retrying without fonts:', error);
    try {
      const response = await render(false);
      return Buffer.from(await response.arrayBuffer());
    } catch (fallbackError) {
      console.error('[OG] Failed to render dynamic image, using static fallback:', fallbackError);
      return readFile(path.join(process.cwd(), 'public/images/og-default.png'));
    }
  }
}

export async function sendOgImage(res: NextApiResponse, element: React.ReactElement) {
  const imageBuffer = await renderOgToBuffer(element);

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  res.send(imageBuffer);
}
