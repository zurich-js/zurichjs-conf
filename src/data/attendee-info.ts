import type { ContentSection, InfoPage } from "@/data/info-pages";

export type AttendeeAudience = "international" | "local";

const discordSection: ContentSection = {
  type: "paragraph",
  content:
    "<strong>Join Discord for conference updates:</strong> we'll use Discord to share slides after the talks and to post live updates if anything changes during the conference. Please join before the event and keep notifications on while you're around the venue. <a href='https://discord.gg/CcTKHFgwM' target='_blank' rel='noopener noreferrer'>Join here</a>.",
};

/** Applies to every attendee, regardless of where they're travelling from. */
const venueAndScheduleSections: ContentSection[] = [
  {
    type: "heading",
    level: "h2",
    content: "Venue & Schedule",
  },
  {
    type: "heading",
    level: "h3",
    content: "Badge Pickup",
  },
  {
    type: "list",
    items: [
      "<strong>Early badge pickup:</strong> Wednesday, 9 September 2026, from 17:30 at GetYourGuide, Stampfenbachstrasse 48, 8006 Zurich.",
      "<strong>Warm-up meetup:</strong> Wednesday, 9 September 2026, 18:00–21:00, also at GetYourGuide, Stampfenbachstrasse 48, 8006 Zurich.",
      "<strong>Workshop day (Zurich Engineering Day):</strong> Thursday, 10 September 2026, at Technopark, Technoparkstrasse 1, 8005 Zurich.",
      "<strong>Conference day:</strong> Friday, 11 September 2026, at Technopark, Technoparkstrasse 1, 8005 Zurich.",
    ],
  },
  {
    type: "paragraph",
    content:
      "Please bring your ticket confirmation and allow a little extra time when arriving.",
  },
  {
    type: "heading",
    level: "h3",
    content: "Venue",
  },
  {
    type: "list",
    items: [
      "<strong>Conference venue:</strong> Technopark Zurich, Technoparkstrasse 1, 8005 Zurich.",
      "<strong>Conference website:</strong> <a href='https://conf.zurichjs.com/' target='_blank' rel='noopener noreferrer'>conf.zurichjs.com</a>.",
    ],
  },
  {
    type: "paragraph",
    content:
      "<strong>Still being finalised:</strong> entrance instructions, cloakroom/luggage info, Wi-Fi details, quiet spaces, and the badge pickup desk location will be added here closer to the event.",
  },
];

/** Applies to every attendee. */
const accessibilitySections: ContentSection[] = [
  {
    type: "heading",
    level: "h2",
    content: "Accessibility",
  },
  {
    type: "paragraph",
    content:
      "We want ZurichJS Conference to be comfortable and welcoming for everyone. If you have accessibility needs, questions, or anything we should know in advance, please contact us as early as possible so we can help.",
  },
  {
    type: "paragraph",
    content:
      "<strong>Contact:</strong> <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>",
  },
  {
    type: "paragraph",
    content: "Examples of things we can help coordinate:",
  },
  {
    type: "list",
    items: [
      "Step-free access",
      "Seating needs",
      "Dietary restrictions",
      "Quiet space information",
      "Questions about lighting, sound, or room setup",
    ],
  },
];

/** Applies to every attendee. */
const checklistSections: ContentSection[] = [
  {
    type: "heading",
    level: "h2",
    content: "Quick Checklist for Attendees",
  },
  {
    type: "list",
    items: [
      "<a href='https://discord.gg/CcTKHFgwM' target='_blank' rel='noopener noreferrer'>Join Discord</a>",
      "Pick up your badge",
      "Save the venue location",
      "Check the MeteoSwiss forecast / rain radar",
      "Bring a light jacket or umbrella if needed",
      "Plan your transport",
      "Share any accessibility needs with the organizers",
    ],
  },
];

/**
 * Full attendee guide for visitors travelling to Zurich for the conference.
 */
