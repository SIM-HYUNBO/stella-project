// app/video-c/store.ts

const DB_NAME = "video_local_db";
const STORE_NAME = "videos";
const DB_VERSION = 1;

// DB 열기
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 영상 저장
export async function saveVideoBlob(name: string, blob: Blob): Promise<string> {
  const db = await openDB();
  const key = `${Date.now()}_${name}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, name, size: blob.size, type: blob.type, blob });
    tx.oncomplete = () => resolve(key);
    tx.onerror = () => reject(tx.error);
  });
}

// 저장된 영상 목록 조회
export async function listSavedVideos(): Promise<{ key: string; name: string; size: number }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = (req.result || []) as { key: string; name: string; size: number }[];
      resolve(rows.map((r) => ({ key: (r as any).key, name: (r as any).name, size: (r as any).size })));
    };
    req.onerror = () => reject(req.error);
  });
}

// 특정 영상 불러오기
export async function loadVideoBlob(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => {
      const row = req.result;
      resolve(row ? (row as any).blob as Blob : null);
    };
    req.onerror = () => reject(req.error);
  });
}

// 영상 삭제
export async function deleteVideo(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
