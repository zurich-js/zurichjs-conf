import Markdown from 'react-markdown';

interface MarkdownAbstractProps {
  content: string;
  className?: string;
}

const components = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-bold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside space-y-1 mb-2 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1 mb-2 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h1: ({ children }: { children?: React.ReactNode }) => (
    <p className="font-bold mb-2 last:mb-0">{children}</p>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <p className="font-bold mb-2 last:mb-0">{children}</p>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <p className="font-semibold mb-2 last:mb-0">{children}</p>
  ),
  a: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
};

export function MarkdownAbstract({ content, className }: MarkdownAbstractProps) {
  return (
    <div className={className}>
      <Markdown components={components}>{content}</Markdown>
    </div>
  );
}
