import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import type { SpeakerFeedbackShare } from '@/lib/types/session-feedback';

export interface ShareLinkButtonProps {
  share: SpeakerFeedbackShare;
  /** Speaker name, used in the toast and the screen-reader label */
  speakerName: string;
  /** `icon` for a table cell, `button` for the detail modal header */
  variant?: 'icon' | 'button';
}

const COPIED_RESET_MS = 2000;

/**
 * Copies a speaker's unlisted feedback URL to the clipboard.
 *
 * Deliberately a copy action rather than a visible anchor: the link is a
 * credential, so it should travel through a deliberate paste into a message to
 * that speaker, not sit in the admin DOM as something to middle-click or leak
 * through a referrer.
 */
export function ShareLinkButton({ share, speakerName, variant = 'icon' }: ShareLinkButtonProps): React.JSX.Element {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // The speaker table's row is clickable too, so keep a copy from also toggling it
  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    event.stopPropagation();
    try {
      // window.location.origin keeps preview deployments pointing at themselves
      await navigator.clipboard.writeText(`${window.location.origin}${share.path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
      toast.success('Share link copied', `Private feedback link for ${speakerName} is ready to send.`);
    } catch {
      toast.error('Copy failed', 'Could not access the clipboard.');
    }
  };

  const Icon = copied ? Check : Link2;

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black cursor-pointer"
      >
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        {copied ? 'Copied' : 'Copy share link'}
        <span className="sr-only"> for {speakerName}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy private feedback link"
      className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black cursor-pointer"
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span className="sr-only">Copy private feedback link for {speakerName}</span>
    </button>
  );
}
