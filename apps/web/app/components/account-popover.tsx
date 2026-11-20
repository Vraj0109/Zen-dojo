"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushSyncQueue, getSyncInfo, subscribeSyncInfo, type SyncStatusInfo } from "@/lib/sync-manager";
import { applyTheme, readStoredAppearance, type ThemeMode } from "@/lib/theme";
import { openShortcutsSheet } from "./shortcuts-sheet";
import { SlidingPill } from "../sliding-pill";

export interface AccountUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  admin: boolean;
}

function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  profile: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  account: "M4 5h16v11H4zM8 20h8M12 16v4",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2l-1-2-3 1 .5 2L6 8l-2-.5-1 3 2 1v2l-2 1 1 3 2-.5L7.5 17 7 19l3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z",
  admin: "M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3zM9 12l2 2 4-4",
  upload: "M12 16V4M6 10l6-6 6 6M4 20h16",
  shortcuts: "M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10",
  theme: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z",
  signout: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10",
};

function formatSyncTime(date: Date | number | null): string {
  if (!date) return "just now";
  const timestamp = typeof date === "number" ? date : date.getTime();
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h ago`;
  return `${Math.floor(diffHours / 24)} d ago`;
}

export function AccountPopover({
  user,
  renew = false,
  level = null,
}: {
  user: AccountUser | null;
  renew?: boolean;
  compact?: boolean;
  /** Level and total XP for the menu header (shown only when game features are on). */
  level?: { level: number; xp: number } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo>(() => getSyncInfo());
  const [uploading, setUploading] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return readStoredAppearance()?.mode ?? "system";
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync info listener
  useEffect(() => {
    return subscribeSyncInfo((newInfo) => {
      setSyncInfo(newInfo);
    });
  }, []);

  // Handle renew token
  useEffect(() => {
    if (!renew) return;
    let cancelled = false;
    fetch("/auth/refresh", { method: "POST" })
      .then((r) => {
        if (!cancelled && r.ok) router.refresh();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [renew, router]);

  // Click outside and keyboard Esc / Arrow navigation
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="radio"]');
        if (!items || items.length === 0) return;
        const list = Array.from(items);
        const idx = list.indexOf(document.activeElement as HTMLElement);
        if (e.key === "ArrowDown") {
          const next = idx + 1 < list.length ? idx + 1 : 0;
          list[next].focus();
        } else {
          const prev = idx - 1 >= 0 ? idx - 1 : list.length - 1;
          list[prev].focus();
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
        first?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
        if (items && items.length > 0) items[items.length - 1].focus();
      }
    };

    // Move focus into the menu so arrow keys work straight away.
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    setCurrentMode(readStoredAppearance()?.mode ?? "system");
    setOpen((v) => !v);
  };
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const setMode = (mode: ThemeMode) => {
    setCurrentMode(mode);
    const existing = readStoredAppearance() ?? {
      mode: "system",
      accent: "green",
      style: "classic",
      font: "default",
      gamify: false,
      bionic: "off",
      motion: "auto",
    };
    applyTheme({ ...existing, mode });
  };

  async function handleUpload() {
    setUploading("Uploading...");
    try {
      const res = await fetch("/api/sync/link", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setUploading(body.error === "account-mismatch" ? "Device linked to another account" : "Could not upload. Try again");
        return;
      }
      try {
        localStorage.removeItem("zen-dojo:adopt-dismissed");
      } catch {
        // storage blocked
      }
      await flushSyncQueue();
      setUploading("Upload started");
    } catch {
      setUploading("Could not upload. Try again");
    }
  }

  // Sync dot calculation
  let dotColor = "bg-primary";
  let syncLabel = "Synced with the web app";
  if (syncInfo.status === "syncing" || syncInfo.status === "throttled" || syncInfo.pending > 0) {
    dotColor = "bg-warning";
    syncLabel = "Syncing with cloud...";
  } else if (syncInfo.status === "error" || syncInfo.status === "account-mismatch") {
    dotColor = "bg-danger";
    syncLabel = syncInfo.status === "account-mismatch" ? "Account mismatch" : "Sync error";
  }

  const avatarInitial = (user?.name || "Y")[0].toUpperCase();

  return (
    <div className="relative">
      {/* Rail Avatar Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        title={user ? `Account (${user.name})` : "Account"}
        className={`relative grid size-12 place-items-center rounded-full transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-primary ${
          open ? "bg-primary-soft" : "hover:bg-surface-2"
        }`}
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-reward-soft font-semibold text-on-reward-soft text-base">
            {avatarInitial}
          </span>
        )}
        {user && (
          <span
            aria-hidden="true"
            className={`absolute right-1 bottom-1 size-3 rounded-full border-2 border-background ${dotColor}`}
          />
        )}
      </button>

      {/* Account Menu Popover */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account"
          className="anim-pop fixed bottom-4 left-[88px] z-50 flex max-h-[calc(100dvh-2rem)] w-80 flex-col gap-0.5 overflow-y-auto rounded-[28px] border border-line bg-surface p-2.5 text-foreground shadow-menu dark:border-line-strong max-md:inset-x-4 max-md:left-4 max-md:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] max-md:w-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-2">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="size-11 rounded-full object-cover" />
            ) : (
              <span className="grid size-11 place-items-center rounded-full bg-reward-soft text-lg font-semibold text-on-reward-soft">
                {avatarInitial}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium leading-tight">
                {user ? (user.admin ? "Administrator" : "Signed in with GitHub") : "Not signed in"}
              </p>
              <p className="truncate text-[13px] text-muted">
                {user ? user.name : "Sign in to keep progress in sync"}
                {level && (
                  <span className="gamify-only">
                    {" "}
                    · Level {level.level} · {level.xp.toLocaleString("en-US")} XP
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Guest Sign-in CTA */}
          {!user && (
            <div className="p-2">
              <Link
                href="/login"
                role="menuitem"
                onClick={close}
                className="flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover"
              >
                Sign in to sync
              </Link>
            </div>
          )}

          {/* Sync status row (when signed in) */}
          {user && (
            <div className="mx-0.5 my-1.5 flex items-center gap-2.5 rounded-2xl bg-primary-soft px-3.5 py-2.5 text-sm text-on-primary-soft">
              <span className={`size-2.5 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
              <span className="flex-1 truncate">{syncLabel}</span>
              <span className="text-xs opacity-75">{formatSyncTime(syncInfo.lastSyncedAt)}</span>
            </div>
          )}

          <div className="mx-2.5 my-1.5 h-px bg-line" />

          {/* Navigation Links */}
          <Link
            href="/profile"
            role="menuitem"
            onClick={close}
            className="flex min-h-12 items-center gap-3 rounded-2xl px-2.5 py-1.5 text-[15px] text-foreground hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="grid w-6 place-items-center text-muted">
              <Icon d={ICONS.profile} />
            </span>
            <span className="flex-1">Profile and stats</span>
          </Link>

          {user && (
            <Link
              href="/profile/account"
              role="menuitem"
              onClick={close}
              className="flex min-h-12 items-center gap-3 rounded-2xl px-2.5 py-1.5 text-[15px] text-foreground hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="grid w-6 place-items-center text-muted">
                <Icon d={ICONS.account} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">Account and devices</span>
                <span className="block text-xs text-muted">Desktop app, web, extension</span>
              </span>
            </Link>
          )}

          <Link
            href="/profile/settings"
            role="menuitem"
            onClick={close}
            className="flex min-h-12 items-center gap-3 rounded-2xl px-2.5 py-1.5 text-[15px] text-foreground hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="grid w-6 place-items-center text-muted">
              <Icon d={ICONS.settings} />
            </span>
            <span className="flex-1">Settings</span>
          </Link>

          {user?.admin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={close}
              className="flex min-h-12 items-center gap-3 rounded-2xl px-2.5 py-1.5 text-[15px] text-foreground hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="grid w-6 place-items-center text-muted">
                <Icon d={ICONS.admin} />
              </span>
              <span className="flex-1">Admin</span>
            </Link>
          )}

          {user && (
            <button
              type="button"
              role="menuitem"
              onClick={handleUpload}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-left text-[15px] text-foreground hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="grid w-6 place-items-center text-muted">
                <Icon d={ICONS.upload} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">Upload this device&apos;s progress</span>
                {uploading && <span className="block text-xs text-muted">{uploading}</span>}
              </span>
            </button>
          )}

          {/* Keyboard Shortcuts trigger */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              openShortcutsSheet();
            }}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-left text-[15px] text-foreground hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="grid w-6 place-items-center text-muted">
              <Icon d={ICONS.shortcuts} />
            </span>
            <span className="flex-1">Keyboard shortcuts</span>
            <kbd className="rounded-lg border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">
              ?
            </kbd>
          </button>

          {/* Theme segmented control */}
          <div className="flex min-h-12 items-center gap-3 px-3 py-2">
            <span className="grid w-6 place-items-center text-muted">
              <Icon d={ICONS.theme} />
            </span>
            <span className="flex-1 text-[15px]">Theme</span>
            <SlidingPill role="radiogroup" aria-label="Theme mode" className="flex rounded-full bg-surface-2 p-[3px]">
              {(["light", "dark", "system"] as const).map((m) => {
                const active = currentMode === m;
                const label = m.charAt(0).toUpperCase() + m.slice(1);
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMode(m)}
                    className={`h-[30px] rounded-full px-2.5 text-xs font-medium transition-colors ${
                      active ? "bg-primary-soft text-on-primary-soft" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </SlidingPill>
          </div>

          {user && (
            <>
              <div className="mx-2.5 my-1.5 h-px bg-line" />
              <form action="/auth/logout" method="post" className="w-full">
                <button
                  type="submit"
                  role="menuitem"
                  className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-left text-[15px] text-foreground hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className="grid w-6 place-items-center text-muted">
                    <Icon d={ICONS.signout} />
                  </span>
                  <span>Sign out</span>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
