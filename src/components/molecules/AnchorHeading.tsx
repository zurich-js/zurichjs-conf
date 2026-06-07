import React, { useState } from 'react';
import { Link as LinkIcon, Check } from 'lucide-react';
import { Heading, type HeadingLevel, type HeadingVariant } from '@/components/atoms';

export interface AnchorHeadingProps {
  /**
   * The anchor id this heading links to (`/path#{id}`). The matching scroll
   * target lives on the enclosing section (e.g. a ShapedSection `id`), so the
   * kicker above the heading stays visible on landing.
   */
  id: string;
  children: React.ReactNode;
  level?: HeadingLevel;
  variant?: HeadingVariant;
  className?: string;
  /** Accessible description of the section, used in the copy button label */
  label?: string;
}

/**
 * A section heading paired with a hover-revealed "copy link" button.
 *
 * Renders a {@link Heading} alongside a link button that copies the section's
 * deep link (`/path#{id}`) to the clipboard and updates the URL hash. The
 * actual scroll target is owned by the enclosing section, not the heading, so
 * that any kicker above the heading remains visible when the anchor is opened.
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
      <Heading level={level} variant={variant} className={className}>
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
