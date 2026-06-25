import './DefragApp.css'
import { useEffect, useRef, useState } from 'react'
import { win98Icons } from '../../data/icons'
import { machineProfile } from '../../data/systemProfile'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'

// A harmless GUI Disk Defragmenter (defrag.exe). It builds a scattered cluster map
// over the simulated drive, then animates a read/write head consolidating it left
// to right. Nothing on a real disk is read or moved.
type DefragPhase = 'idle' | 'analyzing' | 'defragging' | 'complete' | 'stopped'
type BlockType = 'used' | 'system' | 'free' | 'fragmented'

const TOTAL_BLOCKS = 300
const ANALYZE_MS = 1_400
const DEFRAG_MS = 10_000
const TICK_MS = 120

function buildLayout(): BlockType[] {
  return Array.from({ length: TOTAL_BLOCKS }, () => {
    const r = Math.random()
    if (r < 0.5) return 'used'
    if (r < 0.6) return 'system'
    if (r < 0.74) return 'fragmented'
    return 'free'
  })
}

export function DefragApp({ windowId }: AppProps) {
  const { playSound, setWindowTitle } = useOs()
  const [phase, setPhase] = useState<DefragPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [layout, setLayout] = useState<BlockType[]>(buildLayout)
  const startedAtRef = useRef(0)

  useEffect(() => {
    setWindowTitle(windowId, phase === 'defragging' ? 'Disk Defragmenter - Defragmenting (C:)' : 'Disk Defragmenter')
  }, [phase, setWindowTitle, windowId])

  useEffect(() => {
    if (phase !== 'analyzing') return
    const timer = window.setTimeout(() => {
      startedAtRef.current = Date.now()
      setPhase('defragging')
    }, ANALYZE_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'defragging') return
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current
      const pct = Math.min(100, Math.floor((elapsed / DEFRAG_MS) * 100))
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

  function startDefrag() {
    setLayout(buildLayout())
    setProgress(0)
    setPhase('analyzing')
    playSound('launch')
  }

  function stopDefrag() {
    setPhase('stopped')
    playSound('restore')
  }

  const head =
    phase === 'defragging'
      ? Math.floor((progress / 100) * TOTAL_BLOCKS)
      : phase === 'complete'
        ? TOTAL_BLOCKS
        : -1
  const usedCount = layout.filter((type) => type !== 'free').length

  function cellClass(type: BlockType, index: number): string {
    if (phase === 'complete') return index < usedCount ? 'optimized' : 'free'
    if (phase === 'defragging') {
      if (index < head) return 'optimized'
      if (index === head) return 'writing'
      return type
    }
    return type
  }

  const statusLabel =
    phase === 'analyzing'
      ? 'Analyzing drive (C:) ...'
      : phase === 'defragging'
        ? `Defragmenting drive (C:) ... ${progress}% complete`
        : phase === 'complete'
          ? 'Defragmentation of drive (C:) is complete.'
          : phase === 'stopped'
            ? 'Stopped.'
            : 'Ready to defragment drive (C:).'

  const running = phase === 'analyzing' || phase === 'defragging'

  return (
    <div className="app-content defrag-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>View</li>
        <li>Help</li>
      </ul>

      <div className="defrag-banner">
        <img src={win98Icons.hardDrive} alt="" />
        <div>
          <h2>Disk Defragmenter</h2>
          <p>Reorganizes simulated clusters on (C:) {machineProfile.diskModel}. No real disk is changed.</p>
        </div>
      </div>

      <div className="sunken-panel defrag-grid-shell">
        <div className="defrag-grid" aria-label={`Cluster map ${progress}% defragmented`}>
          {layout.map((type, index) => (
            <span key={index} className={`defrag-cell ${cellClass(type, index)}`} />
          ))}
        </div>
      </div>

      <ul className="defrag-legend">
        <li><span className="defrag-cell optimized" /> Used / optimized</li>
        <li><span className="defrag-cell system" /> System files</li>
        <li><span className="defrag-cell fragmented" /> Fragmented</li>
        <li><span className="defrag-cell free" /> Free space</li>
        <li><span className="defrag-cell writing" /> Reading/writing</li>
      </ul>

      <div className="defrag-progress" aria-label={`${progress}% complete`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="defrag-status">{statusLabel}</p>

      <div className="button-row run-buttons defrag-actions">
        <button type="button" className="default" onClick={startDefrag} disabled={running}>
          Defragment
        </button>
        <button type="button" onClick={stopDefrag} disabled={!running}>
          Stop
        </button>
      </div>

      <div className="status-bar">
        <p className="status-bar-field">{statusLabel}</p>
        <p className="status-bar-field">Real clusters moved: 0</p>
      </div>
    </div>
  )
}
