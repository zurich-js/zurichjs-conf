import React from 'react';
import { Heading } from '@/components/atoms';
import type { ContentSection } from '@/data/info-pages';

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
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Extract subsection label from paragraph content (e.g., "1.1 Ticket Validity:")
 * Returns null if not a labeled subsection
 */
const extractSubsectionLabel = (content: string): string | null => {
  const match = content.match(/<strong[^>]*>(\d+\.\d+\s+[^:]+):/);
  return match ? match[1] : null;
};

/**
 * Extract all navigation items from content sections
 * Finds all labeled subsections (e.g., "1.1 Something", "2.1 Another")
 */
export const extractNavigationItems = (sections: ContentSection[]): NavigationItem[] => {
  const items: NavigationItem[] = [];

  const processSection = (section: ContentSection) => {
    if (section.type === 'paragraph' && section.content) {
      const label = extractSubsectionLabel(section.content);
      if (label) {
        items.push({
          id: slugify(label),
          label: label,
        });
      }
    } else if (section.type === 'subsection' && section.subsections) {
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
export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ sections }) => {
  const renderSection = (section: ContentSection, index: number): React.ReactNode => {
    switch (section.type) {
      case 'heading':
        return (
          <Heading
            key={index}
            level={section.level || 'h2'}
            variant="dark"
            className="mb-6"
          >
            {section.content}
          </Heading>
        );

      case 'paragraph':
        // Check if this paragraph is a labeled subsection
        const subsectionLabel = section.content ? extractSubsectionLabel(section.content) : null;
        const paragraphId = subsectionLabel ? slugify(subsectionLabel) : undefined;

        return (
          <p
            key={index}
            id={paragraphId}
            className="text-gray-700 leading-relaxed scroll-mt-24"
            dangerouslySetInnerHTML={{ __html: section.content || '' }}
          />
        );

      case 'list':
        return (
          <ul key={index} className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            {section.items?.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>
        );

      case 'subsection':
        return (
          <div key={index} className="space-y-4 text-gray-700">
            {section.subsections?.map((subsection, i) => renderSection(subsection, i))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-12">
      {sections.map((section, index) => (
        <section key={index}>
          {renderSection(section, index)}
        </section>
      ))}
    </div>
  );
};
