/** IndexedDB store for imported pets. Browser only; every call is wrapped so failures become plain errors or empty results. */
import { PetImportError, type PetMeta, type PetPackage } from "./pet-package";

const DB_NAME = "habit-pets";
const STORE = "pets";
export const MAX_PETS = 12;

interface PetRecord {
  id: string;
  meta: PetMeta;
  sheet: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("open failed"));
    } catch (e) {
      reject(e);
    }
  });
}

function done<T>(tx: IDBTransaction, req: IDBRequest<T> | null): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error ?? new Error("transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("transaction aborted"));
  });
}

async function readAll(db: IDBDatabase): Promise<PetRecord[]> {
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).getAll() as IDBRequest<PetRecord[]>;
  return (await done(tx, req)) ?? [];
}

/** Saves (or replaces) a pet. Refuses a 13th pet with a plain message. */
export async function savePet(pkg: PetPackage, meta: PetMeta): Promise<void> {
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    throw new PetImportError("This browser cannot store pets (storage may be blocked).");
  }
  try {
    const existing = await readAll(db);
    if (!existing.some((p) => p.id === meta.id) && existing.length >= MAX_PETS) {
      throw new PetImportError(`You can keep up to ${MAX_PETS} pets. Remove one first.`);
    }
    const tx = db.transaction(STORE, "readwrite");
    const record: PetRecord = { id: meta.id, meta, sheet: pkg.sheet };
    tx.objectStore(STORE).put(record);
    await done(tx, null);
  } catch (e) {
    if (e instanceof PetImportError) throw e;
    throw new PetImportError("Could not save the pet in this browser.");
  } finally {
    db.close();
  }
}

export async function listPets(): Promise<PetMeta[]> {
  try {
    const db = await openDb();
    try {
      return (await readAll(db)).map((r) => r.meta).sort((a, b) => a.name.localeCompare(b.name));
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

/** Object URL of the stored sheet, or null. The caller must revoke it. */
export async function loadPetSheetUrl(id: string): Promise<string | null> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id) as IDBRequest<PetRecord | undefined>;
      const rec = await done(tx, req);
      return rec?.sheet ? URL.createObjectURL(rec.sheet) : null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export async function deletePet(id: string): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      await done(tx, null);
    } finally {
      db.close();
    }
  } catch {
    /* nothing to delete or storage blocked */
  }
}
