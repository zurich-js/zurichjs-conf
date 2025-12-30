/**
 * Shared Admin Header Component
 * Provides consistent navigation across all admin dashboards
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BarChart3, FileText, Plane, Users, LogOut, Menu, X, Handshake, type LucideIcon } from 'lucide-react';

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

export default function AdminHeader({ title, subtitle, onLogout }: AdminHeaderProps) {
  const router = useRouter();
  const currentPath = router.pathname;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks: NavLink[] = [
    { href: '/admin', label: 'Dashboard', icon: BarChart3 },
    { href: '/admin/cfp', label: 'CFP', icon: FileText },
    { href: '/admin/cfp-travel', label: 'Travel', icon: Plane },
    { href: '/admin/speakers', label: 'Speakers', icon: Users },
    { href: '/admin/partnerships', label: 'Partners', icon: Handshake },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#F1E271] flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-black">{title}</h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Mobile burger menu button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271] transition-all"
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-3">
            {navLinks.map((link) => {
              const isActive = currentPath === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'border-[#F1E271] bg-[#F1E271] text-black'
                      : 'border-gray-300 text-black bg-white hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271]`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <button
              onClick={onLogout}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271] transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile navigation menu */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => {
                const isActive = currentPath === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#F1E271] text-black'
                        : 'text-black bg-gray-50 hover:bg-gray-100'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271]`}
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
                className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-black bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271] transition-all cursor-pointer"
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
