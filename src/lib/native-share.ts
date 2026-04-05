import { copyToClipboard } from '@/lib/social-share';

export interface NativeShareOptions {
  title: string;
  text?: string;
  url: string;
}

export async function shareNatively({ title, text, url }: NativeShareOptions): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      // Fall through to clipboard/prompt fallback.
    }
  }

  const copied = await copyToClipboard(url);
  if (copied) {
    return true;
  }

  window.prompt('Copy this link:', url);
  return false;
}
