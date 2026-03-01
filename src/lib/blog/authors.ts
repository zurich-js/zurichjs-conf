export interface BlogAuthor {
  name: string;
  bluesky?: string; // full handle
  github?: string; // username
  linkedin?: string; // profile URL slug
  x?: string; // handle without @
}

export const authors: Record<string, BlogAuthor> = {
  "zurichjs-team": {
    name: "ZurichJS Team",
    bluesky: "https://bsky.app/profile/zurichjs.com",
  },
  nadja: {
    name: "Nadja",
    bluesky: "https://bsky.app/profile/nadja-hesselbjerg.bsky.social",
  },
};

export function getAuthor(slug: string): BlogAuthor {
  return authors[slug] ?? { name: slug };
}
