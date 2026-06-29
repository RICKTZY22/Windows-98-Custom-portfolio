// Windows 98 Portfolio Edition (c) 2026 John Erick Mendoza (github.com/RICKTZY22) - MIT, attribution required. origin-fingerprint: JEM-W98P-ORIGIN-7f3a9c1e2b5d
import type { AppId, FsNode, FsState, IconKey, RecycleEntry, WindowPayload } from '../types'

/**
 * Pure filesystem engine. All functions are immutable: they never touch the
 * FsState they receive and always return fresh objects on change.
 * Paths are normalized to the canonical 'C:\\Dir\\File.txt' shape internally.
 *
 * Taglish note: ito ang source of truth ng fake C: drive. UI components should
 * call these helpers through fsOps, hindi mag-edit ng nodes object directly.
 */

export const PROTECTED_ROOT = 'C:\\Windows'

/** Files that Windows needs to boot. Deleting any of them is... educational. */
export const REQUIRED_SYSTEM_FILES: string[] = [
  'C:\\Windows\\System32\\kernel32.dll',
  'C:\\Windows\\System32\\user32.dll',
  'C:\\Windows\\System32\\gdi32.dll',
  'C:\\Windows\\System32\\shell32.dll',
  'C:\\Windows\\System32\\vmm32.vxd',
  'C:\\Windows\\EXPLORER.EXE',
  'C:\\Windows\\Command\\COMMAND.COM',
  'C:\\Windows\\WIN.INI',
  'C:\\Windows\\SYSTEM.INI',
]

const ACCESS_DENIED = 'Access is denied. The file is being used by Windows.'

// Guardrail: the whole filesystem is persisted to localStorage (a few hundred KB
// at baseline, ~450 nodes). Cap user-created nodes so a runaway "New File" spree
// can't bloat the saved blob toward the browser's storage limit. Presented to the
// user as the disk being full, the period-accurate way to hit this.
const MAX_FS_NODES = 2000
const DISK_FULL =
  'There is not enough free disk space on drive C: to create this item. Delete some files and try again.'

function atNodeCapacity(fs: FsState): boolean {
  return Object.keys(fs.nodes).length >= MAX_FS_NODES
}

// ---------------------------------------------------------------------------
// Path utilities
// ---------------------------------------------------------------------------

export function normalizePath(path: string): string {
  const cleaned = path.trim().replace(/\//g, '\\')
  if (!cleaned || /^[a-z]:$/i.test(cleaned)) {
    const drive = cleaned ? cleaned[0].toUpperCase() : 'C'
    return `${drive}:\\`
  }
  if (cleaned === '\\') {
    return 'C:\\'
  }
  const withDrive = /^[a-z]:/i.test(cleaned) ? cleaned : `C:\\${cleaned.replace(/^\\+/, '')}`
  const parts = withDrive.split('\\').filter(Boolean)
  const drive = (parts.shift() ?? 'C:')[0].toUpperCase()
  const stack: string[] = []
  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  return stack.length ? `${drive}:\\${stack.join('\\')}` : `${drive}:\\`
}

export function joinPath(dir: string, name: string): string {
  const base = normalizePath(dir)
  return normalizePath(base.endsWith('\\') ? `${base}${name}` : `${base}\\${name}`)
}

export function parentPath(path: string): string {
  const normalized = normalizePath(path)
  if (/^[A-Z]:\\$/.test(normalized)) {
    return normalized
  }
  const slash = normalized.lastIndexOf('\\')
  return slash <= 2 ? `${normalized.slice(0, 2)}\\` : normalized.slice(0, slash)
}

export function baseName(path: string): string {
  const normalized = normalizePath(path)
  if (/^[A-Z]:\\$/.test(normalized)) {
    return normalized
  }
  return normalized.slice(normalized.lastIndexOf('\\') + 1)
}

export function extensionOf(name: string): string {
  const base = baseName(name)
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) {
    return ''
  }
  return base.slice(dot + 1).toLowerCase()
}

