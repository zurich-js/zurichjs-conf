import { Kicker, Heading, Tag } from '@/components/atoms';
import type { BlogFrontmatter } from '@/lib/blog';

interface BlogPostHeaderProps {
  frontmatter: BlogFrontmatter;
}

export function BlogPostHeader({ frontmatter }: BlogPostHeaderProps) {
  return (
    <div className="mb-12">
      <Kicker variant="light" className="mb-4">Blog</Kicker>
      <Heading level="h1" variant="light" className="mb-6 text-2xl font-bold">
        {frontmatter.title}
      </Heading>
      <p className="text-lg text-gray-700 leading-relaxed">
        {frontmatter.excerpt}
      </p>
      <p className="text-sm text-gray-500 mt-4">
        {frontmatter.author} · {new Date(frontmatter.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>
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
