import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/atoms';

export interface PageHeaderProps {
  /**
   * Optional right side content (e.g., cart summary, user info)
   */
  rightContent?: React.ReactNode;
}

/**
 * PageHeader organism component
 * Reusable header for internal pages (cart, checkout, etc.)
 * Matches the homepage design aesthetic with the ZurichJS logo
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ rightContent }) => {
  return (
    <header className="bg-black border-b border-gray-800 sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="cursor-pointer">
            <Logo width={140} height={38} />
          </Link>

          {/* Right Content */}
          {rightContent && (
            <div className="flex items-center gap-4">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
