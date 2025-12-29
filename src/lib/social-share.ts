/**
 * Social Share Utilities
 * Generate share URLs for various social platforms
 */

export interface ShareContent {
  text: string;
  url?: string;
  hashtags?: string[];
}

const CFP_URL = 'https://conf.zurichjs.com/cfp';

/**
 * Default share text for CFP submission success
 */
export const DEFAULT_SHARE_TEXT = `I just applied to speak at ZurichJS Conf 2026!

Switzerland's JavaScript conference is happening September 11th in Zurich - and the CFP is open!

Think you have something to share? Apply here: ${CFP_URL}

#ZurichJS #JavaScript #JSConf`;

/**
 * Generate LinkedIn share URL
 * LinkedIn only supports sharing a URL, text must be added manually by user
 */
export function generateLinkedInShareUrl(url: string = CFP_URL): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

/**
 * Generate X/Twitter share URL with pre-filled text
 */
export function generateTwitterShareUrl(content: ShareContent): string {
  const params = new URLSearchParams();

  // Twitter has a 280 char limit, so we use a shorter version
  const twitterText = `I just applied to speak at ZurichJS Conf 2026!

Switzerland's JavaScript conference is happening September 11th in Zurich - CFP is open!

Apply here:`;

  params.set('text', twitterText);
  params.set('url', content.url || CFP_URL);

  if (content.hashtags?.length) {
    params.set('hashtags', content.hashtags.join(','));
  } else {
    params.set('hashtags', 'ZurichJS,JavaScript');
  }

  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Generate Bluesky share URL with pre-filled text
 */
export function generateBlueskyShareUrl(content: ShareContent): string {
  const blueskyText = content.text || `I just applied to speak at ZurichJS Conf 2026!

Switzerland's JavaScript conference is happening September 11th in Zurich - and the CFP is open!

Think you have something to share? Apply here: ${CFP_URL}`;

  return `https://bsky.app/intent/compose?text=${encodeURIComponent(blueskyText)}`;
}

/**
 * Generate Mastodon share URL
 * Since Mastodon is federated, we use a web+mastodon intent or provide copy option
 */
export function generateMastodonShareUrl(content: ShareContent): string {
  const mastodonText = content.text || DEFAULT_SHARE_TEXT;
  // Use the share intent that prompts user to select their instance
  return `https://mastodonshare.com/?text=${encodeURIComponent(mastodonText)}`;
}

/**
 * Copy text to clipboard
 * Returns true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    } catch {
      return false;
    }
  }
}

/**
 * Open share URL in a new window/tab
 */
export function openShareWindow(url: string, windowName: string = 'share'): void {
  const width = 600;
  const height = 400;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  window.open(
    url,
    windowName,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}
