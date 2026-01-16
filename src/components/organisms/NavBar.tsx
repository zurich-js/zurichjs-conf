import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo, Button, SocialIcon } from "@/components/atoms";

export interface NavBarProps {
  onGetTicketsClick?: () => void;
  scrollThreshold?: number;
}

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Call for Papers", href: "/cfp" },
  { label: "Become a Sponsor", href: "/sponsorship" },
];

const socialLinks = [
  {
    kind: "instagram" as const,
    href: "https://instagram.com/zurichjs",
    showOnDesktop: false,
  },
  { kind: "x" as const, href: "https://x.com/ZurichJS", showOnDesktop: false },
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
  onGetTicketsClick,
  scrollThreshold = 100,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > scrollThreshold);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollThreshold]);

  const handleGetTickets = () => {
    if (onGetTicketsClick) {
      onGetTicketsClick();
    } else {
      const ticketsSection = document.getElementById("tickets");
      if (ticketsSection) {
        ticketsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <nav
      className={`fixed top-4 left-0 right-0 z-50 transition-all duration-300 ${
        isVisible || mobileMenuOpen
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-4 pointer-events-none"
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

          <button
            className="lg:hidden text-white p-2 hover:text-brand-yellow-main transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[100] flex flex-col bg-black"
          style={{
            minHeight: "100dvh",
            marginTop: "-16px",
            paddingTop: "16px",
          }}
        >
          <div className="flex items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="cursor-pointer shrink-0"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Logo width={120} height={32} />
            </Link>
            <button
              className="text-white p-2 hover:text-brand-yellow-main transition-colors"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col flex-1 justify-center items-start gap-6 px-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white text-2xl font-medium hover:text-brand-yellow-main transition-colors duration-200"
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
            className="flex items-center justify-start gap-4 px-6 py-6"
            style={{ backgroundColor: "#000000" }}
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
      )}
    </nav>
  );
};
