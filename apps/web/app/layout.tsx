import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="mx-auto flex w-full max-w-3xl flex-wrap items-end justify-between gap-3 px-4 pt-8 sm:pt-12">
          <div>
            <p className="text-sm font-medium text-muted">SDE2 / SWE3 prep</p>
            <p className="text-3xl font-semibold tracking-tight">HabitManager</p>
          </div>
          <Suspense fallback={<NavLinks pathname={null} />}>
            <Nav />
          </Suspense>
        </header>
        {children}
      </body>
    </html>
  );
}
