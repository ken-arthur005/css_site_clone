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
import { HOME_INTRO_BOOT_SCRIPT } from "@/lib/home-intro";
import { NAVIGATION_SCROLL_BOOT_SCRIPT } from "@/lib/navigation-scroll";
import { getSiteInfo } from "@/lib/content/site";
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

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteInfo();
  return {
    metadataBase: new URL(site.canonicalOrigin.value),
    title: "CSS KNUST",
    description: "The Computer Science Society at KNUST. Meet the community and its executives, explore events, and discover CSS merchandise.",
    icons: { icon: "/css_logo-nobg.png" },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${bioRhyme.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: NAVIGATION_SCROLL_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: HOME_INTRO_BOOT_SCRIPT }} />
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
