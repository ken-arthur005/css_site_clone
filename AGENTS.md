# CSS KNUST website — agent instructions

This file governs work on the Computer Science Society (CSS) website for Kwame Nkrumah University of Science and Technology (KNUST), College of Science. Read it before changing the project. Apply the latest explicit instructions from the project owner when they supersede anything here.

## Mission and scope

Build a youthful, premium, editorial technology showcase for CSS KNUST. It should help a visitor learn who CSS is, meet its executives, find and register for events, and explore merchandise. Bold typography, real CSS photography, selective 3D, and deliberate scroll choreography should make it memorable without obscuring information or making the site difficult to use.

The initial build is a frontend with typed local content. It must be ready to connect to a backend or CMS later without rewriting page components. Do not invent a backend, authentication, cart, payment system, or admin interface for this phase.

### Current agreed routes

| Route | Job |
| --- | --- |
| `/` | Statement hero, About story, executive preview, featured/upcoming events, merch preview. |
| `/about` | CSS identity, mission, community, activities and real imagery. |
| `/executives` | The full executive team with roles and biographies/content when supplied. |
| `/events` | Upcoming events and past events/recaps. |
| `/events/[slug]` | An event's details, optional registration, and optional post-event material. |
| `/merch` | Products and valid colourways; commerce features only when requirements and infrastructure exist. |

Do not invent unsupported public facts. Keep unconfirmed names, dates, prices, stock, links, quotes, slogans, and contact information in clearly marked content placeholders that cannot accidentally be mistaken for live published information. Prefer hiding an optional section to displaying “Coming soon.”

## Before **every** task: input and dependency briefing

Before making changes, give the owner a short task-specific briefing, even if the list is empty:

1. **Outcome:** what this task will deliver and how it will be checked.
2. **Assets required now:** exact files/content needed, intended use, preferred source format/resolution, and whether each item is already in the project, supplied but not yet copied, or missing. Distinguish **blocking** assets from optional polish. Name the actual assets, not a generic “send all assets” request.
3. **Dependencies and setup:** packages/tools needed for this task, whether already installed, the proposed installation commands or steps, and any external setup or credentials required. State “none” when none are needed. Verify the project's actual package manager and installed versions first; do not guess versions or install a broad stack upfront.
4. **Approach:** how the work fits the existing design, data contracts, and mobile layout.

If a required asset or indispensable content is missing, **ask the owner for that specific item before implementing the dependent part**. If the owner has an original artwork/model/photo, ask for it at the point where that task needs it. Do not substitute an unapproved generic stock image, a screenshot, AI imagery, a fabricated quote, or a guessed production colourway. Continue with independent work that is possible while the missing input is being supplied. An expressly approved temporary placeholder is fine for layout/prototyping; label it and track its replacement.

State required installations **before** running them so the owner knows what is being added and why. Routine installation can proceed as part of an authorized coding task once the briefing is given, unless the owner directs otherwise. Ask only for choices or access that cannot reasonably be inferred. Keep a concise record of new packages and their purpose in the task summary. Do not request the entire asset checklist at project start; request the subset relevant to each task.

Examples:

- Hero task: request the approved hero copy if final copy is required; list available logo and symbol SVGs; state whether GSAP is needed. The hero can be prototyped with clearly labeled copy if the owner has authorized placeholders.
- Executive gallery task: request six names/roles, portraits with consistent framing, and approved quotes or biographies before presenting them as real; state the image processing tools needed.
- About 3D task: request the best original logo artwork or vector source and real CSS imagery; inspect the proposed logo model before choosing an asset workflow.
- Merch viewer task: request the original print artwork, product details, current valid inventory matrix, and the test shirt GLB; state the 3D packages and asset preparation tools needed. The presentation mockups alone are insufficient print textures.
- Event page task: request event title, date, location, artwork and registration status/link; only request speaker/sponsor/gallery assets if that event will display those sections.

## Design direction

