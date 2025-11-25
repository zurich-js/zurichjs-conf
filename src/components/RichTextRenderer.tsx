import React from 'react';
import { Heading } from '@/components/atoms';
import type { ContentSection } from '@/data/info-pages';

export interface RichTextRendererProps {
  sections: ContentSection[];
}

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
        return (
          <p
            key={index}
            className="text-gray-700 leading-relaxed"
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
