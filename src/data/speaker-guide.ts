import type { InfoPage } from "@/data/info-pages";

const locations = {
  airport: "Flughafen Zurich",
  hotel: "Novotel Zürich City West, Schiffbaustrasse",
  conference: "8005 Zürich, Technoparkstrasse 1",
  afterParty: "Zürich, Seebad Enge, Mythenquai",
  speakerDinner: "Zürich, Wirtschaft Ziegelhütte, Hüttenkopfstrasse",
} as const;

const sbbJourneyUrl = (from: string, to: string): string =>
  `https://www.sbb.ch/en?von=${encodeURIComponent(from)}&nach=${encodeURIComponent(to)}`;

const googleMapsUrl = (query: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/**
 * Unlisted guide shared only with confirmed ZurichJS Conf 2026 speakers.
 */
export const speakerGuide: InfoPage = {
  slug: "speaker-guide",
  title: "Speaker Guide",
  description:
    "Practical guidance for ZurichJS Conf 2026 speakers, including travel, venues, contacts, stage setup, and local essentials.",
  lastUpdated: "August 8, 2026",
  sections: [
    {
      type: "paragraph",
      content:
        "<strong class='mb-2 block text-xl text-gray-950'>Welcome aboard!</strong><span class='block'>Having you speak at ZurichJS Conf 2026 means the world to us. This community-run conference is built on volunteered time, late nights, and a lot of love. Our CFP received 436 submissions, and yours is one of the few we chose to build the day around. We're proud to host you and see your talk on the Zurich stage.</span>",
    },
    {
      type: "paragraph",
      content:
        "We would love you to stay for as much of the conference as you can. People are travelling from places including Singapore, Australia, Sweden, the UK, Germany, Austria, and France to meet you as well as hear your talk. You can also step away whenever you need to rest, work, or explore. Our team is here when you want support.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Key Contacts",
    },
    {
      type: "infotip",
      before: "For questions or changes, use the ",
      title: "speakers group chat on WhatsApp",
      content:
        "You should already be in the private group for confirmed speakers. We use it for announcements, quick questions, and live coordination. If you cannot see it, email us and we will add you.",
      after:
        " for the fastest response. You can also email <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>.",
    },
    {
      type: "paragraph",
      content:
        "The core team is in both WhatsApp and email. Any of us can help with specific questions or connect you with the right person. Our volunteer crew will also be easy to identify at each venue.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Key Dates at a Glance",
    },
    {
      type: "groupedList",
      groups: [
        {
          heading: "Wednesday, September 9",
          items: [
            "<strong>From 18:00:</strong> optional Community Day, a relaxed ZurichJS meetup where you can meet the local community. See the <a href='https://zurichjs.com/events/sep-2026' target='_blank' rel='noopener noreferrer'>agenda</a> and <a href='https://www.meetup.com/zurich-js/events/315488367/' target='_blank' rel='noopener noreferrer'>RSVP on Meetup</a>.",
          ],
        },
        {
          heading: "Thursday, September 10",
          items: [
            "<strong>Workshop day:</strong> locations across Zurich.",
            "<strong>18:30–22:00:</strong> speaker dinner at Ziegelhütte.",
          ],
        },
        {
          heading: "Friday, September 11",
          items: [
            "<strong>Conference day:</strong> Technopark Zürich.",
            "<strong>19:00–23:00:</strong> after party at Seebad Enge.",
          ],
        },
        {
          heading: "Saturday, September 12",
          items: [
            "<strong>10:00–16:00:</strong> optional speaker day out, planned around everyone&apos;s departure flights. Activities may include a light hike or a tour of Zurich. Final details will follow; reserve the full time window.",
          ],
        },
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Quick Directions",
    },
    {
      type: "paragraph",
      content:
        "Each link opens a door-to-door journey in the official SBB timetable. Check it shortly before leaving for live departures, delays, and platform changes.",
    },
    {
      type: "quicklinks",
      links: [
        {
          label: "Zurich Airport → Speaker hotel",
          travelTime: "25–30 min",
          href: sbbJourneyUrl(locations.airport, locations.hotel),
        },
        {
          label: "Zurich Airport → Conference venue",
          travelTime: "25–30 min",
          href: sbbJourneyUrl(locations.airport, locations.conference),
        },
        {
          label: "Conference venue → After party venue",
          travelTime: "20 min",
          href: sbbJourneyUrl(locations.conference, locations.afterParty),
        },
        {
          label: "Speaker hotel → Speaker dinner venue",
          travelTime: "35 min",
          href: sbbJourneyUrl(locations.hotel, locations.speakerDinner),
        },
        {
          label: "Speaker hotel → Conference venue",
          travelTime: "1 min",
        },
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Speaker Info Form and Plus Ones",
    },
    {
      type: "paragraph",
      content:
        "Please complete your <strong>speaker logistics form</strong> using the personal link sent directly to you. The form covers event attendance, dietary requirements, your T-shirt size, session accommodations, and plus-one details.",
    },
    {
      type: "paragraph",
      content:
        "<strong>Plus ones are welcome and do not need a ticket.</strong> Add them to the form and we will prepare a VIP badge for conference access. They can also receive 20% off workshops. Please tell us in advance so we can plan seating, food, and venue capacity.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Your Talk: Slides, Stage, and Tech",
    },
    {
      type: "paragraph",
      content:
        "Please send us your slides before the conference through the private speakers WhatsApp group or by email at <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>. This lets us verify them on the venue hardware and keep a backup ready in case your laptop has a bad day. Tell us if your talk includes live demos, video, audio, or unusual connection requirements.",
    },
    {
      type: "list",
      items: [
        "<strong>Format:</strong> use a 16:9 deck at 1920×1080.",
        "<strong>Brightness:</strong> dark, high-contrast slides work well under stage lighting. More importantly, avoid switching frequently between very dark and very bright slides.",
        "<strong>Type:</strong> use body text around 24pt or larger and code at 18pt or larger with high contrast.",
        "<strong>Media:</strong> embed video and audio instead of relying on streaming.",
      ],
    },
    {
      type: "infobox",
      title: "Stage equipment",
      content:
        "<strong>HDMI:</strong> common adapters are available; bring your own for unusual connections, plus your charger. Power is available at the podium.<br /><strong>Clicker:</strong> a presenter remote is provided, or bring your own.<br /><strong>Podium and microphone:</strong> the podium sits to the side of the stage so it does not block the screen. You will be miked and can move around the stage.<br /><strong>Backup:</strong> a backup machine will have the slides you sent in advance.",
    },
    {
      type: "paragraph",
      content:
        "The conference starts at <strong>08:45</strong>. Complete your display, clicker, and microphone check before then at the time we confirm with you. The A/V crew will reconnect and confirm your setup during the break before your session.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Arriving via Zurich Airport",
    },
    {
      type: "paragraph",
      content:
        "A volunteer with a <strong>ZurichJS sign</strong> can meet you at Zurich Airport (ZRH) and travel with you to the hotel. We arrange this from the arrival details shared directly with the organizers, so make sure your flight information is current.",
    },
    {
      type: "paragraph",
      content:
        "Install SBB Mobile for <a href='https://apps.apple.com/ch/app/sbb-mobile/id294855237' target='_blank' rel='noopener noreferrer'><strong>iPhone</strong></a> or <a href='https://play.google.com/store/apps/details?id=ch.sbb.mobile.android.b2c&amp;hl=en' target='_blank' rel='noopener noreferrer'><strong>Android</strong></a> before you travel. It gives you precise Swiss public transport times, including live delays and platform changes. Google Maps can be misleading for local connections.",
    },
    {
      type: "list",
      items: [
        "The train station is directly below the airport terminal. Trains to Zürich HB take about 10–15 minutes and run every few minutes.",
        "Buy a ticket in SBB Mobile or at a station machine before you travel.",
        "Taxis cost about CHF 60–70 to the city center. Uber and Bolt also operate in Zurich, but public transport is usually faster and less expensive.",
      ],
    },
    {
      type: "infobox",
      title: "How Swiss public transport tickets work",
      content:
        "One integrated ticket system covers trains, trams, buses, and boats within the zones and time shown on your ticket. Short-distance tickets are available for brief local journeys. Zurich Airport and Zurich city zone 110 are in different zones, and zone 110 counts as two zones when calculating the fare. Enter your destination in SBB Mobile and the app will show you the ticket you need. There are no entry gates, but inspectors check tickets on board, so buy before travelling and keep the ticket with you.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Speaker Hotel",
    },
    {
      type: "infotip",
      before: "Speakers stay at the ",
      title: "Novotel Zürich City West",
      content:
        "<strong>Novotel Zürich City West</strong><br />Schiffbaustrasse 13<br />8005 Zürich<br /><a href='https://all.accor.com/hotel/2731/index.en.shtml' target='_blank' rel='noopener noreferrer'>Hotel website</a>",
      copyText: "Novotel Zürich City West, Schiffbaustrasse 13, 8005 Zürich",
      mapHref: googleMapsUrl(
        "Novotel Zürich City West, Schiffbaustrasse 13, 8005 Zürich"
      ),
      after: ".",
    },
    {
      type: "infotip",
      before: "The conference venue, ",
      title: "Technopark Zürich",
      content:
        "<strong>Technopark Zürich</strong><br />Technoparkstrasse 1<br />8005 Zürich",
      copyText: "Technopark Zürich, Technoparkstrasse 1, 8005 Zürich",
      mapHref: googleMapsUrl(
        "Technopark Zürich, Technoparkstrasse 1, 8005 Zürich"
      ),
      after:
        ", is only 50 metres away. Restaurants and bars are nearby, and you can easily return to your room between sessions when you need a break.",
    },
    {
      type: "list",
      items: [
        "<strong>Breakfast:</strong> included with your stay.",
        "<strong>From the airport:</strong> allow 25–30 minutes by train to Zürich Hardbrücke, followed by a short walk. Use the direct SBB route above for live details.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Workshop Day for Instructors",
    },
    {
      type: "paragraph",
      content:
        "If you are leading a workshop on Thursday, September 10, this is a separate teaching day from your conference talk. We will coordinate the workshop setup with you directly:",
    },
    {
      type: "list",
      items: [
        "<strong>Two weeks before:</strong> we confirm your workshop location after registrations stabilize.",
        "<strong>One week before:</strong> we assign a dedicated point of contact for room access, logistics, and your workshop's A/V setup.",
        "<strong>On the day:</strong> your point of contact will help you get settled before the workshop begins.",
        "<strong>Lunch:</strong> provided for morning and afternoon instructors from 13:00 to 14:00.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Speaker Dinner at Ziegelhütte",
    },
    {
      type: "infotip",
      before:
        "On Thursday evening, we are hosting a Swiss country-style dinner and bowling at ",
      title: "Wirtschaft Ziegelhütte",
      content:
        "<strong>Wirtschaft Ziegelhütte</strong><br />Hüttenkopfstrasse 70<br />8051 Zürich",
      copyText: "Wirtschaft Ziegelhütte, Hüttenkopfstrasse 70, 8051 Zürich",
      mapHref: googleMapsUrl(
        "Wirtschaft Ziegelhütte, Hüttenkopfstrasse 70, 8051 Zürich"
      ),
      after:
        " from <strong>18:30 to 22:00</strong>. Expect good food, good company, and a proper chance to meet your fellow speakers before conference day.",
    },
    {
      type: "paragraph",
      content:
        "The venue is an easy public transport ride from the hotel, followed by a scenic walk. Guides can travel with the group, or you can make your own way there. Allow about 35 minutes and use the direct SBB route above.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Conference Day at Technopark",
    },
    {
      type: "infotip",
      before: "Conference day takes place on Friday, September 11, at ",
      title: "Technopark Zürich",
      content:
        "<strong>Technopark Zürich</strong><br />Technoparkstrasse 1<br />8005 Zürich",
      copyText: "Technopark Zürich, Technoparkstrasse 1, 8005 Zürich",
      mapHref: googleMapsUrl(
        "Technopark Zürich, Technoparkstrasse 1, 8005 Zürich"
      ),
      after: ". The conference starts at <strong>08:45</strong>.",
    },
    {
      type: "list",
      items: [
        "<strong>Check-in:</strong> the venue team will be on site early because we aim to open attendee check-in at 07:30.",
        "<strong>Your access:</strong> you do not need to buy a conference ticket; your speaker access is already covered.",
        "<strong>Speaker card:</strong> ideally, we will give it to you before conference day. If we do not manage that, the check-in desk will have it ready.",
        "<strong>Schedule:</strong> the current program is on the <a href='/schedule'>schedule page</a>. You should receive a Google Calendar invitation for your slot up to one week before the conference. If it has not arrived by then, let us know.",
        "<strong>Lunch*:</strong> served from 12:40 to 14:00.",
        "<strong>Speaker room:</strong> use the dedicated room to work, prepare, or decompress away from the crowd. It is yours whenever you need a quieter moment.",
      ],
    },
    {
      type: "infobox",
      title: "* How conference lunch works",
      content:
        "Food is available throughout the 75-minute lunch period. The <em>e18e &amp; friends</em> live episode runs from 13:05 to 13:35, so you can eat before the panel from 12:40 or after it from 13:35. Lunch is sit-down service, and there is no separate speaker line.",
    },
    {
      type: "heading",
      level: "h2",
      content: "After Party at Seebad Enge",
    },
    {
      type: "infotip",
      before: "After the conference, we have booked ",
      title: "Seebad Enge",
      content:
        "<strong>Seebad Enge</strong><br />Mythenquai 9<br />8002 Zürich",
      copyText: "Seebad Enge, Mythenquai 9, 8002 Zürich",
      mapHref: googleMapsUrl("Seebad Enge, Mythenquai 9, 8002 Zürich"),
      after:
        ", a private lakeside venue, from <strong>19:00 to 23:00</strong>. You will meet VIP ticket holders, the organizers, and one or two sponsors who helped make the event possible. Drinks and apéro are included, and there will be a photobooth.",
    },
    {
      type: "paragraph",
      content:
        "Optionally, you can swim in the lake, so pack a bathing suit if you fancy it.",
    },
    {
      type: "infobox",
      title: "Getting to the after party",
      content:
        "From Technopark, allow about 20 minutes by S-Bahn and a short walk, 12 minutes by bike, or 35 minutes for a scenic walk along the river and lake. Volunteers and guides can lead groups after the closing session.",
    },
    {
      type: "heading",
      level: "h2",
      content: "If You Fall Sick",
    },
    {
      type: "list",
      items: [
        "<strong>Tell us early:</strong> let an organizer know as soon as possible if you are ill or cannot make your slot. We will adjust the schedule. No guilt; your health comes first.",
        "<strong>Message privately if you prefer:</strong> we are here to support you and can help you find the right care.",
        "<strong>Pharmacy:</strong> ask for an <em>Apotheke</em>. Pharmacies are common, and staff usually speak English.",
        "<strong>Emergency:</strong> call <strong>144</strong> for an ambulance or <strong>112</strong> for the general emergency service.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Promoting the Conference",
    },
    {
      type: "paragraph",
      content:
        "Please share your talk and the conference when you can. It makes a real difference to a community-run, nonprofit event, and it helps the right audience find your session.",
    },
    {
      type: "list",
      items: [
        "Download logos, images, key facts, and sample copy from the <a href='/partners/assets'>partner assets page</a>.",
        "Share through social posts, newsletters, or your company channels.",
        "Tag us so we can celebrate and reshare your post.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Swiss Essentials",
    },
    {
      type: "heading",
      level: "h3",
      content: "Language",
    },
    {
      type: "paragraph",
      content:
        "Swiss German is spoken locally, and standard German is used in writing. Most people also speak English. For written German, <a href='https://www.deepl.com/translator' target='_blank' rel='noopener noreferrer'><strong>DeepL</strong></a> is the most reliable translator.",
    },
    {
      type: "list",
      items: [
        "<strong>Grüezi</strong> (/gru-eh-tsee/): hello",
        "<strong>Merci</strong> or <strong>danke</strong>: thank you",
        "<strong>Merci vilmal</strong> or <strong>danke vilmal</strong> (/feel-mahl/): thank you very much",
      ],
    },
    {
      type: "paragraph",
      content:
        "If you want to blend in a little: at dinners, meetups, and other small social gatherings, people usually greet and say goodbye to each person individually. When you toast, make eye contact and clink glasses with everyone at the table. It is entirely optional; no one expects visitors to know every local custom.",
    },
    {
      type: "heading",
      level: "h3",
      content: "Money",
    },
    {
      type: "paragraph",
      content:
        "The local currency is the Swiss franc (CHF). Cards and mobile payments are accepted almost everywhere. Many places also accept euros and apply their own conversion, but paying in CHF usually gives you a better rate. Zurich can be pricey, but we cover most planned meals and events. For current price orientation, see <a href='https://www.numbeo.com/cost-of-living/in/Zurich' target='_blank' rel='noopener noreferrer'>Numbeo's Zurich page</a>.",
    },
    {
      type: "heading",
      level: "h3",
      content: "Food and Water",
    },
    {
      type: "paragraph",
      content:
        "Swiss tap water is safe, high quality, and drinkable by default, including from bathroom taps. Public fountains are also safe unless a sign says <em>Kein Trinkwasser</em> (not drinking water). Bring a reusable bottle; bathroom and kitchen taps use the same drinking-water supply.",
    },
    {
      type: "infobox",
      title: "Where Swiss tap water comes from",
      content:
        "More than 80% of Swiss drinking water comes from groundwater, including springs, and just under 20% comes from treated lake water. Depending on the region, groundwater is replenished by rain, snowmelt, and glacier melt. Much of it needs little or no treatment before entering the drinking-water network. Read more from the <a href='https://www.bafu.admin.ch/en/state-water' target='_blank' rel='noopener noreferrer'>Swiss Federal Office for the Environment</a>.",
    },
    {
      type: "heading",
      level: "h3",
      content: "Local Practicalities",
    },
    {
      type: "list",
      items: [
        "Tipping is not customary. Locals usually round up; larger tips are reserved for extraordinary service and are more common among tourists and expats.",
        "Most shops close around 19:00–20:00. Shops at Zürich HB and the airport stay open later and are useful exceptions.",
        "Many restaurant kitchens close around 21:30–22:00, so plan ahead for a late dinner.",
        "Zurich is generally safe at night and on public transport.",
      ],
    },
    {
      type: "paragraph",
      content: "If you have a few free hours, consider:",
    },
    {
      type: "list",
      items: [
        "<strong>Old Town and Niederdorf:</strong> cobbled lanes, cafés, and Grossmünster church",
        "<strong>Lake Zurich promenade:</strong> lakeside walks and short boat trips from Bürkliplatz",
        "<strong>Uetliberg:</strong> Zurich's local mountain, about 20 minutes away by train",
        "<strong>Zürich-West:</strong> the neighborhood around Technopark, including Frau Gerolds Garten and Im Viadukt",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "FAQ",
    },
    {
      type: "subsection",
      subsections: [
        {
          type: "paragraph",
          content:
            "<strong>I missed my morning tech check. What now?</strong><br />Find the A/V crew during the next break. They will also reconnect and confirm your setup in the break before your session.",
        },
        {
          type: "paragraph",
          content:
            "<strong>I cannot make Community Day or the workshops. Is that a problem?</strong><br />No. Everything except your own session or workshop is optional; join whatever works for you.",
        },
        {
          type: "paragraph",
          content:
            "<strong>Is there somewhere quiet to work or take a meeting?</strong><br />We will have a dedicated speaker room at the venue, and there are also various small rooms you can grab on a first-come-first-served basis. If you need something more, let us know.",
        },
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "See You in Zurich",
    },
    {
      type: "paragraph",
      content:
        "That covers everything for now. We are proud to have you with us and look forward to welcoming you to Zurich in September. Safe travels, and see you soon!",
    },
  ],
};
