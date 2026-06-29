// Single source of truth that classifies every seeded system file by ROLE, so
// "what breaks when this file is gone" is answered in one place — used by app
// launch errors, the print/spooler feature, the file Properties dialog, and the
// recovery/reinstall messaging. Roles are DERIVED from the existing
// REQUIRED_SYSTEM_FILES, driverFileMap and per-app systemDependencies rather than
// re-listing every file; only features that aren't otherwise expressed (printing)
// and the explicit "minimal / no loss" set are declared here.
import type { AppId, DriverType, FsState, MessageBoxRequest } from '../types'
import { REQUIRED_SYSTEM_FILES, baseName, normalizePath } from './filesystem'
import { appDefinitions } from '../data/apps'
import { driverDeviceLabels, driverFileMap, ERR_SYSTEM_FILE_MISSING } from './systemHealth'

const SYSTEM32 = 'C:\\Windows\\System32'

export type SystemFileRole =
  | { kind: 'critical' }
  | { kind: 'app'; appId: AppId }
  | { kind: 'feature'; feature: string }
  | { kind: 'driver'; driver: DriverType }
  | { kind: 'minimal' }

// Feature → the simulated files that power it. Today only printing is gated this
// way (the spooler service + a generic printer driver). Add entries here to gate
// more features without touching call sites.
export const FEATURE_FILES: Record<string, string[]> = {
  Printing: [
    'C:\\Windows\\System32\\Spool\\spoolss.dll',
    'C:\\Windows\\System32\\Drivers\\printer.drv',
  ],
}

/** True when System32 is gone entirely — recovery can no longer self-heal. */
export function isSystem32Wiped(fs: FsState): boolean {
  if (!fs.nodes[normalizePath(SYSTEM32)]) return true
  return REQUIRED_SYSTEM_FILES.every((path) => !fs.nodes[normalizePath(path)])
}

/** Apps whose systemDependencies list this exact file. */
export function appsNeedingFile(path: string): AppId[] {
  const key = normalizePath(path)
  return Object.values(appDefinitions)
    .filter((def) => (def.systemDependencies ?? []).some((dep) => normalizePath(dep) === key))
    .map((def) => def.id)
}

function driverForFile(path: string): DriverType | null {
  const key = normalizePath(path)
  for (const type of Object.keys(driverFileMap) as DriverType[]) {
    if (driverFileMap[type].some((file) => normalizePath(file) === key)) return type
  }
  return null
}

function featureForFile(path: string): string | null {
  const key = normalizePath(path)
  for (const [feature, files] of Object.entries(FEATURE_FILES)) {
    if (files.some((file) => normalizePath(file) === key)) return feature
  }
  return null
}

// Any system file not claimed as critical / driver / feature / app dependency is
// "minimal" — deleting it causes no functional loss (fonts, 16-bit thunks, temp,
// media, registry hives, etc. all fall through to here).
export function isMinimalSystemFile(path: string): boolean {
  return systemFileRole(path).kind === 'minimal'
}

export function systemFileRole(path: string): SystemFileRole {
  const key = normalizePath(path)
  if (REQUIRED_SYSTEM_FILES.some((req) => normalizePath(req) === key)) return { kind: 'critical' }
  const driver = driverForFile(key)
  if (driver) return { kind: 'driver', driver }
  const feature = featureForFile(key)
  if (feature) return { kind: 'feature', feature }
  const apps = appsNeedingFile(key)
  if (apps.length) return { kind: 'app', appId: apps[0] }
  return { kind: 'minimal' }
}

function appLabel(appId: AppId): string {
  return appDefinitions[appId]?.title ?? appId
}

/** Human description of a system file's role — used in Properties and errors. */
export function describeSystemFile(path: string): string {
  const role = systemFileRole(path)
  switch (role.kind) {
    case 'critical':
      return 'Boot-critical: Windows cannot start without this file.'
    case 'driver':
      return `Required by the ${driverDeviceLabels[role.driver]} driver.`
    case 'feature':
      return `Required by: ${role.feature}.`
    case 'app': {
      const apps = appsNeedingFile(path)
      return `Required by: ${apps.map(appLabel).join(', ')}.`
    }
    case 'minimal':
      return 'Minimal — no portfolio OS feature depends on this file.'
  }
}

