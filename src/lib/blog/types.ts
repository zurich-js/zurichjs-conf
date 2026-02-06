export interface BlogFrontmatter {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  coverImage?: string;
}

export interface BlogPost {
  frontmatter: BlogFrontmatter;
  slug: string;
  content: string;
}

export interface BlogPostMeta {
  frontmatter: BlogFrontmatter;
  slug: string;
}
