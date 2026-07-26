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
      content: "Key Dates at a Glance",
    },
    {
      type: "list",
      items: [
        "<strong>Tuesday, September 9:</strong> Community Day — a relaxed ZurichJS meetup to warm up and meet the community. Optional, but lovely if you're in town.",
        "<strong>Wednesday, September 10:</strong> Workshop Day — workshops run across Zurich (locations confirmed to instructors in advance).",
        "<strong>Thursday, September 11:</strong> Conference Day at Technopark Zürich — doors open in the morning; the full agenda is on the <a href='/schedule'>schedule page</a>.",
        "<strong>Thursday, September 11, 19:00–23:00:</strong> After party at Seebad Enge on Lake Zürich.",
        "<strong>Friday, September 12:</strong> Nothing scheduled — travel home whenever suits you.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Key Contacts",
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
      type: "paragraph",
      content:
        "Most speakers fly into <strong>Zurich Airport (ZRH)</strong>. The airport is exceptionally well connected: the train station sits directly beneath the terminal, and trains to Zürich Hauptbahnhof (main station, \"Zürich HB\") run every few minutes and take about 10–15 minutes. Tram 10 also runs from the airport into the city if you prefer a slower, scenic ride.",
    },
    {
      type: "list",
      items: [
        "Buy tickets at the machines, or use the <strong>SBB Mobile</strong> app (easiest — supports international cards).",
        "A regular ticket from the airport into the city covers all onward trams and buses within its zones for its validity window.",
        "Taxis are available but expensive (expect CHF 60–70 to the city center) — the train is genuinely the better option.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Getting Around Zurich",
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
      type: "paragraph",
      content:
        "The main conference day (September 11) takes place at <strong>Technopark Zürich, Technoparkstrasse 1, 8005 Zürich</strong> — Switzerland's largest technology center, in Zurich's innovation district (Zürich-West).",
    },
    {
      type: "list",
      items: [
        "<strong>Getting there:</strong> tram lines 4 and 13 stop directly at the <em>Technopark</em> stop; the S-Bahn station <em>Hardbrücke</em> is a ~7 minute walk away.",
        "<strong>Schedule:</strong> the up-to-date program (including your slot) lives on the <a href='/schedule'>schedule page</a>.",
        "<strong>On arrival:</strong> check in at the registration desk and let a volunteer know you're a speaker — we'll take it from there, including a tech check before your talk.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "Workshop Instructors",
    },
    {
      type: "paragraph",
      content:
        "If you're running a workshop on September 10, two things are handled on a fixed timeline so you're never guessing:",
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
        "Until your point of contact is assigned, direct workshop questions to Faris or the speakers group chat.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Speaker Information Form",
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
      type: "paragraph",
      content:
        "Plus ones are welcome! The only rule: <strong>tell us in advance</strong> — via the speaker information form or by contacting us directly — so we can plan catering, badges, and after-party capacity. Please don't bring someone unannounced on the day.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Your Slides",
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
      type: "paragraph",
      content:
        "Every speaker gets a tech check before going on stage — you will not be plugging in cold in front of the audience:",
    },
    {
      type: "list",
      items: [
        "<strong>Morning of conference day:</strong> come by the stage when you arrive (before doors open) for a full run: display output, resolution, clicker, and mic.",
        "<strong>The break before your session:</strong> the A/V crew does a final connect-and-confirm with you so the handover between talks is seamless.",
        "<strong>Workshop instructors:</strong> your assigned point of contact will arrange the room and A/V check with you directly — typically right before your workshop starts on September 10.",
      ],
    },
    {
      type: "heading",
      level: "h2",
      content: "After Party at Seebad Enge",
    },
    {
      type: "paragraph",
      content:
        "After the conference we've booked <strong>Seebad Enge</strong> — a private lakeside venue right on Lake Zürich — from <strong>19:00 to 23:00</strong> on September 11. Drinks and apéro are included, the September sunset over the Alps is free, and if you fancy it you can even swim in the lake. Speakers have full access, of course.",
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
      type: "paragraph",
      content:
        "Things happen — if you fall ill or can't make your slot, <strong>tell us as early as you can</strong> via the speakers group chat or <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a> so we can adjust the schedule. No guilt, no drama; your health comes first. For medical emergencies in Switzerland dial <strong>144</strong> (ambulance) or <strong>112</strong> (general emergency); pharmacies (\"Apotheke\") are plentiful and staff speak English.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Speakers Group Chat",
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
      type: "paragraph",
      content:
        "Please promote your talk and the conference as much as you can — it genuinely helps a community-run, non-profit event, and it fills the room for <em>your</em> session. Ready-made logos, blurbs, key facts, and imagery are on our <a href='/partners/assets'>assets page</a> — grab whatever you need for posts, newsletters, or your company's channels, and tag <strong>@zurichjs</strong> so we can amplify you.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Zurich Essentials",
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
        "Most shops are <strong>closed on Sundays</strong> — the shops at the main station and airport are the exception.",
        "Zurich is very safe, including at night and on public transport.",
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
      type: "paragraph",
      content:
        "That's it — see you in September! And remember: group chat first, <a href='mailto:hello@zurichjs.com'>hello@zurichjs.com</a> second, and there's always someone from the team nearby during the conference days.",
    },
  ],
};