export const attendeeInfoInternational: InfoPage = {
  slug: "attendee-info-international",
  title: "Attendee Info",
  description:
    "Practical info for ZurichJS Conference 2026 attendees travelling from abroad: venue, schedule, accessibility, weather, transport, food, and coffee.",
  kicker: "For international attendees",
  lastUpdated: "September 4, 2026",
  sections: [
    discordSection,
    ...venueAndScheduleSections,
    ...accessibilitySections,
    {
      type: "heading",
      level: "h2",
      content: "Weather",
    },
    {
      type: "paragraph",
      content:
        "Zurich weather can change quickly, so please check the forecast before heading out. At the moment, the forecast for Zurich around the conference period looks mild, with some chance of showers earlier in the week and more unsettled weather possible after that. Bring a light jacket or umbrella if rain is in the forecast.",
    },
    {
      type: "paragraph",
      content:
        "Use <strong>MeteoSwiss</strong> for the most reliable local forecast: <a href='https://www.meteoswiss.admin.ch/' target='_blank' rel='noopener noreferrer'>meteoswiss.admin.ch</a>, or search for “MeteoSwiss” in your app store. Tip: the rain radar is extremely accurate — a real life saver when it rains and you want to know when it will stop.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Getting Around Zurich",
    },
    {
      type: "paragraph",
      content:
        "Zurich is compact, safe, and easy to navigate. You can usually get around by public transport or on foot.",
    },
    {
      type: "heading",
      level: "h3",
      content: "Public Transport",
    },
    {
      type: "list",
      items: [
        "Trams, buses, and trains are frequent and reliable.",
        "Consider a <strong>Zurich Card</strong> or local public transport day ticket if you plan to move around the city.",
        "Use the ZVV or SBB app for routes and tickets.",
      ],
    },
    {
      type: "heading",
      level: "h3",
      content: "Walking",
    },
    {
      type: "list",
      items: [
        "Many places in central Zurich are easy to reach on foot.",
        "If the weather is good, walking is often the nicest way to explore the city.",
      ],
    },
    {
      type: "heading",
      level: "h3",
      content: "Taxis",
    },
    {
      type: "list",
      items: [
        "Taxis and ride services are available, but they are expensive in Zurich.",
        "Uber is available in Zurich.",
        "Public transport is usually the better option unless you have luggage, accessibility needs, or a late-night route.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Food & Coffee",
    },
    {
      type: "paragraph",
      content: "A few local favourites near the venue to get you started:",
    },
    {
      type: "groupedList",
      groups: [
        {
          heading: "Bakery, Coffee &amp; Ice Cream",
          items: [
            "<a href='https://babus.ch/' target='_blank' rel='noopener noreferrer'>Babu's</a> — bakery",
            "<a href='https://www.mame.coffee/' target='_blank' rel='noopener noreferrer'>Mame</a> — coffee",
            "<a href='https://mirocoffee.co/' target='_blank' rel='noopener noreferrer'>Miro</a> — coffee",
            "<a href='https://collectivebakery.ch/' target='_blank' rel='noopener noreferrer'>Collective Bakery</a> — bakery &amp; coffee",
            "Steiner Bäckerei-Konditorei — bakery",
            "<a href='https://www.ahoi-ladencafe.ch/' target='_blank' rel='noopener noreferrer'>AHOI! Ladencafé</a> — café",
            "<a href='https://gelateriadiberna.ch/en/' target='_blank' rel='noopener noreferrer'>Gelateria di Berna</a> — ice cream",
          ],
        },
        {
          heading: "Restaurants near the venue",
          items: [
            "<a href='https://naanu.ch/en/' target='_blank' rel='noopener noreferrer'>naanu</a> — Nepalese",
            "<a href='https://www.spoonthaikitchen.ch/hardturm' target='_blank' rel='noopener noreferrer'>Spoon Hardturm</a> — Thai",
            "<a href='https://burger-meister.ch/' target='_blank' rel='noopener noreferrer'>Burgermeister Escherwyss</a> — burgers",
            "<a href='https://buny.ch/' target='_blank' rel='noopener noreferrer'>Buny Burgers and Fries</a> — burgers",
            "<a href='https://www.kai-sushi-schiffbau.ch/' target='_blank' rel='noopener noreferrer'>Kai Sushi Schiffbau</a> — sushi",
            "<a href='https://www.danoi.ch/' target='_blank' rel='noopener noreferrer'>DA NOI</a> — Italian",
            "<a href='https://www.brisket.ch/' target='_blank' rel='noopener noreferrer'>Brisket Southern BBQ &amp; Bar</a> — barbecue",
            "<a href='https://www.kitchen-republic.ch/en/home' target='_blank' rel='noopener noreferrer'>Kitchen Republic</a> — food hall, mixed cuisines",
            "<a href='https://www.mar-mar.ch/' target='_blank' rel='noopener noreferrer'>marmar cuisine orientale</a> — Lebanese",
            "<a href='https://ooki.tokyo/start' target='_blank' rel='noopener noreferrer'>Ooki</a> — Japanese",
            "<a href='https://kaisin.ch/en/locations/' target='_blank' rel='noopener noreferrer'>kaisin. hardbrücke</a> — poke bowls",
            "<a href='https://rootsandfriends.com/' target='_blank' rel='noopener noreferrer'>Roots</a> — vegetarian/vegan",
            "<a href='https://www.fraugerold.ch/home' target='_blank' rel='noopener noreferrer'>Frau Gerolds Garten</a> — garden restaurant &amp; bar",
          ],
        },
        {
          heading: "Practical (supermarket &amp; pharmacy)",
          items: [
            "<a href='https://www.migrolino.ch/' target='_blank' rel='noopener noreferrer'>migrolino shop</a> — supermarket",
            "<a href='https://www.coop.ch/en/locations/coop-supermarkt-prime-2/5240_POS' target='_blank' rel='noopener noreferrer'>Coop Supermarkt Prime 2</a> — supermarket",
            "<a href='https://www.amavita.ch/de/apotheke-finden/amavita-apotheke-hardbrucke' target='_blank' rel='noopener noreferrer'>Amavita Apotheke Hardbrücke</a> — pharmacy",
          ],
        },
      ],
    },
    {
      type: "paragraph",
      content:
        "More recommendations are welcome — drop your favourites in the <a href='https://discord.gg/CcTKHFgwM' target='_blank' rel='noopener noreferrer'>Discord</a>.",
    },
    ...checklistSections,
  ],
};

/**
 * Guide for attendees already based in Switzerland. Shares venue, schedule,
 * accessibility, and checklist info with the international guide; skips
 * travel-specific sections (weather, getting to Zurich) that don't apply.
 */
export const attendeeInfoLocal: InfoPage = {
  slug: "attendee-info-local",
  title: "Attendee Info",
  description:
    "Practical info for ZurichJS Conference 2026 attendees based in Switzerland: venue, schedule, accessibility, and a quick checklist.",
  kicker: "For local attendees",
  lastUpdated: "September 4, 2026",
  sections: [
    discordSection,
    ...venueAndScheduleSections,
    ...accessibilitySections,
    ...checklistSections,
  ],
};

export const attendeeInfoByAudience: Record<AttendeeAudience, InfoPage> = {
  international: attendeeInfoInternational,
  local: attendeeInfoLocal,
};
