import type { TeeProduct } from "@/types/merch-store";

// Approved by the owner during the merch migration. API stock/IDs remain live data.
const colourways = [
  { id: "kernel-panic", name: "Kernel Panic", base: "Black", print: "Pink", baseValue: "#2b2b2d", printValue: "#c0438a", modelVariantId: "css-core-tee-black-pink", file: "black-magenta" },
  { id: "hot-reload", name: "Hot Reload", base: "Pink", print: "White", baseValue: "#d93ba9", printValue: "#f4f3f0", modelVariantId: "css-core-tee-pink-white", file: "magenta-white" },
  { id: "blue-screen", name: "Blue Screen", base: "Blue", print: "White", baseValue: "#46568c", printValue: "#f4f3f0", modelVariantId: "css-core-tee-blue-white", file: "blue-white" },
  { id: "dark-mode", name: "Dark Mode", base: "Black", print: "White", baseValue: "#2b2b2d", printValue: "#f4f3f0", modelVariantId: "css-core-tee-black-white", file: "black-white" },
  { id: "light-mode", name: "Light Mode", base: "White", print: "Black", baseValue: "#f4f3f0", printValue: "#2b2b2d", modelVariantId: "css-core-tee-white-black", file: "white-black" },
  { id: "hyperlink", name: "Hyperlink", base: "White", print: "Blue", baseValue: "#f4f3f0", printValue: "#3f5ca6", modelVariantId: "css-core-tee-white-blue", file: "white-blue" },
].map(({ file, ...colourway }) => ({
  ...colourway,
  front: `/merch/tees/${colourway.id}-front.webp`,
  back: `/merch/tees/${colourway.id}-back.webp`,
  photo: `/merch/mockups/${file}.jpg`,
}));

export const teeProducts: TeeProduct[] = [
  {
    id: "css-tee", name: "CSS Tee", description: "The original. Six colourways. One society.", priceMinor: 7000,
    fits: [{ id: "regular", name: "Regular", extraMinor: 0 }, { id: "oversized", name: "Oversized", extraMinor: 2000 }],
    colourways,
  },
  {
    id: "pink-october", name: "Pink October Tee", description: "debugCancer(cure). Wear the reminder.", priceMinor: 7000,
    fits: [{ id: "regular", name: "Regular", extraMinor: 0 }], availableUntil: "2026-10-31",
    colourways: [{ id: "pink-october", name: "Pink October", base: "White", print: "Pink / black artwork", baseValue: "#f4f3f0", printValue: "#a92970", front: "/merch/pink/front.webp", back: "/merch/pink/back.webp", photo: "/merch/pink/mockup.jpg" }],
  },
];

export const merchStoreCopy = {
  sizes: [
    { id: "S" as const, chest: "36–38", length: "28", extraMinor: 0 },
    { id: "M" as const, chest: "39–41", length: "29", extraMinor: 0 },
    { id: "L" as const, chest: "42–44", length: "30", extraMinor: 0 },
    { id: "XL" as const, chest: "45–47", length: "31", extraMinor: 0 },
    { id: "XXL" as const, chest: "48–50", length: "32", extraMinor: 1000 },
    { id: "3XL" as const, chest: "51–53", length: "33", extraMinor: 1500 },
  ],
  maxQuantity: 20,
  discount: { minimumQuantity: 2, percent: 5 },
  features: ["May contain sarcasm", "Code-ranting outbursts", "Shelter from sunlight", "Dangerous caffeine levels"],
  manifesto: "An extraordinary field where ideas become algorithms, algorithms become systems, and systems quietly run the world while everyone sleeps.",
  story: [
    { title: "The front.", description: "Clean chest, loud side. One continuous print from collar to hem." },
    { title: "The mark.", description: "The CSS logo sits on the chest. Small enough to be subtle, sharp enough to be recognised." },
    { title: "The strip.", description: "Databases, bugs, shields, bots, money bags. Everything a CS student dreams about, stacked down the side." },
    { title: "The spec sheet.", description: "Warning labels, a loading bar, the Cyber Society definition and a QR code. The back has something to say, too." },
    { title: "Make it yours.", description: "Choose your colourway, fit and size. Add another tee and get 5% off your merchandise subtotal." },
  ],
  facts: [
    "October is Breast Cancer Awareness Month. That’s why the ribbon—and this tee—are pink.",
    "Get to know what is normal for you. If you notice a new or unusual change, speak to a healthcare professional.",
    "Breast cancer can affect men too. Awareness belongs to everyone.",
    "Check on the people you love. A conversation can be a good place to start.",
  ],
  faq: [
    { question: "How does the 5% offer work?", answer: "Buy two or more tees in one order, in any combination. Get 5% off the whole merchandise subtotal, including fit and size extras. Payment fees are separate." },
    { question: "How do I pay?", answer: "Checkout opens Paystack through the CSS ordering service. Use one of the payment methods offered there. Your order page shows the confirmed payment status and pickup code when available." },
    { question: "Which sizes and fits can I choose?", answer: "Both tees come in S–3XL. The CSS Tee has regular and oversized fits; Pink October has a regular fit. The size guide and any extras are shown before you add a tee." },
  ],
};
