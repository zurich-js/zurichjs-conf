import { describe, expect, it } from "vitest";
import { buildChunks } from "@/components/speaker-guide/GuideChat";
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
    expect(conferenceChunk?.text).not.toContain(
      "Select the address to copy it"
    );
  });
});
