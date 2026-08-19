/**
 * The original CV file, kept verbatim so it can be re-attached to job forms'
 * file inputs. Stored in IndexedDB because extension storage APIs cannot hold
 * binary data and base64 in storage.local would bloat and hit quota.
 *
 * Kept as raw bytes rather than a Blob: the background worker ships the file
 * to content scripts over the messaging channel, which carries ArrayBuffers
 * but not Blobs.
 */

export interface StoredCvFile {
  bytes: ArrayBuffer;
  fileName: string;
  mimeType: string;
}

const DB_NAME = 'autoapply';
const DB_VERSION = 1;
const STORE = 'files';
const CV_KEY = 'cv';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('IndexedDB request failed'));
    });
  } finally {
    db.close();
  }
}

export function saveCvFile(file: StoredCvFile): Promise<IDBValidKey> {
  return withStore('readwrite', (store) => store.put(file, CV_KEY));
}

export async function loadCvFile(): Promise<StoredCvFile | null> {
  const value = await withStore<unknown>('readonly', (store) => store.get(CV_KEY));
  return (value as StoredCvFile | undefined) ?? null;
}

export function deleteCvFile(): Promise<undefined> {
  return withStore('readwrite', (store) => store.delete(CV_KEY));
}
