import type { ReactNode } from 'react';
import Markdown from 'react-markdown';

interface MarkdownAbstractProps {
  content: string;
  className?: string;
}

const allowedElements = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a'];

/**
 * CommonMark treats a single newline as a soft break (rendered as a space), so
 * authored line breaks in an abstract collapse into one block of text. We
 * convert each single newline into a hard break (the two-trailing-spaces
 * marker) so the rendered output preserves the original line breaks, while
 * leaving blank-line paragraph breaks untouched.
 */
function preserveLineBreaks(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/([^\n])\n(?!\n)/g, '$1  \n');
}

const components = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-bold">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="list-disc list-inside space-y-1 mb-2 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1 mb-2 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => <li>{children}</li>,
  br: () => <br />,
  h1: ({ children }: { children?: ReactNode }) => (
    <p className="font-bold mb-2 last:mb-0">{children}</p>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <p className="font-bold mb-2 last:mb-0">{children}</p>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <p className="font-semibold mb-2 last:mb-0">{children}</p>
  ),
  h4: ({ children }: { children?: ReactNode }) => (
    <p className="font-semibold mb-2 last:mb-0">{children}</p>
  ),
  h5: ({ children }: { children?: ReactNode }) => (
    <p className="font-medium mb-2 last:mb-0">{children}</p>
  ),
  h6: ({ children }: { children?: ReactNode }) => (
    <p className="font-medium mb-2 last:mb-0">{children}</p>
  ),
  a: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
};

export function MarkdownAbstract({ content, className }: MarkdownAbstractProps) {
  return (
    <div className={className}>
      <Markdown allowedElements={allowedElements} components={components}>{preserveLineBreaks(content)}</Markdown>
    </div>
  );
}
