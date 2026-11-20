import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Google_Sans, JetBrains_Mono, Lexend } from "next/font/google";
import "./globals.css";
import { connection } from "next/server";
import { Suspense } from "react";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { getAiSettings, getBuddySettings } from "@/lib/ui-prefs";
import { BuddyCompanion } from "./buddy/buddy-companion";
import { CustomFontLoader } from "./custom-font-loader";
import { FocusReading } from "./focus-reading";
import { NavRail } from "./nav";
import { SidebarAccount } from "./components/sidebar-account";
import { HeaderStreak, ReviewCount } from "./components/sidebar-progress";
import { Shell } from "./shell";
import { RegisterSw } from "./register-sw";
import { HostedSyncOnRequest } from "./components/hosted-sync";
import { GuestNotice } from "./components/guest-notice";
import { HapticsListener } from "./components/haptics-listener";
import { SyncedPrefs } from "./components/synced-prefs";
import { PullToRefresh } from "./components/pull-to-refresh";
import { SectionScrubber } from "./components/section-scrubber";

// App fonts (Material 3 Expressive, plan 0085): Google Sans for UI and body, JetBrains Mono for code.
const googleSans = Google_Sans({ variable: "--font-google-sans", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

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
    <html lang="en" className={`${googleSans.variable} ${jetbrainsMono.variable} ${lexend.variable} ${atkinson.variable} h-full antialiased`} suppressHydrationWarning>
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
  <Suspense fallback={<NavRail pathname={null} />}>
    <NavRail
      counts={{ "/review": <Suspense fallback={null}><ReviewCount /></Suspense> }}
      account={<Suspense fallback={null}><SidebarAccount compact /></Suspense>}
    />
  </Suspense>
);