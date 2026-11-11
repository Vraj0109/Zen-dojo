"use client";

import { useState } from "react";
import { AiChat, type ProviderInfo } from "../../../dsa/ai-chat";

/**
 * "Ask AI" for a course lesson: a floating button that opens the same chat as on problems, in a panel at the bottom right.
 * The chat stays mounted while the panel is closed, so the conversation is kept until you press New chat or leave the lesson.
 */
export function LessonAi({ lessonId, providers, provider }: { lessonId: string; providers: ProviderInfo[]; provider: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="lesson-ai-panel"
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-on-accent shadow-lg hover:opacity-90"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {open ? "Close chat" : "Ask AI"}
      </button>
      <div
        id="lesson-ai-panel"
        hidden={!open}
        className="fixed bottom-16 right-4 z-30 max-h-[calc(100vh-6rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface shadow-2xl"
      >
        <AiChat lessonId={lessonId} providers={providers} provider={provider} />
      </div>
    </div>
  );
}
