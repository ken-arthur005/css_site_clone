import type { Metadata } from "next";
import type { ReactNode } from "react";

// Applies to every detail page without excluding the main /events listing.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function EventDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
