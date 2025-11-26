import React, { useState, useEffect } from 'react';
import type { NavigationItem } from '@/components/RichTextRenderer';

export interface PageNavigationProps {
  items: NavigationItem[];
}

export const PageNavigation: React.FC<PageNavigationProps> = ({ items }) => {
  const [activeId, setActiveId] = useState<string>('');
  const [revealedItems, setRevealedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (items.length === 0) return;

    // Initially reveal the first item
    setRevealedItems(new Set([items[0].id]));

    const observerOptions = {
      rootMargin: '-100px 0px -66%',
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
          // Reveal this item and all previous items
          const currentIndex = items.findIndex((item) => item.id === entry.target.id);
          if (currentIndex !== -1) {
            setRevealedItems((prev) => {
              const newSet = new Set(prev);
              for (let i = 0; i <= currentIndex; i++) {
                newSet.add(items[i].id);
              }
              return newSet;
            });
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all section elements
    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100; // Offset for sticky header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className="hidden lg:block sticky top-24 self-start"
      aria-label="Page navigation"
    >
      <div className="bg-white  p-4">
        {/* <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          On this page
        </p> */}
        <ul className="relative space-y-3">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />

          {items.map((item) => {
            const isActive = activeId === item.id;
            const isRevealed = revealedItems.has(item.id);

            return (
              <li
                key={item.id}
                className={`
                  transition-all duration-500 ease-out
                  ${isRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
                `}
              >
                <button
                  onClick={() => handleClick(item.id)}
                  className="group relative flex items-center gap-3 w-full text-left"
                  aria-label={`Go to ${item.label}`}
                  aria-current={isActive ? 'location' : undefined}
                >
                  <span
                    className={`
                      relative z-10 block w-4 h-4 rounded-full border-2 transition-all duration-200 flex-shrink-0
                      ${
                        isActive
                          ? 'bg-brand-yellow-main border-brand-yellow-main scale-110'
                          : 'bg-white border-gray-300 group-hover:border-gray-500'
                      }
                    `}
                  />
                  <span
                    className={`
                      text-sm transition-colors duration-200 leading-snug
                      ${
                        isActive
                          ? 'text-gray-900 font-semibold'
                          : 'text-gray-600 group-hover:text-gray-900'
                      }
                    `}
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
