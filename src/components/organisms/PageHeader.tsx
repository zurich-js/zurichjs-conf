import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/atoms';
import {SectionContainer} from "@/components/organisms/SectionContainer";

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
    <header className="bg-black sticky top-0 z-40">
      <SectionContainer>
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
      </SectionContainer>
    </header>
  );
};
