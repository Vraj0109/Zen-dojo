import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Suspense } from "react";
import { Nav, NavLinks } from "./nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "HabitManager", template: "%s · HabitManager" },
  description: "Daily progress tracker for the SDE2/SWE3 prep roadmap",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full lg:flex">
        {/* Sidebar on wide screens, a scrolling top bar on phones */}
        <aside className="sticky top-0 z-10 print:hidden border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0 lg:px-3 lg:py-6">
          <Link href="/" className="mb-2 block px-1 lg:mb-6 lg:px-3">
            <span className="block text-xs font-medium text-muted">SDE2 / SWE3 prep</span>
            <span className="block text-lg font-semibold tracking-tight">HabitManager</span>
          </Link>
          <Suspense fallback={<NavLinks pathname={null} />}>
            <Nav />
          </Suspense>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
