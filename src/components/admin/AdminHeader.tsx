/**
 * Shared Admin Header Component
 * Provides consistent navigation across all admin dashboards
 */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BarChart3, FileText, Plane, Users, LogOut, Menu, X, Handshake, Building2, ShieldCheck, ChevronDown, type LucideIcon } from 'lucide-react';
import {Button} from '@/components/atoms';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onLogout: () => void;
}

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  links: NavLink[];
}

type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return 'links' in item;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  {
    label: 'Speakers',
    icon: Users,
    links: [
      { href: '/admin/cfp', label: 'CFP', icon: FileText },
      { href: '/admin/cfp-travel', label: 'Travel', icon: Plane },
      { href: '/admin/speakers', label: 'Speakers', icon: Users },
    ],
  },
  {
    label: 'Business',
    icon: Building2,
    links: [
      { href: '/admin/partnerships', label: 'Partners', icon: Handshake },
      { href: '/admin/sponsorships', label: 'Sponsors', icon: Building2 },
      { href: '/admin/b2b', label: 'B2B', icon: Building2 },
    ],
  },
  { href: '/admin/verifications', label: 'Verifications', icon: ShieldCheck },
];

// All links flattened — used for mobile menu
const ALL_LINKS: NavLink[] = NAV_ITEMS.flatMap((item) =>
  isGroup(item) ? item.links : [item],
);

// ---------------------------------------------------------------------------
// Desktop Dropdown
// ---------------------------------------------------------------------------

function NavDropdown({ group, currentPath }: { group: NavGroup; currentPath: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isActive = group.links.some((l) => currentPath === l.href);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-4 py-2 border rounded-lg text-sm font-medium transition-all cursor-pointer ${
          isActive
            ? 'border-brand-primary bg-brand-primary text-black'
            : 'border-gray-300 text-black bg-white hover:bg-gray-50'
        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary`}
      >
        {group.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
          {group.links.map((link) => {
            const Icon = link.icon;
            const linkActive = currentPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  linkActive
                    ? 'bg-brand-primary/10 text-black font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 text-gray-500" />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export default function AdminHeader({ title, subtitle, onLogout }: AdminHeaderProps) {
  const router = useRouter();
  const currentPath = router.pathname;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-primary flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-black">{title}</h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all"
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-3">
            {NAV_ITEMS.map((item) => {
              if (isGroup(item)) {
                return <NavDropdown key={item.label} group={item} currentPath={currentPath} />;
              }
              const isActive = currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'border-brand-primary bg-brand-primary text-black'
                      : 'border-gray-300 text-black bg-white hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Button variant="ghost" forceDark size="xs" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </Button>
          </div>
        </div>

        {/* Mobile navigation menu — flat list of all links */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col space-y-2">
              {ALL_LINKS.map((link) => {
                const isActive = currentPath === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-primary text-black'
                        : 'text-black bg-gray-50 hover:bg-gray-100'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  closeMobileMenu();
                  onLogout();
                }}
                className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-black bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all cursor-pointer"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