- Palette: slightly toned white or off-white, near-black text, and a **light-to-neutral cobalt/electric blue**, not a very deep navy. Choose exact tokens from visual exploration and review them against the real logo, mockups, photos, and contrast requirements. Use blue purposefully for focus, selections, key labels, links, lines, transition panels and occasional lighting.
- Type: a distinctive display face for statements, readable sans for body/UI, and a restrained mono face for technical labels and the institutional ID motif. Use `next/font` or another deliberate self-hosted approach. Do not choose fonts just because they are trendy.
- Geometry: a consistent angled motif through selected masks, cuts, dividers, arrows, menu/page wipes and details. Explore the angle visually; do not apply diagonals to every component.
- Photography: prioritize actual CSS students, events and executives. Organize one consistent executive shoot with good originals and enough crop space. Use individual portraits/cutouts for the interactive gallery; a wide group image may be used elsewhere.
- The provided transparent `css_logo-nobg.png` is a reference for the actual dark CSS mark. Preserve its geometry. Seek the original vector artwork when creating an SVG or GLB; if vectorizing the PNG, review the result against the original rather than assuming a trace is accurate.
- The four provided shirt mockups are visual references showing the print placement and example treatments. They contain lighting, folds and low-resolution details and are not clean production artwork or trustworthy inventory records.

The site should feel connected from page to page. Give every major section an interaction identity; leave enough quiet space between the high-energy moments. A simple button may remain a simple button.

## Site shell and navigation

- Persistent header on **all viewport sizes**: “COMPUTER SCIENCE SOCIETY” at left, and a clearly labeled `MENU` control with hamburger icon at right. Do not replace the desktop menu with an ordinary horizontal navigation bar.
- Menu opens into a quick full-screen navigation surface with About, Executives, Events, Merch, plus appropriate contact/social context. Support keyboard, touch, Escape, focus trapping/return, and correct open/closed semantics.
- Use one coherent, fast angular route transition from a persistent app-level coordinator. The transition must respect navigation timing, direct URL loads and browser Back/Forward; avoid masking a failed or slow route. Aim for a brief visual beat, not a mandatory long intro.
- A short logo/title opening sequence may cover **critical first-view loading** on a first visit in a session. It must not wait for every photo, model and section. Subsequent navigation uses only the short route transition. Do not hold the hero hostage to a fabricated progress bar.
- Use subtle Lenis smoothing on capable desktop contexts if it improves the experience; preserve near-native mobile scrolling. Synchronize it with ScrollTrigger if used, and verify anchors, keyboard navigation, focus and browser restoration.

## Homepage storyboard

### 1. Hero

A composed statement within roughly the first viewport (`100svh` as a starting point, adapted for small screens). The large headline is in the conceptual territory of “WE BUILD WHAT'S NEXT”; final copy requires owner review. Surround it with a scattered editorial collage of roughly 10–14 carefully selected technology marks and generic symbols on desktop and about 4–7 on mobile. This is a **digital collage**, not a circular orbit or indiscriminate brand-logo wall. Symbols can react subtly to pointer proximity with transform, scale, repulsion or rotation. Use one shared pointer input and imperative transforms rather than React state updates for every symbol on every mouse event. Keep text readable and do not cover interactive controls.

At the lower right, a visible institutional identification card supports the headline: Computer Science Society, KNUST, College of Science, Kumasi/Ghana as verified. Its location/scale can adapt on mobile. Do not invent founding dates, serial data presented as fact, or university endorsements.

### 2. About journey

Move from the CSS identity into a restrained burst of **real** community images, then a scroll-driven story: who CSS is, what it does, and where computing can take its members. On desktop, a pinned sequence may transition from a flat mark into a prepared low-cost 3D CSS logo and settle into a composition of approximately 6–8 computing disciplines (for example software, cybersecurity, AI, data, design, cloud, games and research). The canvas ends with this section; do not keep a logo rendering throughout the full site. Build a readable, shorter mobile story with limited pinning. All narrative content must exist in the document even when motion is unavailable.

### 3. Executives

Six executives in an expanding desktop gallery: one wide active panel and five narrow panels; selecting another expands it and updates its portrait, role, name and approved copy. Use coherent individual portraits/cutouts so the composition survives multiple aspect ratios. On mobile, use a swipeable/snap card treatment with visible controls and understandable focus order. Keep names and roles available to assistive technology regardless of which panel is active.

### 4. Events

