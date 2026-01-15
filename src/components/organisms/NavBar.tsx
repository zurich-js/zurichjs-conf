import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Logo, Button, SocialIcon } from '@/components/atoms';

export interface NavBarProps {
  onGetTicketsClick?: () => void;
  scrollThreshold?: number;
}

const navLinks = [
  { label: 'About us', href: '/about' },
  { label: 'Call for Proposals', href: '/cfp' },
  { label: 'Become a Sponsor', href: '/sponsors' },
];

const socialLinks = [
  { kind: 'instagram' as const, href: 'https://instagram.com/zurichjs', showOnMobile: true },
  { kind: 'x' as const, href: 'https://x.com/ZurichJS', showOnMobile: false },
  { kind: 'bluesky' as const, href: 'https://bsky.app/profile/zurichjs.com', showOnMobile: false },
  { kind: 'linkedin' as const, href: 'https://linkedin.com/company/zurichjs', showOnMobile: false },
];

export const NavBar: React.FC<NavBarProps> = ({ onGetTicketsClick, scrollThreshold = 100 }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > scrollThreshold);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollThreshold]);

  const handleGetTickets = () => {
    if (onGetTicketsClick) {
      onGetTicketsClick();
    } else {
      const ticketsSection = document.getElementById('tickets');
      if (ticketsSection) {
        ticketsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <nav
      className={`fixed top-4 left-0 right-0 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="container mx-auto px-4 xs:px-6 sm:px-8 md:px-10 lg:px-12">
        <div className="bg-black rounded-full px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="cursor-pointer shrink-0">
            <Logo width={120} height={32} />
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white text-sm font-medium hover:text-brand-yellow-main transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-0">
              {socialLinks.map((social) => (
                <SocialIcon
                  key={social.kind}
                  kind={social.kind}
                  href={social.href}
                />
              ))}
            </div>
            <div className="w-px h-6 bg-gray-600" />
            <Button
              variant="primary"
              size="sm"
              onClick={handleGetTickets}
            >
              Get Tickets
            </Button>
          </div>

          <button
            className="lg:hidden text-white p-2 hover:text-brand-yellow-main transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="container mx-auto px-4 xs:px-6 sm:px-8 md:px-10 lg:px-12 mt-2">
          <div className="lg:hidden bg-black rounded-3xl p-6">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white text-lg font-medium hover:text-brand-yellow-main transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-800">
                {socialLinks
                  .filter((social) => social.showOnMobile)
                  .map((social) => (
                    <SocialIcon
                      key={social.kind}
                      kind={social.kind}
                      href={social.href}
                    />
                  ))}
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  handleGetTickets();
                  setMobileMenuOpen(false);
                }}
                className="mt-2"
              >
                Get Tickets
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
