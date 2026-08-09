import { describe, expect, it } from "vitest";
import { buildChunks } from "@/components/speaker-guide/retrieval";
import { speakerGuide } from "@/data/speaker-guide";
import { speakerGuideChatContext } from "@/data/speaker-guide-chat";

describe("GuideChat retrieval chunks", () => {
  const chunks = buildChunks(
    speakerGuide.sections,
    speakerGuideChatContext
  );

  it("keeps chat context parallel to visible guide text", () => {
    const techChunk = chunks.find(
      (chunk) => chunk.id === "your-talk-slides-stage-and-tech"
    );

    expect(techChunk?.chatContext).toContain(
      "Conference tech checks must be completed before the conference starts at 08:45"
    );
    expect(techChunk?.searchTerms).toContain("sound check");
    expect(techChunk?.text).not.toContain(
      "Conference tech checks must be completed"
    );
  });

  it("maps every enrichment to a visible guide section", () => {
    const chunkIds = new Set(chunks.map((chunk) => chunk.id));

    speakerGuideChatContext.forEach((entry) => {
      expect(chunkIds.has(entry.sectionId), entry.sectionId).toBe(true);
    });
  });

  it("preserves the surrounding infotip sentence in source text", () => {
    const conferenceChunk = chunks.find(
      (chunk) => chunk.id === "conference-day-at-technopark"
    );

    expect(conferenceChunk?.text).toContain(
      "Conference day takes place on Friday, September 11, at Technopark Zürich"
    );
  });

  it("drops quicklink navigation labels from the corpus", () => {
    const quickDirections = chunks.find(
      (chunk) => chunk.id === "quick-directions"
    );

    // The section may survive via its intro text or chat context, but the
    // "A → B" card labels must never become quotable corpus text.
    chunks.forEach((chunk) => {
      expect(chunk.text).not.toContain("→");
    });
    if (quickDirections) {
      expect(quickDirections.text).not.toContain("Zurich Airport");
    }
  });

  it("indexes grouped key dates and the full September 12 plan", () => {
    const keyDates = chunks.find(
      (chunk) => chunk.id === "key-dates-at-a-glance"
    );

    expect(keyDates?.text).toContain("Saturday, September 12");
    expect(keyDates?.text).toContain("light hike or a tour of Zurich");
    expect(keyDates?.searchTerms).toContain("12th");
    expect(keyDates?.chatContext).toContain("On the 12th");
  });
});
