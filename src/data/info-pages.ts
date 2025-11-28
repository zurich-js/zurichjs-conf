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
    description:
      "How ZurichJS Conference 2026 collects, uses, and protects your data",
    kicker: "Legal",
    lastUpdated: "November 25, 2025",
    sections: [
      {
        type: "paragraph",
        content:
          "This Privacy Policy describes how ZurichJS Conference 2026, organised by ZurichJS — Swiss JavaScript Group, collects, uses, and protects personal data from attendees, speakers, sponsors, and other participants.",
      },

      {
        type: "heading",
        level: "h2",
        content: "1. Data Controller",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "The data controller responsible for your personal information is:",
          },
          {
            type: "paragraph",
            content:
              "<strong>Swiss JavaScript Group (ZurichJS Operations)</strong><br>Alderstrasse 30, 8008 Zürich<br>Email: <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "2. Personal Data We Collect",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "We may collect the following categories of personal data:",
          },
          {
            type: "list",
            items: [
              "<strong>Contact information</strong>: name, email address, company/organization.",
              "<strong>Ticketing information</strong>: billing details, transaction ID, ticket preferences.",
              "<strong>Communication data</strong>: emails or messages you send us.",
              "<strong>Event participation data</strong>: talk submissions, workshop registrations.",
              "<strong>Photography & video</strong>: images or recordings captured during the event.",
              "<strong>Technical data</strong>: IP address, device information, and analytics collected through our website.",
            ],
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "3. How We Use Your Data",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content: "We process your data for the following purposes:",
          },
          {
            type: "list",
            items: [
              "To manage your ticket purchase and event registration.",
              "To send essential event communications (e.g., updates, schedules, changes).",
              "To verify identity and ensure event security.",
              "To organize talks, workshops, and community activities.",
              "To provide customer support and respond to inquiries.",
              "To analyse website or event performance and improve our services.",
              "To record and document the event (including photos and videos).",
            ],
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "4. Legal Basis for Processing",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "We process personal data under the following legal bases under Swiss and EU data protection laws:",
          },
          {
            type: "list",
            items: [
              "<strong>Contractual necessity</strong>: processing required to deliver your ticket or participation.",
              "<strong>Consent</strong>: for optional services, photography, newsletters, or speaker submissions.",
              "<strong>Legitimate interests</strong>: improving the event, ensuring security, preventing fraud.",
              "<strong>Legal obligations</strong>: accounting and record-keeping requirements.",
            ],
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "5. Photography and Video Recording",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "Photographs and videos will be taken during the event. These may include audience shots where individuals are visible.",
          },
          {
            type: "list",
            items: [
              "Recordings may be used for documentation and promotional purposes.",
              "We avoid publishing sensitive or inappropriate material.",
              "If you prefer not to appear in photos, please inform staff at check-in.",
            ],
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "6. Sharing of Personal Data",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "We do not sell your personal information. We may share data only with trusted third parties:",
          },
          {
            type: "list",
            items: [
              "<strong>Ticketing and payment providers</strong> (e.g., Stripe) for secure transactions.",
              "<strong>Email and communication services</strong> for event updates.",
              "<strong>Venue operators</strong> for safety and logistical purposes.",
              "<strong>Contracted photographers or videographers</strong> working on-site.",
            ],
          },
          {
            type: "paragraph",
            content:
              "All third-party providers are required to follow appropriate data protection and confidentiality standards.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "7. Data Retention",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "We retain personal data only as long as necessary for the purposes described in this policy:",
          },
          {
            type: "list",
            items: [
              "Ticketing and billing data: up to 10 years (legal obligation).",
              "Email communications: up to 2 years.",
              "Event media (photos/videos): indefinitely, unless removal is requested.",
              "Analytics and technical data: typically 12–24 months.",
            ],
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "8. Your Rights",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content: "You have the following rights regarding your data:",
          },
          {
            type: "list",
            items: [
              "Right to access your personal data.",
              "Right to correct inaccurate or incomplete data.",
              "Right to request deletion in permissible cases.",
              "Right to withdraw consent (for consent-based processing).",
              "Right to object to certain types of processing.",
              "Right to request data portability.",
            ],
          },
          {
            type: "paragraph",
            content:
              "To exercise any of these rights, contact us at <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "9. Data Security",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "We implement appropriate technical and organizational measures to protect your personal data from unauthorized access, loss, misuse, or disclosure.",
          },
          {
            type: "paragraph",
            content:
              "However, no digital system can guarantee absolute security. We encourage attendees to protect their personal devices and networks.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "10. Third-Party Services",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "Our website and ticketing systems may contain links to third-party services or platforms. We are not responsible for their privacy practices.",
          },
          {
            type: "paragraph",
            content:
              "We encourage you to review the privacy policies of third-party providers such as Stripe, analytics tools, and communication services.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "11. International Data Transfers",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "Your data may be processed outside Switzerland or the EU when required by third-party service providers.",
          },
          {
            type: "paragraph",
            content:
              "We ensure such transfers comply with GDPR, Swiss data protection law, and use adequate safeguards such as Standard Contractual Clauses when applicable.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "12. Changes to This Privacy Policy",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "We may update this Privacy Policy to reflect operational or legal changes. Updates will be published on the official ZurichJS website with a revised “Last Updated” date.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "13. Contact Information",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "If you have questions, concerns, or requests related to your personal data, you may contact:",
          },
          {
            type: "paragraph",
            content:
              "<strong>Swiss JavaScript Group (ZurichJS Operations)</strong><br>Alderstrasse 30, 8008 Zürich<br>Email: <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>",
          },
        ],
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
        content: "1. Our Pledge",
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
        content: "2. Expected Behavior",
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
        content: "3. Unacceptable Behavior",
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
        content: "4. Consequences of Unacceptable Behavior",
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
        content: "5. Reporting Guidelines",
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
        content: "6. Scope",
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
        content: "7. Contact Information",
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

  "refund-policy": {
    slug: "refund-policy",
    title: "Refund Policy",
    description:
      "At ZurichJS Conference 2026, we want to ensure transparency regarding our refund policy. This policy outlines our approach to ticket refunds.",
    kicker: "Policies",
    lastUpdated: "November 14, 2025",
    sections: [
      {
        type: "heading",
        level: "h2",
        content: "1. No Refund Policy",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "<strong>All ticket sales are final.</strong> We do not offer refunds for any ticket type (Standard, Student/Unemployed, or VIP) under normal circumstances.",
          },
          {
            type: "paragraph",
            content:
              "This policy helps us plan and commit to delivering a high-quality event with confirmed numbers for venue, catering, and other essential services.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "2. Exceptional Circumstances",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "While refunds are not available under normal circumstances, we understand that extraordinary situations can arise. In <strong>exceptional cases only</strong>, we may consider refund requests on a <strong>case-by-case basis</strong>.",
          },
          {
            type: "paragraph",
            content:
              "Examples of exceptional circumstances may include (but are not limited to):",
          },
          {
            type: "list",
            items: [
              "Serious medical emergencies (documentation required)",
              "Unforeseen family emergencies",
              "Other extraordinary circumstances beyond your control",
            ],
          },
          {
            type: "paragraph",
            content:
              "<strong>Please note:</strong> Approval is not guaranteed and will be evaluated individually based on the specific circumstances.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "3. Event Cancellation or Postponement",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "<strong>3.1 Conference Cancellation:</strong> If ZurichJS Conference 2026 is cancelled by the organizers, all ticket holders will receive a <strong>full refund (100%)</strong> of the ticket price.",
          },
          {
            type: "paragraph",
            content:
              "<strong>3.2 Conference Postponement:</strong> If the conference is postponed to a new date, ticket holders will have the option to:",
          },
          {
            type: "list",
            items: [
              "Transfer their ticket to the new date at no additional cost, or",
              "Request a full refund (100%) within 14 days of the postponement announcement",
            ],
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "4. Ticket Transfers",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "If you are unable to attend, you may be able to transfer your ticket to another person. Ticket transfers are evaluated on a <strong>case-by-case basis</strong>.",
          },
          {
            type: "paragraph",
            content:
              "<strong>Note:</strong> Student/Unemployed tickets can only be transferred to someone who also qualifies for the discount (verification required).",
          },
          {
            type: "paragraph",
            content:
              "To request a ticket transfer, please contact us with your order number and the details of the person you wish to transfer the ticket to.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "5. How to Request a Refund or Transfer",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "paragraph",
            content:
              "If you believe you have exceptional circumstances that warrant a refund, or if you need to transfer your ticket:",
          },
          {
            type: "list",
            items: [
              "Email us at <a href='mailto:hello@zurichjs.com' class='hover:underline font-semibold'>hello@zurichjs.com</a>",
              "Include your order number in the email",
              "Clearly explain your circumstances and reason for the request",
              "Attach any supporting documentation (if applicable)",
            ],
          },
          {
            type: "paragraph",
            content:
              "We will review your request and respond within 5-7 business days. If your request is approved, refunds will be processed to the original payment method within 10-14 business days.",
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "6. Important Notes",
      },
      {
        type: "subsection",
        subsections: [
          {
            type: "list",
            items: [
              "Refund decisions are made at the sole discretion of the organizers",
              "Approved refunds are processed to the original payment method only",
              "Processing typically takes 10-14 business days depending on your bank",
              "This policy may be updated; changes will be communicated to ticket holders via email",
              "The organizers reserve the right to make exceptions on a case-by-case basis",
            ],
          },
        ],
      },

      {
        type: "heading",
        level: "h2",
        content: "Questions About This Policy?",
      },
      {
        type: "paragraph",
        content:
          'If you have questions about this refund policy or need clarification, please contact us at <a href="mailto:hello@zurichjs.com" class="hover:underline font-semibold">hello@zurichjs.com</a>',
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