Large genuine event imagery expands into a cinematic introduction, with restrained angled reveals, then a short selected-event rail. Desktop may use a limited scroll-driven horizontal sequence; mobile should favor native-feeling cards. The homepage prioritizes featured and upcoming events. If none are upcoming, show recent highlights as an explicit fallback. Provide a direct “View all events” path. Event cards show actual date/status/registration facts; a past event may show a recap and gallery only if those assets exist.

### 5. Merch

A clean product preview with a shirt viewer, product name, verified price if available, and a link to `/merch`. Let people rotate the shirt and try **only available** base/print combinations. This is a taste of the product experience, not a checkout embedded in the homepage. If a quality GLB is unavailable, preserve a useful photographic/static preview until one is ready rather than delaying the entire page.

### 6. Footer

A calm conclusion with CSS identity, useful navigation, verified socials/contact and institutional context. Avoid another elaborate animation sequence.

## Merchandise variant contract

Base fabric colour determines which print colours may be chosen. Show only valid print options for the selected base. Selecting a new base must automatically choose a valid default print for that base, preferably retaining the previous print if it is valid for both bases. Never render or advertise a base/print combination that cannot be ordered.

The owner gave **illustrative** pairings: black base → white or pink print; white base → black or blue print. The mockups additionally depict blue base → white print. Verify the final sellable matrix, sizes, prices and availability with the owner before publishing a product configuration. Treat mockup colours and illustrative pairings as design examples until that confirmation.

Represent variants as data, not arbitrary colour picker values. A product/variant record should contain stable IDs, base and print colour names/values, availability, price where appropriate, image/model references, and optional size/inventory fields. UI choices derive from this data; there should be no hard-coded list of colors duplicated in components. Out-of-stock combinations need a deliberate behavior that accurately reflects inventory.

Aim for one quality shirt model with configurable fabric and clean print masks/materials, not a GLB per colourway. Ask for original front/back artwork (SVG, vector export or high-resolution transparent source), UV/model files if available, and the existing test GLB at the merch task. Inspect topology, UVs, materials, legibility and file size before committing to its use. Do not use the supplied folded mockup JPGs as production textures.

## Approved technical approach

- Next.js App Router + TypeScript; Tailwind CSS; `next/image` and `next/font`.
- GSAP, ScrollTrigger and `@gsap/react` for complex timelines, controlled gallery transitions and scroll choreography. Prefer CSS for straightforward hover/focus effects. No second general animation library unless a concrete need is demonstrated.
- Lenis for subtle desktop smoothing when it passes navigation/accessibility checks.
- Three.js, React Three Fiber and Drei only for the About logo and merch viewer or another specifically approved 3D use. Prefer a prepared GLB/glTF asset, with suitable static fallback.
- Lucide or custom SVGs where suitable; prefer sharp, optimized SVG for logos and technical symbols. Respect third-party logo usage requirements.
- React state/context is enough for current UI state. Add no general state library, broad UI kit or dependency merely for convenience.

Check the current official documentation and package compatibility before installing or following a code snippet. Pin actual project versions in the lockfile; this document intentionally does not freeze package versions or CLI commands. Use the project's existing package manager and conventions if a repository already exists.

Keep Server Components as the default for content, page structure, data access and metadata. Limit `"use client"` to interactive islands (for example `HeroTechField`, `About3DScene`, `ExecutiveGallery`, `EventRail`, `MerchViewer`, menu/transition controllers). Lazy-load 3D and other costly features near their section. Avoid clientifying an entire route just to animate one subsection.

Each GSAP timeline/ScrollTrigger must be scoped to its component and cleaned up on unmount/re-runs. Use responsive conditions, account for font/image/layout changes, and verify refresh behavior. Keep one rendering loop per scene; pause or stop expensive rendering outside active view where possible. No perpetual 60 FPS scene under the footer.

## Content and backend boundary

Define typed content entities and small access functions (`getEvents`, `getExecutives`, `getMerchProducts`, etc.). UI components consume those interfaces rather than importing a mock-data file directly or embedding content in JSX. The implementation behind the access functions can switch from local TypeScript data to an API/CMS later.

Suggested entities: `Executive`, `Committee` if needed, `Event`, `MerchProduct`, `MerchVariant`, `SiteSocial`. Names and field shapes should match actual needs. An event can include title, slug, description, start/end, location, artwork, registration status/link, and *optional* speakers, sponsors, gallery, recap, or hero image. Avoid forcing empty UI sections because a future CMS might support them. Derive event status carefully from actual dates, supplied status and registration state, instead of mixing unrelated badge values into one inconsistent enum.

