import type { ShopProduct, TeeBack, TeeColourway, TeeFit } from "@/types/merch-store";

// Approved by the owner during the merch migration: products, names, taglines
// and designs carried over from the css-merch store. API stock, prices and
// availability remain live data; the prices here are only display estimates.
const colourways: TeeColourway[] = [
  { id: "kernel-panic", apiValue: "black-pink", name: "Kernel Panic", base: "Black", print: "Pink", baseValue: "#2b2b2d", printValue: "#c0438a", modelVariantId: "css-core-tee-black-pink", file: "black-magenta" },
  { id: "hot-reload", apiValue: "pink-white", name: "Hot Reload", base: "Pink", print: "White", baseValue: "#d93ba9", printValue: "#f4f3f0", modelVariantId: "css-core-tee-pink-white", file: "magenta-white" },
  { id: "blue-screen", apiValue: "blue-white", name: "Blue Screen", base: "Blue", print: "White", baseValue: "#46568c", printValue: "#f4f3f0", modelVariantId: "css-core-tee-blue-white", file: "blue-white" },
  { id: "dark-mode", apiValue: "black-white", name: "Dark Mode", base: "Black", print: "White", baseValue: "#2b2b2d", printValue: "#f4f3f0", modelVariantId: "css-core-tee-black-white", file: "black-white" },
  { id: "light-mode", apiValue: "white-black", name: "Light Mode", base: "White", print: "Black", baseValue: "#f4f3f0", printValue: "#2b2b2d", modelVariantId: "css-core-tee-white-black", file: "white-black" },
  { id: "hyperlink", apiValue: "white-blue", name: "Hyperlink", base: "White", print: "Blue", baseValue: "#f4f3f0", printValue: "#3f5ca6", modelVariantId: "css-core-tee-white-blue", file: "white-blue" },
].map(({ file, ...colourway }) => ({
  ...colourway,
  front: `/merch/tees/${colourway.id}-front.webp`,
  back: `/merch/tees/${colourway.id}-back.webp`,
  backs: { "spec-sheet": `/merch/tees/${colourway.id}-back.webp`, backbone: `/merch/tees/${colourway.id}-back-backbone.webp` },
  photo: `/merch/mockups/${file}.jpg`,
}));

const pinkColourway: TeeColourway = { id: "pink-october", name: "Pink October", base: "White", print: "Pink / black artwork", baseValue: "#f4f3f0", printValue: "#a92970", front: "/merch/pink/front.webp", back: "/merch/pink/back.webp", photo: "/merch/pink/mockup.jpg" };
const lacosteColourway: TeeColourway = { id: "general-lacoste", name: "White, blue print", base: "White", print: "Blue", baseValue: "#f4f3f0", printValue: "#2448c8", front: "/merch/lacoste/front.webp", back: "/merch/lacoste/back.webp", photo: "/merch/lacoste/front.webp" };

export const teeBacks: TeeBack[] = [
  { id: "spec-sheet", name: "Spec Sheet", description: "Warning labels, a loading bar and a QR code.", priceMinor: 8000 },
  { id: "backbone", name: "The Backbone", description: "The Backbone of Modern Technology, down the spine.", priceMinor: 7500 },
];
export const teeFits: TeeFit[] = [
  { id: "regular", name: "Regular", extraMinor: 0 },
  { id: "oversized", name: "Oversized", extraMinor: 2000 },
];

