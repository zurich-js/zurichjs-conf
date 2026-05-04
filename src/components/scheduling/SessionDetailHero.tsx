import { Button, Heading } from '@/components/atoms';
import type { PublicSession } from '@/lib/types/cfp';

export interface SessionDetailSpeaker {
  name: string;
  slug: string;
  avatarUrl: string | null;
  role: string | null;
}

interface SessionDetailHeroProps {
  session: PublicSession;
  kind: 'talk' | 'workshop';
  ctaHref: string;
  ctaLabel: string;
}

export function SessionDetailHero({ session, kind, ctaHref, ctaLabel }: SessionDetailHeroProps) {
  const isWorkshop = kind === 'workshop';
  const sessionTypeLabel = isWorkshop ? 'Workshop' : 'Talk';
  const ctaVariant = isWorkshop ? 'blue' : 'primary';

  return (
    <section className="relative isolate bg-brand-black text-brand-white pt-12 md:pt-16">
      <div className="container relative mx-auto px-4 py-10 xs:px-6 sm:px-8 md:px-10 md:py-14 lg:px-12">
        <div className="max-w-screen-lg">
          <p className="text-sm font-bold uppercase tracking-[0.2em]">
            {sessionTypeLabel}
          </p>
          <Heading level="h1" variant="dark" className="mt-5 max-w-4xl text-2xl font-bold leading-none md:text-3xl">
            {session.title}
          </Heading>
          <div className="mt-8">
            <Button variant={ctaVariant} asChild href={ctaHref}>
              {ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
