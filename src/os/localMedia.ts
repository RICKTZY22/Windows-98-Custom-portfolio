import type { FsNode, FsState } from '../types'

const DB_NAME = 'win98-portfolio-local-media'
const STORE_NAME = 'files'
const DB_VERSION = 1

export const LOCAL_MEDIA_REF_PREFIX = 'indexeddb://win98-local-media/'

type LocalMediaRecord = {
  id: string
  name: string
  type: string
  size: number
  lastModified: number
  blob: Blob
  createdAt: number
}

function mediaId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function isLocalMediaRef(src: string | undefined): src is string {
  return typeof src === 'string' && src.startsWith(LOCAL_MEDIA_REF_PREFIX)
}

function idFromRef(ref: string): string {
  return ref.slice(LOCAL_MEDIA_REF_PREFIX.length)
}

export function localMediaRef(id: string): string {
  return `${LOCAL_MEDIA_REF_PREFIX}${id}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Local media storage is not available in this browser.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onerror = () => reject(request.error ?? new Error('Could not open local media storage.'))
    request.onsuccess = () => resolve(request.result)
  })
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const request = run(tx.objectStore(STORE_NAME))
        request.onerror = () => reject(request.error ?? new Error('Local media storage request failed.'))
        request.onsuccess = () => resolve(request.result)
        tx.oncomplete = () => db.close()
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? new Error('Local media storage transaction failed.'))
        }
      }),
  )
}

export async function storeLocalMediaFile(file: File): Promise<{ ref: string; size: number; type: string }> {
  const id = mediaId()
  const record: LocalMediaRecord = {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    blob: file,
    createdAt: Date.now(),
  }
  await withStore('readwrite', (store) => store.put(record))
  return { ref: localMediaRef(id), size: file.size, type: file.type }
}

export async function getLocalMediaBlob(ref: string): Promise<Blob | null> {
  if (!isLocalMediaRef(ref)) return null
  const record = await withStore<LocalMediaRecord | undefined>('readonly', (store) => store.get(idFromRef(ref)))
  return record?.blob ?? null
}

export async function listLocalMediaRefs(): Promise<string[]> {
  const keys = await withStore<IDBValidKey[]>('readonly', (store) => store.getAllKeys())
  return keys
    .filter((key): key is string => typeof key === 'string')
    .map(localMediaRef)
}

export async function deleteLocalMediaRef(ref: string): Promise<void> {
  if (!isLocalMediaRef(ref)) return
  await withStore<undefined>('readwrite', (store) => store.delete(idFromRef(ref)))
}

export async function deleteLocalMediaRefs(refs: Iterable<string>): Promise<number> {
  const uniqueRefs = [...new Set(refs)].filter(isLocalMediaRef)
  await Promise.all(uniqueRefs.map(deleteLocalMediaRef))
  return uniqueRefs.length
}

function collectNodeLocalMediaRefs(node: FsNode, refs: Set<string>): void {
  if (node.kind === 'file' && isLocalMediaRef(node.dataUrl)) {
    refs.add(node.dataUrl)
  }
}

export function collectLocalMediaRefs(fs: FsState): Set<string> {
  const refs = new Set<string>()
  for (const node of Object.values(fs.nodes)) {
    collectNodeLocalMediaRefs(node, refs)
  }
  for (const entry of fs.recycle) {
    for (const node of Object.values(entry.nodes)) {
      collectNodeLocalMediaRefs(node, refs)
    }
  }
  return refs
}

export function unreferencedLocalMediaRefs(before: FsState, after: FsState): string[] {
  const beforeRefs = collectLocalMediaRefs(before)
  if (!beforeRefs.size) return []
  const afterRefs = collectLocalMediaRefs(after)
  return [...beforeRefs].filter((ref) => !afterRefs.has(ref))
}

export async function pruneUnreferencedLocalMedia(fs: FsState): Promise<number> {
  const storedRefs = await listLocalMediaRefs()
  if (!storedRefs.length) return 0
  const liveRefs = collectLocalMediaRefs(fs)
  const staleRefs = storedRefs.filter((ref) => !liveRefs.has(ref))
  return deleteLocalMediaRefs(staleRefs)
}
