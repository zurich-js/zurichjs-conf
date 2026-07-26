import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { Heading } from "@/components/atoms";
import { slugify } from "@/components/RichTextRenderer";
import type { ContentSection } from "@/data/info-pages";

export interface GuideChatProps {
  sections: ContentSection[];
}

interface GuideChunk {
  id: string;
  title: string;
  text: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sources?: GuideChunk[];
}

/**
 * Minimal typings for the Chrome built-in Prompt API (on-device Gemini Nano).
 * @see https://developer.chrome.com/docs/ai/prompt-api
 */
interface LanguageModelSession {
  prompt(input: string): Promise<string>;
}

interface LanguageModelStatic {
  availability(): Promise<string>;
  create(options?: {
    initialPrompts?: Array<{ role: string; content: string }>;
  }): Promise<LanguageModelSession>;
}

const getLanguageModel = (): LanguageModelStatic | null => {
  const candidate = (globalThis as unknown as Record<string, unknown>)
    .LanguageModel;
  if (
    candidate &&
    typeof (candidate as LanguageModelStatic).availability === "function" &&
    typeof (candidate as LanguageModelStatic).create === "function"
  ) {
    return candidate as LanguageModelStatic;
  }
  return null;
};

const SYSTEM_PROMPT =
  "You are the ZurichJS Conf 2026 speaker guide assistant. Answer questions from speakers using ONLY the guide excerpts provided with each question. Be brief and friendly. If the excerpts don't contain the answer, say you don't know and suggest asking in the speakers group chat or emailing hello@zurichjs.com. Never invent dates, prices, names, or logistics.";

const SUGGESTIONS = [
  "How do I get to the after party?",
  "When are the tech checks?",
  "Can I bring a plus one?",
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

/** Group the guide's flat section list into one text chunk per h2 heading. */
const buildChunks = (sections: ContentSection[]): GuideChunk[] => {
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
      return (section.links ?? [])
        .map((link) => `${link.label} ${link.sublabel ?? ""}`)
        .join(" ");
    }
    return section.content ? stripHtml(section.content) : "";
  };

  sections.forEach((section) => {
    if (section.type === "heading" && section.level === "h2" && section.content) {
      current = { id: slugify(section.content), title: section.content, text: "" };
      chunks.push(current);
      return;
    }
    if (current) {
      const text = textOf(section);
      if (text) current.text = `${current.text} ${text}`.trim();
    }
  });

  return chunks.filter((chunk) => chunk.text.length > 0);
};

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "do", "does", "i", "my", "me", "we", "our",
  "you", "your", "to", "of", "in", "on", "at", "for", "and", "or", "what",
  "when", "where", "how", "who", "can", "will", "there", "it", "be", "with",
]);

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9äöüéèà]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

/** Rank chunks by keyword overlap with the question; title hits weigh extra. */
const retrieve = (question: string, chunks: GuideChunk[]): GuideChunk[] => {
  const tokens = tokenize(question);
  if (tokens.length === 0) return [];

  return chunks
    .map((chunk) => {
      const body = chunk.text.toLowerCase();
      const title = chunk.title.toLowerCase();
      let score = 0;
      tokens.forEach((token) => {
        if (title.includes(token)) score += 3;
        let index = body.indexOf(token);
        while (index !== -1) {
          score += 1;
          index = body.indexOf(token, index + token.length);
        }
      });
      return { chunk, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.chunk);
};

const excerpt = (text: string, maxLength = 220): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength).trimEnd()}…`;

export const GuideChat: React.FC<GuideChatProps> = ({ sections }) => {
  const [mounted, setMounted] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<LanguageModelSession | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const chunks = useMemo(() => buildChunks(sections), [sections]);

  useEffect(() => {
    setMounted(true);
    const model = getLanguageModel();
    if (!model) return;
    let cancelled = false;
    model
      .availability()
      .then((state) => {
        if (!cancelled && state === "available") setAiAvailable(true);
      })
      .catch(() => {
        /* Treat probe failures as "no on-device model". */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy]);

  const answerWithModel = async (
    question: string,
    sources: GuideChunk[]
  ): Promise<string> => {
    const model = getLanguageModel();
    if (!model) throw new Error("Prompt API unavailable");
    if (!sessionRef.current) {
      sessionRef.current = await model.create({
        initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
      });
    }
    const context = sources
      .map((source) => `## ${source.title}\n${source.text}`)
      .join("\n\n");
    return sessionRef.current.prompt(
      `Guide excerpts:\n\n${context}\n\nSpeaker question: ${question}`
    );
  };

  const ask = async (rawQuestion: string): Promise<void> => {
    const question = rawQuestion.trim();
    if (!question || busy) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setBusy(true);

    const sources = retrieve(question, chunks);
    let reply: ChatMessage;

    if (sources.length === 0) {
      reply = {
        role: "assistant",
        text: "I couldn't find that in the guide. Ask in the speakers group chat or email hello@zurichjs.com — a human will know!",
      };
    } else if (aiAvailable) {
      try {
        const text = await answerWithModel(question, sources);
        reply = { role: "assistant", text: text.trim(), sources };
      } catch {
        reply = {
          role: "assistant",
          text: "The on-device model hiccuped, but here's what the guide says:",
          sources,
        };
      }
    } else {
      reply = {
        role: "assistant",
        text: "Here's what the guide says about that:",
        sources,
      };
    }

    setMessages((prev) => [...prev, reply]);
    setBusy(false);
  };

  if (!mounted) return null;

  return (
    <section
      id="ask-the-guide"
      aria-label="Ask the guide"
      className="scroll-mt-24 mt-16 rounded-2xl border border-gray-200 p-5 md:p-6 print:hidden"
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-gray-700" aria-hidden="true" />
        <Heading level="h2" variant="light" className="text-lg font-bold">
          Ask the Guide
        </Heading>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        {aiAvailable
          ? "Answers are generated on your device (Chrome built-in AI) from this guide only — nothing leaves your browser."
          : "Ask a question and I'll pull up the matching guide sections — everything runs in your browser. (In Chrome with built-in AI, you get full conversational answers.)"}
      </p>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void ask(suggestion)}
              className="text-xs rounded-full border border-gray-300 px-3 py-1.5 text-gray-700 cursor-pointer transition-colors hover:border-gray-500 hover:bg-gray-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          className="space-y-4 max-h-96 overflow-y-auto mb-4 pr-1"
        >
          {messages.map((message, index) => (
            <div key={index} className="flex gap-2.5">
              {message.role === "assistant" ? (
                <Bot className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {message.text}
                </p>
                {message.sources && message.sources.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {message.sources.map((source) => (
                      <li
                        key={source.id}
                        className="rounded-lg bg-gray-50 border border-gray-200 p-3"
                      >
                        <a
                          href={`#${source.id}`}
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
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Thinking…
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(input);
        }}
        className="flex gap-2"
      >
        <label htmlFor="guide-chat-input" className="sr-only">
          Ask a question about the speaker guide
        </label>
        <input
          id="guide-chat-input"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e.g. What time do doors open?"
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-2 focus:outline-brand-yellow-main"
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
    </section>
  );
};
