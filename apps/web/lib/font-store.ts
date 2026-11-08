// Uploaded font files live in this browser's IndexedDB (too big for localStorage). Browser only.

const DB = "prepwise-fonts";
const STORE = "fonts";
const KEY = "custom";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFontFile(data: ArrayBuffer): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(data, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadFontFile(): Promise<ArrayBuffer | null> {
  const db = await open();
  const data = await new Promise<ArrayBuffer | null>((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve((req.result as ArrayBuffer | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return data;
}

export async function deleteFontFile(): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Makes an uploaded font usable under `family`. */
export async function registerFont(family: string, data: ArrayBuffer): Promise<void> {
  const face = new FontFace(family, data);
  await face.load();
  document.fonts.add(face);
}
