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
        "Welcome aboard — we're thrilled to have you speaking at ZurichJS Conf 2026! This guide collects everything you need before and during the conference. Skim the table of contents, and if anything is unclear, just ask in the speakers group chat or email <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>. You will never be on your own: our team, volunteers, and guides will be around at every step.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Quick Directions",
    },
    {
      type: "paragraph",
      content:
        "One-tap Google Maps routes between the places you'll actually go:",
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
          label: "Speaker hotel → Seebad Enge",
          sublabel: "After party · ~20 min by public transport",
          href: "https://www.google.com/maps/dir/?api=1&origin=Novotel+Z%C3%BCrich+City+West&destination=Seebad+Enge&travelmode=transit",
        },
        {
          label: "Zürich HB → Speaker hotel",
          sublabel: "Main station · ~10 min by S-Bahn or tram",
          href: "https://www.google.com/maps/dir/?api=1&origin=Z%C3%BCrich+HB&destination=Novotel+Z%C3%BCrich+City+West&travelmode=transit",
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
        "Community Day Wed Sept 9th (evening, from 18:00) · Workshops Thu Sept 10th · Conference Fri Sept 11th at Technopark · After party Fri 19:00–23:00 · Speaker day out Sat Sept 12th, 10:00–16:00.",
    },
    {
      type: "list",
      items: [
        "<strong>Wednesday, September 9th:</strong> Community Day — evening only, from <strong>18:00</strong>: a relaxed ZurichJS meetup to warm up and meet the community. Optional, but lovely if you're in town. Check the <a href='https://zurichjs.com/events/sep-2026' target='_blank' rel='noopener noreferrer'>meetup agenda</a> and <a href='https://www.meetup.com/zurich-js/events/315488367/' target='_blank' rel='noopener noreferrer'>RSVP on Meetup</a>.",
        "<strong>Thursday, September 10th:</strong> Workshop Day — workshops run across Zurich (locations confirmed to instructors in advance).",
        "<strong>Friday, September 11th:</strong> Conference Day at Technopark Zürich — doors open at 07:00; the full agenda is on the <a href='/schedule'>schedule page</a>.",
        "<strong>Friday, September 11th, 19:00–23:00:</strong> After party at Seebad Enge on Lake Zürich.",
        "<strong>Saturday, September 12th, 10:00–16:00:</strong> Speaker day out — we're planning activities with everyone's departure flights in mind: perhaps a light hike or a tour of Zurich. Details TBD, but pencil in 10:00–16:00.",
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
        "Your people: Faris, Bogdan, Nadja &amp; Colin. Fastest channel is the speakers group chat; otherwise <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>.",
    },
    {
      type: "paragraph",
      content:
        "Four core organizers run the conference — grab any of us in person, in the speakers group chat, or via <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>:",
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
        "On the days themselves you'll also be supported by our volunteer crew — they'll be clearly identifiable at the venues and can always route you to the right person.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Arriving via Zurich Airport",
    },
    {
      type: "tldr",
      content:
        "Train from the airport to Zürich HB every few minutes (~12 min) — use the <a href='https://www.sbb.ch/en' target='_blank' rel='noopener noreferrer'>SBB</a> app, skip taxis. A volunteer with a ZurichJS sign can meet you and ride with you.",
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
        "A regular ticket from the airport into the city covers all onward trams and buses within its zones for its validity window.",
        "Taxis are available but expensive (expect CHF 60–70 to the city center) — the train is by far the better option.",
      ],
    },
    {
      type: "paragraph",
      content:
        "And here's the best part: <strong>you don't have to navigate your arrival alone</strong>. We'll assign volunteers and support to come pick you up — look for the person holding a <strong>ZurichJS sign</strong> — and they'll guide you on public transport all the way to your hotel. Your arrival details are part of the speaker information form, so make sure we have your flight times.",
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
        "Speakers stay at the <a href='https://www.google.com/maps/search/?api=1&amp;query=Novotel+Z%C3%BCrich+City+West' target='_blank' rel='noopener noreferrer'><strong>Novotel Zürich City West</strong></a> (Schiffbaustrasse 13, 8005 Zürich) — right in Zürich-West, just a <strong>1–2 minute walk from Technopark</strong>, surrounded by restaurants and bars. We picked it for convenience: you can slip back to your room between sessions whenever you need a breather.",
    },
    {
      type: "list",
      items: [
        "<strong>From the airport (~35–40 min):</strong> train to Zürich HB, then an S-Bahn one stop to <em>Hardbrücke</em> — the hotel is a few minutes' walk from the station. Here's the <a href='https://www.google.com/maps/dir/?api=1&amp;origin=Zurich+Airport&amp;destination=Novotel+Z%C3%BCrich+City+West&amp;travelmode=transit' target='_blank' rel='noopener noreferrer'>step-by-step route on Google Maps</a>, or plan it live on <a href='https://www.sbb.ch/en' target='_blank' rel='noopener noreferrer'>SBB</a>.",
        "<strong>To Technopark:</strong> 1–2 minutes on foot — no transport needed on conference morning, and an easy escape hatch when you want a quiet moment.",
        "<strong>Escort included:</strong> as above, a volunteer can meet you at the airport with a ZurichJS sign and ride the route with you, so you never have to puzzle out the Swiss transit system jet-lagged.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Getting Around Zurich",
    },
    {
      type: "tldr",
      content:
        "One ticket covers trams, buses, S-Bahn, and boats. Always carry a valid ticket — inspections are random but real.",
    },
    {
      type: "paragraph",
      content:
        "Zurich's public transport (ZVV) is frequent, punctual, and safe at all hours — trams, buses, S-Bahn trains, and even boats run on one ticket system. Nobody checks tickets at the door; roaming inspections happen instead, so always travel with a valid ticket. The SBB Mobile or ZVV app will route you anywhere door to door. Most places in the city are also within a pleasant 20–30 minute walk of each other.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Conference Day at Technopark",
    },
    {
      type: "tldr",
      content:
        "Technoparkstrasse 1, 8005 Zürich — 1–2 min walk from your hotel; doors open at 07:00. Check in at registration and tell a volunteer you're a speaker. Full agenda on the <a href='/schedule'>schedule page</a>.",
    },
    {
      type: "paragraph",
      content:
        "The main conference day (September 11th) takes place at <strong>Technopark Zürich, Technoparkstrasse 1, 8005 Zürich</strong> — Switzerland's largest technology center, in Zurich's innovation district (Zürich-West).",
    },
    {
      type: "list",
      items: [
        "<strong>Doors open at 07:00:</strong> the Swiss like their early mornings — and the crew will already be there. Come as early as you like; it's the calmest time for a tech check and a coffee.",
        "<strong>Getting there:</strong> your hotel is a 1–2 minute walk away — otherwise tram lines 4 and 13 stop directly at the <em>Technopark</em> stop, and the S-Bahn station <em>Hardbrücke</em> is a ~7 minute walk away.",
        "<strong>Schedule:</strong> the up-to-date program (including your slot) lives on the <a href='/schedule'>schedule page</a>. You should also receive a <strong>Google Calendar invite</strong> for your slot up to a week before the conference — if it hasn't landed by then, ping us in the group chat or at <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>.",
        "<strong>On arrival:</strong> check in at the registration desk and let a volunteer know you're a speaker — we'll take it from there, including a tech check before your talk.",
        "<strong>Speakers room:</strong> there's a dedicated room for speakers to work, prep, or just decompress away from the crowd. If you need any accommodations beyond that for work or meetings, let us know and we'll sort something out.",
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
        "If you're running a workshop on September 10th, two things are handled on a fixed timeline so you're never guessing:",
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
        "And don't worry about food: whether you're a morning or afternoon instructor, <strong>lunch is provided</strong> during the <strong>13:00–14:00</strong> lunch break. Best to grab breakfast beforehand — it's included at your hotel.",
    },
    {
      type: "paragraph",
      content:
        "Until your point of contact is assigned, direct workshop questions to Faris or the speakers group chat.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Speaker Information Form",
    },
    {
      type: "tldr",
      content:
        "A short form is coming your way — fill it in promptly: dietary needs, plus one, flight times.",
    },
    {
      type: "paragraph",
      content:
        "Ahead of the conference you'll receive a short form to fill out. Please complete it promptly — it's how we capture <strong>dietary restrictions</strong>, whether you're bringing a <strong>plus one</strong>, and other practical details we need to take proper care of you. If the form hasn't reached you and the conference is getting close, ping us in the group chat or at <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Plus Ones",
    },
    {
      type: "tldr",
      content:
        "Plus ones are welcome — loved ones make a conference better. Just tell us in advance so we can plan seats, food, and capacity. No surprise guests on the day.",
    },
    {
      type: "paragraph",
      content:
        "Plus ones are welcome! We believe a conference is more fun with your loved ones and friends around, and we want to accommodate them. The only rule: <strong>tell us in advance</strong> — via the speaker information form or by contacting us directly.",
    },
    {
      type: "paragraph",
      content:
        "Why the notice? An accurate headcount matters for <strong>safety and venue capacity limits</strong>, and especially for ordering food. We don't want waste — or worse, someone we lost count of standing without a seat or a plate. Zurich can be a bit tight on space and expensive per head, so knowing your numbers early lets us take proper care of everyone. Please don't bring someone unannounced on the day.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Your Slides",
    },
    {
      type: "tldr",
      content:
        "16:9 at 1920×1080, dark theme, big text (24pt+ body, 18pt+ code). Send your deck to us before the conference.",
    },
    {
      type: "paragraph",
      content:
        "Please send us your slides <strong>before the conference</strong> — it lets us verify formats and resolutions on the venue hardware and have a backup ready if your laptop misbehaves. Share them in the speakers group chat or email them to <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>. If your talk includes live demos, mention it so we can plan the tech check accordingly.",
    },
    {
      type: "paragraph",
      content: "A few guidelines so your deck looks great on the big screen:",
    },
    {
      type: "list",
      items: [
        "<strong>Aspect ratio:</strong> build your deck in <strong>16:9</strong>. The stage output is Full HD (1920×1080) — 16:9 decks fill the screen edge to edge, while 4:3 decks get letterboxed and shrink.",
        "<strong>Dark mode:</strong> we recommend <strong>dark backgrounds with light, high-contrast text</strong> — dark slides read far better under stage lighting and are much easier on the audience's eyes than a glowing white wall.",
        "<strong>Type size:</strong> keep body text at ~24pt or larger and code samples at 18pt+ with a high-contrast syntax theme. Rule of thumb: if you can read it standing three meters behind your laptop, the back row can read it too.",
        "<strong>Videos &amp; audio:</strong> embed media in the deck rather than relying on streaming, and tell us in advance if your talk needs sound so the A/V crew can wire it up.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "On Stage: A/V, Podium & Cabling",
    },
    {
      type: "tldr",
      content:
        "HDMI at the podium; adapters and a clicker are provided — bring anything exotic yourself, plus your charger. You'll be miked, so roam freely.",
    },
    {
      type: "list",
      items: [
        "<strong>Cabling:</strong> the stage connection is <strong>HDMI</strong>. We'll have USB-C and other common adapters on hand, but if your machine needs anything unusual, please bring your own adapter — and your charger; there's power at the podium.",
        "<strong>Clicker:</strong> a presenter remote is provided, and you're welcome to bring your own if you prefer it.",
        "<strong>Podium:</strong> the podium sits to the side of the stage with the main screen beside you, so you never block the audience's view of your slides. You're not chained to it — you'll be miked up, so feel free to use the whole stage.",
        "<strong>Backup:</strong> because you sent your slides in advance (see above), a backup machine is standing by if your laptop refuses to cooperate on the day.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Tech Checks",
    },
    {
      type: "tldr",
      content:
        "Full check the morning of conference day (before doors open), plus a final connect in the break before your session. Workshops: via your point of contact.",
    },
    {
      type: "paragraph",
      content:
        "Every speaker gets a tech check before going on stage — you will not be plugging in cold in front of the audience:",
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
        "After the conference we've booked <strong>Seebad Enge</strong> — a private lakeside venue right on Lake Zürich — from <strong>19:00 to 23:00</strong> on September 11th. Drinks and apéro are included, the September sunset over the Alps is free, and you'll be able to swim in the lake — so <strong>pack a bathing suit</strong> (entirely optional, but you'll be glad you did). There'll also be a <strong>photobooth</strong> — come grab a memento with your fellow speakers. Speakers have full access, of course.",
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
        "<strong>On foot (~35 min):</strong> a lovely stroll along the Limmat and the lakefront promenade.",
      ],
    },
    {
      type: "paragraph",
      content:
        "You won't have to figure this out alone — volunteers and guides will help groups make their way over after the closing session.",
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
        "Things happen — if you fall ill or can't make your slot, <strong>tell us as early as you can</strong> via the speakers group chat or <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a> so we can adjust the schedule. No guilt, no drama; your health comes first. And <strong>feel free to message any of us privately</strong> — we've all dealt with health stuff, we're here to support you, and we can guide you to pharmacies (\"Apotheke\" — plentiful, and staff speak English) or whatever else you need. For medical emergencies in Switzerland dial <strong>144</strong> (ambulance) or <strong>112</strong> (general emergency).",
    },
    {
      type: "heading",
      level: "h2",
      content: "Speakers Group Chat",
    },
    {
      type: "tldr",
      content:
        "Not in the chat yet? Ping Faris, Bogdan, or Nadja and you'll be added right away.",
    },
    {
      type: "paragraph",
      content:
        "There's a dedicated group chat for all speakers — announcements, coordination, and fellow-speaker banter live there, and it's the fastest way to reach the organizers. <strong>If you haven't been invited yet, contact Faris, Bogdan, or Nadja</strong> (or email <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>) and we'll add you right away.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Promoting the Conference",
    },
    {
      type: "tldr",
      content:
        "Promote your talk! Grab logos &amp; blurbs from the <a href='/partners/assets'>assets page</a> and tag <strong>@zurichjs</strong>.",
    },
    {
      type: "paragraph",
      content:
        "Please promote your talk and the conference as much as you can — it makes a real difference to a community-run, non-profit event, and it fills the room for <em>your</em> session. Ready-made logos, blurbs, key facts, and imagery are on our <a href='/partners/assets'>assets page</a> — grab whatever you need for posts, newsletters, or your company's channels, and tag <strong>@zurichjs</strong> so we can amplify you.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Zurich Essentials",
    },
    {
      type: "tldr",
      content:
        "English works everywhere. Pay by card in CHF, drink the tap water, and note things close early (shops shut Sundays) — plan dinner ahead. Zurich is pricey, but we've got you covered most of the time; ask us for budget-friendly tips.",
    },
    {
      type: "paragraph",
      content:
        "<strong>Language:</strong> the local language is Swiss German (spoken), with standard German used in writing — but English is spoken practically everywhere, so you'll have no trouble getting around.",
    },
    {
      type: "paragraph",
      content: "A few phrases that earn instant goodwill:",
    },
    {
      type: "list",
      items: [
        "<strong>Grüezi</strong> — hello (the classic Swiss greeting)",
        "<strong>Merci vilmal</strong> — thank you very much",
        "<strong>Exgüsi</strong> — excuse me",
        "<strong>En Guete</strong> — enjoy your meal",
        "<strong>Proscht</strong> — cheers (make eye contact when clinking!)",
        "<strong>Ade</strong> — goodbye",
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
        "Tap water is excellent — refill your bottle at any of the 1,200+ public fountains.",
        "Tipping is not expected; rounding up for good service is a kind gesture.",
        "Most shops are <strong>closed on Sundays</strong> — the shops at the main station and airport are the exception. In general, things also <strong>close early</strong> here (many shops by 19:00–20:00, plenty of kitchens by 21:30–22:00), so it's good to plan in advance where you're heading for dinner or a late-night drink rather than wandering and hoping.",
        "Zurich is very safe, including at night and on public transport.",
      ],
    },
    {
      type: "paragraph",
      content:
        "<strong>A word on prices:</strong> Zurich can be super pricey at times. Don't stress — <strong>we'll be sorting you out most of the time</strong> (meals, the after party, and so on), so this only matters for your own extra plans. If you want budget-friendly recommendations for anything, just ask us — we know the good cheap spots. For orientation, typical prices look like this:",
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
        "<strong>Lindenhof</strong> — a quiet hilltop with the best free view of the old town",
        "<strong>Uetliberg</strong> — Zurich's local mountain, 20 minutes by train, panoramic views",
        "<strong>Zürich-West</strong> — the neighborhood around Technopark: Frau Gerolds Garten, Im Viadukt, street food and design shops",
        "<strong>Kunsthaus</strong> — one of Switzerland's finest art museums",
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
            "<strong>When exactly is my talk?</strong><br />It's on the <a href='/schedule'>schedule page</a>, and you'll get a Google Calendar invite up to a week before the conference. If it hasn't arrived by then, ping us.",
        },
        {
          type: "paragraph",
          content:
            "<strong>Can my plus one join the after party?</strong><br />Yes — as long as you've told us in advance so we can plan seats, food, and capacity. See <a href='#plus-ones'>Plus Ones</a>.",
        },
        {
          type: "paragraph",
          content:
            "<strong>Where do I send my slides?</strong><br />The speakers group chat or <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a> — before the conference, please. See <a href='#your-slides'>Your Slides</a>.",
        },
        {
          type: "paragraph",
          content:
            "<strong>I missed the morning tech check — what now?</strong><br />No stress: grab the A/V crew during any break. There's a final connect-and-confirm in the break before your session anyway.",
        },
        {
          type: "paragraph",
          content:
            "<strong>I can't make Community Day / the workshops — is that a problem?</strong><br />Not at all. Everything except your own slot is optional. Come for what you can, skip what you can't.",
        },
        {
          type: "paragraph",
          content:
            "<strong>Is there somewhere quiet to work or take a meeting?</strong><br />Yes — the dedicated speakers room at Technopark. Need more than that? Let us know and we'll sort something out.",
        },
        {
          type: "paragraph",
          content:
            "<strong>Something urgent came up on the day — who do I contact?</strong><br />The speakers group chat is fastest. Otherwise grab any volunteer on site, or email <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a>.",
        },
      ],
    },
    {
      type: "paragraph",
      content:
        "That's it — see you in September! And remember: group chat first, <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a> second, and there's always someone from the team nearby during the conference days.",
    },
  ],
};
