import type { FsNode, FsState } from '../types'
import { REQUIRED_SYSTEM_FILES as REQUIRED, createInitialFsState } from '../data/initialFilesystem'
import { isProtectedPath, normalizePath } from './filesystem'

export const REQUIRED_SYSTEM_FILES: string[] = REQUIRED

let cachedInitialFs: FsState | null = null

function initialFs(): FsState {
  if (!cachedInitialFs) {
    cachedInitialFs = createInitialFsState()
  }
  return cachedInitialFs
}

function initialWindowsPaths(): string[] {
  return Object.keys(initialFs().nodes).filter((path) => isProtectedPath(path))
}

/** Initial C:\Windows nodes that are absent from the given filesystem. */
export function missingSystemFiles(fs: FsState): string[] {
  return initialWindowsPaths().filter((path) => !fs.nodes[path])
}

export function isSystemHealthy(fs: FsState): boolean {
  return REQUIRED_SYSTEM_FILES.every((path) => Boolean(fs.nodes[normalizePath(path)]))
}

/**
 * Re-inserts every missing initial C:\Windows node and drops recycle entries
 * that pointed at the now-restored system files.
 */
export function restoreSystemFiles(fs: FsState): { fs: FsState; restored: string[] } {
  const pristine = initialFs()
  const missing = missingSystemFiles(fs)
  if (!missing.length) {
    return { fs, restored: [] }
  }

  const nodes: Record<string, FsNode> = { ...fs.nodes }
  for (const path of missing) {
    const original = pristine.nodes[path]
    if (original) {
      nodes[path] = original
    }
  }

  // Rebuild children lists for every folder in the protected scope so restored
  // entries reappear in their initial order (plus any survivors not in the
  // pristine tree, which normally cannot exist because creates are denied).
  for (const [path, node] of Object.entries(nodes)) {
    if (node.kind !== 'folder') continue
    const pristineNode = pristine.nodes[path]
    if (!pristineNode?.children) continue
    if (!isProtectedPath(path) && path.toLowerCase() !== 'c:\\') continue
    const current = nodes[path].children ?? []
    const fromInitial = pristineNode.children.filter((child) => Boolean(nodes[child]))
    const extras = current.filter((child) => !pristineNode.children?.includes(child) && Boolean(nodes[child]))
    nodes[path] = { ...node, children: [...fromInitial, ...extras] }
  }

  const recycle = fs.recycle.filter((entry) => !isProtectedPath(entry.rootPath))

  return { fs: { ...fs, nodes, recycle }, restored: missing }
}

function restoredFileList(restored: string[]): string[] {
  return restored.filter((path) => initialFs().nodes[path]?.kind !== 'folder')
}

export function scanregLines(restored: string[]): string[] {
  if (!restored.length) {
    return [
      'Windows Registry Checker',
      '',
      'Scanning system registry...',
      'No errors found in the registry.',
      'Windows has already backed up the registry today.',
    ]
  }
  const files = restoredFileList(restored)
  const lines = [
    'Windows Registry Checker',
    '',
    'Restoring registry from backup CAB: rb000.cab',
    ...files.slice(0, 8).map((path) => `  restored ${path}`),
  ]
  if (files.length > 8) {
    lines.push(`  ...and ${files.length - 8} more file(s)`)
  }
  lines.push(
    '',
    `Registry restore complete. ${restored.length} item(s) recovered.`,
    'You must restart your computer for the changes to take effect.',
  )
  return lines
}

export function sfcLines(restored: string[]): string[] {
  if (!restored.length) {
    return [
      'System File Checker',
      '',
      'Verifying the integrity of all protected system files...',
      'Verification 100% complete.',
      'Windows did not find any integrity violations.',
    ]
  }
  const files = restoredFileList(restored)
  const lines = [
    'System File Checker',
    '',
    'Verifying the integrity of all protected system files...',
    ...files.slice(0, 8).map((path) => `  ${path} was missing and has been restored from cache`),
  ]
  if (files.length > 8) {
    lines.push(`  ...and ${files.length - 8} more file(s)`)
  }
  lines.push(
    'Verification 100% complete.',
    '',
    `Windows restored ${restored.length} system item(s).`,
    'You should restart your computer to complete the repair.',
  )
  return lines
}
