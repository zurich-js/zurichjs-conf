import {Heading, Kicker, LinkText} from "@/components/atoms";
import React from "react";
import {useMotion} from "@/contexts";

export interface SectionSplitViewProps {
  kicker: string;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  link?: {
    label: string;
    href: string;
    external?: boolean;
  };
  variant: 'light' | 'dark';
  className?: string;
  children: React.ReactNode;
}

// props: variant
export const SectionSplitView = ({
    kicker,
    title,
    subtitle,
    link,
    variant,
    className = '',
    children
}: SectionSplitViewProps) => {
  const { shouldAnimate } = useMotion();

  return (
    <div className={`flex flex-col xl:flex-row xl:gap-10 ${className}`.trim()}>
      {/* Left column: Title and description */}
      <div className="flex flex-col gap-2.5 flex-[1_0_0]">
        <Kicker variant={variant}>
          {kicker}
        </Kicker>

        <div className="flex flex-col gap-5">
          <Heading
            level="h2"
            variant={variant}
            className="text-xl text-balance leading-tight"
          >
            {title}
          </Heading>

          {subtitle && (
            <p className="text-base text-brand-gray-medium max-w-screen-sm">
              {subtitle}
            </p>
          )}

          {link && (
            <LinkText href={link.href} external={link.external} animate={shouldAnimate}>
              {link.label}
            </LinkText>
          )}
        </div>
      </div>

      <div className="flex-[2_0_0] w-full min-w-0">
        {children}
      </div>
    </div>
  )
}
