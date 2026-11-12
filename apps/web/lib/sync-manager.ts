export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  | "signed-out"
  | "throttled"
  | "account-mismatch";

/**
 * Parses an HTTP Retry-After header which can be an integer in seconds
 * or an HTTP-date string. Returns milliseconds delay, or null if unparseable.
 */
export function parseRetryAfter(headerValue: string | null | undefined): number | null {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  const seconds = Number(trimmed);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return Math.max(0, diff);
  }
  return null;
}

export interface SyncStatusInfo {
  status: SyncStatus;
  state: SyncStatus;
  account: string | null;
  lastSyncedAt: number | null;
  pending: number;
  message?: string;
  hasRows?: boolean;
}

export interface SyncManagerOptions {
  apiEndpoint?: string;
  statusEndpoint?: string;
  runEndpoint?: string;
  fetchFn?: typeof fetch;
  autoStart?: boolean;
  statusIntervalMs?: number;
  syncIntervalMs?: number;
  db?: unknown;
  intervalMs?: number;
  userId?: string;
}

export interface FlushSyncOptions {
  db?: unknown;
  userId?: string;
  throwOnError?: boolean;
}

export interface FlushResult {
  success: boolean;
  status: SyncStatus;
  mutationsCount?: number;
  deltasApplied?: number;
  deltasSkipped?: number;
  lastSyncedAt?: number;
  pushed?: number;
  pulled?: number;
  error?: string;
  reason?: string;
  message?: string;
}

export interface SyncRunResponse {
  state?: "synced" | "signed-out" | "account-mismatch" | "throttled" | "error";
  pushed?: number;
  pulled?: number;
  message?: string;
  error?: string;
}

export interface SyncStatusResponse {
  account?: string | null;
  state?: SyncStatus;
  lastSyncedAt?: number | null;
  pending?: number;
  message?: string;
  hasRows?: boolean;
  has_rows?: boolean;
  error?: string;
}

const MAX_BACKOFF_MS = 15 * 60 * 1000; // 15 min cap

/**
 * Client-driven Thin Poller Sync Manager.
 * Orchestrates periodic background polling, tab visibility checks,
 * network status monitoring, and calls the server-side sync routes.
 * Contains NO direct database access.
 */
export class SyncManager {
  private statusEndpoint: string;
  private runEndpoint: string;
  private statusIntervalMs: number;
  private syncIntervalMs: number;
  private status: SyncStatus = "idle";
  private statusInfo: SyncStatusInfo = {
    status: "idle",
    state: "idle",
    account: null,
    lastSyncedAt: null,
    pending: 0,
  };

  private statusSubscribers = new Set<(status: SyncStatus) => void>();
  private infoSubscribers = new Set<(info: SyncStatusInfo) => void>();

  private statusTimer: ReturnType<typeof setInterval> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempts = 0;

  private isSyncing = false;
  private inFlightSync: Promise<FlushResult> | null = null;
  private inFlightStatusCheck: Promise<void> | null = null;
  private isOnlineOverride: boolean | null = null;
  private isStarted = false;
  private fetchFn: typeof fetch;

  constructor(options: SyncManagerOptions = {}) {
    this.statusEndpoint = options.statusEndpoint ?? "/api/sync/status";
    this.runEndpoint = options.runEndpoint ?? "/api/sync/run";
    this.statusIntervalMs = options.statusIntervalMs ?? 5000; // 5 s poll
    this.syncIntervalMs = options.syncIntervalMs ?? options.intervalMs ?? 30000; // 30 s run

    this.fetchFn =
      options.fetchFn ??
      (typeof fetch !== "undefined"
        ? fetch.bind(globalThis)
        : (async (): Promise<Response> => {
            throw new Error("No fetch implementation available");
          }));

    if (this.isOffline()) {
      this.status = "offline";
      this.statusInfo.status = "offline";
      this.statusInfo.state = "offline";
    }

    if (options.autoStart !== false && typeof window !== "undefined") {
      this.start();
    }
  }

  public getRetryTimer(): ReturnType<typeof setTimeout> | null {
    return this.retryTimer;
  }

  public getStatusTimer(): ReturnType<typeof setInterval> | null {
    return this.statusTimer;
  }

  public getSyncTimer(): ReturnType<typeof setInterval> | null {
    return this.syncTimer;
  }

  public getBackgroundTimer(): ReturnType<typeof setInterval> | null {
    return this.syncTimer;
  }

  public getRetryAttempts(): number {
    return this.retryAttempts;
  }

  public setDb(_db?: unknown): void {
    void _db;
    // No-op for thin poller: DB operations run on server
  }

