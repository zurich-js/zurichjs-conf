import Link from 'next/link';
import type { BlogPostMeta } from '@/lib/blog';

interface BlogPostCardProps {
  post: BlogPostMeta;
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const { frontmatter, slug } = post;

  return (
    <Link
      href={`/blog/${slug}`}
      className="group block py-5 border-b border-gray-200"
    >
      <h2 className="text-lg font-bold text-brand-black">
        {frontmatter.title}
      </h2>
      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
        {frontmatter.excerpt}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        {new Date(frontmatter.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </p>
    </Link>
  );
}
