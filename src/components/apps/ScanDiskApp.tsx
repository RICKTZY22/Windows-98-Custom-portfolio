import './ScanDiskApp.css'
import { useEffect, useRef, useState } from 'react'
import { win98Icons } from '../../data/icons'
import { machineProfile } from '../../data/systemProfile'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'

// A faithful-but-harmless GUI ScanDisk (scandskw.exe). It animates a surface-scan
// over the simulated drive only - no real files are read or changed, and it always
// reports a clean disk. The block grid is the classic "surface scan" visual.
type ScanPhase = 'idle' | 'scanning' | 'complete' | 'stopped'
type TestType = 'standard' | 'thorough'

const SCAN_DURATION_MS = 9_000
const TICK_MS = 120
const TOTAL_BLOCKS = 300

const standardStages = [
  'Checking folders and files ...',
  'Checking the file allocation table ...',
  'Checking the directory tree structure ...',
]

const thoroughStages = [
  ...standardStages,
  'Scanning drive surface for physical errors ...',
]

export function ScanDiskApp({ windowId }: AppProps) {
  const { playSound, setWindowTitle } = useOs()
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [testType, setTestType] = useState<TestType>('thorough')
  const [autoFix, setAutoFix] = useState(true)
  const [progress, setProgress] = useState(0)
  const startedAtRef = useRef(0)

  const stages = testType === 'thorough' ? thoroughStages : standardStages
  const stageIndex = Math.min(stages.length - 1, Math.floor((progress / 100) * stages.length))
  const currentStage =
    phase === 'scanning' ? stages[stageIndex] : phase === 'complete' ? 'Scan complete.' : 'Ready.'
  const filledBlocks =
    phase === 'complete' ? TOTAL_BLOCKS : Math.floor((progress / 100) * TOTAL_BLOCKS)
  const showSurface = testType === 'thorough'

  useEffect(() => {
    setWindowTitle(windowId, phase === 'scanning' ? 'ScanDisk - Checking drive (C:)' : 'ScanDisk')
  }, [phase, setWindowTitle, windowId])

  useEffect(() => {
    if (phase !== 'scanning') return
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current
      const pct = Math.min(100, Math.floor((elapsed / SCAN_DURATION_MS) * 100))
      setProgress(pct)
      if (pct >= 100) {
        window.clearInterval(timer)
        setPhase('complete')
        setProgress(100)
        playSound('ding')
      }
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [phase, playSound])

  function startScan() {
    startedAtRef.current = Date.now()
    setProgress(0)
    setPhase('scanning')
    playSound('launch')
  }

  function stopScan() {
    setPhase('stopped')
    playSound('restore')
  }

  const statusLabel =
    phase === 'scanning'
      ? 'Scanning'
      : phase === 'complete'
        ? 'Complete'
        : phase === 'stopped'
          ? 'Stopped'
          : 'Ready'

  return (
    <div className="app-content scandisk-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Options</li>
        <li>Help</li>
      </ul>

      <div className="scandisk-banner">
        <img src={win98Icons.hardDrive} alt="" />
        <div>
          <h2>ScanDisk</h2>
          <p>Checks the simulated drive for file system and surface errors. No real files are touched.</p>
        </div>
      </div>

      <fieldset className="scandisk-drive">
        <legend>Select the drive(s) you want to check for errors:</legend>
        <div className="sunken-panel scandisk-drive-list">
          <div className="scandisk-drive-row selected">
            <img src={win98Icons.hardDrive} alt="" />
            <span>(C:) {machineProfile.diskModel}</span>
          </div>
        </div>
      </fieldset>

      <fieldset className="scandisk-test">
        <legend>Type of test</legend>
        <label>
          <input
            type="radio"
            name="scandisk-test"
            checked={testType === 'standard'}
            disabled={phase === 'scanning'}
            onChange={() => setTestType('standard')}
          />
          <span>
            <strong>Standard</strong> (checks files and folders for errors)
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="scandisk-test"
            checked={testType === 'thorough'}
            disabled={phase === 'scanning'}
            onChange={() => setTestType('thorough')}
          />
          <span>
            <strong>Thorough</strong> (also scans the disk surface for errors)
          </span>
        </label>
        <label className="scandisk-autofix">
          <input
            type="checkbox"
            checked={autoFix}
            disabled={phase === 'scanning'}
            onChange={(event) => setAutoFix(event.target.checked)}
          />
          <span>Automatically fix errors</span>
        </label>
      </fieldset>

      {showSurface && (
        <div className="scandisk-surface" aria-label={`Surface scan ${progress}% complete`}>
          <div className="scandisk-grid">
            {Array.from({ length: TOTAL_BLOCKS }, (_, index) => {
              const status =
                index < filledBlocks ? 'scanned' : index === filledBlocks && phase === 'scanning' ? 'current' : 'pending'
              return <span key={index} className={`scandisk-cell ${status}`} />
            })}
          </div>
          <ul className="scandisk-legend">
            <li><span className="scandisk-cell scanned" /> Scanned cluster</li>
            <li><span className="scandisk-cell pending" /> Unscanned cluster</li>
            <li><span className="scandisk-cell bad" /> Bad cluster</li>
          </ul>
        </div>
      )}

      <fieldset className="scandisk-progress-box">
        <legend>{phase === 'complete' ? 'Results' : 'Progress'}</legend>
        <p className="scandisk-stage">{currentStage}</p>
        <div className="scandisk-progress" aria-label={`${progress}% complete`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="scandisk-progress-label">{progress}% complete</p>
        {phase === 'complete' && (
          <div className="scandisk-results">
            <p>ScanDisk did not find any errors on this drive.</p>
            <ul>
              <li>File system: FAT16</li>
              <li>{machineProfile.diskSize} total disk space</li>
              <li>0 bytes in bad sectors</li>
              <li>0 lost allocation units</li>
            </ul>
          </div>
        )}
      </fieldset>

      <div className="button-row run-buttons scandisk-actions">
        <button type="button" className="default" onClick={startScan} disabled={phase === 'scanning'}>
          Start
        </button>
        <button type="button" onClick={stopScan} disabled={phase !== 'scanning'}>
          Stop
        </button>
      </div>

      <div className="status-bar">
        <p className="status-bar-field">Status: {statusLabel}</p>
        <p className="status-bar-field">Drive (C:) | Real files changed: 0</p>
      </div>
    </div>
  )
}
