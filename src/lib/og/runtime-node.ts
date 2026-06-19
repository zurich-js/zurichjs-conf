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

export async function sendOgImage(res: NextApiResponse, element: React.ReactElement) {
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

  let imageBuffer: Buffer;
  try {
    const response = await render(true);
    imageBuffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error('[OG] Failed to render with custom fonts, retrying without fonts:', error);
    try {
      const response = await render(false);
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } catch (fallbackError) {
      console.error('[OG] Failed to render dynamic image, using static fallback:', fallbackError);
      imageBuffer = await readFile(path.join(process.cwd(), 'public/images/og-default.png'));
    }
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  res.send(imageBuffer);
}
