import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Menu, ShoppingCart, X } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { Logo, Button, SocialIcon } from "@/components/atoms";
import { useCart } from "@/contexts/CartContext";

export interface NavBarProps {
  scrollThreshold?: number;
  onGetTicketsClick?: () => void;
}

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Speakers", href: "/speakers" },
  { label: "Workshops", href: "/workshops" },
  { label: "Volunteer", href: "/volunteer" },
  { label: "Sponsor us", href: "/sponsorship" },
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
    href: "https://bsky.app/profile/zurichjs.com",
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
  const { cart } = useCart();
  const cartCount = cart.totalItems;
  const hasCart = cartCount > 0;

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
            {hasCart && (
              <Link
                href="/cart"
                prefetch
                aria-label={`Cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
                className="relative inline-flex items-center justify-center size-10 rounded-full text-white hover:text-brand-yellow-main transition-colors cursor-pointer"
              >
                <ShoppingCart size={24} />
                <span className="absolute top-0 right-0 w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold leading-none rounded-full bg-brand-yellow-main text-black">
                  {cartCount}
                </span>
              </Link>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleGetTickets}
              className="h-8 px-4 text-sm font-semibold hover:bg-brand-dark"
            >
              Tickets
            </Button>
          </div>

          <div className="lg:hidden flex items-center gap-1">
            {hasCart && (
              <Link
                href="/cart"
                prefetch
                aria-label={`Cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
                className="relative inline-flex items-center justify-center h-11 w-11 rounded-full text-white hover:text-brand-yellow-main transition-colors cursor-pointer select-none"
              >
                <ShoppingCart size={22} />
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-bold leading-none rounded-full bg-brand-yellow-main text-black">
                  {cartCount}
                </span>
              </Link>
            )}
            <button
              className="inline-flex items-center justify-center h-11 w-11 text-white hover:text-brand-yellow-main transition-colors"
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
            {hasCart && (
              <Link
                href="/cart"
                prefetch
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-lg leading-none bg-transparent text-white font-medium hover:bg-white hover:text-brand-black transition-all"
              >
                <ShoppingCart size={18} />
                View cart ({cartCount})
              </Link>
            )}
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