  public getDb(): null {
    return null;
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public getStatusInfo(): SyncStatusInfo {
    return { ...this.statusInfo };
  }

  public setStatus(newStatus: SyncStatus): void {
    if (this.status === newStatus && this.statusInfo.status === newStatus) return;
    this.status = newStatus;
    this.statusInfo.status = newStatus;
    this.statusInfo.state = newStatus;
    this.notifySubscribers();
  }

  public setStatusInfo(update: Partial<SyncStatusInfo>): void {
    let changed = false;
    for (const [key, val] of Object.entries(update) as [keyof SyncStatusInfo, unknown][]) {
      if (this.statusInfo[key] !== val) {
        changed = true;
        break;
      }
    }
    if (update.status && update.status !== this.status) {
      this.status = update.status;
      changed = true;
    }
    if (changed) {
      this.statusInfo = { ...this.statusInfo, ...update };
      this.notifySubscribers();
    }
  }

  private notifySubscribers(): void {
    for (const sub of this.statusSubscribers) {
      try {
        sub(this.status);
      } catch (err) {
        console.error("SyncManager status subscriber error:", err);
      }
    }
    const infoSnapshot = { ...this.statusInfo };
    for (const sub of this.infoSubscribers) {
      try {
        sub(infoSnapshot);
      } catch (err) {
        console.error("SyncManager info subscriber error:", err);
      }
    }
  }

  public subscribe(callback: (status: SyncStatus) => void): () => void {
    this.statusSubscribers.add(callback);
    callback(this.status);
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  public subscribeStatusInfo(callback: (info: SyncStatusInfo) => void): () => void {
    this.infoSubscribers.add(callback);
    callback({ ...this.statusInfo });
    return () => {
      this.infoSubscribers.delete(callback);
    };
  }

  public isOffline(): boolean {
    if (this.isOnlineOverride !== null) {
      return !this.isOnlineOverride;
    }
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return !navigator.onLine;
    }
    return false;
  }

  public setOnlineState(online: boolean): void {
    this.isOnlineOverride = online;
    if (online) {
      if (this.status === "offline") {
        this.setStatus("idle");
      }
      this.startTimers();
      if (this.status !== "signed-out") {
        this.flushSyncQueue().catch(() => {});
      }
    } else {
      this.setStatus("offline");
      this.stopTimers();
    }
  }

  private handleOnline = (): void => {
    if (this.status === "offline") {
      this.setStatus("idle");
    }
    this.startTimers();
    if (this.status !== "signed-out") {
      this.flushSyncQueue().catch(() => {});
    }
  };

  private handleOffline = (): void => {
    this.setStatus("offline");
    this.stopTimers();
  };

  private handleFocus = (): void => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (!this.isOffline() && this.status !== "signed-out") {
      this.flushSyncQueue().catch(() => {});
    }
  };

  private handleVisibilityChange = (): void => {
    if (typeof document === "undefined") return;
    if (document.hidden) {
      this.stopTimers();
    } else {
      this.startTimers();
      if (!this.isOffline() && this.status !== "signed-out") {
        this.flushSyncQueue().catch(() => {});
      }
    }
  };

