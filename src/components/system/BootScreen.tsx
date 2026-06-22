import { useEffect, useMemo, useState } from 'react'
import { osCreditName, osCreditYear, osProductName } from '../../data/system'
import { bootSequenceLabel } from '../../data/bios'
import { win98Icons } from '../../data/icons'
import { useOs } from '../../os/useOs'

type Stage = 'post' | 'starting' | 'splash'

const BOOT_TOTAL_MS = 20_000
const POST_MS = 8_600
const STARTING_MS = 2_000
const MEM_TOTAL_KB = 65_536
const POST_LINE_START_MS = 1_900
const POST_LINE_STEP_MS = 460

function bootStage(elapsed: number): Stage {
  if (elapsed < POST_MS) return 'post'
  if (elapsed < POST_MS + STARTING_MS) return 'starting'
  return 'splash'
}

function boundedLineCount(elapsed: number, total: number) {
  if (elapsed < POST_LINE_START_MS) return 0
  return Math.min(total, Math.floor((elapsed - POST_LINE_START_MS) / POST_LINE_STEP_MS) + 1)
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
  const stage = bootStage(elapsed)

  useEffect(() => {
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      setElapsed(Math.min(BOOT_TOTAL_MS, Date.now() - startedAt))
    }, 100)
    const done = window.setTimeout(() => finishBoot(), BOOT_TOTAL_MS)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(done)
    }
  }, [finishBoot])

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

  const memoryKb = Math.min(MEM_TOTAL_KB, Math.floor((elapsed / 1_650) * MEM_TOTAL_KB / 1024) * 1024)
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
      'PCI devices listing ...',
      'Detecting IDE drives ...  OK',
      'Checking NVRAM     ...  OK',
      'Verifying DMI Pool Data ......',
      'Starting operating system from fixed disk.',
    ],
    [state.bios],
  )
  const visiblePostLines = postLines.slice(0, boundedLineCount(elapsed, postLines.length))
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
    Math.min(1, (elapsed - POST_MS - STARTING_MS) / (BOOT_TOTAL_MS - POST_MS - STARTING_MS)),
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
