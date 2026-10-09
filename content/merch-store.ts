import type { TeeProduct } from "@/types/merch-store";

// Approved by the owner during the merch migration. API stock/IDs remain live data.
const colourways = [
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
  photo: `/merch/mockups/${file}.jpg`,
}));

export const teeProducts: TeeProduct[] = [
  {
    id: "css-tee", apiId: 2, apiNames: ["Css Shirt", "CSS Tee"], name: "CSS Tee", description: "The original. Six colourways. One society.", priceMinor: 7000,
    colourways,
  },
  {
    id: "pink-october", apiId: 3, apiNames: ["Pink Octobee", "Pink October Tee"], name: "Pink October Tee", description: "debugCancer(cure). Wear the reminder.", priceMinor: 7000,
    availableUntil: "2026-10-31",
    colourways: [{ id: "pink-october", name: "Pink October", base: "White", print: "Pink / black artwork", baseValue: "#f4f3f0", printValue: "#a92970", front: "/merch/pink/front.webp", back: "/merch/pink/back.webp", photo: "/merch/pink/mockup.jpg" }],
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
  maxQuantity: 20,
  discount: { enabled: true, minimumQuantity: 2, percent: 5 },
  features: ["May contain sarcasm", "Code-ranting outbursts", "Shelter from sunlight", "Dangerous caffeine levels"],
  manifesto: "An extraordinary field where ideas become algorithms, algorithms become systems, and systems quietly run the world while everyone sleeps.",
  story: [
    { title: "The front.", description: "Clean chest, loud side. One continuous print from collar to hem." },
    { title: "The mark.", description: "The CSS logo sits on the chest. Small enough to be subtle, sharp enough to be recognised." },
    { title: "The strip.", description: "Databases, bugs, shields, bots, money bags. Everything a CS student dreams about, stacked down the side." },
    { title: "The spec sheet.", description: "Warning labels, a loading bar, the Cyber Society definition and a QR code. The back has something to say, too." },
    { title: "Make it yours.", description: "Choose your colourway and size. Build your order and review the current offer in the shop." },
  ],
  facts: [
    "October is Breast Cancer Awareness Month. That’s why the ribbon—and this tee—are pink.",
    "Get to know what is normal for you. If you notice a new or unusual change, speak to a healthcare professional.",
    "Breast cancer can affect men too. Awareness belongs to everyone.",
    "Check on the people you love. A conversation can be a good place to start.",
  ],
  faq: [
    { question: "How does the offer work?", answer: "The shop shows the current bulk discount from the CSS ordering service. Eligible orders receive the discount on their merchandise subtotal. The payment-processing fee is separate." },
    { question: "How do I pay?", answer: "Review your tees, add your details and choose Proceed to pay. Paystack shows your final total, including the processing fee, before you approve payment. After payment, your receipt shows what you bought and your pickup code." },
    { question: "Which sizes can I choose?", answer: "The shop shows the sizes currently available for each tee. Check the size guide before adding your selection. Your saved order can include different sizes." },
  ],
};
