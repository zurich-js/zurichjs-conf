import { removeNetworkingUtm } from '@/lib/networking/links';
import { copyToClipboard } from '@/lib/social-share';
import type { PublicNetworkingProfile } from '@/lib/types/networking';

export type NetworkingShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

interface ShareDependencies {
  nativeShare?: (data: ShareData) => Promise<void>;
  copyText?: (text: string) => Promise<boolean>;
}

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

export function formatNetworkingShareText(
  profile: PublicNetworkingProfile,
  pageUrl: string
): string {
  const lines = [profile.name];
  if (profile.headline) lines.push(profile.headline);

  for (const link of profile.links) {
    lines.push(`${link.label}: ${readableHref(removeNetworkingUtm(link.href))}`);
  }

  lines.push(`ZurichJS networking page: ${removeNetworkingUtm(pageUrl)}`);
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
        url: removeNetworkingUtm(pageUrl),
      });
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) return 'cancelled';
    }
  }

  const copied = await (dependencies.copyText ?? copyToClipboard)(text);
  return copied ? 'copied' : 'failed';
}
