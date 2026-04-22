import type { NextApiResponse } from 'next';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { publicProgramTabs } from '@/data';
import type { PublicSession, PublicSpeaker } from '@/lib/types/cfp';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  yellow: '#F1E271',
  blue: '#268BCC',
  grayLightest: '#EDEDEF',
  grayLight: '#A9AAB1',
  grayDark: '#242528',
  grayDarkest: '#19191B',
};

type SpeakerSummary = {
  name: string;
  role: string | null;
  avatarUrl: string | null;
  slug?: string;
};

type SessionDetailOgInput = {
  session: PublicSession;
  speaker: SpeakerSummary;
  kind: 'talk' | 'workshop';
};

type SpeakerDetailOgInput = {
  speaker: PublicSpeaker;
};

type CollectionOgInput = {
  kind: 'talks' | 'workshops' | 'speakers';
  speakers: PublicSpeaker[];
};

type ScheduleOgInput = {
  counts?: {
    community: number;
    workshops: number;
    talks: number;
    weekend: number;
  };
};

const baseTextStyle = {
  fontFamily: 'Figtree, sans-serif',
  letterSpacing: '0px',
};

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

function getAbsoluteImageUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  if (url.startsWith('http')) {
    return url;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';
  return `${baseUrl}${url}`;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}…`;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'JS';
}

function getSpeakerName(speaker: PublicSpeaker) {
  return [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
}

function getSpeakerRole(speaker: PublicSpeaker) {
  return [speaker.job_title, speaker.company].filter(Boolean).join(' @ ') || null;
}

function Header({ scheduleLabel = 'Sep 11, 2026' }: { scheduleLabel?: string }) {
  return (
    <div
      style={{
        ...baseTextStyle,
        position: 'absolute',
        top: 0,
        left: 0,
        width: OG_WIDTH,
        height: 120,
        background: COLORS.black,
        color: COLORS.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 60px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: COLORS.yellow,
            color: COLORS.black,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          JS
        </div>
        <div style={{ ...baseTextStyle, fontSize: 30, fontWeight: 700 }}>Zurich JS Conf</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div style={{ ...baseTextStyle, fontSize: 30, fontWeight: 700 }}>{scheduleLabel}</div>
        <div style={{ ...baseTextStyle, fontSize: 24, color: COLORS.grayLight }}>Technopark, Zurich</div>
      </div>
    </div>
  );
}

function Avatar({
  src,
  name,
  size = 116,
  border = false,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  border?: boolean;
}) {
  const imageUrl = getAbsoluteImageUrl(src);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        overflow: 'hidden',
        background: COLORS.grayLightest,
        border: border ? `2px solid ${COLORS.black}` : '0 solid transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: 'cover' }}
        />
      ) : (
        <div style={{ color: COLORS.black, fontSize: Math.round(size * 0.32), fontWeight: 700 }}>
          {initialsFromName(name)}
        </div>
      )}
    </div>
  );
}

function AvatarStrip({ speakers, dark = false }: { speakers: SpeakerSummary[]; dark?: boolean }) {
  const visibleSpeakers = speakers.slice(0, 6);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {visibleSpeakers.map((speaker, index) => (
        <div key={`${speaker.name}-${index}`} style={{ marginLeft: index === 0 ? 0 : -18, display: 'flex' }}>
          <Avatar src={speaker.avatarUrl} name={speaker.name} size={92} border={!dark} />
        </div>
      ))}
    </div>
  );
}

function OgShell({
  children,
  background = COLORS.white,
  scheduleLabel,
}: {
  children: React.ReactNode;
  background?: string;
  scheduleLabel?: string;
}) {
  return (
    <div
      style={{
        ...baseTextStyle,
        width: OG_WIDTH,
        height: OG_HEIGHT,
        background,
        color: COLORS.black,
        position: 'relative',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {children}
      <Header scheduleLabel={scheduleLabel} />
    </div>
  );
}

export function renderSpeakerDetailOg({ speaker }: SpeakerDetailOgInput) {
  const name = getSpeakerName(speaker);

  return (
    <OgShell background={COLORS.yellow}>
      <div
        style={{
          position: 'absolute',
          top: 120,
          right: 0,
          bottom: 0,
          left: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 60px',
          gap: 48,
        }}
      >
        <Avatar src={speaker.profile_image_url} name={name} size={156} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ ...baseTextStyle, fontSize: 44, lineHeight: 1.08, fontWeight: 800 }}>{name}</div>
          {speaker.job_title ? (
            <div style={{ ...baseTextStyle, marginTop: 20, fontSize: 32, lineHeight: 1.1, fontWeight: 800 }}>{speaker.job_title}</div>
          ) : null}
          {speaker.company ? (
            <div style={{ ...baseTextStyle, marginTop: 6, fontSize: 28, lineHeight: 1.1 }}>{`@${speaker.company}`}</div>
          ) : null}
        </div>
      </div>
    </OgShell>
  );
}

export function renderSessionDetailOg({ session, speaker, kind }: SessionDetailOgInput) {
  const isWorkshop = kind === 'workshop';
  const cardLabel = isWorkshop ? 'Workshop' : session.type === 'lightning' ? 'Lightning talk' : 'Standard talk';

  return (
    <OgShell scheduleLabel={isWorkshop ? 'Sep 10, 2026' : undefined}>
      <div
        style={{
          position: 'absolute',
          top: 120,
          right: 0,
          bottom: 0,
          left: 0,
          padding: '78px 60px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            width: '100%',
            minHeight: 230,
            borderRadius: 72,
            border: isWorkshop ? `0 solid ${COLORS.grayLight}` : `1.5px solid ${COLORS.grayLight}`,
            background: isWorkshop ? COLORS.grayLightest : COLORS.white,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '34px 80px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, lineHeight: 1.1 }}>{cardLabel}</div>
          <div style={{ marginTop: 16, fontSize: 58, lineHeight: 1.08, fontWeight: 800 }}>
            {truncateText(session.title, 68)}
          </div>
        </div>

        <div style={{ marginTop: 60, display: 'flex', alignItems: 'center', gap: 56 }}>
          <Avatar src={speaker.avatarUrl} name={speaker.name} size={132} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 40, lineHeight: 1.1, fontWeight: 800 }}>{speaker.name}</div>
            {speaker.role ? (
              <div style={{ marginTop: 16, fontSize: 32, lineHeight: 1.15, fontWeight: 700 }}>
                {speaker.role}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </OgShell>
  );
}

function speakerSummariesForCollection(kind: CollectionOgInput['kind'], speakers: PublicSpeaker[]): SpeakerSummary[] {
  return speakers
    .filter((speaker) => {
      if (kind === 'speakers') {
        return true;
      }

      return speaker.sessions.some((session) =>
        kind === 'workshops' ? session.type === 'workshop' : session.type !== 'workshop'
      );
    })
    .map((speaker) => ({
      name: getSpeakerName(speaker),
      role: getSpeakerRole(speaker),
      avatarUrl: speaker.profile_image_url,
      slug: speaker.slug,
    }));
}

export function renderCollectionOg({ kind, speakers }: CollectionOgInput) {
  const isWorkshop = kind === 'workshops';
  const dark = isWorkshop;
  const visibleSpeakers = speakerSummariesForCollection(kind, speakers);

  const title = isWorkshop
    ? 'Zurich Engineering Day'
    : kind === 'speakers'
      ? 'ZurichJS Conf 2026\nSpeakers'
      : 'ZurichJS Conf 2026\nTalks';
  const subtitle = isWorkshop
    ? 'Packed full of knowledge.'
    : kind === 'speakers'
      ? 'Industry leaders coming to Zurich.'
      : 'Picked by the community\nfor the community.';

  return (
    <OgShell background={dark ? COLORS.black : COLORS.white} scheduleLabel={isWorkshop ? 'Sep 10, 2026' : undefined}>
      <div
        style={{
          position: 'absolute',
          top: 120,
          right: 0,
          bottom: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: dark ? COLORS.white : COLORS.black,
          textAlign: 'center',
          paddingBottom: isWorkshop ? 4 : 10,
        }}
      >
        <div style={{ whiteSpace: 'pre-wrap', fontSize: 60, lineHeight: 1.16, fontWeight: 800 }}>{title}</div>
        <div style={{ marginTop: 36, whiteSpace: 'pre-wrap', fontSize: 38, lineHeight: 1.15, fontWeight: 800 }}>
          {subtitle}
        </div>
        <div style={{ marginTop: 62, display: 'flex' }}>
          <AvatarStrip speakers={visibleSpeakers} dark={dark} />
        </div>
        {isWorkshop ? (
          <div style={{ marginTop: 58, color: COLORS.grayLightest, fontSize: 30 }}>Organized by ZurichJS</div>
        ) : null}
      </div>
    </OgShell>
  );
}

export function renderScheduleOg({ counts }: ScheduleOgInput = {}) {
  const tabCounts = {
    community: counts?.community ?? 0,
    workshops: counts?.workshops ?? 0,
    talks: counts?.talks ?? 0,
    weekend: counts?.weekend ?? 0,
  };

  const labels = publicProgramTabs.map((tab) => {
    if (tab.id === 'community') {
      return { ...tab, count: tabCounts.community, accent: COLORS.yellow };
    }
    if (tab.id === 'warmup') {
      return { ...tab, count: tabCounts.workshops, accent: COLORS.blue };
    }
    if (tab.id === 'conference') {
      return { ...tab, count: tabCounts.talks, accent: COLORS.yellow };
    }
    return { ...tab, count: tabCounts.weekend, accent: COLORS.grayLight };
  });

  return (
    <OgShell background={COLORS.black} scheduleLabel="Sep 9-12, 2026">
      <div
        style={{
          position: 'absolute',
          top: 120,
          right: 0,
          bottom: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '70px 70px 0',
          color: COLORS.white,
        }}
      >
        <div style={{ fontSize: 64, lineHeight: 1.08, fontWeight: 700 }}>ZurichJS Conf days</div>

        <div style={{ marginTop: 62, display: 'flex', gap: 18, width: '100%' }}>
          {labels.map((tab) => (
            <div
              key={tab.id}
              style={{
                flex: 1,
                minHeight: 170,
                borderRadius: 28,
                background: COLORS.grayDarkest,
                border: `1px solid ${COLORS.grayDark}`,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ width: 58, height: 7, borderRadius: 999, background: tab.accent, display: 'flex' }} />
              <div style={{ marginTop: 24, fontSize: 26, lineHeight: 1.1, fontWeight: 800 }}>{tab.label}</div>
              <div style={{ marginTop: 10, color: COLORS.grayLight, fontSize: 20, lineHeight: 1.2 }}>{tab.date}</div>
            </div>
          ))}
        </div>
      </div>
    </OgShell>
  );
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
