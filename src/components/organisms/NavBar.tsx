import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Menu, X } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { Logo, Button, SocialIcon } from "@/components/atoms";

export interface NavBarProps {
  scrollThreshold?: number;
  onGetTicketsClick?: () => void;
}

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Call for Papers", href: "/cfp" },
  { label: "Become a Sponsor", href: "/sponsorship" },
];

const socialLinks = [
  {
    kind: "instagram" as const,
    href: "https://instagram.com/zurich.js",
    showOnDesktop: false,
  },
  { kind: "x" as const, href: "https://x.com/zurichjs", showOnDesktop: false },
  {
    kind: "bluesky" as const,
    href: "https://bsky.app/profile/zurichjs.bsky.social",
    showOnDesktop: true,
  },
  {
    kind: "linkedin" as const,
    href: "https://linkedin.com/company/zurichjs",
    showOnDesktop: true,
  },
];

export const NavBar: React.FC<NavBarProps> = ({
  scrollThreshold = 100,
}) => {
  const router = useRouter();
  const isHomePage = router.pathname === "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Hide NavBar on admin and CFP sub-routes (but not /cfp itself)
  const shouldHideNavBar = router.pathname.startsWith('/admin') || router.pathname.startsWith('/cfp/');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > scrollThreshold);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollThreshold]);

  const handleGetTickets = () => {
    router.push('/#tickets');
  };

  if (shouldHideNavBar) {
    return null;
  }

  // if root: no background, always visible, but logo scrollable
  // else: black background, always visible
  const logoOpacity = isHomePage && !isScrolled ? "opacity-0" : "opacity-100";

  return (
    <nav
      className={
        `fixed top-0 py-0 sm:py-4 left-0 right-0 z-50 transition-all duration-300 print:hidden ${
            isHomePage ? 'lg:bg-transparent' : ''
        }`
      }
    >
      <div className="px-0 sm:mx-auto sm:px-8 md:px-10 lg:px-12">
        <div className={
            `px-4 sm:pl-6 py-3 flex items-center justify-between ${
                isHomePage && !isScrolled ? "bg-transparent" : "bg-black sm:rounded-full"
            }`
        }>
          <Link href="/" className={`cursor-pointer shrink-0 flex items-center transition-opacity duration-300 ${logoOpacity}`}>
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
              {socialLinks
                .filter((social) => social.showOnDesktop)
                .map((social) => (
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
              className="h-8 px-4 text-sm font-semibold hover:bg-brand-dark"
            >
              Tickets
            </Button>
          </div>

          <div className="lg:hidden flex items-center gap-3">
            <button
              className="text-white p-2 hover:text-brand-yellow-main transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <Dialog
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        className="relative z-100 lg:hidden"
      >
        <div className="fixed inset-0 flex flex-col bg-black h-screen">
          <div className="flex items-center justify-between p-4 pl-6">
              <Link
                href="/"
                className="cursor-pointer shrink-0"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Logo width={120} height={32} />
              </Link>
            <button
              className="text-white marg p-2 hover:text-brand-yellow-main transition-colors"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col flex-1 justify-center items-start gap-6 p-4 pl-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white text-xl xs:text-2xl font-medium hover:text-brand-yellow-main transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                handleGetTickets();
                setMobileMenuOpen(false);
              }}
              className="mt-4"
            >
              Tickets
            </Button>
          </div>
          <div
            className="flex items-center justify-start gap-4 p-4 pl-6"
          >
            {socialLinks.map((social) => (
              <SocialIcon
                key={social.kind}
                kind={social.kind}
                href={social.href}
              />
            ))}
          </div>
        </div>
      </Dialog>
    </nav>
  );
};
