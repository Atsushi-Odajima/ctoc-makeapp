"use client"

// Browser-side personal cache. The database is the source of truth; this only holds
// in-progress post drafts (text, order, media ids — never the original file blobs), keyed by
// user id. Everything here is wiped on logout and on account switch.

const DB_NAME = "daynet"
const STORE = "drafts"
const LAST_USER_KEY = "daynet:lastUser"

export interface LocalDraft {
  key: string // `${userId}:create`
  userId: string
  caption: string
  mediaIds: string[]
  altTexts: Record<string, string>
  visibility: "PUBLIC" | "FOLLOWERS"
  communitySlug: string | null
  savedAt: string
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)
  return new Promise(resolve => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "key" })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

export async function saveDraft(draft: Omit<LocalDraft, "key" | "savedAt">) {
  const db = await openDb()
  if (!db) return
  await new Promise<void>(resolve => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put({ ...draft, key: `${draft.userId}:create`, savedAt: new Date().toISOString() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
  db.close()
}

export async function loadDraft(userId: string): Promise<LocalDraft | null> {
  const db = await openDb()
  if (!db) return null
  const draft = await new Promise<LocalDraft | null>(resolve => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(`${userId}:create`)
    req.onsuccess = () => resolve((req.result as LocalDraft) ?? null)
    req.onerror = () => resolve(null)
  })
  db.close()
  return draft && draft.userId === userId ? draft : null
}

export async function deleteDraft(userId: string) {
  const db = await openDb()
  if (!db) return
  await new Promise<void>(resolve => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(`${userId}:create`)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
  db.close()
}

/** Remove every personal trace from this browser (logout / account switch). */
export async function purgePersonalCache() {
  try {
    if (typeof indexedDB !== "undefined") {
      await new Promise<void>(resolve => {
        const req = indexedDB.deleteDatabase(DB_NAME)
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      })
    }
    for (const key of Object.keys(localStorage)) if (key.startsWith("daynet:")) localStorage.removeItem(key)
    for (const key of Object.keys(sessionStorage)) if (key.startsWith("daynet:")) sessionStorage.removeItem(key)
    if (typeof caches !== "undefined") {
      // The service worker only caches public static files, but drop any runtime cache anyway.
      for (const name of await caches.keys()) if (name.startsWith("daynet-runtime")) await caches.delete(name)
    }
  } catch {
    /* best effort */
  }
}

/** Call once per page load with the signed-in user id (or null). */
export async function guardAccountSwitch(userId: string | null) {
  try {
    const last = localStorage.getItem(LAST_USER_KEY)
    if (last && last !== userId) await purgePersonalCache()
    if (userId) localStorage.setItem(LAST_USER_KEY, userId)
    else localStorage.removeItem(LAST_USER_KEY)
  } catch {
    /* storage unavailable */
  }
}
