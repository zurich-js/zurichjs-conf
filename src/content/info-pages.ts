export interface ContentSection {
  type: 'heading' | 'paragraph' | 'list' | 'subsection';
  content?: string;
  level?: 'h1' | 'h2' | 'h3';
  items?: string[];
  subsections?: ContentSection[];
}

export interface InfoPage {
  slug: string;
  title: string;
  description: string;
  kicker: string;
  lastUpdated: string;
  sections: ContentSection[];
}

export const infoPages: Record<string, InfoPage> = {
  'terms-of-service': {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    description: 'Terms and conditions for attending ZurichJS Conference 2026',
    kicker: 'Legal',
    lastUpdated: 'November 25, 2025',
    sections: [
      {
        type: 'paragraph',
        content: 'Welcome to ZurichJS Conference 2026. By purchasing a ticket or attending our conference, you agree to these terms of service.',
      },
      {
        type: 'heading',
        level: 'h2',
        content: '1. Ticket Purchase and Registration',
      },
      {
        type: 'subsection',
        subsections: [
          {
            type: 'paragraph',
            content: '<strong>1.1 Ticket Validity:</strong> All tickets are valid only for ZurichJS Conference 2026 on the dates specified during purchase. Tickets are non-transferable between ticket types (Standard, Student/Unemployed, VIP).',
          },
          {
            type: 'paragraph',
            content: '<strong>1.2 Registration:</strong> Upon purchasing a ticket, you must provide accurate and complete information. You are responsible for maintaining the confidentiality of your ticket and registration details.',
          },
          {
            type: 'paragraph',
            content: '<strong>1.3 Student/Unemployed Verification:</strong> Student and Unemployed tickets require verification. Failure to provide valid documentation may result in ticket cancellation without refund or requirement to upgrade to a Standard ticket.',
          },
        ],
      },
      {
        type: 'heading',
        level: 'h2',
        content: '2. Refund and Cancellation Policy',
      },
      {
        type: 'subsection',
        subsections: [
          {
            type: 'paragraph',
            content: '<strong>2.1 No Refunds:</strong> All ticket sales are final. Please refer to our <a href="/refund-policy" class="text-blue-600 hover:underline">Refund Policy</a> for detailed information about exceptional circumstances.',
          },
          {
            type: 'paragraph',
            content: '<strong>2.2 Event Cancellation:</strong> If the conference is cancelled by the organizers, full refunds will be provided. If postponed, ticket holders may transfer their ticket to the new date or request a refund.',
          },
        ],
      },
      {
        type: 'heading',
        level: 'h2',
        content: '3. Code of Conduct',
      },
      {
        type: 'subsection',
        subsections: [
          {
            type: 'paragraph',
            content: '<strong>3.1 Expected Behavior:</strong> All attendees must adhere to our <a href="/info/code-of-conduct" class="text-blue-600 hover:underline">Code of Conduct</a>. We are committed to providing a harassment-free conference experience for everyone.',
          },
          {
            type: 'paragraph',
            content: '<strong>3.2 Consequences:</strong> Violation of the Code of Conduct may result in removal from the conference without refund and prohibition from future ZurichJS events.',
          },
        ],
      },
      {
        type: 'heading',
        level: 'h2',
        content: '4. Intellectual Property',
      },
      {
        type: 'subsection',
        subsections: [
          {
            type: 'paragraph',
            content: '<strong>4.1 Content Rights:</strong> All conference materials, presentations, and content remain the property of their respective creators and ZurichJS. Recording, photography, or reproduction requires explicit permission.',
          },
          {
            type: 'paragraph',
            content: '<strong>4.2 Photography and Video:</strong> The conference may be photographed and recorded. By attending, you consent to being photographed or recorded and grant ZurichJS rights to use such media for promotional purposes.',
          },
        ],
      },
      {
        type: 'heading',
        level: 'h2',
        content: '5. Privacy and Data Protection',
      },
      {
        type: 'subsection',
        subsections: [
          {
            type: 'paragraph',
            content: '<strong>5.1 Data Collection:</strong> We collect and process personal data in accordance with our <a href="/info/privacy-policy" class="text-blue-600 hover:underline">Privacy Policy</a> and applicable data protection laws.',
          },
          {
            type: 'paragraph',
            content: '<strong>5.2 Marketing:</strong> By registering, you may receive communications about the conference and future ZurichJS events. You can opt out at any time.',
          },
        ],
      },
      {
        type: 'heading',
        level: 'h2',
        content: '6. Liability and Disclaimer',
      },
      {
        type: 'subsection',
        subsections: [
          {
            type: 'paragraph',
            content: '<strong>6.1 Limitation of Liability:</strong> ZurichJS and its organizers are not liable for any injury, loss, or damage that occurs during the conference, except where such exclusion is prohibited by law.',
          },
          {
            type: 'paragraph',
            content: '<strong>6.2 Personal Property:</strong> Attendees are responsible for their personal belongings. ZurichJS is not responsible for lost, stolen, or damaged items.',
          },
          {
            type: 'paragraph',
            content: '<strong>6.3 Health and Safety:</strong> Attendees participate in conference activities at their own risk and are responsible for their own health and safety.',
          },
        ],
      },
      {
        type: 'heading',
        level: 'h2',
        content: '7. Changes to the Conference',
      },
      {
        type: 'subsection',
        subsections: [
          {
            type: 'paragraph',
            content: '<strong>7.1 Program Changes:</strong> We reserve the right to modify the conference program, schedule, speakers, and venue without prior notice. Such changes do not entitle attendees to a refund.',
          },
          {
            type: 'paragraph',
            content: '<strong>7.2 Force Majeure:</strong> We are not liable for failure to perform our obligations due to circumstances beyond our control, including natural disasters, pandemics, or government restrictions.',
          },
        ],
      },
      {
        type: 'heading',
        level: 'h2',
        content: '8. General Terms',
      },
      {
        type: 'subsection',
        subsections: [
          {
            type: 'paragraph',
            content: '<strong>8.1 Governing Law:</strong> These terms are governed by Swiss law. Any disputes shall be subject to the exclusive jurisdiction of the courts of Zurich, Switzerland.',
          },
          {
            type: 'paragraph',
            content: '<strong>8.2 Modifications:</strong> We reserve the right to modify these terms at any time. Changes will be posted on our website and communicated to ticket holders via email.',
          },
          {
            type: 'paragraph',
            content: '<strong>8.3 Severability:</strong> If any provision of these terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.',
          },
        ],
      },
      {
        type: 'heading',
        level: 'h2',
        content: 'Questions About These Terms?',
      },
      {
        type: 'paragraph',
        content: 'If you have any questions about these Terms of Service, please contact us at <a href="mailto:hello@zurichjs.com" class="text-blue-600 hover:underline font-semibold">hello@zurichjs.com</a>',
      },
    ],
  },
  'privacy-policy': {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    description: 'How we collect, use, and protect your data',
    kicker: 'Legal',
    lastUpdated: 'November 25, 2025',
    sections: [
      {
        type: 'paragraph',
        content: 'At ZurichJS Conference 2026, we are committed to protecting your privacy and personal data. This policy explains how we collect, use, and safeguard your information.',
      },
      // Add more content sections as needed
    ],
  },
  'code-of-conduct': {
    slug: 'code-of-conduct',
    title: 'Code of Conduct',
    description: 'Our commitment to a safe and inclusive conference',
    kicker: 'Community',
    lastUpdated: 'November 25, 2025',
    sections: [
      {
        type: 'paragraph',
        content: 'ZurichJS Conference is dedicated to providing a harassment-free conference experience for everyone, regardless of gender, gender identity and expression, age, sexual orientation, disability, physical appearance, body size, race, ethnicity, religion, or technology choices.',
      },
      // Add more content sections as needed
    ],
  },
};

/**
 * Get all page slugs for static generation
 */
export function getAllPageSlugs(): string[] {
  return Object.keys(infoPages);
}

/**
 * Get page data by slug
 */
export function getPageBySlug(slug: string): InfoPage | undefined {
  return infoPages[slug];
}
