import React, { useEffect, useMemo, useRef, useState } from "react";
import MiniSearch from "minisearch";
import { Bot, ChevronRight, RotateCcw, Send } from "lucide-react";
import { analytics } from "@/lib/analytics/client";
import { slugify } from "@/components/RichTextRenderer";
import type { ContentSection } from "@/data/info-pages";
import type { SpeakerGuideChatContext } from "@/data/speaker-guide-chat";

export interface GuideChatProps {
  sections: ContentSection[];
  context?: SpeakerGuideChatContext[];
}

interface GuideChunk {
  id: string;
  title: string;
  text: string;
  chatContext: string;
  searchTerms: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sources?: GuideChunk[];
  streaming?: boolean;
}

const GREETING =
  "Hey! 👋 I'm Faru, your speaker guide companion. Fun fact: \"Faru\" was Faris's nickname as a kid! He graciously lent it to me, so technically I'm the second Faru to help people find their way around. Ask me about arrival, the venues, your slides, the after party; anything from the guide.";

const SUGGESTIONS = [
  "How do I get to the after party?",
  "When are the tech checks?",
  "What's happening on the 12th?",
  "Where is the speaker hotel?",
];

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

const EMPTY_CHAT_CONTEXT: SpeakerGuideChatContext[] = [];

/** Group the visible guide and its parallel chat context into one chunk per h2. */
export const buildChunks = (
  sections: ContentSection[],
  context: SpeakerGuideChatContext[] = EMPTY_CHAT_CONTEXT
): GuideChunk[] => {
  const chunks: GuideChunk[] = [];
  let current: GuideChunk | null = null;

  const textOf = (section: ContentSection): string => {
    if (section.type === "list") {
      return (section.items ?? []).map(stripHtml).join(" ");
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

const processTerm = (term: string): string | null => {
  const lower = term.toLowerCase();
  return lower.length > 1 && !STOPWORDS.has(lower) ? lower : null;
};

const tokenize = (text: string): string[] =>
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

interface ExtractedAnswer {
  text: string;
  chunks: GuideChunk[];
}

/**
 * Pull the best-matching fragments out of the retrieved sections so Faru can
 * quote an actual answer. Matched terms come from MiniSearch (so typo-fixed
 * document terms work too), weighted by idf; fragments from higher-ranked
 * sections get a boost; near-duplicates are dropped, keeping the more
 * informative one. Only the sections that contributed are returned.
 */
const extractAnswer = (
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

const excerpt = (text: string, maxLength = 200): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength).trimEnd()}…`;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const TypingDots: React.FC = () => (
  <span className="inline-flex items-center gap-1" aria-label="Faru is typing">
    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
  </span>
);

const FaruAvatar: React.FC = () => (
  <span
    className="w-7 h-7 rounded-full bg-brand-yellow-main flex items-center justify-center flex-shrink-0"
    aria-hidden="true"
  >
    <Bot className="w-4 h-4 text-gray-900" />
  </span>
);

/**
 * Full-page chat over the speaker guide. Retrieval is a MiniSearch index
 * (BM25-style scoring, prefix + fuzzy matching for typos) built in the
 * browser; the best-matching sentences from the top sections are quoted
 * back. No AI model, no server calls.
 */
export const GuideChat: React.FC<GuideChatProps> = ({
  sections,
  context = EMPTY_CHAT_CONTEXT,
}) => {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const aliveRef = useRef(true);

  const chunks = useMemo(
    () => buildChunks(sections, context),
    [sections, context]
  );

  const chunkById = useMemo(
    () => new Map(chunks.map((chunk) => [chunk.id, chunk])),
    [chunks]
  );

  const miniSearch = useMemo(() => {
    const index = new MiniSearch<GuideChunk>({
      fields: ["title", "text", "chatContext", "searchTerms"],
      processTerm,
      searchOptions: {
        boost: { title: 3, chatContext: 2, searchTerms: 5 },
        prefix: true,
        fuzzy: 0.2,
        processTerm,
      },
    });
    index.addAll(chunks);
    return index;
  }, [chunks]);

  useEffect(() => {
    setMounted(true);
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy]);

  /** Reveal an assistant reply word by word so it reads like a live answer. */
  const streamReply = async (
    fullText: string,
    sources?: GuideChunk[]
  ): Promise<void> => {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "", streaming: true },
    ]);
    const parts = fullText.split(/(\s+)/);
    let revealed = "";
    for (const part of parts) {
      if (!aliveRef.current) return;
      revealed += part;
      if (part.trim()) {
        const snapshot = revealed;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            text: snapshot,
            streaming: true,
          };
          return next;
        });
        await sleep(24);
      }
    }
    if (!aliveRef.current) return;
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { role: "assistant", text: fullText, sources };
      return next;
    });
  };

  const ask = async (
    rawQuestion: string,
    questionSource: "typed" | "suggestion"
  ): Promise<void> => {
    const question = rawQuestion.trim();
    if (!question || busy) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setBusy(true);

    const results = miniSearch.search(question).slice(0, 3);
    const sources = results
      .map((result) => chunkById.get(String(result.id)))
      .filter((chunk): chunk is GuideChunk => Boolean(chunk));
    const queryTerms = Array.from(new Set(tokenize(question)));
    // Document-side terms are retained only as a fallback, so a typo can still
    // resolve without allowing broad fuzzy matches to pollute a normal answer.
    const matchedTerms = Array.from(
      new Set(results.flatMap((result) => Object.keys(result.match)))
    );
    const answer =
      extractAnswer(queryTerms, sources, chunks) ??
      extractAnswer(matchedTerms, sources, chunks);

    analytics.track("speaker_guide_question_asked", {
      question,
      question_source: questionSource,
      results_count: sources.length,
      answered: Boolean(answer),
      matched_sections: (answer ? answer.chunks : sources).map(
        (chunk) => chunk.title
      ),
    });

    if (sources.length === 0) {
      await sleep(600);
      await streamReply(
        "Hmm, I couldn't find that in the guide. Ask in the speakers group chat or email hello@zurichjs.com — a human will know!"
      );
    } else {
      await sleep(600);
      await streamReply(
        answer
          ? `Here's the useful bit:\n\n${answer.text}`
          : "Here's what I found about that:",
        answer ? answer.chunks : sources
      );
    }

    if (!aliveRef.current) return;
    setBusy(false);
    inputRef.current?.focus();
  };

  const reset = (): void => {
    if (busy) return;
    analytics.track("speaker_guide_chat_reset", {
      messages_count: messages.length,
    });
    setMessages([{ role: "assistant", text: GREETING }]);
    inputRef.current?.focus();
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Loading chat…
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = busy && lastMessage?.role === "user";
  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs text-gray-500">
          Nothing you type leaves the page: Faru searches the guide and its
          extra speaker context, straight from your browser.
        </p>
        {messages.length > 1 && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0 cursor-pointer transition-colors hover:text-gray-800"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Start over
          </button>
        )}
      </div>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-busy={busy}
        className="flex-1 min-h-0 rounded-2xl border border-gray-200 bg-white p-3 md:p-4 overflow-y-auto space-y-4 mb-3"
      >
        {messages.map((message, index) =>
          message.role === "user" ? (
            <div key={index} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-900 text-white px-4 py-2.5 text-sm whitespace-pre-wrap">
                {message.text}
              </p>
            </div>
          ) : (
            <div key={index} className="flex gap-2.5">
              <FaruAvatar />
              <div className="min-w-0 max-w-[85%]">
                <div className="rounded-2xl rounded-bl-md bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm text-gray-800 whitespace-pre-wrap">
                  {message.text}
                  {message.streaming && (
                    <span
                      className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom bg-gray-400 animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                </div>
                {message.sources && message.sources.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {message.sources.map((source) => (
                      <li
                        key={source.id}
                        className="rounded-xl bg-white border border-gray-200 p-3"
                      >
                        <a
                          href={`/speaker-guide#${source.id}`}
                          onClick={() =>
                            analytics.track("speaker_guide_answer_source_clicked", {
                              section_id: source.id,
                              section_title: source.title,
                            })
                          }
                          className="text-sm font-semibold text-blue-primary underline"
                        >
                          {source.title}
                        </a>
                        <p className="text-xs text-gray-600 mt-1">
                          {excerpt(source.text)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        )}

        {showTypingIndicator && (
          <div className="flex gap-2.5">
            <FaruAvatar />
            <span className="rounded-2xl rounded-bl-md bg-gray-50 border border-gray-200 px-4 py-3">
              <TypingDots />
            </span>
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void ask(suggestion, "suggestion")}
              className="text-xs rounded-full border border-gray-300 bg-white px-3 py-1.5 text-gray-700 cursor-pointer transition-colors hover:border-gray-500 hover:bg-gray-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(input, "typed");
        }}
        className="flex gap-2"
      >
        <label htmlFor="guide-chat-input" className="sr-only">
          Ask Faru a question about the speaker guide
        </label>
        <input
          id="guide-chat-input"
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e.g. What time do doors open?"
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-2 focus:outline-brand-yellow-main"
        />
        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          className="rounded-xl bg-gray-900 text-white px-4 py-2.5 cursor-pointer transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send question"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </form>

      <details
        className="group mt-3"
        onToggle={(event) => {
          if ((event.target as HTMLDetailsElement).open) {
            analytics.track("speaker_guide_how_it_works_opened", {});
          }
        }}
      >
        <summary className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer list-none hover:text-gray-800 w-fit">
          <ChevronRight
            className="w-3.5 h-3.5 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          For the nerds: curious how this works without any AI?
        </summary>
        <div className="mt-2 text-xs text-gray-600 leading-relaxed space-y-2 pl-4.5">
          <p>
            Faru doesn&apos;t use an AI model and never talks to a server. It
            runs a small search engine in your browser:
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              When the page loads, the visible guide is split into one text
              chunk per section and indexed with{" "}
              <a
                href="https://github.com/lucaong/minisearch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-primary underline"
              >
                MiniSearch
              </a>
              , a tiny open-source full-text search library.
            </li>
            <li>
              Chat-only context and common alternative terms are indexed beside
              each section. They make answers more complete without adding
              extra prose to the reading page.
            </li>
            <li>
              Your question is broken into keywords; filler words like
              &quot;the&quot; and &quot;when&quot; are dropped, and small typos
              are tolerated.
            </li>
            <li>
              Sections are ranked by relevance. Rare words count more than
              common ones, and matches in section titles count triple.
            </li>
            <li>
              The best-matching answer sentences are returned with links to the
              relevant visible sections.
            </li>
          </ol>
          <p>
            The ranking approach is the same idea behind classic search
            engines; read up on{" "}
            <a
              href="https://en.wikipedia.org/wiki/Tf%E2%80%93idf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-primary underline"
            >
              tf&ndash;idf
            </a>{" "}
            if you want to go deeper. The typing effect is just pacing for
            readability; the actual lookup takes about a millisecond. Nothing
            you type leaves the page.
          </p>
        </div>
      </details>
    </div>
  );
};
