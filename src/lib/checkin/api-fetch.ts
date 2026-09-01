/**
 * The fetch wrapper the door hooks use.
 *
 * It is the same one the admin panel uses, re-exported under an honest name.
 * `adminFetch` is not admin-specific — it sends no credentials of its own and
 * knows nothing about roles. What it does is throw an error carrying the HTTP
 * `status`, which is exactly what `src/lib/query-client.ts` reads to decide not
 * to retry a 401 or a 400. That behaviour is what the door needs: a volunteer
 * whose account was deactivated mid-shift must be told once, not have their
 * phone retry the roster.
 *
 * Aliasing rather than importing `adminFetch` at the door keeps the call sites
 * readable and gives one place to change if the door ever needs its own
 * transport.
 */

export { adminFetch as doorFetch, AdminApiError as DoorApiError } from '@/lib/admin/api-fetch';
