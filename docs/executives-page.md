# 2026/27 administration page

## Content and assets

- `committee_members.json` is the source of the 52 committee submissions. Its `upload_your_preferred_picture` fields point to the matched original files in `public/committee_members/`.
- The owner confirmed the abbreviated `B. aaron.jpeg` upload as Blessed Aaron Asare's portrait.
- `content/committees.ts` adapts submissions into public typed content. Full names retain their submitted order and spelling; all-uppercase full names receive display casing. Submission email addresses are excluded.
- `lib/content/committees.ts` groups committees alphabetically and orders Head, Deputy Head, then Members, keeping submission order within a role. `getAdministration()` appends the six approved existing executives from `getExecutives()`.
- `N/A` and `None` quotes are omitted. Preferred names appear beneath quotes when revealed; members without a quote can still reveal their nickname. No nicknames are invented for the main executives.
- The banner uses the supplied `public/cos_landscape.jpeg` and `public/CSS267.png`. The banner's white logo is a CSS colour treatment of the same artwork; the directory uses its original dark treatment.

## Display copies

WebP portraits in `public/executives/committees/` are generated from the matched uploads:

```sh
node tools/prepare-committee-portraits.mjs
```

Run this after adding or replacing an original portrait. The script reuses Sharp installed with Next.js, handles image orientation, limits dimensions without upscaling, and strips the screenshot surround from Cheryl Saah Dekyi's supplied photo. Originals are retained. The initial set went from 75.7 MB of originals to 4.7 MB of display copies.

## Interaction

- Desktop: four portrait cards per row; two below 1100px and one below 600px.
- Hover or keyboard focus reveals favourite quotes and nicknames. The labelled disclosure button supports Enter, Space, and touch taps.
- The grid frame allows enlarged text to grow a card instead of clipping its content.
- Committee links preserve fragment URLs, move focus to the section, and use the existing smooth-scroll provider with a sticky-header offset. Links remain native anchors without JavaScript.
- The GSAP banner sequence is scoped and cleaned up; reduced motion shows its complete title immediately.
- Without JavaScript, all quotes and nicknames are shown. Failed portraits show initials and a portrait-unavailable label while retaining names, roles, and controls.

## Verification

```sh
node --experimental-strip-types --test tests/committees.test.mjs
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

The content tests check one-to-one original portrait mapping, case-sensitive asset names, generated asset availability, complete public roster coverage, role/committee ordering, omitted empty quotes, and the final executive section.

Browser checks cover all 15 committee/team jumps, all 58 portrait responses, hover and keyboard reveals, emulated touch taps, widths from 320px to 1920px, 200% text enlargement, the existing menu's Escape/focus-return behavior, reduced motion, image failures, and no-JavaScript content.
