import React from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Heading } from "@/components/atoms";
import { InfoBox, Infotip } from "@/components/molecules";
import type { ContentSection, QuickLink } from "@/data/info-pages";

export interface RichTextRendererProps {
  sections: ContentSection[];
  /** Called when a quicklink card is clicked (e.g. for analytics). */
  onQuickLinkClick?: (link: QuickLink) => void;
}

export interface NavigationItem {
  id: string;
  label: string;
}

/**
 * Generate a URL-friendly ID from text
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

const extractSubsectionLabel = (content: string): string | null => {
  const match = content.match(/<strong[^>]*>(\d+\.\d+\s+[^:]+):/);
  return match ? match[1] : null;
};

export const extractNavigationItems = (
  sections: ContentSection[]
): NavigationItem[] => {
  const items: NavigationItem[] = [];

  const processSection = (section: ContentSection) => {
    // Add H2 headings to navigation
    if (
      section.type === "heading" &&
      section.level === "h2" &&
      section.content
    ) {
      items.push({
        id: slugify(section.content),
        label: section.content,
      });
    }

    // Add labeled subsections (e.g., "2.1 General:")
    if (section.type === "paragraph" && section.content) {
      const label = extractSubsectionLabel(section.content);
      if (label) {
        items.push({
          id: slugify(label),
          label: label,
        });
      }
    } else if (section.type === "subsection" && section.subsections) {
      section.subsections.forEach(processSection);
    }
  };

  sections.forEach(processSection);
  return items;
};

/**
 * RichTextRenderer component
 * Renders content blocks dynamically based on their type
 * Supports headings, paragraphs, lists, and nested subsections
 */
export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  sections,
  onQuickLinkClick,
}) => {
  const renderContentBlock = (
    section: ContentSection,
    index: number
  ): React.ReactNode => {
    switch (section.type) {
      case "heading":
        const headingId = section.content
          ? slugify(section.content)
          : undefined;
        return (
          <Heading
            key={index}
            id={headingId}
            level={section.level || "h2"}
            variant="light"
            className={`${section.level === "h3" ? "mt-[3.5ex] mb-[1ex]" : "mt-[5ex] mb-[1.5ex]"} scroll-mt-24 first:mt-0`}
          >
            {section.content}
          </Heading>
        );

      case "paragraph":
        // Check if this paragraph is a labeled subsection
        const subsectionLabel = section.content
          ? extractSubsectionLabel(section.content)
          : null;
        const paragraphId = subsectionLabel
          ? slugify(subsectionLabel)
          : undefined;

        return (
          <p
            key={index}
            id={paragraphId}
            className="mb-[2ex] text-gray-700 leading-relaxed scroll-mt-24 [&_a]:text-blue-primary [&_a]:underline [&_a:hover]:text-blue-dark"
            dangerouslySetInnerHTML={{ __html: section.content || "" }}
          />
        );

      case "list":
        return (
          <ul
            key={index}
            className="mb-[2.5ex] ml-[2ex] list-inside list-disc space-y-[0.75ex] text-gray-700 [&_a]:text-blue-primary [&_a]:underline [&_a:hover]:text-blue-dark"
          >
            {section.items?.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>
        );

      case "subsection":
        return (
          <div key={index} className="text-gray-700">
            {section.subsections?.map((subsection, i) =>
              renderContentBlock(subsection, i)
            )}
          </div>
        );

      case "tldr":
        return (
          <div
            key={index}
            className="my-[2.5ex] rounded-xl border border-brand-yellow-main/60 bg-brand-yellow-main/10 px-4 py-3"
          >
            <p className="mb-[0.75ex] text-xs font-bold uppercase tracking-wider text-gray-900">
              TL;DR
            </p>
            <p
              className="text-sm text-gray-800 leading-relaxed [&_a]:text-blue-primary [&_a]:underline [&_a:hover]:text-blue-dark"
              dangerouslySetInnerHTML={{ __html: section.content || "" }}
            />
          </div>
        );

      case "quicklinks":
        return (
          <div
            key={index}
            className="my-[2.5ex] grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {section.links?.map((link) => {
              const content = (
                <>
                  <MapPin
                    className="mt-[0.25ex] h-5 w-5 flex-shrink-0 text-gray-500"
                    aria-hidden="true"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900">
                      {link.label}
                    </span>
                    {link.travelTime && (
                      <small className="ml-[0.75ex] whitespace-nowrap text-xs font-normal text-gray-500">
                        ({link.travelTime})
                      </small>
                    )}
                    {link.sublabel && (
                      <span className="mt-[0.5ex] block text-xs text-gray-500">
                        {link.sublabel}
                      </span>
                    )}
                  </span>
                </>
              );

              if (!link.href) {
                return (
                  <div
                    key={`${link.label}-static`}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 p-4"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <a
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onQuickLinkClick?.(link)}
                  className="group flex items-start gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:border-gray-400 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow-main"
                >
                  {content}
                  <ArrowUpRight
                    className="w-4 h-4 text-gray-400 flex-shrink-0 transition-colors group-hover:text-gray-700"
                    aria-hidden="true"
                  />
                </a>
              );
            })}
          </div>
        );

      case "infotip":
        return (
          <p
            key={index}
            className="mb-[2ex] text-gray-700 leading-relaxed [&_a]:text-blue-primary [&_a]:underline [&_a:hover]:text-blue-dark"
          >
            <span
              dangerouslySetInnerHTML={{ __html: section.before || "" }}
            />
            <Infotip
              label={section.title || "More information"}
              copyText={section.copyText}
              mapHref={section.mapHref}
            >
              <span
                dangerouslySetInnerHTML={{ __html: section.content || "" }}
              />
            </Infotip>
            <span dangerouslySetInnerHTML={{ __html: section.after || "" }} />
          </p>
        );

      case "infobox":
        return (
          <InfoBox
            key={index}
            title={section.title || "More information"}
            className="my-[2.5ex]"
          >
            <span
              dangerouslySetInnerHTML={{ __html: section.content || "" }}
            />
          </InfoBox>
        );

      case "node":
        return (
          <div
            key={index}
            className="mb-[2ex] text-gray-700 leading-relaxed"
          >
            {section.node}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="rich-text-renderer">
      {sections.map((section, index) =>
        renderContentBlock(section, index)
      )}
    </div>
  );
};