export const teeProducts: ShopProduct[] = [
  {
    id: "css-tee", apiId: 2, apiNames: ["Css Shirt", "CSS Tee"], kind: "tee", group: "tees", name: "CSS Tee",
    description: "The original. Six colourways, two back designs.", priceMinor: 7500, colourways, hasSizes: true,
  },
  {
    id: "pink-october", apiId: 3, apiNames: ["Pink Octobee", "Pink October Tee"], kind: "simple", group: "tees", name: "Pink October Tee",
    description: "debugCancer(cure). Wear the reminder.", priceMinor: 7000, availableUntil: "2026-10-31", colourways: [pinkColourway], hasSizes: true,
  },
  {
    id: "general-lacoste", apiNames: ["General Lacoste"], kind: "simple", group: "polos", name: "General Lacoste",
    description: "White piqué polo: twin CSS stripes on the chest, The Backbone of MODERN TECHNOLOGY across the back.", priceMinor: 7000, colourways: [lacosteColourway], hasSizes: true,
  },
  {
    id: "bundle-mono", apiNames: ["Monorepo"], kind: "bundle", group: "bundles", name: "Monorepo", badge: "Best value",
    description: "Everything in one place: the Spec Sheet tee and the Backbone tee in any colours, plus the General Lacoste.", priceMinor: 21000, colourways: [], hasSizes: false,
    pieces: [{ slot: "tee", label: "Spec Sheet tee", productId: "css-tee", back: "spec-sheet" }, { slot: "tee2", label: "Backbone tee", productId: "css-tee", back: "backbone" }, { slot: "gpolo", label: "General Lacoste", productId: "general-lacoste" }],
  },
  {
    id: "bundle-duo", apiNames: ["Pair Programming"], kind: "bundle", group: "bundles", name: "Pair Programming",
    description: "A Spec Sheet tee and a Backbone tee, each in any colour you like. Mix them or match them.", priceMinor: 15000, colourways: [], hasSizes: false,
    pieces: [{ slot: "tee", label: "Spec Sheet tee", productId: "css-tee", back: "spec-sheet" }, { slot: "tee2", label: "Backbone tee", productId: "css-tee", back: "backbone" }],
  },
  {
    id: "bundle-dual", apiNames: ["Dual Boot"], kind: "bundle", group: "bundles", name: "Dual Boot",
    description: "A Spec Sheet tee in any colour and the General Lacoste: one for lectures, one for when it counts.", priceMinor: 14500, colourways: [], hasSizes: false,
    pieces: [{ slot: "tee", label: "Spec Sheet tee", productId: "css-tee", back: "spec-sheet" }, { slot: "gpolo", label: "General Lacoste", productId: "general-lacoste" }],
  },
  {
    id: "bundle-trio", apiNames: ["Three-Way Merge"], kind: "bundle", group: "bundles", name: "Three-Way Merge", availableUntil: "2026-10-31",
    description: "Spec Sheet tee and Backbone tee in any colours you like, plus the Pink October tee.", priceMinor: 21500, colourways: [], hasSizes: false,
    pieces: [{ slot: "tee", label: "Spec Sheet tee", productId: "css-tee", back: "spec-sheet" }, { slot: "tee2", label: "Backbone tee", productId: "css-tee", back: "backbone" }, { slot: "pink", label: "Pink October tee", productId: "pink-october" }],
  },
];

export const merchStoreCopy = {
  sizes: [
    { id: "S" as const, chest: "36–38", length: "28" },
    { id: "M" as const, chest: "39–41", length: "29" },
    { id: "L" as const, chest: "42–44", length: "30" },
    { id: "XL" as const, chest: "45–47", length: "31" },
    { id: "XXL" as const, chest: "48–50", length: "32" },
    { id: "3XL" as const, chest: "51–53", length: "33" },
  ],
  backs: teeBacks,
  fits: teeFits,
  backNamePriceMinor: 1500,
  maxQuantity: 20,
  features: ["May contain sarcasm", "Code-ranting outbursts", "Shelter from sunlight", "Dangerous caffeine levels"],
  manifesto: "An extraordinary field where ideas become algorithms, algorithms become systems, and systems quietly run the world while everyone sleeps.",
  story: [
    { title: "The front.", description: "Clean chest, loud side. One continuous print from collar to hem." },
    { title: "The mark.", description: "The CSS logo sits on the chest. Small enough to be subtle, sharp enough to be recognised." },
    { title: "The strip.", description: "Databases, bugs, shields, bots, money bags. Everything a CS student dreams about, stacked down the side." },
    { title: "The spec sheet.", description: "Warning labels, a loading bar, the Cyber Society definition and a QR code. The back has something to say, too." },
    { title: "Make it yours.", description: "Choose your colourway, back design, fit and size, add your name, or grab a bundle." },
  ],
  facts: [
    "October is Breast Cancer Awareness Month. That’s why the ribbon—and this tee—are pink.",
    "Get to know what is normal for you. If you notice a new or unusual change, speak to a healthcare professional.",
    "Breast cancer can affect men too. Awareness belongs to everyone.",
    "Check on the people you love. A conversation can be a good place to start.",
  ],
  faq: [
    { question: "Are there deals?", answer: "Yes: the bundles. Each is a flat price for two or three pieces, and you choose the colour and size of every piece. Got a bundle code? Enter it when you review your order to take the bundles down to their code price." },
    { question: "How do I pay?", answer: "Pay with Mobile Money (MTN, Telecel or AirtelTigo) or a card, right on the order page. For Mobile Money you approve the prompt on your phone; the page confirms as soon as it’s paid. A small processing fee is added and shown before you pay." },
    { question: "Can I put my name on it?", answer: "On the CSS Tee, yes: up to 12 letters or numbers across the back, for a small extra charge shown in the shop." },
    { question: "How do I collect?", answer: "We text you when your order is ready. At the pickup desk, scan the QR code to join the queue and show your pickup code. Lost your receipt? Use “My orders” with your phone number." },
    { question: "Which sizes can I choose?", answer: "The shop shows the sizes currently available for each piece. Check the size guide before adding your selection. Your order can include different sizes." },
  ],
};
