import React from 'react';
import Link from 'next/link';
import { LockIcon } from 'lucide-react';

export interface LinkGroupItemProps {
  label: string;
  href: string;
  external?: boolean;
  locked?: boolean;
}

/**
 * LinkGroupItem atom component
 * Renders a single navigation link with support for external links and locked state
 *
 * @example
 * <LinkGroupItem label="Home" href="/" />
 * <LinkGroupItem label="GitHub" href="https://github.com" external />
 * <LinkGroupItem label="Coming Soon" href="#" locked />
 */
export const LinkGroupItem: React.FC<LinkGroupItemProps> = ({
  label,
  href,
  external = false,
  locked = false,
}) => {
  const linkContent = (
    <span className="inline-flex items-center gap-1.5">
      <span className="break-keep block w-max">{label}</span>
      {locked && <LockIcon size={18} aria-hidden="true" />}
    </span>
  );

  const linkClassName = locked
    ? 'text-brand-gray-medium cursor-not-allowed inline-flex items-center gap-1.5'
    : 'text-brand-white hover:text-brand-yellow-main transition-colors duration-200 inline-flex items-center gap-1.5 underline decoration-dotted decoration-1 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[rgba(241,226,113,0.5)] rounded-sm';

  const ariaLabel = locked ? `${label} (Coming soon)` : label;

  // Locked state - render as span
  if (locked) {
    return (
      <span
        className={linkClassName}
        aria-label={ariaLabel}
        aria-disabled="true"
      >
        {linkContent}
      </span>
    );
  }

  // External link - render as anchor
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        aria-label={ariaLabel}
      >
        {linkContent}
      </a>
    );
  }

  // Internal link - render as Next.js Link
  return (
    <Link href={href} className={linkClassName} aria-label={ariaLabel}>
      {linkContent}
    </Link>
  );
};

