import {Heading, Kicker, LinkText} from "@/components/atoms";
import React from "react";
import {useMotion} from "@/contexts";

interface SectionSplitViewProps {
  kicker: string;
  title: string;
  subtitle: string;
  aboutLink?: {
    label: string;
    href: string;
  };
  variant: 'light' | 'dark';
  children: React.ReactNode;
}

// props: variant
export const SectionSplitView = ({
    kicker,
    title,
    subtitle,
    aboutLink,
    variant,
    children
}: SectionSplitViewProps) => {
  const { shouldAnimate } = useMotion();

  return (
    <div className="flex flex-col xl:flex-row xl:gap-10">
      {/* Left column: Title and description */}
      <div className="flex flex-col gap-2.5 flex-[1_0_0]">
        <Kicker variant={variant}>
          {kicker}
        </Kicker>

        <div className="flex flex-col gap-5">
          <Heading
            level="h2"
            variant="light"
            className="text-xl text-balance leading-tight"
          >
            {title}
          </Heading>

          <p className="text-base text-brand-gray-medium max-w-screen-sm">
            {subtitle}
          </p>

          {aboutLink && (
            <LinkText href={aboutLink.href} animate={shouldAnimate}>
              {aboutLink.label}
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
