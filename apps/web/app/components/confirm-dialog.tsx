"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { buttonClass } from "../ui";

export type ConfirmOptions = {
  /** Names the thing being changed, for example "Delete utils.py?". Never "Are you sure?". */
  title: string;
  /** One short sentence about what is lost or kept. */
  body?: ReactNode;
  /** Verb-first label for the confirm button, for example "Delete file". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive action: red confirm button, and Cancel gets the first focus. */
  danger?: boolean;
};

/**
 * Accessible confirmation dialog (role=alertdialog) built on the native <dialog> element, so the page behind it is
 * inert, Tab stays inside and Esc cancels. Focus moves in on open (Cancel for danger, otherwise the confirm button)
 * and returns to the element that opened it. Render it only while it is open; use `useConfirm` for the usual case.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    (danger ? cancelRef.current : confirmRef.current)?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [danger]);

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={body ? bodyId : undefined}
      onCancel={(e) => {
        // Esc: let React unmount us instead of the browser closing the element.
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // A click on the scrim (the dialog box itself, outside its content) cancels.
        if (e.target === e.currentTarget) onCancel();
      }}
      className="m-auto w-[min(calc(100vw-32px),26rem)] max-w-none rounded-[28px] border border-line bg-surface p-0 text-foreground shadow-lg animate-[habit-pop_0.28s_var(--ease-spring)_both] backdrop:animate-[habit-fade_0.15s_ease-out_both] backdrop:bg-foreground/40 dark:border-0"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="space-y-2">
          <h2 id={titleId} className="text-lg leading-snug font-semibold">
            {title}
          </h2>
          {body ? (
            <p id={bodyId} className="text-sm text-muted">
              {body}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className={buttonClass("quiet", "md", "max-md:h-11")}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={buttonClass(danger ? "danger" : "primary", "md", "max-md:h-11")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

type Pending = { options: ConfirmOptions; resolve: (ok: boolean) => void };

/**
 * `const { confirm, dialog } = useConfirm();` then `if (!(await confirm({...}))) return;` and render `{dialog}` once.
 * Resolves true on confirm and false on cancel, Esc or a click on the scrim.
 */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const settle = useCallback((ok: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(ok);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      pendingRef.current?.resolve(false);
      const next = { options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  // A dialog that unmounts with its host counts as cancelled.
  useEffect(() => {
    return () => {
      pendingRef.current?.resolve(false);
      pendingRef.current = null;
    };
  }, []);

  const dialog = pending ? (
    <ConfirmDialog {...pending.options} onConfirm={() => settle(true)} onCancel={() => settle(false)} />
  ) : null;

  return { confirm, dialog };
}
