import { slugify } from "@/components/RichTextRenderer";
import type { ContentSection } from "@/data/info-pages";
import type { SpeakerGuideChatContext } from "@/data/speaker-guide-chat";

export interface GuideChunk {
  id: string;
  title: string;
  text: string;
  chatContext: string;
  searchTerms: string;
}

export interface ExtractedAnswer {
  text: string;
  chunks: GuideChunk[];
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, " ")
    // Single-pass decode so replacements can never form new entities that a
    // later pass would unescape again (CodeQL: double-unescaping).
    .replace(
      /&(?:amp|lt|gt|quot|#39|nbsp);/g,
      (entity) => HTML_ENTITIES[entity] ?? entity
    )
    .replace(/\s+/g, " ")
    .trim();

export const EMPTY_CHAT_CONTEXT: readonly SpeakerGuideChatContext[] = [];

/** Group the visible guide and its parallel chat context into one chunk per h2. */
export const buildChunks = (
  sections: ContentSection[],
  context: readonly SpeakerGuideChatContext[] = EMPTY_CHAT_CONTEXT
): GuideChunk[] => {
  const chunks: GuideChunk[] = [];
  let current: GuideChunk | null = null;

  const textOf = (section: ContentSection): string => {
    if (section.type === "list") {
      return (section.items ?? []).map(stripHtml).join(" ");
    }
    if (section.type === "groupedList") {
      return (section.groups ?? [])
        .map((group) =>
          [stripHtml(group.heading), ...group.items.map(stripHtml)].join(" ")
        )
        .join(" ");
    }
    if (section.type === "subsection") {
      return (section.subsections ?? []).map(textOf).join(" ");
    }
    if (section.type === "quicklinks") {
      // Navigation labels, not prose — they concatenate into unquotable
      // fragments and duplicate facts that live in real sections.
      return "";
    }
    if (section.type === "infotip") {
      const sentence = stripHtml(
        `${section.before ?? ""}${section.title ?? ""}${section.after ?? ""}`
      );
      const detail = section.content ? stripHtml(section.content) : "";
      return [sentence, detail].filter(Boolean).join(" ");
    }
    if (section.type === "infobox") {
      return [section.title, section.content ? stripHtml(section.content) : ""]
        .filter(Boolean)
        .join(". ");
    }
    return section.content ? stripHtml(section.content) : "";
  };

  sections.forEach((section) => {
    if (section.type === "heading" && section.level === "h2" && section.content) {
      current = {
        id: slugify(section.content),
        title: section.content,
        text: "",
        chatContext: "",
        searchTerms: "",
      };
      chunks.push(current);
      return;
    }
    if (current) {
      const text = textOf(section);
      if (text) current.text = `${current.text} ${text}`.trim();
    }
  });

  const contextBySection = new Map(
    context.map((entry) => [entry.sectionId, entry])
  );

  return chunks
    .map((chunk) => {
      const enrichment = contextBySection.get(chunk.id);
      return {
        ...chunk,
        chatContext: enrichment?.content.join(" ") ?? "",
        searchTerms: enrichment?.searchTerms.join(" ") ?? "",
      };
    })
    .filter(
      (chunk) => chunk.text.length > 0 || chunk.chatContext.length > 0
    );
};

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "do", "does", "i", "my", "me", "we", "our",
  "you", "your", "to", "of", "in", "on", "at", "for", "and", "or", "what",
  "when", "where", "how", "who", "can", "will", "there", "it", "be", "with",
  "whats", "happening", "someone", "anyone", "something", "anything", "up",
  "out", "down", "off", "if", "that", "this", "was",
]);

export const processTerm = (term: string): string | null => {
  const lower = term.toLowerCase();
  return lower.length > 1 && !STOPWORDS.has(lower) ? lower : null;
};

export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9äöüéèà]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

/** Whole-word match with light prefix stemming: "pick" matches "picks" and
 * "get" matches "getting", but short tokens can't reach into much longer
 * or unrelated words. */
const matchesToken = (word: string, token: string): boolean =>
  word === token ||
  (token.length >= 3 &&
    word.startsWith(token) &&
    word.length - token.length <= 4);

/** Inverse document frequency per matched term, computed over all sections:
 * rare terms ("pick", "getting") weigh more than ubiquitous ones ("speaker"). */
const computeIdf = (
  tokens: string[],
  chunks: GuideChunk[]
): Map<string, number> => {
  const idf = new Map<string, number>();
  const tokenLists = chunks.map(
    (chunk) =>
      tokenize(
        `${chunk.title} ${chunk.text} ${chunk.chatContext} ${chunk.searchTerms}`
      )
  );
  tokens.forEach((token) => {
    const df = tokenLists.filter((words) =>
      words.some((word) => matchesToken(word, token))
    ).length;
    if (df > 0) idf.set(token, Math.log(1 + chunks.length / df));
  });
  return idf;
};

/** Split chunk text into quotable fragments — sentences AND the "·"-separated
 * summary fragments, so a TL;DR line is never quoted whole. */
const splitSentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+|\s+·\s+/)
    .map((raw) => raw.replace(/^·\s*|\s*·$/g, "").trim())
    .filter((sentence) => sentence.length >= 15 && sentence.length <= 280);

/** Fraction of the shorter fragment's tokens also present in the longer one. */
const tokenOverlap = (a: string, b: string): number => {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  const [small, large] =
    tokensA.size <= tokensB.size ? [tokensA, tokensB] : [tokensB, tokensA];
  if (small.size === 0) return 0;
  let shared = 0;
  small.forEach((token) => {
    if (large.has(token)) shared += 1;
  });
  return shared / small.size;
};

/**
 * Pull the best-matching fragments out of the retrieved sections so Faru can
 * quote an actual answer. Matched terms come from MiniSearch (so typo-fixed
 * document terms work too), weighted by idf; fragments from higher-ranked
 * sections get a boost; near-duplicates are dropped, keeping the more
 * informative one. Only the sections that contributed are returned.
 */
export const extractAnswer = (
  matchedTerms: string[],
  rankedChunks: GuideChunk[],
  allChunks: GuideChunk[]
): ExtractedAnswer | null => {
  if (matchedTerms.length === 0 || rankedChunks.length === 0) return null;

  const idf = computeIdf(matchedTerms, allChunks);

  const candidates: Array<{ chunk: GuideChunk; text: string; score: number }> =
    [];
  rankedChunks.forEach((chunk, rank) => {
    const rankBonus = Math.max(0, 2 - rank);
    splitSentences(`${chunk.chatContext} ${chunk.text}`.trim()).forEach((sentence) => {
      const words = tokenize(sentence);
      let matchWeight = 0;
      idf.forEach((weight, token) => {
        if (words.some((word) => matchesToken(word, token))) {
          matchWeight += weight;
        }
      });
      if (matchWeight > 0) {
        candidates.push({
          chunk,
          text: sentence,
          score: matchWeight * 2 + rankBonus,
        });
      }
    });
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score || b.text.length - a.text.length);

  const selected: Array<{ chunk: GuideChunk; text: string }> = [];
  for (const candidate of candidates) {
    if (selected.length >= 2) break;
    if (selected.some((prior) => tokenOverlap(prior.text, candidate.text) >= 0.7)) {
      continue;
    }
    selected.push(candidate);
  }

  const chunks: GuideChunk[] = [];
  selected.forEach((entry) => {
    if (!chunks.includes(entry.chunk)) chunks.push(entry.chunk);
  });

  return {
    text: selected.map((entry) => entry.text).join("\n\n"),
    chunks,
  };
};
