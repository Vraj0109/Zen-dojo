import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Geist, Geist_Mono, Lexend } from "next/font/google";
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
import { HistoryButtons } from "./history-buttons";
import { Nav, NavFooter, NavFooterLinks, NavLinks } from "./nav";
import { SidebarAccount } from "./components/sidebar-account";
import { Logo } from "./logo";
import { Shell } from "./shell";
import { RegisterSw } from "./register-sw";
import { HostedSyncOnRequest } from "./components/hosted-sync";
import { GuestNotice } from "./components/guest-notice";
import { HapticsListener } from "./components/haptics-listener";
import { PullToRefresh } from "./components/pull-to-refresh";

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
  title: { default: "Zen Dojo", template: "%s · Zen Dojo" },
  description:
    process.env.HABIT_HOSTED === "1"
      ? "Interview-prep course: DSA, system design, low-level design and core CS"
      : "Offline, open-source engineering course: DSA, system design, low-level design and core CS",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Zen Dojo", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#1c1715", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the init script sets data-mode/data-theme/data-accent on <html> before React runs.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${lexend.variable} ${atkinson.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Shell aside={asideNode} account={<Suspense fallback={null}><SidebarAccount compact /></Suspense>}>{children}</Shell>
        <RegisterSw />
        <Suspense fallback={null}>
          <HostedSyncOnRequest />
        </Suspense>
        <Suspense fallback={null}>
          <GuestNotice />
        </Suspense>
        <HapticsListener />
        <PullToRefresh />
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
        {/* Sidebar on wide screens, a scrolling top bar on phones */}
        <aside className="sticky top-0 z-10 print:hidden border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0 lg:px-3 lg:py-6">
          <div className="mb-2 flex items-center justify-between gap-2 px-1 lg:mb-6 lg:px-3">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="size-9 shrink-0" />
              <span className="block leading-tight">
                <span className="block text-base font-semibold tracking-tight">Zen Dojo</span>
                <span className="block whitespace-nowrap text-[11px] text-muted">{process.env.HABIT_HOSTED === "1" ? "Interview prep" : "Offline learning"}</span>
              </span>
            </Link>
            {/* Phones: no back/forward arrows or Sign in up here; the bottom tab bar has Today, Practice, Learn, Review and You. */}
            <div className="flex items-center gap-1 max-md:hidden">
              <HistoryButtons />
              {/* Phones: the account button (the sidebar footer is wide-screen only). Hidden inside the drawer. */}
              <div className="lg:hidden [.drawer-panel_&]:hidden">
                <Suspense fallback={null}>
                  <SidebarAccount compact />
                </Suspense>
              </div>
            </div>
          </div>
          <Suspense fallback={<NavLinks pathname={null} />}>
            <Nav />
          </Suspense>
          {/* The one focus timer, above Profile on wide screens and under the top bar on phones */}
          <div className="mt-2 space-y-3 lg:mt-auto">
            <GlobalTimer />
            <Suspense fallback={<NavFooterLinks pathname={null} />}>
              <NavFooter account={<Suspense fallback={null}><SidebarAccount /></Suspense>} />
            </Suspense>
          </div>
        </aside>
        </>
);
