import React from "react";
import { InfoContentLayout } from "@/components/InfoContentLayout";
import type { InfoPage } from "@/data/info-pages";

const faqPage: InfoPage = {
  slug: "faq",
  title: "Frequently Asked Questions",
  description:
    "Find answers to common questions about ZurichJS Conference 2026, including tickets, the venue, schedule, and more.",
  kicker: "FAQ",
  lastUpdated: "January 28, 2026",
  sections: [
    // General
    { type: "heading", level: "h2", content: "General" },
    { type: "heading", level: "h3", content: "When and where is Zurich JS Conf happening?" },
    {
      type: "paragraph",
      content:
        "Zurich JS Conf takes place at <strong>Technopark Zürich, Switzerland</strong>, on <strong>September 9–11, 2026</strong>:",
    },
    {
      type: "list",
      items: [
        "Community Day – September 9",
        "Zurich Engineering Day (Workshops &amp; Warm-up) – September 10",
        "Conference Day – September 11",
      ],
    },
    {
      type: "heading",
      level: "h3",
      content: "What can I expect at Zurich JS?",
    },
    {
      type: "paragraph",
      content:
        "Three days of JavaScript-focused talks, workshops, community meet-ups, and networking with developers and engineers from across Europe.",
    },
    {
      type: "heading",
      level: "h3",
      content:
        "Are there networking events, community day activities, or social meet-ups?",
    },
    {
      type: "paragraph",
      content:
        "Yes. Community Day (September 9) is dedicated to <strong>local JavaScript user groups and informal meetups</strong>, and the Zurich Engineering Day (September 10) includes workshops as well as social and networking activities to meet other attendees before the main conference day.",
    },
    { type: "heading", level: "h3", content: "Who should attend?" },
    {
      type: "paragraph",
      content:
        "Anyone interested in JavaScript: front-end, back-end, full-stack developers, dev-ops, toolmakers, library authors, and community builders.",
    },
    {
      type: "heading",
      level: "h3",
      content: "What's included with my registration?",
    },
    {
      type: "paragraph",
      content:
        "Your ticket includes access to the sessions and activities for the days you selected, plus scheduled networking opportunities. Details about food, drinks, and recordings depend on the ticket type. Please refer to the ticket section for details.",
    },
    { type: "heading", level: "h3", content: "Can I apply to speak?" },
    {
      type: "paragraph",
      content:
        'Yes. The call for papers is open until <strong>April 1, 2026</strong>. You\'ll find the submission link on the "Call for Papers" section of the website.',
    },

    // Registration
    { type: "heading", level: "h2", content: "Registration" },
    {
      type: "heading",
      level: "h3",
      content: "How do I register for Zurich JS?",
    },
    {
      type: "paragraph",
      content:
        'Go to the ticket section or find the "Tickets" button on the website and choose your ticket type.',
    },
    {
      type: "heading",
      level: "h3",
      content: "Can I transfer, refund, or cancel my ticket?",
    },
    {
      type: "paragraph",
      content:
        "Tickets <strong>cannot be cancelled</strong> and <strong>are non-refundable</strong>.",
    },
    {
      type: "paragraph",
      content:
        "However, you <strong>may transfer your ticket to another person</strong>.",
    },
    {
      type: "paragraph",
      content:
        'To request a transfer, please contact us at <strong><a href="mailto:hello@zurichjs.com">hello@zurichjs.com</a></strong> — we\'ll do our best to find a solution.',
    },
    {
      type: "heading",
      level: "h3",
      content: "Are prices inclusive of VAT and can I get an invoice?",
    },
    {
      type: "paragraph",
      content:
        "Yes. Ticket prices are inclusive of VAT where applicable, and you can request an invoice during or after registration.",
    },
    {
      type: "paragraph",
      content:
        "For specific tax or invoicing requirements, please check the registration page or contact support.",
    },
    {
      type: "heading",
      level: "h3",
      content: "Are team discounts or bulk tickets available?",
    },
    {
      type: "paragraph",
      content: "Yes, we offer team / bulk ticket options.",
    },
    {
      type: "paragraph",
      content:
        'If you\'re booking for a group, please contact the organizers at <strong><a href="mailto:hello@zurichjs.com">hello@zurichjs.com</a></strong> for current group pricing and conditions.',
    },
    {
      type: "heading",
      level: "h3",
      content: "What payment methods are accepted?",
    },
    {
      type: "paragraph",
      content:
        'Major credit cards are accepted. Additional payment or invoicing options for companies may be available. If you need support, don\'t hesitate to contact us at <strong><a href="mailto:hello@zurichjs.com">hello@zurichjs.com</a></strong>.',
    },

    // Accessibility
    { type: "heading", level: "h2", content: "Accessibility" },
    {
      type: "heading",
      level: "h3",
      content:
        "What accommodations are available for attendees with access needs?",
    },
    {
      type: "paragraph",
      content:
        "The venue is fully wheelchair accessible. Facilities such as accessible restrooms and elevators are provided.",
    },
    {
      type: "paragraph",
      content:
        "Additional services (such as hearing-impaired support, translation, prayer or quiet rooms) — these details will be published closer to the event. Please contact us if you need any support.",
    },
    { type: "heading", level: "h3", content: "Is there a code of conduct?" },
    {
      type: "paragraph",
      content:
        "Yes. Zurich JS Conf has a Code of Conduct that applies to all attendees, speakers, sponsors and volunteers. You are expected to respect the guidelines and report any concerns to the team.",
    },

    // Travel
    { type: "heading", level: "h2", content: "Travel" },
    { type: "heading", level: "h3", content: "Getting to Zurich" },
    {
      type: "paragraph",
      content:
        "Zurich is very well connected by train to several major Swiss and nearby international airports, making it easy to reach the city even when flying into neighboring countries. In addition to <strong>Zurich Airport (ZRH)</strong>, which is just 10 minutes from Zurich main station and approximately <strong>20 minutes to the venue by train</strong>, attendees can also consider:",
    },
    {
      type: "list",
      items: [
        "<strong>EuroAirport Basel–Mulhouse–Freiburg (BSL)</strong> – approx. 1 hour 15 minutes by train to Zurich. Served by easyJet, Ryanair, Wizz Air, and other low-cost and international carriers.",
        "<strong>Stuttgart Airport (STR), Germany</strong> – approx. 3 hours by train or bus. Served by Eurowings, Lufthansa, Ryanair, Wizz Air, and others.",
        "<strong>Memmingen Airport (FMM), Germany</strong> – approx. 3.5 hours by train or bus. A popular low-cost hub served by <strong>Wizz Air</strong> and Ryanair.",
        "<strong>Milan Malpensa Airport (MXP), Italy</strong> – approx. 3.5–4 hours by train. Served by many international and low-cost airlines.",
      ],
    },
    {
      type: "paragraph",
      content:
        "These connections make Zurich easily accessible from across Europe, including via budget airlines, with frequent and reliable rail links into the city.",
    },
    {
      type: "heading",
      level: "h3",
      content: "Are there room blocks or partner hotels for attendees?",
    },
    {
      type: "paragraph",
      content:
        "Yes, we will be offering discounted rates at selected partner hotels for conference attendees. We are currently finalizing these arrangements and will publish the details as soon as possible.",
    },
    {
      type: "paragraph",
      content:
        'In the meantime, if you want to go ahead and book your stay there are two hotels located directly opposite the venue: <strong><a href="https://all.accor.com/booking/en/novotel/hotel/2731?destination=zurich-switzerland" target="_blank" rel="noopener noreferrer">Novotel Zurich City West</a></strong> and <strong><a href="https://all.accor.com/booking/en/ibis/hotel/3184?destination=zurich-switzerland" target="_blank" rel="noopener noreferrer">ibis Budget Zurich City West</a></strong>.',
    },
    {
      type: "heading",
      level: "h3",
      content: "What are public transportation or parking options?",
    },
    {
      type: "paragraph",
      content:
        'Technopark Zürich is well connected by tram, train, and bus. Parking is available nearby but may be limited; we therefore encourage using public transport or ridesharing where possible. For planning your journey within Zurich and across Switzerland, we recommend using <strong><a href="https://sbb.ch" target="_blank" rel="noopener noreferrer">sbb.ch</a></strong>, which provides up-to-date schedules and route planning.',
    },
    {
      type: "heading",
      level: "h3",
      content: "Do I need a visa or invitation letter?",
    },
    {
      type: "paragraph",
      content:
        "If you require a visa to enter Switzerland, you may request an invitation letter during registration. Ensure you apply in sufficient time for visa processing.",
    },

    // Other
    { type: "heading", level: "h2", content: "Other" },
    { type: "heading", level: "h3", content: "Is there an age requirement?" },
    {
      type: "paragraph",
      content: "Attendees must be 18 years or older to register and attend.",
    },
    {
      type: "heading",
      level: "h3",
      content: "Can I become a sponsor or exhibitor?",
    },
    {
      type: "paragraph",
      content:
        'Yes. Sponsorship and exhibitor opportunities are available. Contact the Zurich JS team via the contact form or email to <strong><a href="mailto:hello@zurichjs.com">hello@zurichjs.com</a></strong> to receive the sponsorship prospectus.',
    },
    {
      type: "heading",
      level: "h3",
      content: "Who can I contact if I have additional questions?",
    },
    {
      type: "paragraph",
      content:
        "If your question isn't answered here, please email the ZurichJS conference team via the contact form on the website or write an email to <strong><a href=\"mailto:hello@zurichjs.com\">hello@zurichjs.com</a></strong> and we'll respond within a few business days.",
    },
  ],
};

const FAQPage: React.FC = () => {
  return <InfoContentLayout page={faqPage} />;
};

export default FAQPage;