export function systemFileDeletionConsequence(path: string): string {
  const role = systemFileRole(path)
  switch (role.kind) {
    case 'critical':
      return 'Boot-critical. Normal boot can fail or crash; multiple missing critical files can also break Safe Mode until Recovery or reinstall restores them.'
    case 'driver': {
      switch (role.driver) {
        case 'network':
          return 'Network features go offline: Network Neighborhood, Internet Explorer networking, PING, IPCONFIG, DHCP, and LAN status stop working.'
        case 'audio':
          return 'Sound features stop: startup sound, Media Player audio, Sound Recorder, volume controls, and sound schemes are disabled.'
        case 'video':
          return 'Video drivers use a counter: 1 missing shows a VGA warning, 2 missing disable visual/media apps, 3 missing add display glitches, and 4 missing trigger a simulated boot failure until Recovery restores them.'
        case 'input':
          return 'Device Manager shows an input-driver warning only. Real browser keyboard and mouse input are intentionally kept usable.'
        case 'storage':
          return 'Storage warnings appear, but the virtual drive remains usable so the user is not trapped.'
      }
      return 'The matching simulated device category becomes unavailable until the driver is restored.'
    }
    case 'feature':
      return `${role.feature} becomes unavailable until the missing simulated system file is restored.`
    case 'app': {
      const apps = appsNeedingFile(path).map(appLabel)
      return `${apps.join(', ')} ${apps.length === 1 ? 'fails' : 'fail'} to open or shows a missing-file error.`
    }
    case 'minimal':
      return 'No current portfolio OS feature depends on this file. Deleting it is logged/restorable but has no functional loss.'
  }
}

// ----- feature availability (printing) -----
export function missingFeatureFiles(fs: FsState, feature: string): string[] {
  return (FEATURE_FILES[feature] ?? []).filter((path) => !fs.nodes[normalizePath(path)])
}

export function featureAvailable(fs: FsState, feature: string): boolean {
  return missingFeatureFiles(fs, feature).length === 0
}

// ----- error messaging -----
// The remedy text branches on whether System32 is still recoverable: partial
// damage points at Recovery Mode / SFC, a full wipe points at the manual SETUP.
function remedy(fs: FsState): { detail: string; hint: string } {
  if (isSystem32Wiped(fs)) {
    return {
      detail:
        'System32 has been removed, so Recovery Mode can no longer restore it. Restart, press F8, choose Command prompt only, then run SETUP to reinstall Windows.',
      hint: 'Boot Command prompt only and run SETUP to reinstall Windows.',
    }
  }
  return {
    detail:
      'Open BIOS Setup > Recovery Mode, or run SFC /SCANNOW, to restore it from the protected cache.',
    hint: 'Use Recovery Mode or SFC /SCANNOW to restore missing protected files.',
  }
}

export function systemFileFailureBox(
  fs: FsState,
  title: string,
  missingPath: string,
): Omit<MessageBoxRequest, 'id'> {
  const r = remedy(fs)
  return {
    title,
    message: `Windows cannot run ${title} because ${baseName(missingPath)} is missing.`,
    detail: `${describeSystemFile(missingPath)} ${r.detail}`,
    icon: 'error',
    buttons: ['ok'],
    errorCode: ERR_SYSTEM_FILE_MISSING,
    recoveryHint: r.hint,
  }
}

/** Print-feature error: spooler/driver missing vs present-but-no-printer. */
export function printOutcomeBox(fs: FsState, appTitle: string): Omit<MessageBoxRequest, 'id'> {
  const missing = missingFeatureFiles(fs, 'Printing')
  if (missing.length) {
    return {
      title: `${appTitle} - Print`,
      message: 'The print spooler service is not running.',
      detail: `${missing.map(baseName).join(', ')} is missing, so documents cannot be queued. ${remedy(fs).hint}`,
      icon: 'error',
      buttons: ['ok'],
      errorCode: ERR_SYSTEM_FILE_MISSING,
    }
  }
  return {
    title: `${appTitle} - Print`,
    message: 'Printing to file (PRN) in the portfolio OS.',
    detail:
      'No physical printer is installed, so the spooler wrote the job to a simulated PRN file. Nothing left this browser tab.',
    icon: 'info',
    buttons: ['ok'],
  }
}
