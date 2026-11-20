"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReviewItem } from "@/lib/review";
import { clearStruggleAction, logStruggleAction, markSolvedAction, rateConceptAction } from "../actions";
import { SubmitButton } from "../submit-button";

interface ReviewCardProps {
  item: ReviewItem;
  index: number;
  total: number;
  skipHref: string;
  itemHref: string;
  subjectLabel: string;
  subjectClass: string;
  instruction: string;
  answerText?: string;
  points?: string[];
}

export function ReviewCard({
  item,
  skipHref,
  itemHref,
  subjectLabel,
  subjectClass,
  instruction,
  answerText,
  points,
}: ReviewCardProps) {
  const [flipped, setFlipped] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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
    <div className="relative pt-4">
      {/* Two tonal layers behind current card */}
      <div aria-hidden="true" className="pointer-events-none absolute top-0 left-9 right-9 h-[60px] rounded-[32px] bg-primary-soft/70" />
      <div aria-hidden="true" className="pointer-events-none absolute top-2 left-4.5 right-4.5 h-[60px] rounded-[32px] bg-primary-container" />

      {/* Main card */}
      <section
        aria-label="Card"
        className="relative flex min-h-[380px] flex-col gap-4.5 rounded-[32px] border border-line bg-surface p-6 shadow-sm dark:border-0 sm:p-9"
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
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="h-12 rounded-full bg-primary px-7 text-base font-medium text-on-primary shadow-sm hover:bg-primary-hover transition-colors"
            >
              Show answer
            </button>
            <Link href={skipHref} className="text-sm text-muted hover:text-foreground">
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
                <Link href={skipHref} className="text-sm text-muted hover:text-foreground ml-auto">
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
                <Link href={skipHref} className="text-sm text-muted hover:text-foreground ml-auto">
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
                <Link href={skipHref} className="text-sm text-muted hover:text-foreground ml-auto">
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
