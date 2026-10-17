# Google indexing and legacy URL migration

## Approved search structure

Promote the homepage and four main destinations: `/about`, `/executives`,
`/events`, and `/merch`. Google chooses whether to show sitelinks and their
labels/order; the application cannot guarantee the search-result layout.

The owner approved the existing About content and its indexing during this task.
The current, verified event records and supplied images power the Events listing
and detail pages through the existing content retrieval boundary.

## URL policy

| URL | Behavior |
| --- | --- |
| `/current-administration` | 308 to `/executives` |
| `/history` | 308 to `/about`, the replacement society-background page |
| `/events` | Indexable public listing |
| `/faq` | 410 Gone, with useful navigation and `noindex` |
| `/events/[slug]` | Valid verified events stay usable, with `noindex, follow` |
| Unknown/unverified event slug | Not found |
| `www.thecssknust.com/*` | 308 to the equivalent `https://thecssknust.com/*` |

The two legacy www paths redirect directly to their final canonical destinations.
Query parameters are preserved by Next.js redirects. Keep the migration redirects
for at least a year; longer is useful for old bookmarks and links.

The preferred origin is `https://thecssknust.com`. Shared site content normalizes
legacy www/HTTP settings for this domain and old Vercel-origin settings to that
origin. Keep `NEXT_PUBLIC_SITE_ORIGIN=https://thecssknust.com` in production.
In hosting domain settings, ensure the apex domain serves this deployment and
is **not** configured to redirect back to www; such an opposite hosting rule
would conflict with the application's www-to-apex redirect.

## Discovery and metadata

- `lib/seo.ts` supplies per-page canonical, robots, Open Graph, and Twitter metadata.
- `app/sitemap.ts` lists only the homepage and the four main public pages, without
  inventing modification dates. Review this list if a page becomes unpublished.
- `app/robots.ts` permits crawling and points to the canonical sitemap. Do not
  disallow event details: Google must fetch them to see `noindex`.
- Existing shop/payment/receipt `noindex` rules remain in their own pages.
- `public/google094ce6a07ea344d8.html` exposes the supplied Google verification
  token. The original repository-root file is retained.
- Events use an hourly revalidation policy for date-sensitive groupings. Missing
  event times, locations, registration links, and recaps are not fabricated.

## After deployment

1. Confirm the apex homepage loads and www redirects to it without a loop.
2. Check the two legacy redirects, `/faq` (410), and an event detail's `noindex`.
3. Check `/robots.txt`, `/sitemap.xml`, and `/google094ce6a07ea344d8.html`.
4. In the Search Console property covering the canonical domain, submit
   `https://thecssknust.com/sitemap.xml`.
5. Inspect the homepage and four main URLs, test their live versions, and request
   indexing where eligible. Verify Google sees the old URLs' redirects.
6. Monitor Page indexing and Performance → Pages while Google recrawls. A 410 or
   `noindex` exclusion for the intentionally retired/excluded URLs is expected.

No Change of Address submission is needed for these same-domain path changes.
Deploying redirects fixes clicks immediately; Google updating its visible results
is asynchronous, with no guaranteed sitelink selection or refresh date.

## Dependencies and verification

No new dependencies. Use the existing pnpm installation:

```sh
pnpm lint
pnpm exec tsc --noEmit
pnpm build
node --experimental-strip-types --test tests/events.test.mjs
```

Verify HTTP status codes and final rendered metadata against a production build,
including unknown event slugs and the existing noindex shop/order pages. Check
Events on narrow phones, tablet, desktop, keyboard, enlarged text, and with
JavaScript or images unavailable; dates, descriptions, and links are server-rendered.
