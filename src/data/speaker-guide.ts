import type { InfoPage } from "@/data/info-pages";

/**
 * Speaker Guide — unlisted page served at /speaker-guide.
 *
 * This page is intentionally NOT registered in `infoPages` (so it never
 * appears in the sitemap), is rendered with `noindex`, and is disallowed in
 * robots.txt. It exists purely as a link we send to confirmed speakers.
 */
export const speakerGuide: InfoPage = {
  slug: "speaker-guide",
  title: "Speaker Guide",
  description:
    "Everything you need to know as a ZurichJS Conf 2026 speaker — arrival, venues, contacts, the after party, and getting around Zurich.",
  kicker: "For Speakers",
  lastUpdated: "July 26, 2026",
  sections: [
    {
      type: "paragraph",
      content:
        "Welcome! Having you speak at ZurichJS Conf 2026 means the world to us. This conference is built on volunteered time, late nights, and a lot of love for this community, and your talk is one of the reasons it exists: our CFP received <strong>436 submissions</strong>, and yours is one of the few we chose to build the day around. We can't wait to see it on stage.",
    },
    {
      type: "paragraph",
      content:
        "This guide covers everything you need before and during the conference. We support every speaker individually, so if anything here doesn't answer your question, ask in the speakers group chat or email <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>. You won't be on your own at any point: our team, volunteers, and guides are around at every step.",
    },
    {
      type: "paragraph",
      content:
        "One ask from us: <strong>stick around as much as you can</strong>. Attendees are travelling in from Singapore, Australia, Sweden, the UK, Germany, Austria, and France, and they're coming to meet you as much as to hear you. Your presence beyond your talk is a big part of what makes the conference feel like a community. We also want you to enjoy Switzerland, so balance it however works for you.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Quick Directions",
    },
    {
      type: "paragraph",
      content:
        "One-tap Google Maps routes between the places you'll need:",
    },
    {
      type: "quicklinks",
      links: [
        {
          label: "Zurich Airport → Speaker hotel",
          sublabel: "Novotel Zürich City West · ~35–40 min by train",
          href: "https://www.google.com/maps/dir/?api=1&origin=Zurich+Airport&destination=Novotel+Z%C3%BCrich+City+West&travelmode=transit",
        },
        {
          label: "Zurich Airport → Technopark",
          sublabel: "Conference venue · ~35–40 min by train",
          href: "https://www.google.com/maps/dir/?api=1&origin=Zurich+Airport&destination=Technopark+Z%C3%BCrich&travelmode=transit",
        },
        {
          label: "Speaker hotel → Technopark",
          sublabel: "1–2 min walk",
          href: "https://www.google.com/maps/dir/?api=1&origin=Novotel+Z%C3%BCrich+City+West&destination=Technopark+Z%C3%BCrich&travelmode=walking",
        },
        {
          label: "Technopark → Seebad Enge",
          sublabel: "After party · ~15 min by S-Bahn",
          href: "https://www.google.com/maps/dir/?api=1&origin=Technopark+Z%C3%BCrich&destination=Seebad+Enge&travelmode=transit",
        },
        {
          label: "Speaker hotel → Ziegelhütte",
          sublabel: "Speaker dinner · Thu Sept 10th evening",
          href: "https://www.google.com/maps/dir/?api=1&origin=Novotel+Z%C3%BCrich+City+West&destination=Restaurant+Ziegelh%C3%BCtte+Z%C3%BCrich&travelmode=transit",
        },
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Key Dates at a Glance",
    },
    {
      type: "tldr",
      content:
        "Community Day Wed Sept 9th (evening, from 18:00) · Workshops Thu Sept 10th · Speaker dinner Thu 18:30–22:00 at Ziegelhütte · Conference Fri Sept 11th at Technopark · After party Fri 19:00–23:00 · Speaker day out Sat Sept 12th, 10:00–16:00.",
    },
    {
      type: "list",
      items: [
        "<strong>Wednesday, September 9th:</strong> Community Day — evening only, from <strong>18:00</strong>: a relaxed ZurichJS meetup to warm up and meet the community. Optional, and a good warm-up if you're in town. Check the <a href='https://zurichjs.com/events/sep-2026' target='_blank' rel='noopener noreferrer'>meetup agenda</a> and <a href='https://www.meetup.com/zurich-js/events/315488367/' target='_blank' rel='noopener noreferrer'>RSVP on Meetup</a>.",
        "<strong>Thursday, September 10th:</strong> Workshop Day — workshops run across Zurich (locations confirmed to instructors in advance).",
        "<strong>Thursday, September 10th, 18:30–22:00:</strong> Speaker dinner at Ziegelhütte — dinner and a round of bowling with your fellow speakers. Guides will take you there.",
        "<strong>Friday, September 11th:</strong> Conference Day at Technopark Zürich — doors open at 07:00; the full agenda is on the <a href='/schedule'>schedule page</a>.",
        "<strong>Friday, September 11th, 19:00–23:00:</strong> After party at Seebad Enge on Lake Zürich.",
        "<strong>Saturday, September 12th, 10:00–16:00:</strong> Speaker day out — activities planned around everyone's departure flights, such as a light hike or a tour of Zurich. Details follow; reserve 10:00–16:00.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Key Contacts",
    },
    {
      type: "tldr",
      content:
        "Faris, Bogdan, Nadja &amp; Colin. Fastest channel is the speakers group chat; otherwise <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>.",
    },
    {
      type: "paragraph",
      content:
        "Four core organizers run the conference. Reach any of us in person, in the speakers group chat, or via <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>:",
    },
    {
      type: "list",
      items: [
        "<strong>Faris Aziz</strong> — conference lead, speaker &amp; workshop liaison",
        "<strong>Bogdan Mihai Ilie</strong> — community, speaker support",
        "<strong>Nadja Hesselbjerg</strong> — logistics &amp; on-site experience",
        "<strong>Colin Schwarz</strong> — operations &amp; on-site support",
      ],
    },
    {
      type: "paragraph",
      content:
        "On the days themselves you'll also be supported by our volunteer crew; they'll be clearly identifiable at the venues and can always route you to the right person.",
    },
    {
      type: "paragraph",
      content:
        "There's also a dedicated <strong>speakers group chat</strong>; announcements and coordination live there, and it's the fastest way to reach us. If you haven't been added yet, <strong>contact Faris, Bogdan, or Nadja</strong> and we'll invite you right away.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Arriving via Zurich Airport",
    },
    {
      type: "tldr",
      content:
        "Train from the airport to Zürich HB every few minutes (~12 min); use the <a href='https://www.sbb.ch/en' target='_blank' rel='noopener noreferrer'>SBB</a> app, skip taxis. A volunteer with a ZurichJS sign can meet you and ride with you.",
    },
    {
      type: "paragraph",
      content:
        "Most speakers fly into <strong>Zurich Airport (ZRH)</strong>. The airport is exceptionally well connected: the train station sits directly beneath the terminal, and trains to Zürich Hauptbahnhof (main station, \"Zürich HB\") run every few minutes and take about 10–15 minutes. Tram 10 also runs from the airport into the city if you prefer a slower, scenic ride.",
    },
    {
      type: "list",
      items: [
        "Buy tickets at the machines, or use the <a href='https://www.sbb.ch/en' target='_blank' rel='noopener noreferrer'><strong>SBB</strong></a> Mobile app (easiest — supports international cards and plans door-to-door routes).",
        "A regular ticket from the airport into the city covers all onward trams and buses within its zones for its validity window. One ticket system covers trams, buses, S-Bahn, and boats city-wide — nobody checks at the door, but roaming inspections are real, so always carry a valid ticket.",
        "Taxis are available but expensive (expect CHF 60–70 to the city center). <strong>Uber operates in Zurich</strong> too and is usually a bit cheaper than a taxi — but the train still wins.",
      ],
    },
    {
      type: "paragraph",
      content:
        "<strong>You don't have to navigate your arrival alone.</strong> We'll assign volunteers to pick you up (look for the <strong>ZurichJS sign</strong>) and ride with you on public transport to your hotel. Your arrival details are part of the speaker intake form, so make sure we have your flight times.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Speaker Hotel",
    },
    {
      type: "tldr",
      content:
        "Novotel Zürich City West, Schiffbaustrasse 13 — a 1–2 minute walk from Technopark. From the airport: train to Zürich HB, then S-Bahn to Hardbrücke (~35–40 min total).",
    },
    {
      type: "paragraph",
      content:
        "Speakers stay at the <a href='https://www.google.com/maps/search/?api=1&amp;query=Novotel+Z%C3%BCrich+City+West' target='_blank' rel='noopener noreferrer'><strong>Novotel Zürich City West</strong></a> (Schiffbaustrasse 13, 8005 Zürich), right in Zürich-West, a <strong>1–2 minute walk from Technopark</strong> and surrounded by restaurants and bars. We chose it for proximity: you can return to your room between sessions whenever you need a break.",
    },
    {
      type: "list",
      items: [
        "<strong>From the airport (~35–40 min):</strong> train to Zürich HB, then an S-Bahn one stop to <em>Hardbrücke</em>; the hotel is a few minutes' walk from the station. Here's the <a href='https://www.google.com/maps/dir/?api=1&amp;origin=Zurich+Airport&amp;destination=Novotel+Z%C3%BCrich+City+West&amp;travelmode=transit' target='_blank' rel='noopener noreferrer'>step-by-step route on Google Maps</a>, or plan it live on <a href='https://www.sbb.ch/en' target='_blank' rel='noopener noreferrer'>SBB</a>.",
        "<strong>To Technopark:</strong> 1–2 minutes on foot — no transport needed on conference morning.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Conference Day at Technopark",
    },
    {
      type: "tldr",
      content:
        "Technoparkstrasse 1, 8005 Zürich — 1–2 min walk from your hotel; doors open at 07:00. Check in at registration and tell a volunteer you're a speaker. Lunch in two waves, 12:40–14:00. Full agenda on the <a href='/schedule'>schedule page</a>.",
    },
    {
      type: "paragraph",
      content:
        "The main conference day (September 11th) takes place at <strong>Technopark Zürich, Technoparkstrasse 1, 8005 Zürich</strong>, Switzerland's largest technology center, in Zurich's innovation district (Zürich-West).",
    },
    {
      type: "list",
      items: [
        "<strong>Doors open at 07:00:</strong> the Swiss start early, and so do we. The crew will already be on site, and early morning is the calmest time for a tech check and a coffee.",
        "<strong>Getting there:</strong> your hotel is a 1–2 minute walk away — otherwise tram lines 4 and 13 stop directly at the <em>Technopark</em> stop, and the S-Bahn station <em>Hardbrücke</em> is a ~7 minute walk away.",
        "<strong>Schedule:</strong> the up-to-date program (including your slot) lives on the <a href='/schedule'>schedule page</a>. You should also receive a <strong>Google Calendar invite</strong> for your slot up to a week before the conference. If it hasn't landed by then, message us in the group chat or at <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>.",
        "<strong>On arrival:</strong> check in at the registration desk and let a volunteer know you're a speaker; we'll take it from there, including a tech check before your talk.",
        "<strong>Lunch (12:40–14:00):</strong> to reduce traffic, conference-day lunch runs in two waves around the <em>e18e &amp; friends</em> live episode (13:05–13:35, with Alexander Lichter and Debbie O'Brien). Grab food from 12:40 and head back in for the panel, or eat after it from 13:35. Food is available for the full 75 minutes, it's sit-down serving, and there's no separate speakers line — come whenever suits you.",
        "<strong>Speakers room:</strong> there's a dedicated room for speakers to work, prep, or just decompress away from the crowd. If you need anything beyond that for work or meetings, let us know and we'll arrange it.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Workshop Instructors",
    },
    {
      type: "tldr",
      content:
        "Location confirmed 2 weeks out; your point of contact assigned 1 week out. Lunch provided 13:00–14:00; breakfast at your hotel. Until then, ask Faris.",
    },
    {
      type: "paragraph",
      content:
        "If you're running a workshop on September 10th, two things are settled on a fixed timeline:",
    },
    {
      type: "list",
      items: [
        "<strong>Two weeks before the workshop:</strong> the exact workshop location is confirmed. Venues are settled based on final capacity, so we lock them in once registrations have stabilized.",
        "<strong>One week before the workshop:</strong> you'll be assigned a dedicated point of contact from our team who will handle your questions, logistics, and anything you need on the day.",
      ],
    },
    {
      type: "paragraph",
      content:
        "And don't worry about food: whether you're a morning or afternoon instructor, <strong>lunch is provided</strong> on workshop day during the <strong>13:00–14:00</strong> lunch break. Best to grab breakfast beforehand; it's included at your hotel.",
    },
    {
      type: "paragraph",
      content:
        "Until your point of contact is assigned, direct workshop questions to Faris or the speakers group chat.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Speaker Dinner at Ziegelhütte",
    },
    {
      type: "tldr",
      content:
        "Thu Sept 10th, 18:30–22:00 at Ziegelhütte — dinner and bowling with the other speakers. Guides will take you there.",
    },
    {
      type: "paragraph",
      content:
        "On workshop day evening, <strong>Thursday, September 10th, 18:30–22:00</strong>, we're hosting a speaker dinner at <a href='https://www.google.com/maps/search/?api=1&amp;query=Restaurant+Ziegelh%C3%BCtte+Z%C3%BCrich' target='_blank' rel='noopener noreferrer'><strong>Ziegelhütte</strong></a>. Expect good food, good company, and <strong>bowling</strong>. It's a proper chance to meet your fellow speakers before conference day.",
    },
    {
      type: "paragraph",
      content:
        "<strong>Getting there:</strong> it's an easy public transport ride; here's the <a href='https://www.google.com/maps/dir/?api=1&amp;origin=Novotel+Z%C3%BCrich+City+West&amp;destination=Restaurant+Ziegelh%C3%BCtte+Z%C3%BCrich&amp;travelmode=transit' target='_blank' rel='noopener noreferrer'>route from the speaker hotel</a>. But you won't need to navigate it yourself: <strong>guides will pick you up and travel with you</strong>, and an Uber is always a fallback if you're running late.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Speaker Info Form & Plus Ones",
    },
    {
      type: "tldr",
      content:
        "You'll have received a speaker intake form — fill it in promptly: dietary needs, flight times, plus one. Plus ones are welcome and get a VIP ticket with 20% off workshops, but they do need a ticket — tell us in advance.",
    },
    {
      type: "paragraph",
      content:
        "You'll have received a <strong>speaker intake form</strong>. Please fill it out promptly. It's how we capture <strong>dietary restrictions</strong>, your <strong>flight times</strong>, and whether you're bringing a <strong>plus one</strong>, and it's how we arrange your plus one's ticket. If it hasn't reached you, message us in the group chat or at <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>.",
    },
    {
      type: "paragraph",
      content:
        "<strong>Plus ones are welcome.</strong> A conference is more fun with your loved ones and friends around, and we want to accommodate them. They <strong>do need a ticket</strong>: once you've flagged them in the intake form, we'll set them up with a <strong>VIP ticket</strong> that includes <strong>20% off workshops</strong>. Just <strong>tell us in advance</strong> — via the form or directly — so we can plan seats, food, and capacity (Zurich is tight on space and pricey per head). Please don't bring someone unannounced on the day.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Your Talk: Slides, Stage & Tech",
    },
    {
      type: "tldr",
      content:
        "16:9 at 1920×1080, dark theme, big text. Send slides before the conference. HDMI + clicker at the podium. Tech checks: conference morning + the break before your session.",
    },
    {
      type: "paragraph",
      content:
        "Please send us your slides <strong>before the conference</strong>. It lets us verify formats and resolutions on the venue hardware and keep a backup ready in case of laptop trouble. Share them in the speakers group chat or email them to <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>. If your talk includes live demos, mention it so we can plan the tech check accordingly.",
    },
    {
      type: "paragraph",
      content: "A few guidelines so your deck looks great on the big screen:",
    },
    {
      type: "list",
      items: [
        "<strong>Aspect ratio:</strong> build your deck in <strong>16:9</strong>. The stage output is Full HD (1920×1080): 16:9 decks fill the screen edge to edge, while 4:3 decks get letterboxed and shrink.",
        "<strong>Dark mode:</strong> we recommend <strong>dark backgrounds with light, high-contrast text</strong>: dark slides read far better under stage lighting and are much easier on the audience's eyes than a bright white screen.",
        "<strong>Type size:</strong> keep body text at ~24pt or larger and code samples at 18pt+ with a high-contrast syntax theme. If you can read it standing three meters behind your laptop, the back row can read it too.",
        "<strong>Videos &amp; audio:</strong> embed media in the deck rather than relying on streaming, and tell us in advance if your talk needs sound so the A/V crew can wire it up.",
      ],
    },
    {
      type: "paragraph",
      content: "<strong>On stage</strong>, the setup is:",
    },
    {
      type: "list",
      items: [
        "<strong>Cabling:</strong> the stage connection is <strong>HDMI</strong>. We'll have USB-C and other common adapters on hand, but if your machine needs anything unusual, please bring your own adapter, plus your charger; there's power at the podium.",
        "<strong>Clicker:</strong> a presenter remote is provided, and you're welcome to bring your own if you prefer it.",
        "<strong>Podium:</strong> the podium sits to the side of the stage with the main screen beside you, so you never block the audience's view of your slides. You'll be miked up, so you're free to move around the whole stage.",
        "<strong>Backup:</strong> because you sent your slides in advance (see above), a backup machine is standing by if your laptop fails on the day.",
      ],
    },
    {
      type: "paragraph",
      content:
        "Every speaker gets a <strong>tech check</strong> before going on stage; nobody plugs in cold in front of the audience:",
    },
    {
      type: "list",
      items: [
        "<strong>Morning of conference day:</strong> come by the stage when you arrive (before doors open) for a full run: display output, resolution, clicker, and mic.",
        "<strong>The break before your session:</strong> the A/V crew does a final connect-and-confirm with you so the handover between talks is seamless.",
        "<strong>Workshop instructors:</strong> your assigned point of contact will arrange the room and A/V check with you directly — typically right before your workshop starts on September 10th.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "After Party at Seebad Enge",
    },
    {
      type: "tldr",
      content:
        "Seebad Enge, Fri Sept 11th, 19:00–23:00 — drinks &amp; apéro included. Bring a bathing suit if you fancy a swim (optional). ~15 min from Technopark (S-Bahn Hardbrücke → Bahnhof Enge). Guides will lead groups over.",
    },
    {
      type: "paragraph",
      content:
        "After the conference we've booked <strong>Seebad Enge</strong>, a private lakeside venue on Lake Zürich, from <strong>19:00 to 23:00</strong> on September 11th. Drinks and apéro are included, and you can swim in the lake, so <strong>pack a bathing suit</strong> if you fancy it (optional). There'll also be a <strong>photobooth</strong> for photos with your fellow speakers.",
    },
    {
      type: "paragraph",
      content: "<strong>Getting there from Technopark:</strong>",
    },
    {
      type: "list",
      items: [
        "<strong>Public transport (~15 min):</strong> S-Bahn from Hardbrücke to Bahnhof Enge, then a short walk to the lake.",
        "<strong>By bike (~12 min):</strong> along the riverside path — Publibike stations at both ends.",
        "<strong>On foot (~35 min):</strong> a scenic walk along the Limmat and the lakefront promenade.",
      ],
    },
    {
      type: "paragraph",
      content:
        "You won't have to figure this out alone: volunteers and guides will help groups make their way over after the closing session.",
    },
    {
      type: "heading",
      level: "h2",
      content: "If You Fall Sick",
    },
    {
      type: "tldr",
      content:
        "Tell us as early as possible via the group chat or <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>. Emergencies: 144 (ambulance), 112 (general).",
    },
    {
      type: "paragraph",
      content:
        "If you fall ill or can't make your slot, <strong>tell us as early as you can</strong> via the speakers group chat or <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a> so we can adjust the schedule. No guilt: your health comes first. <strong>Feel free to message any of us privately</strong>: we've all dealt with health stuff, we're here to support you, and we can point you to pharmacies (\"Apotheke\": plentiful, and staff speak English). For medical emergencies in Switzerland dial <strong>144</strong> (ambulance) or <strong>112</strong> (general emergency).",
    },
    {
      type: "heading",
      level: "h2",
      content: "Promoting the Conference",
    },
    {
      type: "tldr",
      content:
        "Promote your talk — logos &amp; blurbs are on the <a href='/partners/assets'>assets page</a>; tag <strong>@zurichjs</strong> so we can amplify you.",
    },
    {
      type: "paragraph",
      content:
        "Please promote your talk and the conference as much as you can. It makes a real difference to a community-run, non-profit event, and it fills the room for <em>your</em> session. Ready-made logos, blurbs, key facts, and imagery are on our <a href='/partners/assets'>assets page</a>; grab whatever you need for posts, newsletters, or your company's channels, and tag <strong>@zurichjs</strong> so we can amplify you.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Zurich Essentials",
    },
    {
      type: "tldr",
      content:
        "English works everywhere. Pay by card in CHF, drink the tap water, and note things close early (shops shut Sundays) — plan dinner ahead. Zurich is pricey, but we cover most things; ask us for budget-friendly tips.",
    },
    {
      type: "paragraph",
      content:
        "<strong>Language:</strong> the local language is Swiss German (spoken), with standard German used in writing, but English is spoken practically everywhere, so you'll have no trouble getting around.",
    },
    {
      type: "paragraph",
      content: "A few phrases locals appreciate:",
    },
    {
      type: "list",
      items: [
        "<strong>Grüezi</strong> — hello (the classic Swiss greeting)",
        "<strong>Merci vilmal</strong> — thank you very much",
        "<strong>Proscht</strong> — cheers (make eye contact when clinking)",
      ],
    },
    {
      type: "paragraph",
      content: "<strong>Good to know:</strong>",
    },
    {
      type: "list",
      items: [
        "Currency is the <strong>Swiss franc (CHF)</strong> — cards and Apple/Google Pay are accepted almost everywhere.",
        "Tap water is excellent; refill your bottle at any of the 1,200+ public fountains.",
        "Tipping is not expected; rounding up for good service is a kind gesture.",
        "Most shops are <strong>closed on Sundays</strong>; the shops at the main station and airport are the exception. In general, things also <strong>close early</strong> here (many shops by 19:00–20:00, plenty of kitchens by 21:30–22:00), so plan ahead for dinner or a late-night drink.",
        "Zurich is very safe, including at night and on public transport.",
      ],
    },
    {
      type: "paragraph",
      content:
        "<strong>A word on prices:</strong> Zurich can be pricey. <strong>We cover most things</strong> (meals, the speaker dinner, the after party), so this mainly matters for your own extra plans. Ask us for budget-friendly recommendations any time; we know where to go. For orientation:",
    },
    {
      type: "list",
      items: [
        "Coffee or cappuccino: <strong>CHF 5–6</strong>",
        "Beer in a bar (0.5L): <strong>CHF 7–9</strong>; a glass of wine: <strong>CHF 8–10</strong>",
        "Street food / kebab / quick lunch: <strong>CHF 12–20</strong>",
        "Main course at a regular restaurant: <strong>CHF 25–40</strong>",
        "Single public transport ticket in the city: <strong>~CHF 5</strong>",
        "Bottle of water at a kiosk: <strong>CHF 3–4</strong> (or free from any fountain — bring a bottle)",
      ],
    },
    {
      type: "paragraph",
      content: "<strong>Worth a visit</strong> if you have spare hours:",
    },
    {
      type: "list",
      items: [
        "<strong>Old Town &amp; Niederdorf</strong> — cobbled lanes, cafés, and the Grossmünster church",
        "<strong>Lake Zürich promenade</strong> — or a short boat ride from Bürkliplatz",
        "<strong>Uetliberg</strong> — Zurich's local mountain, 20 minutes by train, panoramic views",
        "<strong>Zürich-West</strong> — the neighborhood around Technopark: Frau Gerolds Garten, Im Viadukt, street food and design shops",
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
            "<strong>Do I need a ticket as a speaker?</strong><br />No — you're covered. Just check in at registration on arrival and tell a volunteer you're a speaker.",
        },
        {
          type: "paragraph",
          content:
            "<strong>When exactly is my talk?</strong><br />It's on the <a href='/schedule'>schedule page</a>, and you'll get a Google Calendar invite up to a week before the conference. If it hasn't arrived by then, message us.",
        },
        {
          type: "paragraph",
          content:
            "<strong>I missed the morning tech check — what now?</strong><br />Find the A/V crew during any break. There's a final connect-and-confirm in the break before your session anyway.",
        },
        {
          type: "paragraph",
          content:
            "<strong>I can't make Community Day / the workshops — is that a problem?</strong><br />No. Everything except your own slot is optional; join whatever you can.",
        },
        {
          type: "paragraph",
          content:
            "<strong>Is there somewhere quiet to work or take a meeting?</strong><br />Yes — the dedicated speakers room at Technopark. If you need more than that, let us know and we'll arrange it.",
        },
      ],
    },
    {
      type: "paragraph",
      content:
        "That's everything for now. See you in September. For anything else: the group chat first, <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a> second, and there's always someone from the team nearby during the conference days.",
    },
  ],
};
