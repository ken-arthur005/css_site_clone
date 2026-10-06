# Inside CSS — content and implementation notes

## Source and approval

The narrative is adapted from `app/about/About.txt`. The supplied document was
explicitly identified as a draft. The page displays a content-preview notice and
draft labels for estimates, historic results, procedures, and contact details.
Search indexing is disabled for this route while `contentStatus` is `placeholder`.

The owner confirmed:
- The executive names in About.txt and the existing Organising Secretary portrait
  mapping are correct. Shared executive content has been reconciled. Stable IDs
  and existing slugs are retained.
- There is currently no IT fourth-year group; that cohort arrives next year.
- The orange-shirt team and trophy-celebration photos depict IT ’28, back-to-back
  CSS Games champions. Football winners take the CSS Games championship.

Still to approve before launch:
- Rewritten narrative and humorous headlines.
- Approximate cohort populations (their sum is 3,231, displayed as ~3,230), and
  the academic session to which they apply. The conflicting 3,500+ claim is omitted.
- Programme subject/career descriptions and faculty support/research claims.
- Council session and programme/year annotations.
- Season labels and historic tournament entries in the honour roll.
- FF2/FF4/FF14 office locations, responsibilities, and procedures.
- Email addresses and departmental contact context. Draft emails are displayed
  within a labelled disclosure without active mail links.
- Canonical domain in shared site content. No unapproved canonical or localhost
  sharing-image URL is emitted. The opening photo becomes the Open Graph/Twitter
  image automatically once the shared canonical origin is verified.
- Optional photo/video credits if supplied; no photographer attribution is invented.

After approval, update the source content and its status deliberately; do not just
remove the preview labels from JSX. `getAboutStory()` is the retrieval boundary.

## Media

Originals remain under `public/about/`. Selected images are mapped in the content
layer. Next Image supplies responsive, lazy-loaded derivatives. Only the opening
photo is prioritised. Aspect-ratio reservations avoid layout shifts; failed images
retain a readable descriptive fallback.

The 51-second, 848 × 480 CSS Games montage is intentionally a contained player.
It starts muted, never autoplays, loads metadata near the section, and pauses when
away from the section, on tab hiding, or when site navigation opens. The poster
`public/about/video/css-games-poster.jpg` is a frame at 30 seconds derived from
the supplied video with the already-installed FFmpeg. A higher-resolution source
would be optional polish; it is not required for the current composition.

## Behaviour

Desktop has two brief scoped pins: the opening photographic portal and the
decorative CS/IT convergence. Touch-sized layouts and reduced motion retain normal
document flow. No new WebGL scene, animation library, or package was added.

The chapter index uses real hash links, with header-aware smooth scrolling and
focus movement as progressive enhancements. Hash history is retained; automatic
chapter tracking does not write history. Office anchors open their corresponding
native disclosure. Native chapter and office-guide alternatives exist without JS.

The scroll provider accepts optional offset/immediate parameters. Explicit offsets
use numeric Lenis destinations so CSS scroll margins are not applied twice.

## Verification

- ESLint, TypeScript, and an optimised production build.
- Browser checks for all eight chapter destinations, direct hash loads, hash
  Back/Forward, chapter Escape behaviour, site-menu focus return and background inertness.
- Office-help selections and automatic opening of the linked office disclosure.
- Muted, user-controlled video playback and pausing when site navigation opens.
- Layout widths of 320, 390, 768, 1024, 1440, and 1920 CSS pixels; 200% text sizing.
- Touch and reduced-motion layouts without pins; native chapter/office alternatives
  with JavaScript disabled; simulated image and video network failures.

Browser tooling uses an existing cached Playwright installation, with an isolated
headless browser and temporary scripts/screenshots outside the repository.
