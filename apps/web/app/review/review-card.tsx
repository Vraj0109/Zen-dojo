"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { tick } from "@/lib/haptics";
import type { ReviewItem } from "@/lib/review";
import { clearStruggleAction, logStruggleAction, markSolvedAction, rateConceptAction } from "../actions";
import { SubmitButton } from "../submit-button";

interface ReviewCardProps {
  item: ReviewItem;
  index: number;
  total: number;
  skipHref: string;
  /** Link that shows the answer without JavaScript (the page re-renders with `show=1`). */
  showHref: string;
  /** True when the page was opened with `show=1`. */
  initialFlipped?: boolean;
  itemHref: string;
  subjectLabel: string;
  subjectClass: string;
  instruction: string;
  answerText?: string;
  points?: string[];
}

/** True when animations are off (Settings > Animations) or the system asks for reduced motion. */
function motionOff(): boolean {
  return (
    document.documentElement.dataset.motion === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const EASE_IN = "cubic-bezier(0.7, 0, 0.84, 0)";

export function ReviewCard({
  item,
  skipHref,
  showHref,
  initialFlipped = false,
  itemHref,
  subjectLabel,
  subjectClass,
  instruction,
  answerText,
  points,
}: ReviewCardProps) {
  const router = useRouter();
  const [flipped, setFlipped] = useState(initialFlipped);
  // Set once the card is being dismissed: which side it leaves to, and how far the two tonal layers must stretch.
  const [leaving, setLeaving] = useState<{ dir: 1 | -1; k1: number; k2: number } | null>(null);
  const [navigating, startNavigation] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const leavingRef = useRef(false);
  const navTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const navStarted = useRef(false);
  const drag = useRef<{
    id: number;
    x0: number;
    y0: number;
    active: boolean;
    dx: number;
    samples: { x: number; t: number }[];
  } | null>(null);
  const suppressClick = useRef(false);

  // The same card can stay mounted after a skip (a queue of one): bring it back once the navigation has finished.
  useEffect(() => {
    if (navStarted.current && !navigating) {
      navStarted.current = false;
      leavingRef.current = false;
      setLeaving(null);
    }
  }, [navigating]);
  useEffect(() => () => clearTimeout(navTimer.current), []);

  // Skip = dismiss the card like an Android notification: it slides out to a side (220ms, ease-in), the two layers
  // behind it spring forward, then we navigate. Without JavaScript the Skip link just navigates.
  function dismiss(dir: 1 | -1) {
    if (leavingRef.current) return;
    leavingRef.current = true;
    tick();
    router.prefetch(skipHref);
    const w = stackRef.current?.offsetWidth ?? 0;
    // Layer 1 grows to layer 2's width, layer 2 to the card's width (insets 36 / 18 / 0 px per side).
    const k1 = w > 80 ? (w - 36) / (w - 72) : 1;
    const k2 = w > 40 ? w / (w - 36) : 1;
    setLeaving({ dir, k1, k2 });
    navTimer.current = setTimeout(() => {
      navStarted.current = true;
      startNavigation(() => router.push(skipHref));
    }, 220);
  }

  const handleSkip = (e: React.MouseEvent) => {
    // Let the browser handle new-tab clicks, and skip instantly when motion is off.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || motionOff()) return;
    e.preventDefault();
    dismiss(1);
  };

  const springBack = (el: HTMLElement) => {
    el.style.transition = "transform 300ms var(--ease-spring-soft), opacity 200ms ease-out";
    el.style.transform = "translateX(0) rotate(0deg)";
    el.style.opacity = "1";
    setTimeout(() => {
      el.style.transition = "";
      el.style.transform = "";
      el.style.opacity = "";
      el.style.transformOrigin = "";
    }, 320);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (!e.isPrimary || leavingRef.current || (e.pointerType === "mouse" && e.button !== 0) || motionOff()) return;
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, active: false, dx: 0, samples: [{ x: e.clientX, t: e.timeStamp }] };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    const el = cardRef.current;
    if (!d || !el || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.active) {
      // Only take over when the gesture is clearly horizontal; a vertical move is a scroll and is left alone.
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      d.active = true;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // capture can fail if the pointer is already gone
      }
      el.style.transition = "none";
      el.style.userSelect = "none";
      el.style.transformOrigin = "50% 90%";
    }
    d.dx = dx - Math.sign(dx) * 10;
    d.samples.push({ x: e.clientX, t: e.timeStamp });
    if (d.samples.length > 6) d.samples.shift();
    // Resistance: the card moves 80% of the finger distance, tilts up to 4deg, and fades as it goes.
    const w = el.offsetWidth || 1;
    const x = d.dx * 0.8;
    const progress = Math.min(Math.abs(x) / w, 1);
    el.style.transform = `translateX(${x}px) rotate(${Math.sign(x) * Math.min(progress * 10, 4)}deg)`;
    el.style.opacity = String(1 - progress * 0.7);
  };

  const finishDrag = (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;
    const el = cardRef.current;
    if (!d || !el || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 60);
    el.style.userSelect = "";
    const w = el.offsetWidth || 1;
    const first = d.samples.find((s) => e.timeStamp - s.t <= 120) ?? d.samples[d.samples.length - 1];
    const last = d.samples[d.samples.length - 1];
    const v = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    const dir = d.dx >= 0 ? 1 : -1;
    const flung = Math.abs(v) > 0.55 && Math.abs(d.dx) > 30 && Math.sign(v) === dir;
    if (!cancelled && (Math.abs(d.dx) > w * 0.35 || flung)) {
      el.style.transition = "";
      dismiss(dir);
    } else {
      springBack(el);
    }
  };

  // Keyboard controls: Space to show answer, 1-4 to rate
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      )
        return;
      if (e.code === "Space" && !flipped) {
        // On a link or button (the Skip link, the rail) Space belongs to that control.
        // The "Show answer" link itself is the exception: Space should flip the card from there too.
        if (t instanceof HTMLElement && !t.hasAttribute("data-show-answer") && t.closest("a, button, summary, [role='button']")) return;
        e.preventDefault();
        setFlipped(true);
      } else if (flipped) {
        const ratingButtons = formRef.current?.querySelectorAll<HTMLButtonElement>("button[data-rating]");
        if (!ratingButtons) return;
        const keyNum = parseInt(e.key, 10);
        if (keyNum >= 1 && keyNum <= ratingButtons.length) {
          e.preventDefault();
          ratingButtons[keyNum - 1]?.click();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipped]);

  return (
    <div ref={stackRef} className="relative pt-4">
      {/* Two tonal layers behind the current card. On skip they move forward one place (transform only). They are as tall
          as a card, so the one that arrives in the card's place is a full card; the card always covers their lower part. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 left-9 right-9 h-[380px] rounded-[32px] ${leaving ? "bg-primary-container" : "bg-primary-soft/70"}`}
        style={{
          transform: leaving ? `translateY(8px) scaleX(${leaving.k1})` : undefined,
          transition: leaving
            ? "transform 320ms var(--ease-spring-soft), background-color 200ms ease-out"
            : undefined,
        }}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-2 left-4.5 right-4.5 h-[380px] rounded-[32px] ${leaving ? "bg-surface shadow-sm" : "bg-primary-container"}`}
        style={{
          transform: leaving ? `translateY(8px) scaleX(${leaving.k2})` : undefined,
          transition: leaving
            ? "transform 320ms var(--ease-spring-soft), background-color 200ms ease-out"
            : undefined,
        }}
      />

      {/* Main card. Swipe it sideways to skip (touch-action pan-y keeps vertical scrolling). */}
      <section
        ref={cardRef}
        aria-label="Card"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finishDrag(e, false)}
        onPointerCancel={(e) => finishDrag(e, true)}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDragStart={(e) => e.preventDefault()}
        style={
          leaving
            ? {
                transform: `translateX(110%) rotate(${leaving.dir * 3}deg)`,
                transformOrigin: "50% 90%",
                opacity: 0,
                transition: `transform 220ms ${EASE_IN}, opacity 200ms ${EASE_IN}`,
                pointerEvents: "none",
              }
            : undefined
        }
        className="relative flex min-h-[380px] touch-pan-y flex-col gap-4.5 rounded-[32px] border border-line bg-surface p-6 shadow-sm dark:border-0 sm:p-9"
      >
        <span className={`self-start rounded-full px-3.5 py-1.5 text-[13px] font-medium ${subjectClass}`}>
          {subjectLabel} · {item.detail || item.title}
        </span>

        <h2 className="text-2xl font-medium sm:text-[28px] leading-snug">
          <Link href={itemHref} className="hover:underline">
            {item.title}
          </Link>
        </h2>

        {flipped ? (
          <div className="space-y-3 rounded-[24px] bg-background p-5 text-base leading-relaxed">
            {answerText ? (
              <p className="whitespace-pre-wrap">{answerText}</p>
            ) : points && points.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5">
                {points.map((pt, idx) => (
                  <li key={idx}>{pt}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">{instruction}</p>
            )}
          </div>
        ) : (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-4">
            {/* A real link (?show=1) so the answer and the rating forms also work without JavaScript; with JS it flips in place. */}
            <Link
              href={showHref}
              prefetch={false}
              scroll={false}
              data-show-answer=""
              onClick={(e) => {
                e.preventDefault();
                setFlipped(true);
              }}
              className="inline-flex h-12 items-center rounded-full bg-primary px-7 text-base font-medium text-on-primary shadow-sm hover:bg-primary-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Show answer
            </Link>
            <Link href={skipHref} onClick={handleSkip} className="inline-flex min-h-10 items-center rounded-full px-3 text-sm text-muted hover:bg-surface-2 hover:text-foreground max-md:min-h-11">
              Skip for now
            </Link>
          </div>
        )}

        {flipped && (
          <div className="mt-auto pt-4">
            {item.kind === "concept" ? (
              <form ref={formRef} action={rateConceptAction} className="flex flex-wrap gap-2 sm:gap-3">
                <input type="hidden" name="conceptId" value={item.id} />
                <button
                  type="submit"
                  name="confidence"
                  value="2"
                  data-rating="1"
                  className="flex-1 min-w-[72px] flex flex-col items-center justify-center rounded-[20px] bg-reward-soft px-2 py-3 text-on-reward-soft transition-colors hover:brightness-95"
                >
                  <span className="block text-[15px] font-medium">Shaky</span>
                  <span className="block text-xs opacity-80">10 min</span>
                </button>
                <button
                  type="submit"
                  name="confidence"
                  value="3"
                  data-rating="2"
                  className="flex-1 min-w-[72px] flex flex-col items-center justify-center rounded-[20px] bg-surface-2 px-2 py-3 text-foreground transition-colors hover:brightness-95"
                >
                  <span className="block text-[15px] font-medium">Okay</span>
                  <span className="block text-xs opacity-80">2 days</span>
                </button>
                <button
                  type="submit"
                  name="confidence"
                  value="4"
                  data-rating="3"
                  data-haptic="success"
                  className="flex-1 min-w-[72px] flex flex-col items-center justify-center rounded-[20px] bg-primary-container px-2 py-3 text-on-primary-container transition-colors hover:brightness-95"
                >
                  <span className="block text-[15px] font-medium">Solid</span>
                  <span className="block text-xs opacity-80">7 days</span>
                </button>
                <button
                  type="submit"
                  name="confidence"
                  value="5"
                  data-rating="4"
                  data-haptic="success"
                  className="flex-1 min-w-[72px] flex flex-col items-center justify-center rounded-[20px] bg-primary px-2 py-3 text-on-primary transition-colors hover:bg-primary-hover"
                >
                  <span className="block text-[15px] font-medium">Can teach it</span>
                  <span className="block text-xs opacity-80">21 days</span>
                </button>
              </form>
            ) : item.kind === "struggle" ? (
              <div className="flex flex-wrap items-center gap-3">
                <form action={clearStruggleAction}>
                  <input type="hidden" name="problemId" value={item.id} />
                  <SubmitButton className="h-11 rounded-full bg-primary px-6 text-sm font-medium text-on-primary hover:bg-primary-hover transition-colors">
                    Solved it cold
                  </SubmitButton>
                </form>
                <form action={logStruggleAction}>
                  <input type="hidden" name="problemId" value={item.id} />
                  <input type="hidden" name="kind" value="failed" />
                  <input type="hidden" name="reason" value={item.struggle.reason} />
                  <SubmitButton className="h-11 rounded-full bg-reward-soft px-6 text-sm font-medium text-on-reward-soft hover:brightness-95 transition-colors">
                    Still stuck (3 days)
                  </SubmitButton>
                </form>
                <Link href={skipHref} onClick={handleSkip} className="ml-auto inline-flex min-h-10 items-center rounded-full px-3 text-sm text-muted hover:bg-surface-2 hover:text-foreground max-md:min-h-11">
                  Skip for now
                </Link>
              </div>
            ) : item.kind === "resolve" ? (
              <div className="flex flex-wrap items-center gap-3">
                <form action={markSolvedAction}>
                  <input type="hidden" name="problemId" value={item.id} />
                  <SubmitButton className="h-11 rounded-full bg-primary px-6 text-sm font-medium text-on-primary hover:bg-primary-hover transition-colors">
                    Re-solved cold
                  </SubmitButton>
                </form>
                <form action={logStruggleAction}>
                  <input type="hidden" name="problemId" value={item.id} />
                  <input type="hidden" name="kind" value="hint" />
                  <input type="hidden" name="reason" value="Needed help at 14-day re-solve" />
                  <SubmitButton className="h-11 rounded-full bg-surface-2 px-6 text-sm font-medium text-foreground hover:brightness-95 transition-colors">
                    Needed help
                  </SubmitButton>
                </form>
                <Link href={skipHref} onClick={handleSkip} className="ml-auto inline-flex min-h-10 items-center rounded-full px-3 text-sm text-muted hover:bg-surface-2 hover:text-foreground max-md:min-h-11">
                  Skip for now
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href={itemHref}
                  className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-on-primary hover:bg-primary-hover transition-colors"
                >
                  Practice now →
                </Link>
                <Link href={skipHref} onClick={handleSkip} className="ml-auto inline-flex min-h-10 items-center rounded-full px-3 text-sm text-muted hover:bg-surface-2 hover:text-foreground max-md:min-h-11">
                  Skip for now
                </Link>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
