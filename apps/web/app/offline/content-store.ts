import {
  CONTENT_SCHEMA_VERSION,
  entityKey,
  noticesFrom,
  patchEntity,
  refreshNotice,
  revOf,
  summaryLine,
  unitsFor,
  type AssetRow,
  type ChangeEntry,
  type ContentEntity,
  type EntityKind,
  type Notice,
  type UnitId,
} from "@habit/shared";

export const DB_NAME = "zd-content";
export const DB_VERSION = 1;

export interface StoredMeta {
  version: number;
  epoch: number;
  followedUnits: UnitId[];
  lastCheckedAt?: number;
}

export interface StoredEntityRecord {
  key: string;
  kind: EntityKind;
  id: string;
  entity: ContentEntity;
  rev: string;
  units: UnitId[];
}

export interface StoredNotice extends Notice {
  readAt: string | null;
}

function entityIdOf(e: ContentEntity): string {
  switch (e.kind) {
    case "problem":
      return e.value.row.id;
    case "lesson":
      return e.value.row.id;
    case "course":
      return e.value.row.id;
    case "doc":
      return `${e.value.row.kind}:${e.value.row.id}`;
  }
}

/** Opens or initializes the zd-content IndexedDB database. */
export function openContentDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
      if (!db.objectStoreNames.contains("entities")) {
        const store = db.createObjectStore("entities", { keyPath: "key" });
        store.createIndex("kind", "kind", { unique: false });
        store.createIndex("units", "units", { multiEntry: true, unique: false });
      }
      if (!db.objectStoreNames.contains("assets")) {
        db.createObjectStore("assets", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("notices")) {
        db.createObjectStore("notices", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Reads stored metadata (version, epoch, followed units). */
export async function getStoredMeta(): Promise<StoredMeta> {
  try {
    const db = await openContentDb();
    const tx = db.transaction("meta", "readonly");
    const store = tx.objectStore("meta");
    const [version, epoch, followedUnits, lastCheckedAt] = await Promise.all([
      reqToPromise(store.get("version")),
      reqToPromise(store.get("epoch")),
      reqToPromise(store.get("followedUnits")),
      reqToPromise(store.get("lastCheckedAt")),
    ]);
    return {
      version: typeof version === "number" ? version : 0,
      epoch: typeof epoch === "number" ? epoch : 1,
      followedUnits: Array.isArray(followedUnits) ? followedUnits : [],
      lastCheckedAt: typeof lastCheckedAt === "number" ? lastCheckedAt : undefined,
    };
  } catch {
    return { version: 0, epoch: 1, followedUnits: [] };
  }
}

/** Lists followed unit ids from meta. */
export async function listFollowedUnits(): Promise<UnitId[]> {
  const meta = await getStoredMeta();
  return meta.followedUnits;
}

/** Downloads the given units from the public /api/content/ endpoints. */
export async function downloadUnits(
  units: UnitId[],
  onProgress?: (progress: { unit: UnitId; current: number; total: number; stage: string }) => void,
): Promise<{ count: number; version: number }> {
  if (units.length === 0) return { count: 0, version: 0 };

  const verRes = await fetch("/api/content/version");
  if (!verRes.ok) throw new Error(`GET /api/content/version failed with ${verRes.status}`);
  const remote = (await verRes.json()) as { version: number; schema: number; epoch: number };

  if (remote.schema > CONTENT_SCHEMA_VERSION) {
    throw new Error("New content needs a newer app version.");
  }

  const db = await openContentDb();
  let totalEntities = 0;
  const currentMeta = await getStoredMeta();
  const allFollowed = Array.from(new Set([...currentMeta.followedUnits, ...units]));

  for (let uIdx = 0; uIdx < units.length; uIdx++) {
    const unit = units[uIdx];
    onProgress?.({ unit, current: uIdx + 1, total: units.length, stage: `Fetching ${unit}` });

    for (let page = 0; ; page++) {
      const url = `/api/content/unit/${encodeURIComponent(unit)}?v=${remote.version}&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GET ${url} failed with ${res.status}`);
      const data = (await res.json()) as {
        entities: ContentEntity[];
        assets: AssetRow[];
        next?: number;
      };

      const tx = db.transaction(["entities", "assets"], "readwrite");
      const entStore = tx.objectStore("entities");
      const assetStore = tx.objectStore("assets");

      for (const asset of data.assets || []) {
        assetStore.put(asset);
      }

      for (const entity of data.entities || []) {
        const id = entityIdOf(entity);
        const key = entityKey(entity);
        const existingRecord = (await reqToPromise(entStore.get(key))) as StoredEntityRecord | undefined;
        const assignedUnits = Array.from(new Set([...(existingRecord?.units || []), unit, ...unitsFor(entity)]));

        entStore.put({
          key,
          kind: entity.kind,
          id,
          entity,
          rev: revOf(entity.value),
          units: assignedUnits,
        });
        totalEntities++;
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      if (typeof data.next !== "number") break;
    }
  }

  // Save meta
  const metaTx = db.transaction("meta", "readwrite");
  const metaStore = metaTx.objectStore("meta");
  metaStore.put(remote.version, "version");
  metaStore.put(remote.epoch, "epoch");
  metaStore.put(allFollowed, "followedUnits");
  metaStore.put(Date.now(), "lastCheckedAt");
  await new Promise<void>((resolve, reject) => {
    metaTx.oncomplete = () => resolve();
    metaTx.onerror = () => reject(metaTx.error);
  });

  // Request storage persistence if possible
  try {
    if (navigator.storage && navigator.storage.persist) {
      await navigator.storage.persist();
    }
  } catch {
    // Ignore persistence denial
  }

  // Precache offline reader via service worker
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "cache-reader" });
    }
  } catch {
    // Ignore
  }

  return { count: totalEntities, version: remote.version };
}

