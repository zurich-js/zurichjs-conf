import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { BlogFrontmatter, BlogPost, BlogPostMeta } from './types';

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''));
}

export function getAllPosts(): BlogPostMeta[] {
  const slugs = getAllSlugs();

  const posts = slugs.map((slug) => {
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(fileContent);

    return {
      frontmatter: data as BlogFrontmatter,
      slug,
    };
  });

  return posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    frontmatter: data as BlogFrontmatter,
    slug,
    content,
  };
}

export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tagSet = new Set<string>();

  for (const post of posts) {
    for (const tag of post.frontmatter.tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort();
}
