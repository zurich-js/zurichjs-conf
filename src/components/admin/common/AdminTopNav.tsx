import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BarChart3, FileText, Plane, Users, LogOut, Menu, X, Handshake, Building2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/atoms';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  activePaths: Array<{ path: string; exact?: boolean }>;
}

const navLinks: NavLink[] = [
  { href: '/admin/dashboard/tickets', label: 'Dashboard', icon: BarChart3, activePaths: [{ path: '/admin', exact: true }, { path: '/admin/dashboard' }] },
  { href: '/admin/cfp/submissions', label: 'CFP', icon: FileText, activePaths: [{ path: '/admin/cfp' }] },
  { href: '/admin/travel/overview', label: 'Travel', icon: Plane, activePaths: [{ path: '/admin/travel' }, { path: '/admin/cfp-travel' }] },
  { href: '/admin/program/sessions', label: 'Program', icon: Users, activePaths: [{ path: '/admin/program' }, { path: '/admin/speakers' }] },
  { href: '/admin/partnerships', label: 'Partners', icon: Handshake, activePaths: [{ path: '/admin/partnerships' }] },
  { href: '/admin/sponsorships', label: 'Sponsors', icon: Building2, activePaths: [{ path: '/admin/sponsorships' }] },
];

function isActivePath(currentPath: string, link: NavLink) {
  return link.activePaths.some(({ path, exact }) => currentPath === path || (!exact && currentPath.startsWith(`${path}/`)));
}

export function AdminTopNav() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout: onLogout } = useAdminAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-brand-gray-lightest bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary shadow-sm">
            <BarChart3 className="h-5 w-5 text-black" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-base font-bold text-black">ZurichJS Admin</span>
            <span className="text-xs text-brand-gray-medium">Operations</span>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen((value) => !value)}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white p-2 text-black transition-colors hover:bg-gray-50 md:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => {
            const active = isActivePath(router.pathname, link);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-brand-primary text-black' : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                )}
              >
                {link.label}
              </Link>
            );
          })}

          <Button variant="ghost" forceDark size="xs" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </Button>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <nav className="border-t border-brand-gray-lightest bg-white md:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
            {navLinks.map((link) => {
              const active = isActivePath(router.pathname, link);
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    active ? 'bg-brand-primary text-black' : 'bg-gray-50 text-black hover:bg-text-brand-gray-lightest'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLogout();
              }}
              className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-text-brand-gray-lightest"
            >
              <LogOut className="h-5 w-5" />
              <span>Log out</span>
            </button>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