/** Removes a downloaded unit and clears entities that no other unit needs. */
export async function removeUnit(unit: UnitId): Promise<void> {
  const db = await openContentDb();
  const meta = await getStoredMeta();
  const nextFollowed = meta.followedUnits.filter((u) => u !== unit);

  const tx = db.transaction(["entities", "meta"], "readwrite");
  const entStore = tx.objectStore("entities");
  const allRecords = (await reqToPromise(entStore.getAll())) as StoredEntityRecord[];

  for (const record of allRecords) {
    if (record.units.includes(unit)) {
      const remainingUnits = record.units.filter((u) => u !== unit && nextFollowed.includes(u));
      if (remainingUnits.length === 0) {
        entStore.delete(record.key);
      } else {
        record.units = remainingUnits;
        entStore.put(record);
      }
    }
  }

  const metaStore = tx.objectStore("meta");
  metaStore.put(nextFollowed, "followedUnits");
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Checks for updates to followed units and applies part-level patches (plan 0115 step 7).
 * Also records notices for learner (plan 0119 step 5).
 */
export async function updateIfNeeded(): Promise<{ updated: boolean; applied: number; notices: Notice[] }> {
  const meta = await getStoredMeta();
  if (meta.followedUnits.length === 0) {
    return { updated: false, applied: 0, notices: [] };
  }

  let verRes: Response;
  try {
    verRes = await fetch("/api/content/version");
  } catch {
    // Offline or network error
    return { updated: false, applied: 0, notices: [] };
  }
  if (!verRes.ok) return { updated: false, applied: 0, notices: [] };
  const remote = (await verRes.json()) as { version: number; schema: number; epoch: number };

  if (remote.schema > CONTENT_SCHEMA_VERSION) {
    return { updated: false, applied: 0, notices: [] };
  }

  // Epoch mismatch or server version lower than client version -> full refresh
  if (meta.epoch !== remote.epoch || remote.version < meta.version) {
    const res = await downloadUnits(meta.followedUnits);
    const notice = refreshNotice(Date.now());
    await storeOfflineNotices([notice]);
    return { updated: true, applied: res.count, notices: [notice] };
  }

  // Already up to date
  if (remote.version === meta.version) {
    return { updated: false, applied: 0, notices: [] };
  }

  // Fetch changes
  const url = `/api/content/changes?since=${meta.version}&units=${encodeURIComponent(meta.followedUnits.join(","))}`;
  const changesRes = await fetch(url);
  if (changesRes.status === 410) {
    // Too far behind -> full refresh
    const res = await downloadUnits(meta.followedUnits);
    const notice = refreshNotice(Date.now());
    await storeOfflineNotices([notice]);
    return { updated: true, applied: res.count, notices: [notice] };
  }
  if (!changesRes.ok) return { updated: false, applied: 0, notices: [] };

  const changesPage = (await changesRes.json()) as {
    from: number;
    to: number;
    schema: number;
    changes: ChangeEntry[];
  };

  const db = await openContentDb();
  let appliedCount = 0;
  const mismatchedUnits = new Set<UnitId>();

  const tx = db.transaction(["entities", "assets", "meta"], "readwrite");
  const entStore = tx.objectStore("entities");
  const assetStore = tx.objectStore("assets");

  for (const change of changesPage.changes) {
    const key = `${change.entity}:${change.id}`;
    if (change.op === "delete") {
      entStore.delete(key);
      appliedCount++;
      continue;
    }

    const data = change.data || {};
    let patchedEntity: ContentEntity | null = null;

    if (change.parts.includes("all") && data.all) {
      patchedEntity = data.all as ContentEntity;
    } else {
      const current = (await reqToPromise(entStore.get(key))) as StoredEntityRecord | undefined;
      if (!current) {
        for (const u of change.units) mismatchedUnits.add(u);
        continue;
      }
      patchedEntity = patchEntity(current.entity, change.parts, data);
    }

    if (!patchedEntity || revOf(patchedEntity.value) !== change.rev) {
      for (const u of change.units) mismatchedUnits.add(u);
      continue;
    }

    // Store asset parts
    for (const p of change.parts) {
      if (p.startsWith("asset:") && data[p]) {
        assetStore.put(data[p] as AssetRow);
      }
    }

    const assignedUnits = Array.from(new Set([...change.units, ...unitsFor(patchedEntity)]));
    entStore.put({
      key,
      kind: patchedEntity.kind,
      id: entityIdOf(patchedEntity),
      entity: patchedEntity,
      rev: change.rev,
      units: assignedUnits,
    });
    appliedCount++;
  }

  // Update meta version
  const metaStore = tx.objectStore("meta");
  metaStore.put(changesPage.to, "version");
  metaStore.put(Date.now(), "lastCheckedAt");

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Re-fetch any mismatched units in full
  if (mismatchedUnits.size > 0) {
    await downloadUnits(Array.from(mismatchedUnits));
  }

  // Build notices for downloaded units
  const notices = noticesFrom(
    changesPage.changes,
    new Set(meta.followedUnits),
    (_entity, id) => ({ title: id, unitTitle: "Content update" }),
    Date.now(),
  );

  if (notices.length > 0) {
    await storeOfflineNotices(notices);
    // Trigger browser notification if enabled
    try {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        "serviceWorker" in navigator &&
        navigator.serviceWorker.controller
      ) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(summaryLine(notices), {
          tag: "zd-content",
          data: { url: "/whats-new" },
        });
      }
    } catch {
      // Browser notification failed or unsupported
    }
  }

  return { updated: true, applied: appliedCount, notices };
}

