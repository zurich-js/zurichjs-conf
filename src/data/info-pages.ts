export interface ContentSection {
  type: "heading" | "paragraph" | "list" | "subsection";
  content?: string;
  level?: "h1" | "h2" | "h3";
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
  "terms-of-service": {
    slug: "terms-of-service",
    title: "Terms of Service",
    description: "Terms and conditions for attending ZurichJS Conference 2026",
    kicker: "Legal",
    lastUpdated: "November 25, 2025",
    sections: [
      {
        type: "paragraph",
        content:
          "Welcome to ZurichJS Conference 2026 organised by ZurichJS, which is part of the Swiss JavaScript Group, a non-profit association registered in Switzerland. By purchasing a ticket and participating in the Conference, you agree to comply with and be bound by these Terms and Conditions.",
      },
      {
        type: "heading",
        level: "h2",
        content: "1. Organizer Information",
      },
      {
        type: "paragraph",
        content:
          "The Conference is organised by: Zurich JS — Swiss JavaScript Group, Email: hello@zurichjs.com,Alderstrasse 30, 8008 Zürich",
      },
      {
        type: "heading",
        level: "h2",
        content: "2. Ticket Purchase",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "<strong>2.1 General:</strong> Tickets for the Conference can be purchased online via the ticketing system provided on the official website.",
          },
          {
            type: "paragraph",
            content: "All ticket sales are final:",
          },
          {
            type: "list",
            items: [
              "Tickets cannot be cancelled",
              "Tickets are non-refundable",
              "Transfers are allowed (see Section 2.4)",
            ],
          },
          {
            type: "paragraph",
            content:
              "<strong>2.2 Payment:</strong> Payments are processed securely using Stripe. By purchasing a ticket, you agree to Stripe’s Terms of Service and Privacy Policy.The organisers do not store your payment details.",
          },
          {
            type: "paragraph",
            content:
              "<strong>2.3 Confirmation:</strong> After successful payment, you will receive a confirmation email with your ticket.You are responsible for ensuring that your email address and contact details are accurate during registration.",
          },
          {
            type: "paragraph",
            content:
              "<strong>2.4 Ticket Transfers:</strong> If you can no longer attend, you may request to transfer your ticket to another person. Please contact us at <a href='mailto:hello@zurichjs.com', class=' hover:underline font-semibold'> hello@zurichjs.com </a> , and we will do our best to find a solution.Transfers are subject to organizer approval and may require verification.",
          },
          {
            type: "paragraph",
            content:
              "<strong>2.5 Group / Team Tickets:</strong> If you can no longer attend, you may request to transfer your ticket to another person. Please contact us at <a href='mailto:hello@zurichjs.com', class=' hover:underline font-semibold'> hello@zurichjs.com </a> , and we will do our best to find a solution.Transfers are subject to organizer approval and may require verification.",
          },
        ],
      },
      {
        type: "heading",
        level: "h2",
        content: "3. Cancellations and Refunds ",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "<strong>3.1. Organizer Cancellation:</strong> If the Conference is cancelled by the organizers, all registered ticket holders will receive a full refund of the ticket fee.The organizers are not responsible for any additional costs (travel, accommodation, etc.) incurred by attendees.",
          },
          {
            type: "paragraph",
            content:
              "<strong>3.2 Attendee Cancellation:</strong> Tickets are <strong>non-refundable </strong> and cannot be cancelled. Only ticket transfers (Section 2.4) are available.",
          },
        ],
      },
      {
        type: "heading",
        level: "h2",
        content: "4. Code of Conduct",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "All attendees, speakers, sponsors, and volunteers must adhere to the Conference Code of Conduct. The organizers reserve the right to take action, including removal from the event without refund, against anyone violating the Code of Conduct.",
          },
        ],
      },
      {
        type: "heading",
        level: "h2",
        content: "5. Liability",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "<strong>5.1. Personal Property:</strong> The organizers do not accept responsibility for:",
          },
          {
            type: "list",
            items: [
              "personal injury",
              "loss of property",
              "damage to personal belongings",
            ],
          },
          {
            type: "paragraph",
            content:
              "during the conference. Attendees are responsible for their own health, safety, and personal items.",
          },
          {
            type: "paragraph",
            content:
              "<strong>5.2. Limitation of Liability:</strong> ZurichJS and its organizers are not liable for any injury, loss, or damage that occurs during the conference, except where such exclusion is prohibited by law.",
          },
          {
            type: "paragraph",
            content:
              "<strong>5.3 Health and Safety:</strong> Attendees participate in conference activities at their own risk and are responsible for their own health and safety.",
          },
        ],
      },
      {
        type: "heading",
        level: "h2",
        content: "6. Photography, Filming and Recording",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "By attending the Conference, you consent to being photographed, filmed, or recorded. These materials may be used by the organizers for promotional, educational, and archival purposes.If you do not wish to appear in recordings or photos, please notify the organizers upon arrival. ",
          },
        ],
      },
      {
        type: "heading",
        level: "h2",
        content: "7. Changes to the Conference",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "<strong>7.1 Program Changes:</strong> We reserve the right to modify the conference program, schedule, speakers, and venue without prior notice. Such changes do not entitle attendees to a refund.",
          },
          {
            type: "paragraph",
            content:
              "<strong>7.2 Force Majeure:</strong> We are not liable for failure to perform our obligations due to circumstances beyond our control, including natural disasters, pandemics, or government restrictions.",
          },
        ],
      },
      {
        type: "heading",
        level: "h2",
        content: "8. Privacy and Data Protection",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "<strong> Data Collection </strong> By registering, you consent to the collection and processing of personal data necessary for event management, including your:",
          },
          {
            type: "list",
            items: [
              "name",
              "email adress",
              "billing information",
              "ticket details",
            ],
          },
          {
            type: "paragraph",
            content:
              "Payment information is handled exclusively by Stripe and is never stored by the organizers.",
          },
          {
            type: "paragraph",
            content: "<strong>8.2. Data Use:</strong> Your data is used for:",
          },
          {
            type: "list",
            items: [
              "ticket and event registration",
              "important event communication",
              "operational and safety reasons",
            ],
          },
          {
            type: "paragraph",
            content:
              "Your data will not be shared with third parties except as required by law or as part of essential event services (e.g., payment processing via Stripe).",
          },
        ],
      },
      {
        type: "heading",
        level: "h2",
        content: "9. General Terms",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "<strong>9.1 Governing Law:</strong> These terms are governed by Swiss law. Any disputes shall be subject to the exclusive jurisdiction of the courts of Zurich, Switzerland.",
          },
          {
            type: "paragraph",
            content:
              "<strong>9.2 Modifications:</strong> We reserve the right to modify these terms at any time. Changes will be posted on our website and communicated to ticket holders via email.",
          },
          {
            type: "paragraph",
            content:
              "<strong>9.3 Severability:</strong> If any provision of these terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.",
          },
        ],
      },
      {
        type: "heading",
        level: "h2",
        content: "Questions About These Terms?",
      },
      {
        type: "paragraph",
        content:
          'If you have any questions about these Terms of Service, please contact us at <a href="mailto:hello@zurichjs.com" class="hover:underline font-semibold">hello@zurichjs.com</a>',
      },
    ],
  },
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy Policy",
    description: "How we collect, use, and protect your data",
    kicker: "Legal",
    lastUpdated: "November 25, 2025",
    sections: [
      {
        type: "paragraph",
        content:
          "At ZurichJS Conference 2026, we are committed to protecting your privacy and personal data. This policy explains how we collect, use, and safeguard your information.",
      },
    ],
  },
  "code-of-conduct": {
    slug: "code-of-conduct",
    title: "Code of Conduct",
    description: "Our commitment to a safe and inclusive conference",
    kicker: "Community",
    lastUpdated: "November 25, 2025",
    sections: [
      {
        type: "paragraph",
        content:
          "ZurichJS Conference is dedicated to providing a harassment-free conference experience for everyone, regardless of gender, gender identity and expression, age, sexual orientation, disability, physical appearance, body size, race, ethnicity, religion, or technology choices.",
      },
      {
        type: "heading",
        level: "h2",
        content: "Our Pledge",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "Zurich JS Conf, organised by <strong>ZurichJS</strong> — <strong>Swiss JavaScript Group</strong> (a registered non-profit association in Switzerland), is committed to providing a <strong>harassment-free, safe, and inclusive</strong> conference experience for everyone.",
          },
          {
            type: "paragraph",
            content: "We welcome participation from all people regardless of:",
          },
          {
            type: "list",
            items: [
              "gender identity or expression",
              "sexual orientation",
              "disability",
              "physical appearance or body size",
              "race, ethnicity, or national origin",
              "age",
              "religion or belief",
              "technology choices or professional background",
            ],
          },
          {
            type: "paragraph",
            content:
              "We <strong>do not tolerate harassment in any form</strong>, and we are dedicated to ensuring that every attendee feels safe, respected, and valued.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "Expected Behavior",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "All participants—including attendees, speakers, sponsors, staff, and volunteers—are expected to:",
          },
          {
            type: "list",
            items: [
              "Be respectful, kind, and considerate toward others.",
              "Refrain from demeaning, discriminatory, or harassing behavior, speech, or imagery.",
              "Listen actively, engage constructively, and help foster a welcoming community.",
              "Be mindful of your surroundings and fellow participants.",
              "Report unsafe situations, harassment, or violations of this Code of Conduct to organizers as soon as possible.",
              "Participate authentically, contributing positively to the event and the broader community.",
            ],
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "Unacceptable Behavior",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content: "Unacceptable behaviors include, but are not limited to:",
          },

          // Harassment & Discrimination
          {
            type: "paragraph",
            content: "<strong>Harassment &amp; Discrimination:</strong>",
          },
          {
            type: "list",
            items: [
              "Offensive or derogatory comments related to gender, gender identity or expression, sexual orientation, disability, physical appearance, body size, race, age, religion, nationality, or socio-economic status.",
              "Deliberate misgendering or the use of inappropriate or exclusionary language.",
            ],
          },

          // Abusive Conduct
          {
            type: "paragraph",
            content: "<strong>Abusive Conduct:</strong>",
          },
          {
            type: "list",
            items: [
              "Verbal, physical, or written threats or aggression.",
              "Sustained disruption of talks, workshops, or activities.",
              "Stalking, intimidation, or following.",
            ],
          },

          // Sexual Harassment
          {
            type: "paragraph",
            content: "<strong>Sexual Harassment:</strong>",
          },
          {
            type: "list",
            items: [
              "Unwelcome sexual attention or advances.",
              "Sexualized jokes, images, comments, or behavior—whether in person, in talks, or online communication.",
              "Inappropriate physical contact or invasion of personal space.",
            ],
          },

          // Other Inappropriate Behavior
          {
            type: "paragraph",
            content: "<strong>Other Inappropriate Behavior:</strong>",
          },
          {
            type: "list",
            items: [
              "Advocating for, encouraging, or trivializing any of the above conduct.",
              "Excessively intoxicated behavior that creates discomfort or risk for others.",
            ],
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "Consequences of Unacceptable Behavior",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "If a participant engages in unacceptable behavior, the organizers may take any action they deem appropriate. This may include, without limitation:",
          },
          {
            type: "list",
            items: [
              "Verbal warning",
              "Removal from a session or activity",
              "Temporary or permanent expulsion from the conference without refund",
              "Bans from future ZurichJS or Swiss JavaScript Group events",
            ],
          },
          {
            type: "paragraph",
            content:
              "Sponsors, speakers, and individuals in positions of authority will be held to the same or higher standards as attendees.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "Reporting Guidelines",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "If you feel unsafe, experience or witness unacceptable behavior, or have any concerns, please contact an organizer as soon as possible.",
          },
          {
            type: "paragraph",
            content: "You can reach us by:",
          },
          {
            type: "list",
            items: [
              "Email: <a href='mailto:hello@zurichjs.com' class='hover:underline font-semibold'>hello@zurichjs.com</a>",
              "In person: Speak to any Zurich JS Conf staff member or organizer (they will be clearly identifiable).",
            ],
          },
          {
            type: "paragraph",
            content:
              "All reports will be handled with <strong>respect, confidentiality, and care</strong>.",
          },
          {
            type: "paragraph",
            content:
              "The Swiss JavaScript Group organizers will review and investigate every report promptly and fairly.",
          },
          {
            type: "paragraph",
            content:
              "We are committed to protecting the reporter’s privacy and safety.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "Scope",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content: "This Code of Conduct applies to:",
          },
          {
            type: "list",
            items: [
              "all conference venues, sessions, and activities",
              "social events connected with Zurich JS Conf",
              "official online spaces (e.g., chat platforms, social media hashtags)",
              "any communication related to the conference before, during, and after the event",
            ],
          },
          {
            type: "paragraph",
            content:
              "It applies to <strong>all participants</strong>: attendees, speakers, sponsors, exhibitors, volunteers, contractors, and organizers.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "Contact Information",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "If you have any questions or need to report an incident, you can contact:",
          },
          {
            type: "paragraph",
            content:
              "<strong>Swiss JavaScript Group (ZurichJS Operations)</strong>",
          },
          {
            type: "paragraph",
            content: "Alderstrasse 30, 8008 Zürich",
          },
          {
            type: "paragraph",
            content:
              "Email: <a href='mailto:hello@zurichjs.com' class='hover:underline font-semibold'>hello@zurichjs.com</a>",
          },
        ],
      },
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
