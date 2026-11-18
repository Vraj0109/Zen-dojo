import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Figtree, JetBrains_Mono, Lexend } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { getAiSettings, getBuddySettings } from "@/lib/ui-prefs";
import { BuddyCompanion } from "./buddy/buddy-companion";
import { GlobalTimer } from "./global-timer";
import { CustomFontLoader } from "./custom-font-loader";
import { FocusReading } from "./focus-reading";
import { Nav, NavFooter, NavFooterLinks, NavLinks } from "./nav";
import { SidebarAccount } from "./components/sidebar-account";
import { HeaderStreak, ReviewCount, SidebarProgress } from "./components/sidebar-progress";
import { Logo } from "./logo";
import { Shell } from "./shell";
import { RegisterSw } from "./register-sw";
import { HostedSyncOnRequest } from "./components/hosted-sync";
import { GuestNotice } from "./components/guest-notice";
import { HapticsListener } from "./components/haptics-listener";
import { SyncedPrefs } from "./components/synced-prefs";
import { PullToRefresh } from "./components/pull-to-refresh";
import { SectionScrubber } from "./components/section-scrubber";

// App fonts (DESIGN.md): Figtree for UI and body, JetBrains Mono for code.
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

// Optional reading fonts (Settings > Interface > Reading font). Loaded with the page, used only when chosen.
const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"], display: "swap" });
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"], display: "swap" });

const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Zen Dojo", template: "%s · Zen Dojo" },
  description:
    process.env.HABIT_HOSTED === "1"
      ? "Interview-prep course: DSA, system design, low-level design and core CS"
      : "Offline, open-source engineering course: DSA, system design, low-level design and core CS",
  icons: {
    // Listed explicitly: setting `icons` here replaces the automatic tags for app/icon.svg.
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Zen Dojo", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#1c1715", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the init script sets data-mode/data-theme/data-accent on <html> before React runs.
    <html lang="en" className={`${figtree.variable} ${jetbrainsMono.variable} ${lexend.variable} ${atkinson.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Shell
          aside={asideNode}
          account={<Suspense fallback={null}><SidebarAccount compact /></Suspense>}
          streak={<Suspense fallback={null}><HeaderStreak /></Suspense>}
          notice={<Suspense fallback={null}><GuestNotice /></Suspense>}
        >
          {children}
        </Shell>
        <RegisterSw />
        <Suspense fallback={null}>
          <HostedSyncOnRequest />
        </Suspense>
        <HapticsListener />
        <SyncedPrefs />
        <PullToRefresh />
        <Suspense fallback={null}>
          <SectionScrubber />
        </Suspense>
        <FocusReading />
        <CustomFontLoader />
        <Suspense fallback={null}>
          <BuddySessionLoader />
        </Suspense>
      </body>
    </html>
  );
}

async function BuddySessionLoader() {
  await connection();
  const [settings, ai] = await Promise.all([getBuddySettings(), process.env.HABIT_HOSTED === "1" ? null : getAiSettings()]);
  return <BuddyCompanion settings={settings} ai={{ enabled: process.env.HABIT_HOSTED === "1" || Boolean(ai?.enabled) }} />;
}

const asideNode = (
  <>
    {/* Sidebar from lg (240px, surface-2); a top bar between md and lg; on phones only a running timer shows (the phone
        header and tab bar replace the rest). */}
    <aside className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur max-md:contents print:hidden lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0 lg:bg-surface-2 lg:px-3 lg:py-5 lg:backdrop-blur-none">
      <div className="mb-2 flex items-center gap-3 max-md:hidden lg:mb-5 lg:flex-col lg:items-stretch lg:gap-3 lg:px-1">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <Logo className="size-8 shrink-0" />
          <span className="block leading-tight">
            <span className="block text-base font-semibold tracking-tight">Zen Dojo</span>
            <span className="block whitespace-nowrap text-xs text-muted">{process.env.HABIT_HOSTED === "1" ? "Interview prep" : "Offline learning"}</span>
          </span>
        </Link>
        <Suspense fallback={null}>
          <SidebarProgress />
        </Suspense>
        {/* Tablet top bar: the account button (the sidebar footer is lg only). Hidden inside the problem-page drawer. */}
        <div className="ml-auto lg:hidden [.drawer-panel_&]:hidden">
          <Suspense fallback={null}>
            <SidebarAccount compact />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={<NavLinks pathname={null} />}>
        <Nav counts={{ "/review": <Suspense fallback={null}><ReviewCount /></Suspense> }} />
      </Suspense>
      {/* The one focus timer (only while it runs), then the account and sync row */}
      <div className="mt-2 space-y-3 max-md:mx-4 max-md:mt-3 max-md:empty:hidden lg:mt-auto">
        <GlobalTimer />
        <Suspense fallback={<NavFooterLinks pathname={null} />}>
          <NavFooter account={<Suspense fallback={null}><SidebarAccount /></Suspense>} />
        </Suspense>
      </div>
    </aside>
  </>
);