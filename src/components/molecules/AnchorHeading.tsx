import React, { useState } from 'react';
import { Link as LinkIcon, Check } from 'lucide-react';
import { Heading, type HeadingLevel, type HeadingVariant } from '@/components/atoms';

export interface AnchorHeadingProps {
  /** The anchor id — links resolve as `/path#{id}` */
  id: string;
  children: React.ReactNode;
  level?: HeadingLevel;
  variant?: HeadingVariant;
  className?: string;
  /** Accessible description of the section, used in the copy button label */
  label?: string;
}

/**
 * A heading that doubles as a linkable anchor target.
 *
 * Renders a {@link Heading} carrying the given `id` (the scroll target, offset
 * below the fixed nav via `scroll-mt`) alongside a hover-revealed link button.
 * Clicking the button copies the section's deep link to the clipboard and
 * updates the URL hash so the link can be shared.
 */
export const AnchorHeading: React.FC<AnchorHeadingProps> = ({
  id,
  children,
  level = 'h2',
  variant = 'dark',
  className = '',
  label,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Update the hash so the URL reflects the section (and scrolls to it).
    window.history.replaceState(null, '', `#${id}`);

    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          // Clipboard can fail (permissions, insecure context) — the hash
          // update above still lets the user copy from the address bar.
        });
    }
  };

  // Icon tones tuned to the heading variant (dark = light text on dark bg).
  const iconColor =
    variant === 'dark'
      ? 'text-brand-gray-light hover:text-brand-yellow-main'
      : 'text-brand-gray-dark hover:text-brand-yellow-main';

  return (
    <div className="group flex items-center gap-2">
      <Heading id={id} level={level} variant={variant} className={`scroll-mt-28 ${className}`}>
        {children}
      </Heading>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy link to ${label ?? 'this section'}`}
        className={`shrink-0 rounded-md p-1 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow-main ${iconColor}`}
      >
        {copied ? (
          <Check size={18} className="text-brand-yellow-main" aria-hidden="true" />
        ) : (
          <LinkIcon size={18} aria-hidden="true" />
        )}
        <span className="sr-only" role="status">
          {copied ? 'Link copied' : ''}
        </span>
      </button>
    </div>
  );
};