  public setupNetworkListeners(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
      window.addEventListener("focus", this.handleFocus);
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  public removeNetworkListeners(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
      window.removeEventListener("focus", this.handleFocus);
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  public start(): void {
    this.isStarted = true;
    this.setupNetworkListeners();

    // Check document visibility: no timers if hidden
    if (typeof document !== "undefined" && document.hidden) {
      return;
    }

    this.startTimers();

    if (!this.isOffline() && this.status !== "signed-out") {
      // On start / page load, learn whether anyone is signed in first: a signed-out visitor never calls the run endpoint.
      this.checkStatus()
        .catch(() => {})
        .then(() => {
          if (!this.isOffline() && this.status !== "signed-out") return this.flushSyncQueue();
        })
        .catch(() => {});
    }
  }

  public stop(): void {
    this.isStarted = false;
    this.stopTimers();
  }

  private startTimers(): void {
    this.stopTimers();

    if (typeof window === "undefined" || !this.isStarted) return;
    if (this.isOffline() || this.status === "signed-out") return;
    if (typeof document !== "undefined" && document.hidden) return;

    // 5 s poller: checks status, if pending > 0 triggers sync run
    this.statusTimer = setInterval(() => {
      if (!this.isOffline() && !this.isSyncing && this.status !== "signed-out") {
        this.checkStatus().catch(() => {});
      }
    }, this.statusIntervalMs);

    // 30 s poller: triggers sync run (head check on server)
    this.syncTimer = setInterval(() => {
      if (!this.isOffline() && !this.isSyncing && this.status !== "signed-out") {
        this.flushSyncQueue().catch(() => {});
      }
    }, this.syncIntervalMs);
  }

  public startBackgroundSync(_intervalMs?: number): void {
    void _intervalMs;
    this.start();
  }

  public stopBackgroundSync(): void {
    this.stop();
  }

  private stopTimers(): void {
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private scheduleBackoff(retryAfterMs?: number | null): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    const base = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, this.retryAttempts));
    const delayBeforeJitter =
      retryAfterMs !== null && retryAfterMs !== undefined ? Math.max(retryAfterMs, base) : base;
    const jitter = Math.floor(Math.random() * 900) + 100;
    const finalDelayMs = Math.min(MAX_BACKOFF_MS, delayBeforeJitter + jitter);

    this.retryAttempts++;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (typeof document !== "undefined" && document.hidden) return;
      if (!this.isOffline() && this.status !== "signed-out") {
        this.flushSyncQueue().catch(() => {});
      }
    }, finalDelayMs);
  }

  /**
   * Calls GET /api/sync/status.
   * Updates current pending count, lastSyncedAt, account linkage and state.
   * If pending > 0, triggers flushSyncQueue().
   */
  public async checkStatus(): Promise<void> {
    if (this.isOffline()) {
      this.setStatus("offline");
      return;
    }
    if (this.status === "signed-out") {
      return;
    }
    if (this.inFlightStatusCheck) {
      return this.inFlightStatusCheck;
    }

    const runCheck = async (): Promise<void> => {
      try {
        const res = await this.fetchFn(this.statusEndpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (res.status === 401) {
          this.stop();
          this.setStatus("signed-out");
          return;
        }

        if (res.status === 429) {
          const retryHeader = res.headers?.get ? res.headers.get("Retry-After") : null;
          const retryMs = parseRetryAfter(retryHeader);
          this.setStatus("throttled");
          this.scheduleBackoff(retryMs);
          return;
        }

        if (!res.ok) {
          this.setStatus("error");
          this.scheduleBackoff();
          return;
        }

        const data: SyncStatusResponse = await res.json();
        const pending = typeof data.pending === "number" ? data.pending : 0;
        const lastSyncedAt =
          typeof data.lastSyncedAt === "number" && data.lastSyncedAt > 0
            ? data.lastSyncedAt
            : this.statusInfo.lastSyncedAt;
        const account = data.account ?? null;
        const rawHasRows = data.hasRows ?? data.has_rows;

        const update: Partial<SyncStatusInfo> = {
          account,
          pending,
          lastSyncedAt,
          message: data.message,
          hasRows: rawHasRows,
        };

        if (data.state === "signed-out") {
          this.stop();
          this.setStatus("signed-out");
          return;
        }

        if (data.state === "account-mismatch") {
          this.setStatus("account-mismatch");
          this.setStatusInfo(update);
          return;
        }

        if (data.state && !this.isSyncing && this.status !== "offline") {
          update.status = data.state;
          update.state = data.state;
        }

        this.setStatusInfo(update);

        // If changes are pending and we are not currently syncing, flush now
        if (pending > 0 && !this.isSyncing) {
          this.flushSyncQueue().catch(() => {});
        }
      } catch {
        if (this.isOffline()) {
          this.setStatus("offline");
        } else {
          this.setStatus("error");
          this.scheduleBackoff();
        }
      } finally {
        this.inFlightStatusCheck = null;
      }
    };

    this.inFlightStatusCheck = runCheck();
    return this.inFlightStatusCheck;
  }

  /**
   * Runs sync via POST /api/sync/run.
   */
  public async flushSyncQueue(options: FlushSyncOptions = {}): Promise<FlushResult> {
    if (this.isOffline()) {
      this.setStatus("offline");
      return { success: false, status: "offline", reason: "offline" };
    }

    if (this.status === "signed-out") {
      return { success: false, status: "signed-out", reason: "signed_out" };
    }

    if (this.isSyncing && this.inFlightSync) {
      return this.inFlightSync;
    }

    const runSync = async (): Promise<FlushResult> => {
      this.isSyncing = true;
      this.setStatus("syncing");

      try {
        const res = await this.fetchFn(this.runEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        // 401 Unauthorized: user session expired or signed out
        if (res.status === 401) {
          this.stop();
          this.setStatus("signed-out");
          if (options.throwOnError) {
            throw new Error("Unauthorized");
          }
          return {
            success: false,
            status: "signed-out",
            error: "Unauthorized",
            reason: "unauthorized",
          };
        }

        // 429 Too Many Requests: throttled with Retry-After backoff
        if (res.status === 429) {
          const retryHeader = res.headers?.get ? res.headers.get("Retry-After") : null;
          const retryMs = parseRetryAfter(retryHeader);

          this.setStatus("throttled");
          this.scheduleBackoff(retryMs);

          let errorMsg = "Too Many Requests";
          try {
            const errData = await res.json();
            if (errData?.error) errorMsg = errData.error;
            else if (errData?.message) errorMsg = errData.message;
          } catch {}

          if (options.throwOnError) {
            throw new Error(errorMsg);
          }

          return {
            success: false,
            status: "throttled",
            error: errorMsg,
            reason: "throttled",
          };
        }

        // 403 Forbidden or 413 Payload Too Large / Quota Exceeded (non-retryable)
        if (res.status === 403 || res.status === 413) {
          let errorMsg = res.status === 413 ? "quota_exceeded" : "Forbidden";
          try {
            const errData = await res.json();
            if (errData?.error) errorMsg = errData.error;
            else if (errData?.message) errorMsg = errData.message;
          } catch {}

          this.setStatus("error");
          if (options.throwOnError) {
            throw new Error(errorMsg);
          }
          return {
            success: false,
            status: "error",
            error: errorMsg,
            reason: res.status === 413 ? "quota_exceeded" : "forbidden",
          };
        }

        if (!res.ok) {
          let errorMsg = `Sync request failed with status ${res.status}: ${res.statusText}`;
          try {
            const errData = await res.json();
            if (errData?.error) errorMsg = errData.error;
            else if (errData?.message) errorMsg = errData.message;
          } catch {}

          this.setStatus("error");
          this.scheduleBackoff();

          if (options.throwOnError) {
            throw new Error(errorMsg);
          }

          return {
            success: false,
            status: "error",
            error: errorMsg,
          };
        }

        const data: SyncRunResponse = await res.json();

        // Successful response resets backoff attempts
        this.retryAttempts = 0;
        if (this.retryTimer) {
          clearTimeout(this.retryTimer);
          this.retryTimer = null;
        }

        const pushed = typeof data.pushed === "number" ? data.pushed : 0;
        const pulled = typeof data.pulled === "number" ? data.pulled : 0;
        const message = data.message;

        if (data.state === "signed-out") {
          this.stop();
          this.setStatus("signed-out");
          return {
            success: false,
            status: "signed-out",
            reason: "signed_out",
            pushed,
            pulled,
            message,
          };
        }

        if (data.state === "account-mismatch") {
          this.setStatus("account-mismatch");
          return {
            success: false,
            status: "account-mismatch",
            reason: "account_mismatch",
            pushed,
            pulled,
            message,
          };
        }

        if (data.state === "throttled") {
          this.setStatus("throttled");
          this.scheduleBackoff();
          return {
            success: false,
            status: "throttled",
            reason: "throttled",
            pushed,
            pulled,
            message,
          };
        }

        if (data.state === "error") {
          this.setStatus("error");
          this.scheduleBackoff();
          return {
            success: false,
            status: "error",
            pushed,
            pulled,
            message,
            error: data.error ?? message,
          };
        }

        // State is "synced"
        const now = Date.now();
        this.setStatusInfo({
          status: "synced",
          state: "synced",
          lastSyncedAt: now,
          pending: 0,
          message,
        });

        return {
          success: true,
          status: "synced",
          pushed,
          pulled,
          lastSyncedAt: now,
          message,
        };
      } catch (err: unknown) {
        if (this.isOffline()) {
          this.setStatus("offline");
        } else {
          this.setStatus("error");
          this.scheduleBackoff();
        }

        if (options.throwOnError) {
          throw err;
        }

        return {
          success: false,
          status: this.status,
          error: err instanceof Error ? err.message : String(err),
        };
      } finally {
        this.isSyncing = false;
        this.inFlightSync = null;
      }
    };

    this.inFlightSync = runSync();
    return this.inFlightSync;
  }

  public destroy(): void {
    this.stop();
    this.removeNetworkListeners();
    this.statusSubscribers.clear();
    this.infoSubscribers.clear();
  }
}

/**
 * Backward-compatibility dummy for callers expecting applyIncomingDeltas
 */
export async function applyIncomingDeltas(
  _db?: unknown,
  _deltas?: unknown
): Promise<{ applied: number; skipped: number }> {
  void _db;
  void _deltas;
  return { applied: 0, skipped: 0 };
}

/**
 * Global default SyncManager singleton
 */
export const syncManager = new SyncManager();

export function subscribeSyncStatus(callback: (status: SyncStatus) => void): () => void {
  return syncManager.subscribe(callback);
}

export function subscribeSyncInfo(callback: (info: SyncStatusInfo) => void): () => void {
  return syncManager.subscribeStatusInfo(callback);
}

export function getSyncStatus(): SyncStatus {
  return syncManager.getStatus();
}

export function getSyncInfo(): SyncStatusInfo {
  return syncManager.getStatusInfo();
}

export function flushSyncQueue(options?: FlushSyncOptions): Promise<FlushResult> {
  return syncManager.flushSyncQueue(options);
}

export function setSyncDb(_db?: unknown): void {
  syncManager.setDb(_db);
}
