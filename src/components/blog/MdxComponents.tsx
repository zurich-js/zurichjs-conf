import Image from 'next/image';
import type { MDXComponents } from 'mdx/types';

export const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1 className="font-bold mt-8 mb-3" {...props} />
  ),
  h2: (props) => (
    <h2 className="font-bold mt-6 mb-3" {...props} />
  ),
  h3: (props) => (
    <h3 className="font-semibold mt-4 mb-2" {...props} />
  ),
  p: (props) => (
    <p className="leading-relaxed mb-4" {...props} />
  ),
  a: ({ href, children, ...props }) => {
    const isExternal = href?.startsWith('http');
    return (
      <a
        href={href}
        className="text-brand-blue hover:underline font-medium"
        {...(isExternal
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
        {...props}
      >
        {children}
      </a>
    );
  },
  ul: (props) => (
    <ul
      className="list-disc list-inside space-y-2  ml-4 mb-4"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="list-decimal list-inside space-y-2  ml-4 mb-4"
      {...props}
    />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="border-l-4 border-brand-yellow-main pl-4 italic text-gray-600 my-4"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="bg-gray-100 text-brand-orange rounded px-1.5 py-0.5 text-sm font-mono"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto mb-4 text-sm font-mono"
      {...props}
    />
  ),
  img: ({ src, alt, ...props }) => {
    if (!src) return null;
    return (
      <span className="block my-6">
        <Image
          src={src}
          alt={alt || ''}
          width={800}
          height={400}
          className="rounded-xl w-full h-auto"
          {...props}
        />
      </span>
    );
  },
  hr: () => <hr className="border-gray-200 my-8" />,
  strong: (props) => (
    <strong className="font-semibold" {...props} />
  ),
};