export function resolvePath(cwd: string, target: string): string {
  const trimmed = target.trim()
  if (!trimmed || trimmed === '.') {
    return normalizePath(cwd)
  }
  if (/^[a-z]:/i.test(trimmed)) {
    return normalizePath(trimmed)
  }
  const cleaned = trimmed.replace(/\//g, '\\')
  if (cleaned.startsWith('\\')) {
    return normalizePath(`C:${cleaned}`)
  }
  const base = normalizePath(cwd)
  return normalizePath(base.endsWith('\\') ? `${base}${cleaned}` : `${base}\\${cleaned}`)
}

export function nowStamp(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const yyyy = now.getFullYear()
  let hours = now.getHours()
  const suffix = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  const hh = String(hours).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${mm}/${dd}/${yyyy} ${hh}:${min} ${suffix}`
}

export function formatSize(bytes: number): string {
  if (bytes <= 0) {
    return ''
  }
  const kb = Math.ceil(bytes / 1024)
  return `${kb.toLocaleString('en-US')} KB`
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export function getNode(fs: FsState, path: string): FsNode | undefined {
  const normalized = normalizePath(path)
  const direct = fs.nodes[normalized]
  if (direct) {
    return direct
  }
  // Case-insensitive fallback (DOS users type lowercase paths).
  const lower = normalized.toLowerCase()
  for (const node of Object.values(fs.nodes)) {
    if (node.path.toLowerCase() === lower) {
      return node
    }
  }
  return undefined
}

export function listDirectory(fs: FsState, path: string): FsNode[] {
  const node = getNode(fs, path)
  if (!node || node.kind !== 'folder') {
    return []
  }
  return (node.children ?? [])
    .map((childPath) => fs.nodes[childPath])
    .filter((child): child is FsNode => Boolean(child))
}

function childNameTaken(fs: FsState, parent: string, name: string): boolean {
  const parentNode = getNode(fs, parent)
  if (!parentNode?.children) {
    return false
  }
  const lower = name.toLowerCase()
  return parentNode.children.some((childPath) => baseName(childPath).toLowerCase() === lower)
}

export function uniqueChildName(fs: FsState, parent: string, desired: string): string {
  if (!childNameTaken(fs, parent, desired)) {
    return desired
  }
  const ext = extensionOf(desired)
  const stem = ext ? desired.slice(0, desired.length - ext.length - 1) : desired
  for (let i = 2; i < 1000; i += 1) {
    const candidate = ext ? `${stem} (${i}).${ext}` : `${stem} (${i})`
    if (!childNameTaken(fs, parent, candidate)) {
      return candidate
    }
  }
  return `${stem} (${Date.now()})${ext ? `.${ext}` : ''}`
}

// ---------------------------------------------------------------------------
// Protection rules
// ---------------------------------------------------------------------------

function isWithin(path: string, root: string): boolean {
  const a = normalizePath(path).toLowerCase()
  const b = normalizePath(root).toLowerCase()
  return a === b || a.startsWith(b.endsWith('\\') ? b : `${b}\\`)
}

export function isProtectedPath(path: string): boolean {
  return isWithin(path, PROTECTED_ROOT)
}

export function isCriticalPath(path: string): boolean {
  const normalized = normalizePath(path).toLowerCase()
  return REQUIRED_SYSTEM_FILES.some((required) => {
    const lower = required.toLowerCase()
    return lower === normalized || lower.startsWith(`${normalized}\\`)
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type FsResult = { fs: FsState; error: string | null; createdPath?: string }

function fail(fs: FsState, error: string): FsResult {
  return { fs, error }
}

function isValidName(name: string): boolean {
  if (!name || !name.trim()) return false
  return !/[\\/:*?"<>|]/.test(name)
}

function withNode(fs: FsState, node: FsNode): FsState {
  return { ...fs, nodes: { ...fs.nodes, [node.path]: node } }
}

function attachChild(fs: FsState, parent: string, childPath: string): FsState {
  const parentNode = getNode(fs, parent)
  if (!parentNode || parentNode.kind !== 'folder') {
    return fs
  }
  const children = parentNode.children ?? []
  if (children.includes(childPath)) {
    return fs
  }
  return withNode(fs, { ...parentNode, children: [...children, childPath], modified: nowStamp() })
}

function detachChild(fs: FsState, parent: string, childPath: string): FsState {
  const parentNode = getNode(fs, parent)
  if (!parentNode || parentNode.kind !== 'folder' || !parentNode.children) {
    return fs
  }
  return withNode(fs, {
    ...parentNode,
    children: parentNode.children.filter((child) => child !== childPath),
    modified: nowStamp(),
  })
}

/** Collects a node and every descendant, keyed by path. */
function collectSubtree(fs: FsState, rootPath: string): Record<string, FsNode> {
  const result: Record<string, FsNode> = {}
  const queue = [normalizePath(rootPath)]
  while (queue.length) {
    const current = queue.shift() as string
    const node = fs.nodes[current]
    if (!node) continue
    result[current] = node
    if (node.children) {
      queue.push(...node.children)
    }
  }
  return result
}

/** Internal: insert a node without protection checks (used by restore/recovery). */
export function internalInsertNode(fs: FsState, node: FsNode): FsState {
  let next = withNode(fs, node)
  next = attachChild(next, parentPath(node.path), node.path)
  return next
}

function internalCreateFolder(fs: FsState, parent: string, name: string): FsResult {
  const parentNode = getNode(fs, parent)
  if (!parentNode || parentNode.kind !== 'folder') {
    return fail(fs, 'The system cannot find the path specified.')
  }
  const parentNorm = parentNode.path
  if (!isValidName(name)) {
    return fail(fs, 'A file name cannot contain any of the following characters: \\ / : * ? " < > |')
  }
  if (childNameTaken(fs, parentNorm, name)) {
    return fail(fs, 'A folder with that name already exists.')
  }
  const path = joinPath(parentNorm, name)
  const node: FsNode = {
    path,
    name,
    kind: 'folder',
    icon: 'folder',
    fileType: 'File Folder',
    size: 0,
    modified: nowStamp(),
    children: [],
  }
  return { fs: internalInsertNode(fs, node), error: null, createdPath: path }
}

export function createFolder(fs: FsState, parent: string, name: string): FsResult {
  if (isProtectedPath(parent)) {
    return fail(fs, ACCESS_DENIED)
  }
  if (atNodeCapacity(fs)) {
    return fail(fs, DISK_FULL)
  }
  return internalCreateFolder(fs, parent, name)
}

export function createFile(
  fs: FsState,
  parent: string,
  name: string,
  opts?: { content?: string; dataUrl?: string; icon?: IconKey; fileType?: string; size?: number },
): FsResult {
  if (isProtectedPath(parent)) {
    return fail(fs, ACCESS_DENIED)
  }
  if (atNodeCapacity(fs)) {
    return fail(fs, DISK_FULL)
  }
  const parentNode = getNode(fs, parent)
  if (!parentNode || parentNode.kind !== 'folder') {
    return fail(fs, 'The system cannot find the path specified.')
  }
  const parentNorm = parentNode.path
  if (!isValidName(name)) {
    return fail(fs, 'A file name cannot contain any of the following characters: \\ / : * ? " < > |')
  }
  if (childNameTaken(fs, parentNorm, name)) {
    return fail(fs, 'A file with that name already exists.')
  }
  const path = joinPath(parentNorm, name)
  const node: FsNode = {
    path,
    name,
    kind: 'file',
    icon: opts?.icon ?? iconForFileName(name),
    fileType: opts?.fileType ?? fileTypeForName(name),
    size: opts?.size ?? opts?.content?.length ?? opts?.dataUrl?.length ?? 0,
    modified: nowStamp(),
    content: opts?.content,
    dataUrl: opts?.dataUrl,
  }
  return { fs: internalInsertNode(fs, node), error: null, createdPath: path }
}

export function writeFile(fs: FsState, path: string, data: { content?: string; dataUrl?: string }): FsResult {
  const normalized = normalizePath(path)
  if (isProtectedPath(normalized)) {
    return fail(fs, ACCESS_DENIED)
  }
  const existing = getNode(fs, normalized)
  if (existing && existing.kind === 'folder') {
    return fail(fs, 'Cannot write: the target is a folder.')
  }
  if (existing?.attributes?.readOnly) {
    return fail(fs, 'Cannot write: the file is read-only.')
  }
  if (!existing) {
    const parent = parentPath(normalized)
    return createFile(fs, parent, baseName(normalized), data)
  }
  const node: FsNode = {
    ...existing,
    content: data.content ?? existing.content,
    dataUrl: data.dataUrl ?? existing.dataUrl,
    size: (data.content ?? existing.content)?.length ?? (data.dataUrl ?? existing.dataUrl)?.length ?? 0,
    modified: nowStamp(),
  }
  return { fs: withNode(fs, node), error: null, createdPath: existing.path }
}

/** Re-keys a whole subtree from oldRoot to newRoot. Returns the changed nodes map. */
function rekeySubtree(fs: FsState, oldRoot: string, newRoot: string): Record<string, FsNode> {
  const subtree = collectSubtree(fs, oldRoot)
  const next: Record<string, FsNode> = {}
  const rename = (path: string) => `${newRoot}${path.slice(oldRoot.length)}`
  for (const [path, node] of Object.entries(subtree)) {
    const newPath = rename(path)
    next[newPath] = {
      ...node,
      path: newPath,
      name: newPath === newRoot ? baseName(newRoot) : node.name,
      children: node.children?.map(rename),
    }
  }
  return next
}

export function renameNode(fs: FsState, path: string, newName: string): FsResult {
  const node = getNode(fs, path)
  if (!node) {
    return fail(fs, 'The system cannot find the file specified.')
  }
  const normalized = node.path
  if (isProtectedPath(normalized)) {
    return fail(fs, ACCESS_DENIED)
  }
  if (/^[A-Z]:\\$/.test(normalized)) {
    return fail(fs, 'Cannot rename a drive.')
  }
  if (!isValidName(newName)) {
    return fail(fs, 'A file name cannot contain any of the following characters: \\ / : * ? " < > |')
  }
  if (newName === node.name) {
    return { fs, error: null, createdPath: normalized }
  }
  const parent = parentPath(normalized)
  if (
    childNameTaken(fs, parent, newName) &&
    newName.toLowerCase() !== node.name.toLowerCase()
  ) {
    return fail(fs, 'A file with that name already exists.')
  }
  const newPath = joinPath(parent, newName)
  const rekeyed = rekeySubtree(fs, normalized, newPath)
  const nodes: Record<string, FsNode> = {}
  for (const [key, value] of Object.entries(fs.nodes)) {
    if (!isWithin(key, normalized)) {
      nodes[key] = value
    }
  }
  Object.assign(nodes, rekeyed)
  let next: FsState = { ...fs, nodes }
  const parentNode = next.nodes[parent]
  if (parentNode?.children) {
    next = withNode(next, {
      ...parentNode,
      children: parentNode.children.map((child) => (child === normalized ? newPath : child)),
      modified: nowStamp(),
    })
  }
  return { fs: next, error: null, createdPath: newPath }
}

export function moveNode(fs: FsState, path: string, targetFolder: string): FsResult {
  const node = getNode(fs, path)
  if (!node) {
    return fail(fs, 'The system cannot find the file specified.')
  }
  const targetNode = getNode(fs, targetFolder)
  if (!targetNode || targetNode.kind !== 'folder') {
    return fail(fs, 'The system cannot find the path specified.')
  }
  const source = node.path
  const target = targetNode.path
  if (isProtectedPath(source) || isProtectedPath(target)) {
    return fail(fs, ACCESS_DENIED)
  }
  if (source === target || isWithin(target, source)) {
    return fail(fs, 'Cannot move a folder into itself.')
  }
  if (parentPath(source) === target) {
    return { fs, error: null, createdPath: source }
  }
  if (childNameTaken(fs, target, node.name)) {
    return fail(fs, 'A file with that name already exists.')
  }
  const newPath = joinPath(target, node.name)
  const rekeyed = rekeySubtree(fs, source, newPath)
  const nodes: Record<string, FsNode> = {}
  for (const [key, value] of Object.entries(fs.nodes)) {
    if (!isWithin(key, source)) {
      nodes[key] = value
    }
  }
  Object.assign(nodes, rekeyed)
  let next: FsState = { ...fs, nodes }
  next = detachChild(next, parentPath(source), source)
  next = attachChild(next, target, newPath)
  return { fs: next, error: null, createdPath: newPath }
}

export function copyNode(fs: FsState, path: string, targetFolder: string): FsResult {
  const node = getNode(fs, path)
  if (!node) {
    return fail(fs, 'The system cannot find the file specified.')
  }
  const targetNode = getNode(fs, targetFolder)
  if (!targetNode || targetNode.kind !== 'folder') {
    return fail(fs, 'The system cannot find the path specified.')
  }
  const source = node.path
  const target = targetNode.path
  if (isProtectedPath(target)) {
    return fail(fs, ACCESS_DENIED)
  }
  if (atNodeCapacity(fs)) {
    return fail(fs, DISK_FULL)
  }
  if (node.kind === 'folder' && isWithin(target, source)) {
    return fail(fs, 'Cannot copy a folder into itself.')
  }
  const desired = childNameTaken(fs, target, node.name) ? `Copy of ${node.name}` : node.name
  const finalName = uniqueChildName(fs, target, desired)
  const newRoot = joinPath(target, finalName)
  const rekeyed = rekeySubtree(fs, source, newRoot)
  const stamp = nowStamp()
  const nodes = { ...fs.nodes }
  for (const [key, value] of Object.entries(rekeyed)) {
    nodes[key] = {
      ...value,
      name: key === newRoot ? finalName : value.name,
      modified: stamp,
      attributes: value.attributes ? { ...value.attributes, critical: false, system: false } : undefined,
    }
  }
  let next: FsState = { ...fs, nodes }
  next = attachChild(next, target, newRoot)
  return { fs: next, error: null, createdPath: newRoot }
}

/** The authentic Win98 desktop folder. Icons here are mirrored onto the desktop. */
export const DESKTOP_FOLDER = 'C:\\Windows\\Desktop'

/**
 * Drops a `.lnk` shortcut for `targetPath` into the Desktop folder so it shows up
 * as a desktop icon. Uses internalInsertNode to bypass the C:\Windows write
 * protection (a "Send to Desktop" is a deliberate, safe system op, like restore).
 */
export function createDesktopShortcut(fs: FsState, targetPath: string): FsResult {
  const target = getNode(fs, targetPath)
  if (!target) {
    return fail(fs, 'The system cannot find the file specified.')
  }
  const desktop = getNode(fs, DESKTOP_FOLDER)
  if (!desktop || desktop.kind !== 'folder') {
    return fail(fs, 'The system cannot find the path specified.')
  }
  const open = openTargetFor(target)
  const baseLabel = target.name.replace(/\.lnk$/i, '')
  const name = uniqueChildName(fs, desktop.path, `${baseLabel}.lnk`)
  const path = joinPath(desktop.path, name)
  const node: FsNode = {
    path,
    name,
    kind: 'file',
    icon: target.icon,
    fileType: 'Shortcut',
    size: 1024,
    modified: nowStamp(),
    appId: open?.appId ?? target.appId,
    appPayload: open?.payload ?? target.appPayload,
  }
  return { fs: internalInsertNode(fs, node), error: null, createdPath: path }
}

let recycleCounter = 0

export function deleteNode(fs: FsState, path: string): { fs: FsState; error: string | null; criticalDeleted: boolean } {
  const node = getNode(fs, path)
  if (!node) {
    return { fs, error: 'The system cannot find the file specified.', criticalDeleted: false }
  }
  const normalized = node.path
  if (/^[A-Z]:\\$/.test(normalized)) {
    return { fs, error: 'Cannot delete a drive.', criticalDeleted: false }
  }
  const subtree = collectSubtree(fs, normalized)
  const critical = isCriticalPath(normalized) || Object.keys(subtree).some((key) => isCriticalPath(key))
  recycleCounter += 1
  const entry: RecycleEntry = {
    id: `re-${Date.now()}-${recycleCounter}`,
    rootPath: normalized,
    name: node.name,
    icon: node.icon,
    fileType: node.fileType,
    deletedAt: nowStamp(),
    critical,
    nodes: subtree,
  }
  const nodes: Record<string, FsNode> = {}
  for (const [key, value] of Object.entries(fs.nodes)) {
    if (!subtree[key]) {
      nodes[key] = value
    }
  }
  let next: FsState = { ...fs, nodes, recycle: [entry, ...fs.recycle] }
  next = detachChild(next, parentPath(normalized), normalized)
  return { fs: next, error: null, criticalDeleted: critical }
}

export function restoreEntry(fs: FsState, entryId: string): FsResult {
  const entry = fs.recycle.find((item) => item.id === entryId)
  if (!entry) {
    return fail(fs, 'The recycle bin entry no longer exists.')
  }
  if (getNode(fs, entry.rootPath)) {
    return fail(fs, 'Cannot restore: a file with that name already exists.')
  }
  let next: FsState = { ...fs, recycle: fs.recycle.filter((item) => item.id !== entryId) }
  // Recreate missing parent folders (bypassing protection: restore is a system op).
  const missingParents: string[] = []
  let cursor = parentPath(entry.rootPath)
  while (!/^[A-Z]:\\$/.test(cursor) && !getNode(next, cursor)) {
    missingParents.unshift(cursor)
    cursor = parentPath(cursor)
  }
  if (!getNode(next, cursor)) {
    return fail(fs, 'Cannot restore: the original drive no longer exists.')
  }
  for (const parent of missingParents) {
    const folder: FsNode = {
      path: parent,
      name: baseName(parent),
      kind: 'folder',
      icon: 'folder',
      fileType: 'File Folder',
      size: 0,
      modified: nowStamp(),
      children: [],
    }
    next = internalInsertNode(next, folder)
  }
  // Reinsert the whole subtree.
  for (const node of Object.values(entry.nodes)) {
    next = { ...next, nodes: { ...next.nodes, [node.path]: node } }
  }
  next = attachChild(next, parentPath(entry.rootPath), entry.rootPath)
  return { fs: next, error: null, createdPath: entry.rootPath }
}

export function emptyRecycleBin(fs: FsState): FsState {
  if (!fs.recycle.length) {
    return fs
  }
  return { ...fs, recycle: [] }
}

// ---------------------------------------------------------------------------
// File associations
// ---------------------------------------------------------------------------

const TEXT_EXTENSIONS = new Set(['txt', 'ini', 'log', 'inf', 'bat', 'md'])
const DOCUMENT_EXTENSIONS = new Set(['doc', 'docx', 'rtf'])
const PDF_EXTENSIONS = new Set(['pdf'])
const IMAGE_EXTENSIONS = new Set(['bmp', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg'])
const AUDIO_EXTENSIONS = new Set(['wav', 'mp3', 'mid'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'avi', 'webm', 'mov', 'mkv', 'ogg'])
const WEB_EXTENSIONS = new Set(['url', 'htm', 'html'])

export function openTargetFor(node: FsNode): { appId: AppId; payload: WindowPayload } | null {
  if (node.appId) {
    return { appId: node.appId, payload: node.appPayload ?? {} }
  }
  if (node.kind === 'folder') {
    return { appId: 'explorer', payload: { path: node.path } }
  }
  const ext = extensionOf(node.name)
  if (TEXT_EXTENSIONS.has(ext)) {
    return { appId: 'notepad', payload: { filePath: node.path } }
  }
  if (DOCUMENT_EXTENSIONS.has(ext)) {
    return { appId: 'wordpad', payload: { filePath: node.path } }
  }
  if (PDF_EXTENSIONS.has(ext)) {
    return { appId: 'pdfViewer', payload: { filePath: node.path } }
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    return { appId: 'imageViewer', payload: { filePath: node.path } }
  }
  if (AUDIO_EXTENSIONS.has(ext)) {
    return { appId: 'mediaPlayer', payload: { filePath: node.path } }
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    return { appId: 'videoPlayer', payload: { filePath: node.path } }
  }
  if (WEB_EXTENSIONS.has(ext)) {
    return { appId: 'internetExplorer', payload: { url: node.content ?? 'about:home' } }
  }
  return null
}

export function iconForFileName(name: string): IconKey {
  const ext = extensionOf(name)
  if (ext === 'bat') return 'batchFile'
  if (PDF_EXTENSIONS.has(ext)) return 'html'
  if (DOCUMENT_EXTENSIONS.has(ext)) return 'wordpad'
  if (TEXT_EXTENSIONS.has(ext)) return 'textFile'
  if (ext === 'bmp') return 'paint'
  if (IMAGE_EXTENSIONS.has(ext)) return 'imageFile'
  if (ext === 'wav' || ext === 'mp3' || ext === 'mid') return 'audioFile'
  if (VIDEO_EXTENSIONS.has(ext)) return 'videoFile'
  if (ext === 'url') return 'urlFile'
  if (ext === 'htm' || ext === 'html') return 'html'
  if (ext === 'exe' || ext === 'com') return 'execFile'
  if (ext === 'dll') return 'dllFile'
  if (['drv', 'sys', 'vxd', '386'].includes(ext)) return 'driverFile'
  if (ext === 'cpl') return 'cplFile'
  if (ext === 'reg') return 'regFile'
  if (ext === 'fon' || ext === 'ttf') return 'fontFile'
  if (['ini', 'inf', 'dat', 'tmp', 'prv', 'pwl'].includes(ext)) return 'iniFile'
  return 'windowsFile'
}

export function fileTypeForName(name: string): string {
  const ext = extensionOf(name)
  switch (ext) {
    case 'txt':
    case 'log':
    case 'md':
      return 'Text Document'
    case 'ini':
      return 'Configuration Settings'
    case 'inf':
      return 'Setup Information'
    case 'bat':
      return 'MS-DOS Batch File'
    case 'doc':
    case 'docx':
      return 'Microsoft Word Document'
    case 'rtf':
      return 'Rich Text Format'
    case 'pdf':
      return 'PDF Document'
    case 'bmp':
      return 'Bitmap Image'
    case 'png':
      return 'PNG Image'
    case 'jpg':
    case 'jpeg':
      return 'JPEG Image'
    case 'gif':
      return 'GIF Image'
    case 'webp':
      return 'WebP Image'
    case 'avif':
      return 'AVIF Image'
    case 'svg':
      return 'SVG Image'
    case 'wav':
      return 'Wave Sound'
    case 'mp3':
      return 'MP3 Audio'
    case 'mid':
      return 'MIDI Sequence'
    case 'mp4':
    case 'avi':
    case 'webm':
    case 'mov':
    case 'mkv':
      return 'Video Clip'
    case 'ogg':
      return 'Media File'
    case 'url':
      return 'Internet Shortcut'
    case 'htm':
    case 'html':
      return 'HTML Document'
    case 'exe':
    case 'com':
      return 'Application'
    case 'dll':
      return 'Application Extension'
    case 'vxd':
      return 'Virtual Device Driver'
    case 'drv':
    case 'sys':
      return 'System File'
    case 'dat':
    case 'reg':
      return 'Registry Data'
    case 'fon':
      return 'Font File'
    case 'cpl':
      return 'Control Panel Extension'
    case 'lnk':
      return 'Shortcut'
    case 'tmp':
    case 'prv':
      return 'Temporary File'
    case '':
      return 'File'
    default:
      return `${ext.toUpperCase()} File`
  }
}
