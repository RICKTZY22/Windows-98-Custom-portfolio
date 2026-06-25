import { useEffect, useMemo, useState } from 'react'
import { osCreditName, osCreditYear, osProductName } from '../../data/system'
import { bootSequenceLabel } from '../../data/bios'
import { win98Icons } from '../../data/icons'
import { useOs } from '../../os/useOs'

type Stage = 'post' | 'updating' | 'starting' | 'splash'
type BootTiming = {
  totalMs: number
  postMs: number
  updatingMs: number
  startingMs: number
  lineStartMs: number
  lineStepMs: number
}

const MEM_TOTAL_KB = 65_536
const SPLASH_MS = 9_400
const QUICK_SPLASH_MS = 4_200
const UPDATING_MS = 1_900

function createBootTiming(quickPost: boolean, bootProfile: 'cold' | 'warm', updatingSystemSettings: boolean): BootTiming {
  const quick = quickPost || bootProfile === 'warm'
  const postMs = quick ? 3_300 : 8_600
  const startingMs = quick ? 1_100 : 2_000
  const splashMs = quick ? QUICK_SPLASH_MS : SPLASH_MS
  const updatingMs = updatingSystemSettings ? UPDATING_MS : 0
  return {
    totalMs: postMs + updatingMs + startingMs + splashMs,
    postMs,
    updatingMs,
    startingMs,
    lineStartMs: quick ? 550 : 1_900,
    lineStepMs: quick ? 175 : 460,
  }
}

function bootStage(elapsed: number, timing: BootTiming): Stage {
  if (elapsed < timing.postMs) return 'post'
  if (elapsed < timing.postMs + timing.updatingMs) return 'updating'
  if (elapsed < timing.postMs + timing.updatingMs + timing.startingMs) return 'starting'
  return 'splash'
}

function boundedLineCount(elapsed: number, total: number, timing: BootTiming) {
  if (elapsed < timing.lineStartMs) return 0
  return Math.min(total, Math.floor((elapsed - timing.lineStartMs) / timing.lineStepMs) + 1)
}

function BootSignature() {
  return (
    <div className="boot-sequence-signature" aria-label={`${osCreditName} boot signature`}>
      <img src={win98Icons.windowsSmall} alt="" />
      <span>{osCreditName}</span>
    </div>
  )
}

export function BootScreen() {
  const { state, finishBoot, restart, enterBiosSetup } = useOs()

  const [elapsed, setElapsed] = useState(0)
  const timing = useMemo(
    () => createBootTiming(state.bios.quickPost, state.bootProfile, state.bios.resetConfigurationData),
    [state.bios.quickPost, state.bios.resetConfigurationData, state.bootProfile],
  )
  const stage = bootStage(elapsed, timing)

  useEffect(() => {
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      setElapsed(Math.min(timing.totalMs, Date.now() - startedAt))
    }, 100)
    const done = window.setTimeout(() => finishBoot(), timing.totalMs)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(done)
    }
  }, [finishBoot, timing.totalMs])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'F12' || event.key === 'Delete' || event.key.toLowerCase() === 'del') {
        event.preventDefault()
        enterBiosSetup()
        return
      }
      if (event.key === 'F8') {
        event.preventDefault()
        restart('bootMenu', { bootProfile: 'warm' })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enterBiosSetup, restart])

  const memoryKb = Math.min(
    MEM_TOTAL_KB,
    Math.floor((elapsed / (state.bios.quickPost ? 650 : 1_650)) * MEM_TOTAL_KB / 1024) * 1024,
  )
  const memoryLine = `Memory Test       : ${String(memoryKb).padStart(5, ' ')}K ${
    memoryKb >= MEM_TOTAL_KB ? 'OK' : ''
  }`
  const postLines = useMemo(
    () => [
      'Main Processor    : Pentium(R) MMX 266MHz',
      'Floppy Drive A    : 1.44M, 3.5 in.',
      'Primary Master    : VIRTUAL_DISK_98 2.1GB',
      'Primary Slave     : None',
      'Secondary Master  : PORTFOLIO CD-ROM 24X',
      'Secondary Slave   : None',
      `Boot Sequence     : ${bootSequenceLabel(state.bios)}`,
      state.bios.quickPost ? 'Quick POST        : Enabled' : 'Quick POST        : Disabled',
      'PCI devices listing ...',
      'Detecting IDE drives ...  OK',
      'Checking NVRAM     ...  OK',
      'Verifying DMI Pool Data ......',
      'Starting operating system from fixed disk.',
    ],
    [state.bios],
  )
  const visiblePostLines = postLines.slice(0, boundedLineCount(elapsed, postLines.length, timing))
  const postBody = [memoryLine, '', ...visiblePostLines].join('\n')
  const startingText =
    state.bootTarget === 'safe'
      ? 'Starting Windows 98 Safe Mode...'
      : state.bootTarget === 'dos'
        ? 'Starting MS-DOS Mode...'
        : state.bootTarget === 'recovery'
          ? 'Starting Windows 98 Recovery Mode...'
          : 'Starting Windows 98...'
  const splashProgress = Math.max(
    0,
    Math.min(
      1,
      (elapsed - timing.postMs - timing.updatingMs - timing.startingMs) /
        (timing.totalMs - timing.postMs - timing.updatingMs - timing.startingMs),
    ),
  )

  if (stage === 'post') {
    return (
      <main className="boot-screen boot-sequence-screen boot-sequence-post" aria-live="polite">
        <section className="boot-post-panel" aria-label={`${osProductName} boot sequence`}>
          <header className="boot-post-header">
            <div>
              <strong>Award Modular BIOS v4.51PG</strong>
              <span>Copyright (C) 1984-{osCreditYear}, Award Software, Inc.</span>
            </div>
            <b>ENERGY STAR</b>
          </header>

          <p className="boot-post-model">VX Pro+ 430VX PCI/ISA Portfolio System BIOS</p>
          <pre className="boot-post-log">{postBody}<span className="boot-sequence-caret" /></pre>
          <footer className="boot-post-footer">
            <span>F12: BIOS Setup  F8: Startup Menu</span>
            <span>06/22/1998-i430VX-JEM-W98P-00</span>
          </footer>
          <BootSignature />
        </section>
      </main>
    )
  }

  if (stage === 'starting') {
    return (
      <main className="boot-screen boot-sequence-screen boot-sequence-starting" aria-live="polite">
        <p>{startingText}</p>
        <BootSignature />
      </main>
    )
  }

  if (stage === 'updating') {
    return (
      <main className="boot-screen boot-sequence-screen boot-sequence-updating" aria-live="polite">
        <section>
          <p>Updating ESCD ... Success</p>
          <p>Updating system settings ...</p>
          <small>Simulated Plug and Play records are being refreshed inside the portfolio OS.</small>
        </section>
        <BootSignature />
      </main>
    )
  }

  return (
    <main className="boot-screen boot-sequence-screen boot-sequence-splash" aria-live="polite">
      <section className="boot-splash-brand" aria-label={osProductName}>
        <img src={win98Icons.windows} alt="" />
        <div>
          <span>Microsoft</span>
          <strong>
            Windows <em>98</em>
          </strong>
          <small>Portfolio Edition</small>
        </div>
      </section>
      <div className="boot-splash-progress" aria-label={`${Math.round(splashProgress * 100)}% loaded`}>
        <i />
      </div>
      <p className="boot-splash-hint">F12 opens BIOS setup</p>
      <BootSignature />
    </main>
  )
}