Place verified content and explicitly marked placeholders together in a clear content layer. Mark which fields must be approved before launch. No fake executive biographies, event registrations, prices, sponsors or social links. Build URLs from a configurable canonical site origin once a real domain is confirmed.

## Accessibility and responsiveness

- Design each breakpoint intentionally. Desktop's pinned About sequence becomes a shorter readable mobile experience; desktop executive accordion becomes mobile cards; desktop horizontal event rail becomes accessible native-feeling navigation.
- All interactive elements must work by keyboard and touch, expose visible focus, and have meaningful labels. Images need appropriate alt text; decorative symbols can be hidden from assistive technology. Preserve headings and sensible reading order in all animation states.
- Test narrow phones, tablets, desktop, zoomed text and touch. Avoid trapping scrolling or making navigation dependent on hover.
- Meet usable contrast for real text and controls against the selected lighter blue/near-white palette. Check both mock and real photography behind text.

## Performance, loading and asset handling

- The hero and menu must become useful quickly. Load only critical first-view resources eagerly. Defer About model, portraits, event media and especially the shirt model until needed. Use responsive `next/image` and suitable WebP/AVIF exports for photos; keep original source assets for editing.
- Preload a model only when its upcoming use justifies it; loading the entire page behind the opening sequence is prohibited. Measure actual bundle and asset sizes before adding a speculative optimizer or an arbitrary hard budget.
- Optimize the CSS logo GLB and shirt GLB for the web: remove unused geometry/materials, keep texture resolution and draw calls reasonable, consider compression only after verifying compatibility, and avoid excessive dynamic lights/shadows.
- Keep one Canvas per relevant 3D experience and give it a useful static fallback on unsupported/slow devices or while loading. Handle WebGL failure without losing product information or the About story.
- Avoid layout shifts by reserving image/model space and using measured dimensions. Test a mid-range phone as well as desktop; prioritize smooth scrolling and fast navigation over decorative effects.

## Search, sharing and semantics

Give each route a meaningful title, description and canonical URL. Use App Router metadata for page and event-specific Open Graph/Twitter images; event flyers are strong candidates after checking legibility and crop. Generate sitemap and robots entries for real public pages. Use semantic content and descriptive link labels. Consider Organization/Event structured data only when public facts are verified. Verify WhatsApp/social previews from an accessible deployment; do not promise a particular preview layout that a platform controls.

## Suggested organization

Adapt to an existing repository rather than reorganizing it blindly:

```text
app/
  layout.tsx
  page.tsx
  about/page.tsx
  executives/page.tsx
  events/page.tsx
  events/[slug]/page.tsx
  merch/page.tsx
components/
  home/  navigation/  transitions/  executives/
  events/  merch/  three/  ui/
content/             # local typed content, including placeholder markers
lib/
  content/  animations/  three/
types/
public/
  brand/  tech-icons/  executives/  events/  merch/  models/
```

Avoid importing `content/` directly from many page components if `lib/content/` is the stable retrieval boundary. Keep reusable behavior reusable; do not over-abstract one-off choreography.

## Execution and completion standard

Build the full static page and responsive skeleton before sinking days into a single 3D or scroll interaction. Then add hero, About, executives, events, merch and interior pages, followed by accessibility, SEO and performance passes. A later sprint plan will turn this into dated tasks; this document is the ongoing implementation contract, not a fixed calendar.

For each completed task: show the changed files, what changed and why, which supplied assets and new dependencies were used, and the specific checks performed. Verify responsive behavior and the task's core interaction; run available type/lint/build checks where relevant. Report missing assets or unapproved placeholders plainly. A section is complete only when its information remains readable without animation, controls work with keyboard/touch, mobile layout is intentional, media failure has a sensible fallback, and claims/content are verified or explicitly pending approval.

Keep the first release focused. Defer dark mode, user accounts, checkout/cart, custom CMS/admin, elaborate search, broad gallery/sponsor systems, large multi-product 3D showroom, and site-layout editing. Add them only through a later scoped requirement.
