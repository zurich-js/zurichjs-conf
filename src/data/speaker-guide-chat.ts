/** Extra retrieval context for Faru that is never rendered in the guide. */
export interface SpeakerGuideChatContext {
  sectionId: string;
  searchTerms: readonly string[];
  content: readonly string[];
}

export const speakerGuideChatContext = [
  {
    sectionId: "key-contacts",
    searchTerms: [
      "contact organizers",
      "contact organisers",
      "ask for help",
      "WhatsApp group",
      "email address",
    ],
    content: [
      "The whole ZurichJS core team is available in the private speakers WhatsApp group and at hello@zurichjs.com.",
      "Any core-team member can answer a question or connect a speaker with the right person.",
    ],
  },
  {
    sectionId: "key-dates-at-a-glance",
    searchTerms: [
      "conference dates",
      "September 9",
      "September 10",
      "September 11",
      "September 12",
      "speaker day out",
    ],
    content: [
      "Community Day is on Wednesday, September 9; workshops and the speaker dinner are on Thursday, September 10; conference day and the after party are on Friday, September 11; and the optional speaker day out is on Saturday, September 12.",
    ],
  },
  {
    sectionId: "quick-directions",
    searchTerms: [
      "directions",
      "route planner",
      "public transport",
      "SBB journey",
      "travel between venues",
    ],
    content: [
      "Use the SBB route cards for live public-transport directions between the airport, hotel, dinner, conference, and after-party venues.",
      "The conference venue is only about 50 metres from the speaker hotel, so that journey is a one-minute walk and needs no route planning.",
    ],
  },
  {
    sectionId: "speaker-info-form-and-plus-ones",
    searchTerms: [
      "personal speaker form",
      "dietary requirements",
      "accessibility requirements",
      "flight details",
      "plus one ticket",
      "guest badge",
    ],
    content: [
      "Each speaker receives their personal speaker-info form link directly.",
      "Plus ones do not need to buy a conference ticket; ZurichJS prepares a VIP badge after their details are added to the form.",
    ],
  },
  {
    sectionId: "your-talk-slides-stage-and-tech",
    searchTerms: [
      "tech check",
      "technical check",
      "sound check",
      "stage check",
      "A/V check",
      "AV check",
      "microphone check",
      "mic check",
      "presentation check",
      "rehearsal",
    ],
    content: [
      "Conference tech checks must be completed before the conference starts at 08:45, at the individual time confirmed with each speaker.",
      "The tech check covers the display connection, presentation clicker, and microphone.",
      "The A/V crew reconnects and verifies each setup during the break before that speaker's session.",
      "A speaker who misses the morning tech check should find the A/V crew during the next break.",
    ],
  },
  {
    sectionId: "arriving-via-zurich-airport",
    searchTerms: [
      "airport pickup",
      "airport train",
      "flight arrival",
      "SBB Mobile",
      "Uber",
      "Bolt",
      "taxi",
    ],
    content: [
      "A ZurichJS volunteer can meet a speaker at Zurich Airport when current flight details are present in the speaker-info form.",
      "The airport railway station is below the terminal, and Zurich-bound trains run every few minutes.",
    ],
  },
  {
    sectionId: "speaker-hotel",
    searchTerms: [
      "Novotel",
      "hotel address",
      "accommodation",
      "breakfast",
      "distance to conference",
    ],
    content: [
      "The speaker hotel is Novotel Zürich City West at Schiffbaustrasse 13, 8005 Zürich.",
      "Breakfast is included, and Technopark is only about 50 metres from the hotel.",
    ],
  },
  {
    sectionId: "workshop-day-for-instructors",
    searchTerms: [
      "workshop teacher",
      "workshop instructor",
      "workshop room",
      "workshop setup",
      "workshop lunch",
    ],
    content: [
      "Workshop delivery is a separate Thursday teaching day from the Friday conference talk.",
      "ZurichJS confirms the workshop location about two weeks before and assigns a dedicated logistics and A/V contact about one week before.",
    ],
  },
  {
    sectionId: "speaker-dinner-at-ziegelhtte",
    searchTerms: [
      "speaker dinner",
      "Thursday dinner",
      "Ziegelhütte",
      "bowling",
      "Swiss dinner",
    ],
    content: [
      "The speaker dinner is a Swiss country-style dinner and bowling evening at Wirtschaft Ziegelhütte on Thursday from 18:30 to 22:00.",
      "Allow about 35 minutes from the hotel by public transport followed by a scenic walk.",
    ],
  },
  {
    sectionId: "conference-day-at-technopark",
    searchTerms: [
      "conference venue",
      "Technopark address",
      "doors open",
      "check in",
      "speaker card",
      "speaker room",
      "conference lunch",
    ],
    content: [
      "Conference day is Friday, September 11 at Technopark Zürich, Technoparkstrasse 1, 8005 Zürich.",
      "Attendee check-in is planned to open at 07:30, and the conference starts at 08:45.",
      "Speakers should receive their speaker card in advance; otherwise it will be waiting at the check-in desk.",
    ],
  },
  {
    sectionId: "after-party-at-seebad-enge",
    searchTerms: [
      "afterparty",
      "after party",
      "Friday night",
      "Seebad Enge",
      "swimming",
      "bathing suit",
    ],
    content: [
      "The after party is at Seebad Enge on Friday from 19:00 to 23:00, with drinks and apéro included.",
      "Swimming is optional; speakers only need a bathing suit if they want to swim.",
    ],
  },
  {
    sectionId: "if-you-fall-sick",
    searchTerms: [
      "illness",
      "sick",
      "pharmacy",
      "doctor",
      "medical help",
      "emergency number",
    ],
    content: [
      "A speaker who feels ill should tell an organizer as early as possible so the schedule can be adjusted without guilt.",
      "Call 144 for an ambulance or 112 for the general emergency service in Switzerland.",
    ],
  },
] as const satisfies readonly SpeakerGuideChatContext[];
