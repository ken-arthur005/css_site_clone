import type { Metadata } from "next";
import {
  BioRhyme,
  Bricolage_Grotesque,
  Geist,
  Geist_Mono,
} from "next/font/google";
import { SiteFooter } from "@/components/navigation/site-footer";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import { NavigationBackground, NavigationStateProvider } from "@/components/providers/navigation-state-provider";
import { SiteHeader } from "@/components/navigation/site-header";
import { RouteTransitionProvider } from "@/components/transitions/route-transition-provider";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const bioRhyme = BioRhyme({
  variable: "--font-biorhyme",
  subsets: ["latin"],
  weight: ["200", "300", "400", "700", "800"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CSS KNUST",
  description: "Computer Science Society, KNUST.",
  icons: {
    icon: "/css_logo-nobg.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${bioRhyme.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScrollProvider>
          <NavigationStateProvider>
            <RouteTransitionProvider>
              <SiteHeader />
              <NavigationBackground>
                {children}
                <SiteFooter />
              </NavigationBackground>
            </RouteTransitionProvider>
          </NavigationStateProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
