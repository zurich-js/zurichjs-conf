import { Save } from 'lucide-react';
import { Button, Heading } from '@/components/atoms';
import { SavedContacts } from '@/components/networking';
import { SEO } from '@/components/SEO';
import {
  PageHeader,
  SectionContainer,
  ShapedSection,
  SiteFooter,
} from '@/components/organisms';

export default function SavedContactsPage() {
  return (
    <>
      <SEO
        title="Saved networking contacts"
        description="Networking contacts saved on this device at ZurichJS Conference."
        canonical="/shares"
        noindex
      />
      <PageHeader
        rightContent={(
          <Button variant="ghost" size="sm" asChild href="/">
            Conference home
          </Button>
        )}
      />
      <main className="min-h-[calc(100vh-5rem)] bg-brand-white py-12 sm:py-16">
        <SectionContainer className="max-w-3xl">
          <header className="mb-8 text-center">
            <Heading level="h1" variant="light" className="text-2xl xs:text-3xl xl:text-4xl">
              Saved contacts
            </Heading>
            <p className="mx-auto mt-3 flex max-w-xl items-center justify-center gap-2 text-brand-gray-darkest">
              <Save className="size-4 shrink-0" aria-hidden="true" />
              Your saved public contact snapshots live only in this browser.
            </p>
          </header>
          <SavedContacts />
        </SectionContainer>
      </main>
      <ShapedSection shape="straight" variant="dark" compactTop>
        <SiteFooter showContactLinks />
      </ShapedSection>
    </>
  );
}
