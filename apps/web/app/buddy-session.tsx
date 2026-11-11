"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  type BuddySettings,
  type BuddyTone,
  DEFAULT_BUDDY_SETTINGS,
  getMidSessionNudge,
  getPacingConfig,
  getPostSessionCelebration,
  getStartCheckIn,
} from "@habit/shared";
import { emitBuddy } from "./buddy/buddy-events";
import { useNow } from "./timer-store";

interface SessionData {
  status: "idle" | "intent" | "active" | "reflection";
  goal: string;
  startedAt: number | null;
  durationMinutes: number;
  completedAt?: number | null;
  achieved?: boolean;
}

const STORAGE_KEY = "habit-buddy-session";

function loadSession(): SessionData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { status: "idle", goal: "", startedAt: null, durationMinutes: 20 };
    return JSON.parse(raw) as SessionData;
  } catch {
    return { status: "idle", goal: "", startedAt: null, durationMinutes: 20 };
  }
}

function saveSession(data: SessionData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * The co-work session panel (intent, sprint, reflection). The companion avatar opens it and says
 * where it goes (`style`: fixed position next to the avatar). All session logic lives here.
 * Mount it after hydration only (the companion does).
 */
export function BuddySession({
  settings = DEFAULT_BUDDY_SETTINGS,
  open,
  onClose,
  style,
}: {
  settings?: BuddySettings;
  open: boolean;
  onClose: () => void;
  style: CSSProperties;
}) {
  const [session, setSession] = useState<SessionData>(() => {
    if (typeof window === "undefined") return { status: "idle", goal: "", startedAt: null, durationMinutes: 20 };
    return loadSession();
  });
  const [goalInput, setGoalInput] = useState(() => (typeof window === "undefined" ? "" : loadSession().goal));
  const [chosenMinutes, setChosenMinutes] = useState<number | null>(null);
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);
  const now = useNow(open && session.status === "active");

  const tone: BuddyTone = settings.mode === "off" ? "calm" : settings.mode;
  const name = settings.name?.trim() || "Buddy";

  if (!open || settings.mode === "off") return null;

  const pacing = getPacingConfig(settings.pacing);
  const minutes = chosenMinutes ?? pacing.workMinutes;

  // The panel is only visible while open; the idle state shows the intent form straight away.
  const panel = (children: ReactNode) => (
    <div style={style} className="fixed z-40 print:hidden" role="dialog" aria-label={`Co-work with ${name}`}>
      {children}
    </div>
  );

  const beginSprint = () => {
    const goal = goalInput.trim() || "Focus on the problem";
    const updated: SessionData = {
      status: "active",
      goal,
      startedAt: Date.now(),
      durationMinutes: minutes,
    };
    setSession(updated);
    saveSession(updated);
    emitBuddy("session-start");
  };

  const showNudge = () => {
    setNudgeMessage(getMidSessionNudge(tone, name));
    setTimeout(() => setNudgeMessage(null), 8000);
  };

  const finishSprint = () => {
    const updated: SessionData = {
      ...session,
      status: "reflection",
      completedAt: Date.now(),
    };
    setSession(updated);
    saveSession(updated);
    emitBuddy("session-end");
  };

  const recordOutcome = (achieved: boolean) => {
    const updated: SessionData = {
      ...session,
      achieved,
    };
    setSession(updated);
    saveSession(updated);
  };

  const dismiss = () => {
    const updated: SessionData = { status: "idle", goal: "", startedAt: null, durationMinutes: 20 };
    setSession(updated);
    saveSession(updated);
    setGoalInput("");
    setChosenMinutes(null);
    setNudgeMessage(null);
    onClose();
  };

  // 1. Intent declaration (also what an idle session shows when the avatar is clicked)
  if (session.status === "idle" || session.status === "intent") {
    const prompt = getStartCheckIn(tone, name);
    return panel(
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xl anim-pop">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Sprint Check-in</span>
          </div>
          <button type="button" onClick={dismiss} aria-label="Close" className="text-muted hover:text-foreground text-sm">
            ×
          </button>
        </div>
        <p className="mt-2 text-sm text-foreground leading-relaxed">{prompt}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            beginSprint();
          }}
          className="mt-3 space-y-3"
        >
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="e.g. Understand 2 examples & write brute force"
            maxLength={120}
            autoFocus
            className="w-full rounded-lg border border-line bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 text-[11px] text-muted">
              {[15, 20, 25, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setChosenMinutes(m)}
                  className={`rounded px-1.5 py-0.5 border ${
                    minutes === m ? "border-accent bg-accent/10 font-medium text-foreground" : "border-line"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent hover:opacity-90 transition-opacity"
            >
              Start sprint
            </button>
          </div>
        </form>
      </div>,
    );
  }

  // 2. Active co-working session
  if (session.status === "active") {
    const elapsedSeconds = session.startedAt ? Math.floor((now - session.startedAt) / 1000) : 0;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const secsRemainingInMinute = elapsedSeconds % 60;
    const isGentle = settings.pacing === "gentle";

    const displayTime = isGentle
      ? `${elapsedMinutes}:${String(secsRemainingInMinute).padStart(2, "0")} elapsed`
      : `${Math.max(0, session.durationMinutes - elapsedMinutes - 1)}:${String(59 - secsRemainingInMinute).padStart(2, "0")}`;

    return panel(
      <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-2xl anim-pop">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2 rounded-full bg-accent animate-pulse shrink-0" />
            <span className="truncate text-xs font-semibold text-foreground">With {name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted">{displayTime}</span>
            <button type="button" onClick={onClose} aria-label="Hide, the sprint keeps running" className="text-muted hover:text-foreground text-sm">
              ×
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted italic line-clamp-2">&ldquo;{session.goal}&rdquo;</p>

        {nudgeMessage && (
          <div className="mt-2.5 rounded-lg border border-line bg-background p-2 text-xs text-foreground anim-fade-up">
            {nudgeMessage}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
          <button
            type="button"
            onClick={showNudge}
            className="text-xs text-muted hover:text-foreground underline decoration-dotted"
          >
            Ask {name}
          </button>
          <button
            type="button"
            onClick={finishSprint}
            className="rounded-lg border border-line bg-background px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-foreground"
          >
            Finish sprint
          </button>
        </div>
      </div>,
    );
  }

  // 3. Post-sprint reflection
  const celebration = getPostSessionCelebration(tone, session.achieved ?? true, name);
  return panel(
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xl anim-pop">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">Sprint Complete</span>
        <button type="button" onClick={dismiss} aria-label="Close" className="text-muted hover:text-foreground text-sm">
          ×
        </button>
      </div>

      <p className="mt-2 text-sm text-foreground leading-relaxed">{celebration}</p>

      {session.achieved === undefined ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted">Did you hit what you aimed for?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => recordOutcome(true)}
              className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent"
            >
              Yes, hit it!
            </button>
            <button
              type="button"
              onClick={() => recordOutcome(false)}
              className="flex-1 rounded-lg border border-line bg-background px-3 py-1.5 text-xs font-medium hover:bg-surface"
            >
              Made progress
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent"
          >
            Done
          </button>
        </div>
      )}
    </div>,
  );
}
