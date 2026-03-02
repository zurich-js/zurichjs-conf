import { useRouter } from 'next/router';

interface BlogTagFilterProps {
  tags: string[];
  activeTag?: string;
}

export function BlogTagFilter({ tags, activeTag }: BlogTagFilterProps) {
  const router = useRouter();

  const setTag = (tag: string | null) => {
    if (tag) {
      router.push({ pathname: '/blog', query: { tag } }, undefined, {
        shallow: true,
      });
    } else {
      router.push('/blog', undefined, { shallow: true });
    }
  };

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => setTag(null)}
        className="px-3 py-1.5 rounded-full text-sm font-medium bg-brand-gray-dark text-white"
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => setTag(tag)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeTag === tag
              ? 'bg-brand-gray-dark text-white'
              : 'bg-brand-gray-lightest text-brand-gray-dark hover:bg-brand-gray-light'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
