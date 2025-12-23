/**
 * Disclosure/Accordion Component
 * Reusable HeadlessUI Disclosure wrapper with consistent styling
 */

import React from 'react';
import {
  Disclosure as HeadlessDisclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import { ChevronDown } from 'lucide-react';

export interface DisclosureProps {
  /** Trigger/header content */
  trigger: React.ReactNode;
  /** Panel content to show when expanded */
  children: React.ReactNode;
  /** Whether the disclosure is open by default */
  defaultOpen?: boolean;
  /** Visual variant */
  variant?: 'default' | 'dark';
  /** Optional badge to show next to the trigger */
  badge?: React.ReactNode;
  /** Additional class name for the container */
  className?: string;
}

export function Disclosure({
  trigger,
  children,
  defaultOpen = false,
  variant = 'default',
  badge,
  className = '',
}: DisclosureProps) {
  const isDark = variant === 'dark';

  return (
    <HeadlessDisclosure defaultOpen={defaultOpen}>
      {({ open }) => (
        <div
          className={`rounded-xl overflow-hidden ${
            isDark ? 'bg-brand-gray-darkest' : 'bg-gray-50 border border-gray-200'
          } ${className}`}
        >
          <DisclosureButton
            className={`w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer transition-colors ${
              isDark
                ? 'hover:bg-brand-gray-medium/30'
                : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`font-medium ${isDark ? 'text-white' : 'text-black'}`}>
                {trigger}
              </span>
              {badge}
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''} ${
                isDark ? 'text-brand-gray-light' : 'text-gray-500'
              }`}
            />
          </DisclosureButton>

          <DisclosurePanel className="px-4 pb-4">
            {children}
          </DisclosurePanel>
        </div>
      )}
    </HeadlessDisclosure>
  );
}

/**
 * Disclosure Group - for managing a set of accordions where only one can be open
 */
export interface DisclosureGroupProps {
  /** Children should be AccordionItem components */
  children: React.ReactNode;
  /** Visual variant passed to all children */
  variant?: 'default' | 'dark';
  /** Additional class name for the container */
  className?: string;
}

export function DisclosureGroup({
  children,
  className = '',
}: DisclosureGroupProps) {
  return <div className={`space-y-3 ${className}`}>{children}</div>;
}

/**
 * Controlled Disclosure - for when you need external state control
 */
export interface ControlledDisclosureProps {
  /** Whether the disclosure is open */
  isOpen: boolean;
  /** Callback when the disclosure toggle is clicked */
  onToggle: () => void;
  /** Trigger/header content */
  trigger: React.ReactNode;
  /** Panel content to show when expanded */
  children: React.ReactNode;
  /** Visual variant */
  variant?: 'default' | 'dark';
  /** Optional badge to show next to the trigger */
  badge?: React.ReactNode;
  /** Additional class name for the container */
  className?: string;
}

export function ControlledDisclosure({
  isOpen,
  onToggle,
  trigger,
  children,
  variant = 'default',
  badge,
  className = '',
}: ControlledDisclosureProps) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`rounded-xl overflow-hidden ${
        isDark ? 'bg-brand-gray-darkest' : 'bg-gray-50 border border-gray-200'
      } ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer transition-colors ${
          isDark
            ? 'hover:bg-brand-gray-medium/30'
            : 'hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`font-medium ${isDark ? 'text-white' : 'text-black'}`}>
            {trigger}
          </span>
          {badge}
        </div>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''} ${
            isDark ? 'text-brand-gray-light' : 'text-gray-500'
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