/** Stores update notices into IndexedDB notices store. Keeps up to 200 newest. */
export async function storeOfflineNotices(notices: Notice[]): Promise<void> {
  if (notices.length === 0) return;
  const db = await openContentDb();
  const tx = db.transaction("notices", "readwrite");
  const store = tx.objectStore("notices");

  for (const n of notices) {
    let id = n.id;
    if (!id || id <= 0) {
      id = Date.now();
    }
    store.put({
      ...n,
      id,
      readAt: null,
    });
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Lists all offline notices, newest first. */
export async function listOfflineNotices(): Promise<StoredNotice[]> {
  try {
    const db = await openContentDb();
    const tx = db.transaction("notices", "readonly");
    const store = tx.objectStore("notices");
    const all = (await reqToPromise(store.getAll())) as StoredNotice[];
    return all.sort((a, b) => b.at - a.at || b.id - a.id);
  } catch {
    return [];
  }
}

/** Marks one offline notice as read. */
export async function markOfflineNoticeRead(id: number): Promise<void> {
  const db = await openContentDb();
  const tx = db.transaction("notices", "readwrite");
  const store = tx.objectStore("notices");
  const notice = (await reqToPromise(store.get(id))) as StoredNotice | undefined;
  if (notice) {
    notice.readAt = new Date().toISOString();
    store.put(notice);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Marks all offline notices as read. */
export async function markAllOfflineNoticesRead(): Promise<void> {
  const db = await openContentDb();
  const tx = db.transaction("notices", "readwrite");
  const store = tx.objectStore("notices");
  const all = (await reqToPromise(store.getAll())) as StoredNotice[];
  const now = new Date().toISOString();
  for (const n of all) {
    if (!n.readAt) {
      n.readAt = now;
      store.put(n);
    }
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Count of unread offline notices. */
export async function getOfflineUnreadCount(): Promise<number> {
  const notices = await listOfflineNotices();
  return notices.filter((n) => !n.readAt).length;
}

/** Lists saved entities from IndexedDB, optionally filtered by kind. */
export async function listSavedEntities(kind?: EntityKind): Promise<ContentEntity[]> {
  try {
    const db = await openContentDb();
    const tx = db.transaction("entities", "readonly");
    const store = tx.objectStore("entities");
    const records = (await reqToPromise(store.getAll())) as StoredEntityRecord[];
    if (kind) {
      return records.filter((r) => r.kind === kind).map((r) => r.entity);
    }
    return records.map((r) => r.entity);
  } catch {
    return [];
  }
}

/** Gets one saved entity by kind and id. */
export async function getSavedEntity(kind: EntityKind, id: string): Promise<ContentEntity | null> {
  try {
    const db = await openContentDb();
    const tx = db.transaction("entities", "readonly");
    const store = tx.objectStore("entities");
    const key = `${kind}:${id}`;
    const record = (await reqToPromise(store.get(key))) as StoredEntityRecord | undefined;
    return record?.entity ?? null;
  } catch {
    return null;
  }
}

/** Gets one saved asset image by id (returns data URL or null). */
export async function getSavedAsset(id: string): Promise<string | null> {
  try {
    const db = await openContentDb();
    const tx = db.transaction("assets", "readonly");
    const store = tx.objectStore("assets");
    const asset = (await reqToPromise(store.get(id))) as AssetRow | undefined;
    if (!asset || !asset.base64) return null;
    return `data:${asset.mime};base64,${asset.base64}`;
  } catch {
    return null;
  }
}

/** Estimates storage usage in bytes. */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
    }
  } catch {
    // Ignore
  }
  return null;
}
