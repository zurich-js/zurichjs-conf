/**
 * Corporate Access Link — /corporate/<code>
 *
 * Not a page. An admin-issued link redirects straight to the landing page's
 * ticket section, exactly where a plain "buy tickets" link would have put the
 * visitor, and everything else happens out of sight.
 *
 * What happens out of sight: the browser gets marked as a corporate buyer,
 * which permanently stops the discount popup from offering money off. That's
 * our margin decision, not something the recipient needs to read about — they
 * clicked a link to buy tickets, so they get tickets. An expired, mistyped or
 * tampered code takes the identical route and just doesn't set the marker, so
 * the visitor sees the normal popup and never learns a link failed.
 *
 * The redirect is issued by the server, so nothing renders and the corporate
 * URL never becomes a page view. The code is a path segment rather than a query
 * parameter so it doesn't end up in analytics URLs, Referer headers or shared
 * screenshots of the address bar as an obvious `?discount=` style toggle.
 *
 * The work lives in `@/lib/discount/corporate-redirect` — a file under
 * `src/pages/` is a route, so its tests can't be colocated here.
 */

import type { GetServerSideProps } from 'next';
import { resolveCorporateLink } from '@/lib/discount/corporate-redirect';

/** Never rendered — `getServerSideProps` always redirects. */
export default function CorporateAccessLink(): null {
  return null;
}

export const getServerSideProps: GetServerSideProps = resolveCorporateLink;
