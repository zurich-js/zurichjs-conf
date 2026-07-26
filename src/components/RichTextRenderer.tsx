import React from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Heading } from "@/components/atoms";
import type { ContentSection } from "@/data/info-pages";

export interface RichTextRendererProps {
  sections: ContentSection[];
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
 * Renders content sections dynamically based on their type
 * Supports headings, paragraphs, lists, and nested subsections
 */
export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  sections,
}) => {
  const renderSection = (
    section: ContentSection,
    index: number
  ): React.ReactNode => {
    switch (section.type) {
      case "heading":
        const headingId = section.content
          ? slugify(section.content)
          : undefined;
        return (
          <div key={index} id={headingId} className="scroll-mt-24">
            <Heading
              level={section.level || "h2"}
              variant="light"
              className="mb-3"
            >
              {section.content}
            </Heading>
          </div>
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
            className="text-gray-700 leading-relaxed scroll-mt-24 [&_a]:text-blue-primary [&_a]:underline [&_a:hover]:text-blue-dark"
            dangerouslySetInnerHTML={{ __html: section.content || "" }}
          />
        );

      case "list":
        return (
          <ul
            key={index}
            className="list-disc list-inside space-y-2 text-gray-700 ml-4 [&_a]:text-blue-primary [&_a]:underline [&_a:hover]:text-blue-dark"
          >
            {section.items?.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>
        );

      case "subsection":
        return (
          <div key={index} className="space-y-4 text-gray-700">
            {section.subsections?.map((subsection, i) =>
              renderSection(subsection, i)
            )}
          </div>
        );

      case "tldr":
        return (
          <div
            key={index}
            className="rounded-xl border border-brand-yellow-main/60 bg-brand-yellow-main/10 px-4 py-3"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-1">
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
          <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.links?.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:border-gray-400 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow-main"
              >
                <MapPin
                  className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">
                    {link.label}
                  </span>
                  {link.sublabel && (
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {link.sublabel}
                    </span>
                  )}
                </span>
                <ArrowUpRight
                  className="w-4 h-4 text-gray-400 flex-shrink-0 transition-colors group-hover:text-gray-700"
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
        );

      case "node":
        return (
          <div key={index} className="text-gray-700 leading-relaxed">
            {section.node}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="rich-text-renderer space-y-6">
      {sections.map((section, index) => (
        <section key={index}>{renderSection(section, index)}</section>
      ))}
    </div>
  );
};
