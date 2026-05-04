import type { ReactNode } from 'react';
import Markdown from 'react-markdown';

interface MarkdownAbstractProps {
  content: string;
  className?: string;
}

const allowedElements = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a'];

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
      <Markdown allowedElements={allowedElements} components={components}>{content}</Markdown>
    </div>
  );
}
