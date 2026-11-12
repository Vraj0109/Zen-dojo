"use client";

import { useEffect, useState } from "react";
import { AiChat, type ProviderInfo } from "../../../dsa/ai-chat";

/**
 * "Ask AI" for a course lesson. Wide screens: a floating button that opens the same chat as on problems, in a panel at the
 * bottom right. Phones: a button above the tab bar (the tab bar used to cover it) that opens the chat as a full-screen
 * sheet with a Close button. The chat stays mounted while closed, so the conversation is kept until you press New chat or
 * leave the lesson.
 */
export function LessonAi({ lessonId, providers, provider }: { lessonId: string; providers: ProviderInfo[]; provider: string }) {
  const [open, setOpen] = useState(false);

  // While the phone sheet is open the page behind it should not scroll.
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 767px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="lesson-ai-panel"
        className={`fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-on-accent shadow-lg hover:opacity-90 max-md:bottom-[calc(5.25rem+env(safe-area-inset-bottom))] max-md:right-3 max-md:min-h-11 ${open ? "max-md:hidden" : ""}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {open ? "Close chat" : "Ask AI"}
      </button>
      <div
        id="lesson-ai-panel"
        hidden={!open}
        role="dialog"
        aria-label="Ask AI about this lesson"
        className="fixed bottom-16 right-4 z-30 max-h-[calc(100vh-6rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface shadow-2xl max-md:inset-0 max-md:bottom-0 max-md:right-0 max-md:z-50 max-md:max-h-none max-md:w-auto max-md:overflow-hidden max-md:rounded-none max-md:border-0 max-md:bg-background max-md:pb-[env(safe-area-inset-bottom)]"
      >
        <div className="hidden h-12 items-center justify-between border-b border-line px-3 max-md:flex">
          <span className="text-sm font-semibold">Ask AI</span>
          <button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-lg px-3 text-sm font-medium text-muted hover:bg-surface hover:text-foreground">
            Close
          </button>
        </div>
        <div className='max-md:p-2 max-md:[&_section[aria-label="Ask AI"]]:h-[calc(100dvh-4.5rem)]'>
          <AiChat lessonId={lessonId} providers={providers} provider={provider} />
        </div>
      </div>
    </div>
  );
}
