import type { Metadata } from "next";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Zen Dojo</h1>
      <p className="mt-4 text-muted">
        A 16-week interview-prep course: DSA, system design, low-level design and core CS. Sign in with GitHub to see your
        plan, notes and progress on any computer or phone. The same account works in the desktop app.
      </p>
      <p className="mt-2 text-sm text-muted">Running code is available in the desktop app.</p>
      <a href="/auth/start" className="mt-8 inline-block rounded-md bg-accent px-5 py-2.5 font-medium text-white">
        Continue with GitHub
      </a>
    </main>
  );
}
