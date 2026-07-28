import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronRight, RotateCcw, Send } from "lucide-react";
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
  streaming?: boolean;
}

const GREETING =
  "Hey! 👋 I'm Faru, your speaker guide companion. Fun fact: \"Faru\" was Faris's nickname as a kid — he graciously lent it to me, so technically I'm the second Faru to help people find their way around. Ask me about arrival, the venues, your slides, the after party — anything from the guide.";

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
  "whats", "happening",
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

/**
 * Pull the best-matching sentences out of the retrieved sections so Faru can
 * quote an actual answer instead of only linking the sections.
 */
const extractAnswer = (
  question: string,
  sources: GuideChunk[]
): string | null => {
  const tokens = tokenize(question);
  if (tokens.length === 0) return null;

  const scored: Array<{ text: string; score: number }> = [];
  sources.forEach((source) => {
    source.text.split(/(?<=[.!?])\s+/).forEach((raw) => {
      const sentence = raw.trim();
      if (sentence.length < 15) return;
      const lower = sentence.toLowerCase();
      let score = 0;
      tokens.forEach((token) => {
        if (lower.includes(token)) score += 1;
      });
      if (score > 0) scored.push({ text: sentence, score });
    });
  });

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, 2)
    .map((sentence) => `“${sentence.text}”`)
    .join("\n\n");
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
 * Full-page chat over the speaker guide. Pure in-browser retrieval — no AI
 * model, no server calls: sections are scored by keyword overlap and the
 * best-matching sentences are quoted back with links to their sections.
 */
export const GuideChat: React.FC<GuideChatProps> = ({ sections }) => {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const aliveRef = useRef(true);

  const chunks = useMemo(() => buildChunks(sections), [sections]);

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

  const ask = async (rawQuestion: string): Promise<void> => {
    const question = rawQuestion.trim();
    if (!question || busy) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setBusy(true);

    const sources = retrieve(question, chunks);

    if (sources.length === 0) {
      await sleep(600);
      await streamReply(
        "Hmm, I couldn't find that in the guide. Ask in the speakers group chat or email hello@zurichjs.com — a human will know!"
      );
    } else {
      await sleep(600);
      const answer = extractAnswer(question, sources);
      await streamReply(
        answer
          ? `Here's what the guide says:\n\n${answer}`
          : "Here's what the guide says about that:",
        sources
      );
    }

    if (!aliveRef.current) return;
    setBusy(false);
    inputRef.current?.focus();
  };

  const reset = (): void => {
    if (busy) return;
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
          Faru answers straight from this guide, right in your browser —
          nothing you type leaves the page.
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
              onClick={() => void ask(suggestion)}
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
          void ask(input);
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

      <details className="group mt-3">
        <summary className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer list-none hover:text-gray-800 w-fit">
          <ChevronRight
            className="w-3.5 h-3.5 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          For the nerds: curious how this works — without any AI?
        </summary>
        <div className="mt-2 text-xs text-gray-600 leading-relaxed space-y-2 pl-4.5">
          <p>
            Faru doesn&apos;t use an AI model and never talks to a server.
            It&apos;s a small piece of plain JavaScript that runs in your
            browser:
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              When the page loads, the guide is split into one text chunk per
              section.
            </li>
            <li>
              Your question is broken into keywords, and filler words like
              &quot;the&quot; and &quot;when&quot; are dropped.
            </li>
            <li>
              Each section gets a score based on how many of your keywords it
              contains. Matches in section titles count triple.
            </li>
            <li>
              The best-matching sentences from the top sections are quoted
              back, with links to the full sections.
            </li>
          </ol>
          <p>
            This is a simplified version of the term-frequency scoring that
            classic search engines use. If you want to go deeper, read up on{" "}
            <a
              href="https://en.wikipedia.org/wiki/Tf%E2%80%93idf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-primary underline"
            >
              tf&ndash;idf
            </a>
            . The typing effect is just pacing for readability; the actual
            lookup takes about a millisecond. Nothing you type leaves the page.
          </p>
        </div>
      </details>
    </div>
  );
};
