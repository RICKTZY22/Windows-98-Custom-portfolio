import { useEffect, useRef, useState } from 'react'
import { osProductName } from '../../data/system'
import { useOs } from '../../os/useOs'

// Shown only when the previous session ended improperly (see wasSessionDirty in
// persistence.ts). Mirrors the Win98 "Windows was not properly shut down" screen:
// a short, skippable ScanDisk sweep that then continues to the desktop. No real
// disk is touched - this only animates over the simulated boot.
const SCAN_DURATION_MS = 8_000
const TICK_MS = 100

const scanStages = [
  'Checking file allocation tables ...',
  'Checking directory structure ...',
  'Checking file and folder fragmentation ...',
  'Verifying free space ...',
]

const BLOCK_COUNT = 40

export function StartupScanScreen() {
  const { completeStartupScan } = useOs()
  const [elapsed, setElapsed] = useState(0)
  const finishedRef = useRef(false)

  useEffect(() => {
    let interval = 0
    function finish() {
      if (finishedRef.current) return
      finishedRef.current = true
      window.clearInterval(interval)
      completeStartupScan()
    }
    const startedAt = Date.now()
    interval = window.setInterval(() => {
      const next = Math.min(SCAN_DURATION_MS, Date.now() - startedAt)
      setElapsed(next)
      if (next >= SCAN_DURATION_MS) {
        finish()
      }
    }, TICK_MS)
    // "Press any key to skip" - a key press or click jumps straight to the desktop.
    window.addEventListener('keydown', finish)
    window.addEventListener('pointerdown', finish)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('keydown', finish)
      window.removeEventListener('pointerdown', finish)
    }
  }, [completeStartupScan])

  const progress = Math.min(100, Math.round((elapsed / SCAN_DURATION_MS) * 100))
  const stageIndex = Math.min(
    scanStages.length - 1,
    Math.floor((elapsed / SCAN_DURATION_MS) * scanStages.length),
  )
  const scannedBlocks = Math.floor((progress / 100) * BLOCK_COUNT)

  return (
    <main className="startup-scan-screen" aria-live="polite">
      <section className="startup-scan-window">
        <div className="startup-scan-window-title">
          <span>Microsoft ScanDisk</span>
          <span>Drive C:</span>
        </div>
        <div className="startup-scan-panel">
          <p className="startup-scan-product">{osProductName}</p>
          <h1 className="startup-scan-title">ScanDisk</h1>
          <p>
            Because Windows was not properly shut down, one or more of your disk drives may have
            errors.
          </p>
          <p>
            ScanDisk is running a browser-only check of the simulated portfolio drive before the
            desktop starts.
          </p>
          <div className="startup-scan-drive-card">
            <div>
              <span>Drive</span>
              <strong>C: Portfolio OS</strong>
            </div>
            <div>
              <span>File system</span>
              <strong>FAT32 simulation</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{progress >= 100 ? 'No errors found' : 'Checking'}</strong>
            </div>
          </div>
          <p className="startup-scan-now">ScanDisk is now checking drive C: for errors.</p>
          <p className="startup-scan-stage">{scanStages[stageIndex]}</p>
          <div className="startup-scan-blocks" aria-hidden="true">
            {Array.from({ length: BLOCK_COUNT }, (_, index) => (
              <i
                key={index}
                className={[
                  index < scannedBlocks ? 'is-scanned' : '',
                  index === scannedBlocks ? 'is-current' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </div>
          <div className="startup-scan-bar" aria-label={`${progress}% complete`}>
            <i style={{ width: `${progress}%` }} />
          </div>
          <p className="startup-scan-percent">{progress}% complete</p>
          <p className="startup-scan-report">
            Report: this educational portfolio OS did not touch the host file system.
          </p>
          <p className="startup-scan-hint">Press any key or click to skip disk checking ...</p>
        </div>
      </section>
    </main>
  )
}
