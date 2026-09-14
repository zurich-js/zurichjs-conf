import type { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { Save } from 'lucide-react';
import { Button } from '@/components/atoms';
import { NetworkingProfileCard } from '@/components/networking';
import { SEO } from '@/components/SEO';
import {
  PageHeader,
  SectionContainer,
  ShapedSection,
  SiteFooter,
} from '@/components/organisms';
import { findFrozenNetworkingProfile, getFrozenNetworkingProfiles } from '@/lib/archive/frozen';
import { saveNetworkingProfile } from '@/lib/networking/storage';
import type { PublicNetworkingProfile } from '@/lib/types/networking';

interface SharePageProps {
  profile: PublicNetworkingProfile;
}

export default function SharePage({ profile }: SharePageProps) {
  const router = useRouter();

  const handleSave = async () => {
    if (!saveNetworkingProfile(profile)) {
      throw new Error('This contact could not be saved on your device. Check your browser storage settings.');
    }
    const navigated = await router.push('/shares');
    if (!navigated) throw new Error('Contact saved, but the saved contacts page could not be opened.');
  };

  return (
    <>
      <SEO
        title={`${profile.name} | Networking`}
        description={profile.links.length > 0
          ? `Public networking links shared by ${profile.name} at ZurichJS Conference.`
          : `${profile.name}'s networking profile is not public yet.`}
        canonical={profile.path}
        noindex
      />
      <PageHeader
        rightContent={(
          <Button variant="ghost" size="sm" asChild href="/shares">
            Saved contacts
          </Button>
        )}
      />
      <main className="min-h-[calc(100vh-5rem)] bg-brand-white py-12 sm:py-16">
        <SectionContainer className="max-w-3xl">
          <NetworkingProfileCard profile={profile} showQr onSave={handleSave} />
          <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-brand-gray-darkest">
            <Save className="size-4 shrink-0" aria-hidden="true" />
            Saving keeps a snapshot in this browser only. No account is required.
          </p>
        </SectionContainer>
      </main>
      <ShapedSection shape="straight" variant="dark" compactTop>
        <SiteFooter showContactLinks />
      </ShapedSection>
    </>
  );
}

/**
 * Share cards were resolved live from a ticket id; the archive renders the
 * frozen set instead. Contact links (`mailto:`, `tel:`) are stripped at freeze
 * time — see FREEZE_CONTACT_LINKS in `scripts/freeze-2026.ts`.
 */
export const getStaticPaths: GetStaticPaths = () => ({
  paths: getFrozenNetworkingProfiles().map((profile) => ({
    params: { id: profile.publicId },
  })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<SharePageProps> = async (context) => {
  const publicId = typeof context.params?.id === 'string' ? context.params.id : null;
  if (!publicId) return { notFound: true };

  const profile = findFrozenNetworkingProfile(publicId);
  if (!profile) return { notFound: true };

  return { props: { profile } };
};
