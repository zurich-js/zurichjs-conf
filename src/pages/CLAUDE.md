# Pages — `src/pages/`

Next.js **Pages Router**, not App Router. File-system routing: `src/pages/foo.tsx`
serves at `/foo`; `src/pages/api/foo.ts` is an API route.

## Layout

```
src/pages/
├── api/                # API routes — see src/pages/api/CLAUDE.md
├── cfp/                # Speaker portal (CFP submission, profile, dashboard)
├── admin/              # Admin dashboard
├── account/            # User account
├── workshops/          # Workshop catalog + details
├── sponsors/           # Sponsor pages
├── speakers/           # Public speaker profiles
├── index.tsx           # Landing
├── _app.tsx            # App wrapper (providers, layout)
├── _document.tsx       # HTML document (rarely changed)
└── ...                 # Other top-level pages
```

## SSR auth pattern

Logged-in pages use `getServerSideProps` with the cookie-aware Supabase client:

```typescript
import { GetServerSideProps } from 'next';
import { createSupabaseServerClient, getSpeakerByUserId } from '@/lib/cfp/auth';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/cfp/login', permanent: false } };
  }

  const speaker = await getSpeakerByUserId(session.user.id);
  return { props: { speaker } };
};
```

Don't use the browser singleton (`@/lib/supabase/client`'s `supabase`) inside
`getServerSideProps` — it won't see the request's cookies.

## Composition pattern

Pages are thin: import organisms, fetch via `getServerSideProps` or TanStack
Query, pass data down. **No business logic in pages.**

```typescript
export default function SubmissionsPage({ speaker }: Props) {
  const { data, isLoading } = useSubmissions();
  return (
    <Layout>
      <SubmissionsHeader speaker={speaker} />
      {isLoading ? <Skeleton /> : <SubmissionsList items={data ?? []} />}
    </Layout>
  );
}
```

## SEO

Use the `SEO` component (`src/components/SEO.tsx`) for `<title>`, meta, OG tags.
Don't inline `<Head>` from `next/head` directly — go through `SEO` for consistency.

## Dynamic routes

```
src/pages/cfp/submissions/[id]/index.tsx       → /cfp/submissions/:id
src/pages/cfp/submissions/[id]/edit.tsx        → /cfp/submissions/:id/edit
src/pages/api/admin/tickets/[id]/refund.ts     → POST /api/admin/tickets/:id/refund
```

Access params via `useRouter()` on the client or via `ctx.params` in
`getServerSideProps`.

## Layouts

`Layout.tsx` (top-level component) wraps most pages. Sub-areas (CFP, admin) have
their own wrappers — `_app.tsx` doesn't auto-apply them, each page imports the
right layout.

## Hydration safety

Avoid these in render: `new Date()`, `Math.random()`, `window`, `localStorage`.
See `src/components/CLAUDE.md` for the deferred-render pattern with `isMounted`.

## File-size limit

Page files should stay under 500 lines too. Today's largest:
- `pages/sponsor-quote.tsx` (675)
- `pages/cfp/submissions/[id]/index.tsx` (655)
- `pages/admin/verifications.tsx` (592)

Refactor when touched — extract sections into organisms.

## When NOT to add a new page

If the route is purely a different view of the same data on the same domain, use
URL state (`nuqs`) on the existing page instead. Adding pages is fine; just don't
multiply routes that share 90% of their data fetching.
