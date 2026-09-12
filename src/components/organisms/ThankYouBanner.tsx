import { useState } from 'react';
import { Heart, X } from 'lucide-react';

export function ThankYouBanner(): React.JSX.Element | null {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <section
      aria-labelledby="thank-you-title"
      className="fixed inset-x-3 bottom-3 z-50 max-h-[80dvh] min-h-[max(200px,30vh)] overflow-y-auto rounded-3xl border-2 border-white/40 bg-black px-6 py-8 text-center text-white shadow-2xl sm:inset-x-6 sm:px-12 sm:py-10"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss thank-you banner"
        className="absolute right-3 top-3 rounded-full p-2 text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow-main"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="relative mx-auto max-w-3xl">
        <h2 id="thank-you-title" className="mb-4 text-2xl font-bold">
          That's a wrap
        </h2>
        <p className="text-sm leading-relaxed text-white/80 sm:text-base">
          To everyone who attended, supported us, volunteered, shared their knowledge, or spread the word:
          thank you from the bottom of our hearts. Your energy, curiosity, and kindness turned ZurichJS Conf
          into a successful event.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
          We’ll be back here soon with pictures from the event
        </p>
        <p className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold">
          <Heart className="h-4 w-4 text-brand-yellow-main" aria-hidden="true" />
          With love, the ZurichJS team
        </p>
      </div>
    </section>
  );
}
