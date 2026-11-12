"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSyncQueue } from "@/lib/sync-manager";
import { SyncStatusPill } from "./sync-status";

export interface AccountUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  admin: boolean;
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const ICON = {
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  settings: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  stats: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  admin: "M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3zM9 12l2 2 4-4",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  signout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  chevron: "m6 15 6-6 6 6",
};

function Avatar({ user, size }: { user: AccountUser; size: string }) {
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a small GitHub avatar
      <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className={`${size} shrink-0 rounded-full object-cover`} />
    );
  }
  return (
    <span aria-hidden className={`${size} grid shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-on-accent`}>
      {(user.name || "?")[0].toUpperCase()}
    </span>
  );
}

const ITEM = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-background";

function MenuLink({ href, icon, onNavigate, children }: { href: string; icon: string; onNavigate: () => void; children: ReactNode }) {
  return (
    <Link href={href} role="menuitem" onClick={onNavigate} className={ITEM}>
      <span className="text-muted">
        <Icon d={icon} />
      </span>
      {children}
    </Link>
  );
}

/** Profile button at the bottom of the sidebar: your name and avatar, a menu with Account, Settings and Sign out. */
/** `compact`: just the avatar (phone top bar); the menu opens downward from the right edge and the sync pill is left out. */
export function AccountPopover({ user, renew, compact = false }: { user: AccountUser | null; renew: boolean; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  // A page cannot renew an expired 15-minute token itself, so ask the refresh route to, then redraw.
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

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user && compact) {
    return renew ? null : (
      <Link href="/login" className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-on-accent hover:opacity-90">
        Sign in
      </Link>
    );
  }

  if (!user) {
    return (
      <div className="space-y-2">
        {renew ? (
          <p className="px-3 py-2 text-xs text-muted">Restoring your session...</p>
        ) : (
          <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-on-accent hover:opacity-90">
            Sign in
          </Link>
        )}
        <SyncStatusPill className="w-full justify-between" user={null} />
      </div>
    );
  }

  const close = () => setOpen(false);

  // Always available: links this device to the account (queues every existing row) and starts a sync.
  async function uploadProgress() {
    setUploading("Uploading...");
    try {
      const res = await fetch("/api/sync/link", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setUploading(body.error === "account-mismatch" ? "This device is linked to another account" : "Could not upload. Try again");
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

  return (
    <div ref={box} className={compact ? "relative" : "relative space-y-2"}>
      {compact ? (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account"
          onClick={() => setOpen((v) => !v)}
          className="grid size-8 place-items-center rounded-full hover:bg-background"
        >
          <Avatar user={user} size="size-6" />
        </button>
      ) : (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-background"
        >
          <Avatar user={user} size="size-8" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{user.name}</span>
            {user.admin && <span className="block text-[11px] text-muted">Admin</span>}
          </span>
          <span className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
            <Icon d={ICON.chevron} />
          </span>
        </button>
      )}

      {open && (
        <div role="menu" aria-label="Account" className={`absolute z-60 min-w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg ${compact ? "top-full right-0 mt-2 w-64 max-w-[calc(100vw-1rem)]" : "bottom-full left-0 z-30 mb-2 w-full"}`}>
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <Avatar user={user} size="size-9" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{user.name}</span>
              <span className="block text-xs text-muted">{user.admin ? "Administrator" : "Signed in with GitHub"}</span>
            </span>
          </div>
          <div className="my-1 border-t border-line" />
          <MenuLink href="/profile/account" icon={ICON.account} onNavigate={close}>
            Account and devices
          </MenuLink>
          <MenuLink href="/profile/settings" icon={ICON.settings} onNavigate={close}>
            Settings
          </MenuLink>
          <MenuLink href="/profile" icon={ICON.stats} onNavigate={close}>
            Profile and stats
          </MenuLink>
          {user.admin && (
            <MenuLink href="/admin" icon={ICON.admin} onNavigate={close}>
              Admin
            </MenuLink>
          )}
          <button type="button" role="menuitem" onClick={uploadProgress} className={ITEM}>
            <span className="text-muted">
              <Icon d={ICON.upload} />
            </span>
            <span className="min-w-0">
              <span className="block">Upload this device&apos;s progress</span>
              {uploading && <span className="block text-xs text-muted">{uploading}</span>}
            </span>
          </button>
          <div className="my-1 border-t border-line" />
          <form action="/auth/logout" method="post">
            <button type="submit" role="menuitem" className={ITEM}>
              <span className="text-muted">
                <Icon d={ICON.signout} />
              </span>
              Sign out
            </button>
          </form>
        </div>
      )}

      {!compact && <SyncStatusPill className="w-full justify-between" user={{ id: user.id, isGuest: false }} />}
    </div>
  );
}
