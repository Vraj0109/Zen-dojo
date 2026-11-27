"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { UnitId } from "@habit/shared";
import {
  downloadUnits,
  getStorageEstimate,
  listFollowedUnits,
  removeUnit,
} from "@/app/offline/content-store";
import {
  checkForUpdatesDesktopAction,
  setAutoUpdateAction,
  setSystemNotificationsAction,
} from "./offline-actions";
import { setUnitFollowAction } from "./follow-actions";

export interface UnitInfo {
  unit: UnitId;
  title: string;
  kind: string;
  count: number;
  bytes: number;
  rev: string;
}

export interface DesktopContentProps {
  isDesktop: true;
  version: number;
  checkedAt: number | null;
  status: string;
  lastError: string | null;
  /** Units from the local content copy, for the Follow / Mute list (plan 0119 step 6). Optional: no list without it. */
  units?: UnitInfo[];
  /** Units set to Follow and to Mute (content-follow.ts). */
  follow?: UnitId[];
  mute?: UnitId[];
  autoUpdate: boolean;
  systemNotifications: boolean;
}

export interface WebContentProps {
  isDesktop: false;
}

export type OfflineContentCardProps = DesktopContentProps | WebContentProps;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(ms: number | null): string {
  if (!ms) return "never";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function OfflineContentCard(props: OfflineContentCardProps) {
  if (props.isDesktop) {
    return <DesktopCard {...props} />;
  }
  return <WebCard />;
}

// -------------------------------------------------------------------------------------------------
// Desktop Card
// -------------------------------------------------------------------------------------------------

function DesktopCard(props: DesktopContentProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);

  const statusDisplay = () => {
    if (props.status === "app-too-old") {
      return (
        <span className="text-danger font-medium">
          Needs a newer app version.{" "}
          <Link href="/help" className="underline">
            Check app updates
          </Link>
        </span>
      );
    }
    if (props.status === "offline") {
      return <span className="text-warning">Offline, will retry</span>;
    }
    if (props.status === "error") {
      return <span className="text-danger">{props.lastError || "Sync error"}</span>;
    }
    return <span className="text-muted">Up to date</span>;
  };

  const handleCheckNow = () => {
    startTransition(async () => {
      const res = await checkForUpdatesDesktopAction();
      setFeedback(res);
      setTimeout(() => setFeedback(null), 5000);
    });
  };

  const handleAutoUpdateToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    startTransition(async () => {
      await setAutoUpdateAction(val);
    });
  };

  const handleNotificationsToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    startTransition(async () => {
      await setSystemNotificationsAction(val);
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface-2/50 p-4 text-sm space-y-1">
        <p className="font-medium text-foreground">
          All content is on this computer · version {props.version} · updated {timeAgo(props.checkedAt)} · {statusDisplay()}
        </p>
        <p className="text-xs text-muted">
          DSA problems, system design, LLD walkthroughs and reading materials work fully offline.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCheckNow}
          disabled={isPending}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Checking…" : "Check for updates"}
        </button>
        <Link
          href="/whats-new"
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
        >
          What&apos;s new
        </Link>
      </div>

      {feedback && (
        <p className={`text-sm ${feedback.ok ? "text-primary" : "text-danger"}`}>
          {feedback.message}
        </p>
      )}

      <div className="space-y-3 pt-2 border-t border-line/60">
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            defaultChecked={props.autoUpdate}
            onChange={handleAutoUpdateToggle}
            className="size-4 rounded accent-primary"
          />
          <span>Update content automatically in background</span>
        </label>
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            defaultChecked={props.systemNotifications}
            onChange={handleNotificationsToggle}
            className="size-4 rounded accent-primary"
          />
          <span>System notifications when followed content is updated</span>
        </label>
      </div>

      {props.units && props.units.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-line/60">
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Follow or mute</h4>
            <p className="text-xs text-muted">
              Default: you get updates from a course or problem set once you start it. Follow also gives you updates
              from one you have not started. Mute gives you no updates from it, even when you have started it.
            </p>
          </div>
          <ul className="space-y-2">
            {props.units.map((u) => {
              const state: UnitFollowState = (props.mute ?? []).includes(u.unit)
                ? "mute"
                : (props.follow ?? []).includes(u.unit)
                  ? "follow"
                  : "default";
              return <FollowRow key={u.unit} unit={u} state={state} />;
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

type UnitFollowState = "default" | "follow" | "mute";

const FOLLOW_OPTIONS: { value: UnitFollowState; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "follow", label: "Follow" },
  { value: "mute", label: "Mute" },
];

const STATE_TEXT: Record<UnitFollowState, string> = {
  default: "Default: updates once you start it",
  follow: "Followed: updates even if you have not started it",
  mute: "Muted: no updates from this one",
};

// One unit with three buttons. Each button submits the form with its own state, so this works without JavaScript.
function FollowRow({ unit, state }: { unit: UnitInfo; state: UnitFollowState }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{unit.title}</p>
        <p className="text-xs text-muted">{STATE_TEXT[state]}</p>
      </div>
      <form action={setUnitFollowAction} className="flex flex-wrap gap-1" aria-label={`Updates from ${unit.title}`}>
        <input type="hidden" name="unit" value={unit.unit} />
        {FOLLOW_OPTIONS.map((o) => {
          const active = o.value === state;
          return (
            <button
              key={o.value}
              type="submit"
              name="state"
              value={o.value}
              aria-pressed={active}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-primary text-on-primary"
                  : "border border-line bg-surface hover:bg-surface-2"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </form>
    </li>
  );
}

// -------------------------------------------------------------------------------------------------
// Web Card (IndexedDB + ServiceWorker)
// -------------------------------------------------------------------------------------------------

function WebCard() {
  const [supported] = useState(() => {
    if (typeof window === "undefined") return true;
    return typeof indexedDB !== "undefined" && "serviceWorker" in navigator;
  });
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [followed, setFollowed] = useState<Set<UnitId>>(new Set());
  const [selected, setSelected] = useState<Set<UnitId>>(new Set());
  const [storageEstimate, setStorageEstimate] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; stage: string } | null>(null);
  const [notifPerm, setNotifPerm] = useState<string>(() => {
    if (typeof Notification !== "undefined") return Notification.permission;
    return "default";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof indexedDB === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let active = true;
    void (async () => {
      try {
        const [unitsRes, followedList, est] = await Promise.all([
          fetch("/api/content/units"),
          listFollowedUnits(),
          getStorageEstimate(),
        ]);

        if (!active) return;
        if (unitsRes.ok) {
          const list = (await unitsRes.json()) as UnitInfo[];
          setUnits(list);
        }
        setFollowed(new Set(followedList));
        if (est?.usage) setStorageEstimate(est.usage);
      } catch {
        // network or idb error
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (!supported) return null;

  if (loading) {
    return <div className="py-4 text-sm text-muted">Loading offline content options…</div>;
  }

  const handleToggleSelect = (unitId: UnitId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selected.size === units.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(units.map((u) => u.unit)));
    }
  };

  const handleDownloadSelected = async () => {
    const toDownload = Array.from(selected);
    if (toDownload.length === 0) return;
    setDownloading(true);
    try {
      await downloadUnits(toDownload, (p) => {
        setProgress({ current: p.current, total: p.total, stage: p.stage });
      });
      const [updatedFollowed, est] = await Promise.all([listFollowedUnits(), getStorageEstimate()]);
      setFollowed(new Set(updatedFollowed));
      setSelected(new Set());
      if (est?.usage) setStorageEstimate(est.usage);
    } catch (err) {
      alert(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  };

  const handleRemove = async (unitId: UnitId) => {
    await removeUnit(unitId);
    const [updatedFollowed, est] = await Promise.all([listFollowedUnits(), getStorageEstimate()]);
    setFollowed(new Set(updatedFollowed));
    if (est?.usage) setStorageEstimate(est.usage);
  };

  const handleRequestNotifs = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  const courses = units.filter((u) => u.kind === "course" || u.unit.startsWith("course:"));
  const problems = units.filter((u) => u.kind === "problems" || u.unit.startsWith("problems:"));
  const docs = units.filter((u) => u.unit === "docs");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          Save courses and problem sets to read offline in your browser.
          {storageEstimate !== null && (
            <span className="ml-2 font-medium text-foreground">
              (Storage used: {formatBytes(storageEstimate)})
            </span>
          )}
        </p>
        <Link
          href="/offline/read"
          className="rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-semibold hover:bg-surface-2"
        >
          Open offline reader →
        </Link>
      </div>

      {/* Browser notifications section */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2/40 p-4">
        <div>
          <h4 className="text-sm font-medium">Browser notifications</h4>
          <p className="text-xs text-muted">
            Be notified when content in your followed courses is updated.
          </p>
        </div>
        {notifPerm === "granted" ? (
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            Notifications enabled
          </span>
        ) : notifPerm === "denied" ? (
          <span className="text-xs text-muted">Blocked in browser settings</span>
        ) : (
          <button
            type="button"
            onClick={handleRequestNotifs}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
          >
            Turn on browser notifications
          </button>
        )}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSelectAll}
          className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
        >
          {selected.size === units.length ? "Deselect all" : "Select all"}
        </button>
        <button
          type="button"
          onClick={handleDownloadSelected}
          disabled={downloading || selected.size === 0}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-40"
        >
          {downloading
            ? `Downloading (${progress?.current || 0}/${progress?.total || selected.size})…`
            : `Download selected (${selected.size})`}
        </button>
      </div>

      {/* Unit lists */}
      <div className="space-y-6">
        {courses.length > 0 && (
          <UnitGroup
            title="Courses"
            items={courses}
            followed={followed}
            selected={selected}
            onToggleSelect={handleToggleSelect}
            onRemove={handleRemove}
          />
        )}
        {problems.length > 0 && (
          <UnitGroup
            title="DSA Problems by Pattern"
            items={problems}
            followed={followed}
            selected={selected}
            onToggleSelect={handleToggleSelect}
            onRemove={handleRemove}
          />
        )}
        {docs.length > 0 && (
          <UnitGroup
            title="Documentation & Reference"
            items={docs}
            followed={followed}
            selected={selected}
            onToggleSelect={handleToggleSelect}
            onRemove={handleRemove}
          />
        )}
      </div>
    </div>
  );
}

function UnitGroup({
  title,
  items,
  followed,
  selected,
  onToggleSelect,
  onRemove,
}: {
  title: string;
  items: UnitInfo[];
  followed: Set<UnitId>;
  selected: Set<UnitId>;
  onToggleSelect: (unit: UnitId) => void;
  onRemove: (unit: UnitId) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold tracking-tight text-foreground">{title}</h4>
      <div className="divide-y divide-line/60 rounded-2xl border border-line bg-surface">
        {items.map((it) => {
          const isSaved = followed.has(it.unit);
          const isChecked = selected.has(it.unit);

          return (
            <div key={it.unit} className="flex items-center justify-between gap-3 p-3 text-sm">
              <label className="flex items-center gap-3 cursor-pointer min-w-0">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleSelect(it.unit)}
                  className="size-4 rounded accent-primary shrink-0"
                />
                <span className="truncate font-medium">{it.title}</span>
                <span className="text-xs text-muted shrink-0">({formatBytes(it.bytes)})</span>
              </label>

              <div className="flex items-center gap-2 shrink-0">
                {isSaved && (
                  <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                    Saved
                  </span>
                )}
                {isSaved && (
                  <button
                    type="button"
                    onClick={() => onRemove(it.unit)}
                    className="text-xs text-danger hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
