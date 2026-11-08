import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Geist, Geist_Mono, Lexend } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Suspense } from "react";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { GlobalTimer } from "./global-timer";
import { CustomFontLoader } from "./custom-font-loader";
import { FocusReading } from "./focus-reading";
import { HistoryButtons } from "./history-buttons";
import { Nav, NavFooter, NavFooterLinks, NavLinks } from "./nav";
import { Logo } from "./logo";
import { Shell } from "./shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Optional reading fonts (Settings > Interface > Reading font). Loaded with the page, used only when chosen.
const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"], display: "swap" });
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"], display: "swap" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Prepwise", template: "%s · Prepwise" },
  description: "Offline, open-source engineering course: DSA, system design, low-level design and core CS",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the init script sets data-mode/data-theme/data-accent on <html> before React runs.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${lexend.variable} ${atkinson.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Shell aside={asideNode}>{children}</Shell>
        <FocusReading />
        <CustomFontLoader />
      </body>
    </html>
  );
}

const asideNode = (
        <>
        {/* Sidebar on wide screens, a scrolling top bar on phones */}
        <aside className="sticky top-0 z-10 print:hidden border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0 lg:px-3 lg:py-6">
          <div className="mb-2 flex items-center justify-between gap-2 px-1 lg:mb-6 lg:px-3">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="size-9 shrink-0" />
              <span className="block leading-tight">
                <span className="block text-base font-semibold tracking-tight">Prepwise</span>
                <span className="block whitespace-nowrap text-[11px] text-muted">Offline learning</span>
              </span>
            </Link>
            <HistoryButtons />
          </div>
          <Suspense fallback={<NavLinks pathname={null} />}>
            <Nav />
          </Suspense>
          {/* The one focus timer, above Profile on wide screens and under the top bar on phones */}
          <div className="mt-2 space-y-3 lg:mt-auto">
            <GlobalTimer />
            <Suspense fallback={<NavFooterLinks pathname={null} />}>
              <NavFooter />
            </Suspense>
          </div>
        </aside>
        </>
);
