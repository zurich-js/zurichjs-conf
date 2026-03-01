import { Kicker, Heading, Tag } from '@/components/atoms';
import { getAuthor } from '@/lib/blog/authors';
import type { BlogFrontmatter } from '@/lib/blog';
import { Github, Linkedin } from 'lucide-react';

interface BlogPostHeaderProps {
  frontmatter: BlogFrontmatter;
}

function BlueskyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 568 501" fill="currentColor" aria-hidden="true">
      <path d="M123.121 33.6637C188.241 82.5526 258.281 181.681 284 234.873C309.719 181.681 379.759 82.5526 444.879 33.6637C491.866 -1.61183 568 -28.9064 568 57.9464C568 75.2916 558.055 203.659 552.222 224.501C531.947 296.954 458.067 315.434 392.347 304.249C507.222 323.8 536.444 388.56 473.333 453.32C353.473 576.312 301.061 422.461 287.631 383.039C285.169 374.073 284.017 369.32 284 371.607C283.983 369.32 282.831 374.073 280.369 383.039C266.939 422.461 214.527 576.312 94.6667 453.32C31.5556 388.56 60.7778 323.8 175.653 304.249C109.933 315.434 36.0535 296.954 15.7778 224.501C9.94525 203.659 0 75.2916 0 57.9464C0 -28.9064 76.1345 -1.61183 123.121 33.6637Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function BlogPostHeader({ frontmatter }: BlogPostHeaderProps) {
  const author = getAuthor(frontmatter.author);

  return (
    <div className="mb-12">
      <Kicker variant="light" className="mb-4">Blog</Kicker>
      <Heading level="h1" variant="light" className="mb-6 text-2xl font-bold">
        {frontmatter.title}
      </Heading>
      <p className="text-lg text-gray-700 leading-relaxed">
        {frontmatter.excerpt}
      </p>
      <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
        <span>{author.name}</span>
        {(author.bluesky || author.github || author.linkedin || author.x) && (
          <span className="flex items-center gap-1.5 text-brand-blue">
            {author.bluesky && (
              <a
                href={author.bluesky}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${author.name} on Bluesky`}
                className="hover:opacity-70 transition-opacity"
              >
                <BlueskyIcon />
              </a>
            )}
            {author.github && (
              <a
                href={`https://github.com/${author.github}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${author.name} on GitHub`}
                className="hover:opacity-70 transition-opacity"
              >
                <Github className="w-3.5 h-3.5" />
              </a>
            )}
            {author.linkedin && (
              <a
                href={`https://linkedin.com/in/${author.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${author.name} on LinkedIn`}
                className="hover:opacity-70 transition-opacity"
              >
                <Linkedin className="w-3.5 h-3.5" />
              </a>
            )}
            {author.x && (
              <a
                href={`https://x.com/${author.x}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${author.name} on X`}
                className="hover:opacity-70 transition-opacity"
              >
                <XIcon />
              </a>
            )}
          </span>
        )}
        <span>·</span>
        <span>
          {new Date(frontmatter.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>
      {frontmatter.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {frontmatter.tags.map((tag) => (
            <Tag key={tag} label={tag} tone="neutral" className="bg-brand-blue text-brand-white" />
          ))}
        </div>
      )}
    </div>
  );
}
