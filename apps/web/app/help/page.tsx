import type { Metadata } from "next";
import { PageMain } from "../ui";
import { FaqBrowser } from "./faq-browser";

export const metadata: Metadata = { title: "Help and FAQ" };

// Static page: the FAQ text lives in lib/faq.ts, and searching and filtering happen in the client component.
export default function HelpPage() {
  return (
    <PageMain title="Help and FAQ" narrow>
      <h2 className="text-2xl font-semibold tracking-tight">Help and FAQ</h2>
      <p className="mt-1 mb-5 text-sm text-muted">Install problems, running code, AI, sync, the hosted site and certificates. Search or pick a topic.</p>
      <FaqBrowser />
    </PageMain>
  );
}
