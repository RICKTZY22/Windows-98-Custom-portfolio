import './TaskManagerApp.css'
import { useEffect, useRef, useState } from 'react'
import { win98Icons } from '../../data/icons'
import { useOs } from '../../os/useOs'

type TabId = 'applications' | 'processes' | 'performance'

type ProcessRow = {
  id: string
  name: string
  pid: number
  memKb: number
  kind: 'system' | 'shell' | 'app'
  windowId?: string
}

function pseudoPid(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9000
  }
  return 100 + hash
}

const systemProcesses: Array<Omit<ProcessRow, 'windowId'>> = [
  { id: 'kernel', name: 'KERNEL32.DLL', pid: 8, memKb: 2148, kind: 'system' },
  { id: 'explorer', name: 'EXPLORER.EXE', pid: 81, memKb: 4212, kind: 'shell' },
  { id: 'systray', name: 'SYSTRAY.EXE', pid: 122, memKb: 488, kind: 'system' },
  { id: 'mmtask', name: 'MMTASK.TSK', pid: 134, memKb: 256, kind: 'system' },
  { id: 'rundll', name: 'RUNDLL32.EXE', pid: 187, memKb: 740, kind: 'system' },
]

const TOTAL_MEM_KB = 65536

export function TaskManagerApp() {
  const { state, closeWindow, focusWindow, openApp, showMessageBox, crashSystem } = useOs()
  const [tab, setTab] = useState<TabId>('applications')
  const [selectedTask, setSelectedTask] = useState<string>()
  const [selectedProcess, setSelectedProcess] = useState<string>()
  const cpuCanvasRef = useRef<HTMLCanvasElement>(null)
  const memCanvasRef = useRef<HTMLCanvasElement>(null)
  const cpuHistoryRef = useRef<number[]>([])
  const memHistoryRef = useRef<number[]>([])
  const windowCountRef = useRef(state.windows.length)
  const [cpuNow, setCpuNow] = useState(6)

  useEffect(() => {
    windowCountRef.current = state.windows.length
  }, [state.windows.length])

  const usedMemKb = 18432 + state.windows.length * 4096
  const memPercent = Math.min(98, Math.round((usedMemKb / TOTAL_MEM_KB) * 100))

  const processes: ProcessRow[] = [
    ...systemProcesses,
    ...state.windows.map((win) => ({
      id: win.instanceId,
      name: `${win.appId.toUpperCase().slice(0, 12)}.EXE`,
      pid: pseudoPid(win.instanceId),
      memKb: 1024 + win.title.length * 96,
      kind: 'app' as const,
      windowId: win.instanceId,
    })),
  ]

  useEffect(() => {
    if (tab !== 'performance') return

    function drawGraph(canvas: HTMLCanvasElement | null, history: number[], color: string) {
      const context = canvas?.getContext('2d')
      if (!canvas || !context) return
      const { width, height } = canvas
      context.fillStyle = '#000'
      context.fillRect(0, 0, width, height)
      context.strokeStyle = '#0b4f0b'
      context.lineWidth = 1
      for (let x = 0; x < width; x += 12) {
        context.beginPath()
        context.moveTo(x + 0.5, 0)
        context.lineTo(x + 0.5, height)
        context.stroke()
      }
      for (let y = 0; y < height; y += 12) {
        context.beginPath()
        context.moveTo(0, y + 0.5)
        context.lineTo(width, y + 0.5)
        context.stroke()
      }
      context.strokeStyle = color
      context.lineWidth = 2
      context.beginPath()
      history.forEach((value, index) => {
        const x = width - (history.length - 1 - index) * 4
        const y = height - (value / 100) * (height - 4) - 2
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.stroke()
    }

    const interval = window.setInterval(() => {
      const base = 4 + windowCountRef.current * 5
      const cpu = Math.min(98, Math.max(2, base + Math.round(Math.random() * 18 - 6)))
      const mem = Math.min(98, Math.round(((18432 + windowCountRef.current * 4096) / TOTAL_MEM_KB) * 100))
      const cpuHistory = cpuHistoryRef.current
      const memHistory = memHistoryRef.current
      cpuHistory.push(cpu)
      memHistory.push(mem)
      if (cpuHistory.length > 80) cpuHistory.shift()
      if (memHistory.length > 80) memHistory.shift()
      setCpuNow(cpu)
      drawGraph(cpuCanvasRef.current, cpuHistory, '#00ff00')
      drawGraph(memCanvasRef.current, memHistory, '#00ffff')
    }, 600)

    return () => window.clearInterval(interval)
  }, [tab])

  function endTask() {
    if (!selectedTask) return
    closeWindow(selectedTask)
    setSelectedTask(undefined)
  }

  function endProcess() {
    const process = processes.find((row) => row.id === selectedProcess)
    if (!process) return
    if (process.kind === 'app' && process.windowId) {
      closeWindow(process.windowId)
      setSelectedProcess(undefined)
      return
    }
    if (process.kind === 'shell') {
      showMessageBox({
        title: 'Task Manager',
        message: 'Ending EXPLORER.EXE will shut down the Windows shell. Continue?',
        icon: 'warning',
        buttons: ['yes', 'no'],
        onResult: (button) => {
          if (button === 'yes') {
            crashSystem({
              title: 'Windows protection error',
              message: 'The Windows shell (EXPLORER.EXE) was terminated by Task Manager.',
              detail: 'The desktop, taskbar, and all running programs can no longer continue.',
              stopCode: '0E : 0157 : BFF9DB61',
              crashedAt: new Date().toLocaleTimeString(),
            })
          }
        },
      })
      return
    }
    showMessageBox({
      title: 'Task Manager',
      message: `Access is denied. '${process.name}' is a protected system process.`,
      icon: 'error',
      buttons: ['ok'],
    })
  }

  return (
    <div className="app-content task-manager-app">
      <div className="tm-tabs" role="tablist">
        {(
          [
            ['applications', 'Applications'],
            ['processes', 'Processes'],
            ['performance', 'Performance'],
          ] as Array<[TabId, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'applications' && (
        <>
          <div className="sunken-panel tm-list" role="listbox" aria-label="Running tasks">
            {state.windows.length === 0 && <p className="tm-empty">No tasks are running.</p>}
            {state.windows.map((win) => (
              <div
                key={win.instanceId}
                role="option"
                aria-selected={selectedTask === win.instanceId}
                tabIndex={0}
                className={`tm-row ${selectedTask === win.instanceId ? 'selected' : ''}`}
                onClick={() => setSelectedTask(win.instanceId)}
                onDoubleClick={() => focusWindow(win.instanceId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') focusWindow(win.instanceId)
                  if (event.key === 'Delete') {
                    closeWindow(win.instanceId)
                    setSelectedTask(undefined)
                  }
                }}
              >
                <img src={win98Icons[win.icon]} alt="" />
                <span className="tm-row-title">{win.title}</span>
                <span className="tm-row-status">{win.minimized ? 'Minimized' : 'Running'}</span>
              </div>
            ))}
          </div>
          <div className="button-row run-buttons">
            <button type="button" onClick={() => openApp('run')}>
              New Task...
            </button>
            <button type="button" disabled={!selectedTask} onClick={() => selectedTask && focusWindow(selectedTask)}>
              Switch To
            </button>
            <button type="button" disabled={!selectedTask} onClick={endTask}>
              End Task
            </button>
          </div>
        </>
      )}

      {tab === 'processes' && (
        <>
          <div className="sunken-panel tm-list tm-process-list" role="listbox" aria-label="Processes">
            <div className="tm-row tm-process-header" aria-hidden="true">
              <span className="tm-row-title">Image Name</span>
              <span>PID</span>
              <span>Mem Usage</span>
            </div>
            {processes.map((process) => (
              <div
                key={process.id}
                role="option"
                aria-selected={selectedProcess === process.id}
                tabIndex={0}
                className={`tm-row tm-process-row ${selectedProcess === process.id ? 'selected' : ''}`}
                onClick={() => setSelectedProcess(process.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Delete') endProcess()
                }}
              >
                <span className="tm-row-title">{process.name}</span>
                <span>{process.pid}</span>
                <span>{process.memKb.toLocaleString()} K</span>
              </div>
            ))}
          </div>
          <div className="button-row run-buttons">
            <button type="button" disabled={!selectedProcess} onClick={endProcess}>
              End Process
            </button>
          </div>
        </>
      )}

      {tab === 'performance' && (
        <div className="tm-performance">
          <fieldset>
            <legend>CPU Usage History</legend>
            <canvas ref={cpuCanvasRef} width={336} height={96} />
          </fieldset>
          <fieldset>
            <legend>Memory Usage History</legend>
            <canvas ref={memCanvasRef} width={336} height={96} />
          </fieldset>
          <div className="tm-perf-stats">
            <p>CPU Usage: {cpuNow}%</p>
            <p>
              Memory: {usedMemKb.toLocaleString()}K / {TOTAL_MEM_KB.toLocaleString()}K ({memPercent}%)
            </p>
            <p>Threads: {12 + state.windows.length * 3} &nbsp; Handles: {180 + state.windows.length * 42}</p>
          </div>
        </div>
      )}

      <div className="status-bar">
        <p className="status-bar-field">Processes: {processes.length}</p>
        <p className="status-bar-field">CPU Usage: {cpuNow}%</p>
        <p className="status-bar-field">Mem Usage: {usedMemKb.toLocaleString()}K / {TOTAL_MEM_KB.toLocaleString()}K</p>
      </div>
    </div>
  )
}
