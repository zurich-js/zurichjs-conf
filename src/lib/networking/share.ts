import { copyToClipboard } from '@/lib/social-share';
import type { PublicNetworkingProfile } from '@/lib/types/networking';

export type NetworkingShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

interface ShareDependencies {
  nativeShare?: (data: ShareData) => Promise<void>;
  copyText?: (text: string) => Promise<boolean>;
}

const UTM_TAGS = {
  utm_source: 'zurichjs-conf',
  utm_medium: 'networking',
  utm_campaign: 'connections',
} as const;

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  );
}

function browserNativeShare(): ShareDependencies['nativeShare'] {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return undefined;
  }
  return navigator.share.bind(navigator);
}

function readableHref(href: string): string {
  if (/^mailto:/i.test(href)) return href.slice('mailto:'.length);
  if (/^tel:/i.test(href)) return href.slice('tel:'.length);
  return href;
}

export function addNetworkingUtm(href: string, publicId: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return href;

  for (const [key, value] of Object.entries(UTM_TAGS)) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  if (!url.searchParams.has('utm_content')) {
    url.searchParams.set('utm_content', publicId);
  }
  return url.toString();
}

export function formatNetworkingShareText(
  profile: PublicNetworkingProfile,
  pageUrl: string
): string {
  const lines = [profile.name];
  if (profile.headline) lines.push(profile.headline);

  for (const link of profile.links) {
    lines.push(`${link.label}: ${readableHref(addNetworkingUtm(link.href, profile.publicId))}`);
  }

  lines.push(`ZurichJS networking page: ${pageUrl}`);
  return lines.join('\n');
}

export async function shareNetworkingProfile(
  profile: PublicNetworkingProfile,
  pageUrl: string,
  dependencies: ShareDependencies = {}
): Promise<NetworkingShareOutcome> {
  const text = formatNetworkingShareText(profile, pageUrl);
  const nativeShare = dependencies.nativeShare ?? browserNativeShare();

  if (nativeShare) {
    try {
      await nativeShare({
        title: `${profile.name} — contact details`,
        text,
        url: pageUrl,
      });
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) return 'cancelled';
    }
  }

  const copied = await (dependencies.copyText ?? copyToClipboard)(text);
  return copied ? 'copied' : 'failed';
}
