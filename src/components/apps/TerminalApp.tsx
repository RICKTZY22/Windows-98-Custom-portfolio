import './TerminalApp.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppProps, CrashState } from '../../types'
import { useOs } from '../../os/useOs'
import { baseName, normalizePath, nowStamp } from '../../os/filesystem'
import { autoCompletePath, executeCommand, type CommandEffect } from '../../os/commands'
import { osCreditName, osProductName, osCreditYear } from '../../data/system'

const banner = [osProductName, `(C)Copyright ${osCreditName} ${osCreditYear}`, '']

function crashFor(path: string): CrashState {
  return {
    title: 'Windows protection error',
    message: 'A required system component has been deleted from Windows.',
    detail: `While initializing device ${baseName(path).toUpperCase()}: ${path} is missing or damaged.`,
    stopCode: '0E : 0028 : C0011E36',
    crashedAt: nowStamp(),
  }
}

export function TerminalApp({ windowId, payload }: AppProps) {
  const { state, openApp, closeWindow, fsOps, networkOps, restart, crashSystem } = useOs()
  const [cwd, setCwd] = useState(() => normalizePath(payload?.path ?? 'C:\\'))
  const [lines, setLines] = useState<string[]>(banner)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timersRef = useRef<number[]>([])

  const dosOnly = state.phase === 'dosOnly'
  const prompt = useMemo(() => `${cwd}>`, [cwd])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  function append(nextLines: string[]) {
    setLines((current) => [...current, ...nextLines])
  }

  function applyEffects(effects: CommandEffect[] | undefined) {
    effects?.forEach((effect) => {
      switch (effect.type) {
        case 'openApp':
          openApp(effect.appId, effect.payload)
          break
        case 'setFs':
          fsOps.replaceFs(effect.fs)
          break
        case 'crash':
          crashSystem(crashFor(effect.criticalPath))
          break
        case 'restart':
          restart(effect.target, { bootProfile: 'warm' })
          break
        case 'networkPing':
          networkOps.recordTraffic(effect.sent, effect.received)
          break
        case 'setNetwork':
          networkOps.applyConfig(effect.network)
          break
        case 'exitWindow':
          if (dosOnly) {
            restart('bootMenu')
          } else {
            closeWindow(windowId)
          }
          break
      }
    })
  }

  function runCommand(command: string) {
    const shownPrompt = `${prompt}${command}`
    const output = executeCommand(command, {
      cwd,
      fs: state.fs,
      network: state.network,
      bootMode: state.bootMode,
      dosOnly,
    })

    if (output.clear) {
      setLines([])
    } else {
      append([shownPrompt, ...output.lines])
    }

    if (output.newCwd) {
      setCwd(output.newCwd)
    }
    applyEffects(output.effects)

    let totalDelay = 0
    output.stream?.forEach((chunk) => {
      totalDelay += chunk.delayMs
      const timer = window.setTimeout(() => {
        append(chunk.lines)
        applyEffects(chunk.effects)
      }, totalDelay)
      timersRef.current.push(timer)
    })
  }

  function submit() {
    runCommand(input)
    if (input.trim()) {
      setHistory((current) => [...current, input])
    }
    setHistoryIndex(null)
    setInput('')
  }

  return (
    <div className={`terminal-app ${dosOnly ? 'dos-only-terminal' : ''}`} onClick={() => inputRef.current?.focus()}>
      <div className="terminal-output">
        {lines.map((line, index) => (
          <div key={`${index}-${line}`}>{line || '\u00a0'}</div>
        ))}
        <form
          className="terminal-input-line"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <span>{prompt}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1)
                if (nextIndex >= 0) {
                  setHistoryIndex(nextIndex)
                  setInput(history[nextIndex])
                }
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                if (historyIndex === null) return
                const nextIndex = historyIndex + 1
                if (nextIndex >= history.length) {
                  setHistoryIndex(null)
                  setInput('')
                } else {
                  setHistoryIndex(nextIndex)
                  setInput(history[nextIndex])
                }
              }
              if (event.key === 'Tab') {
                event.preventDefault()
                const completed = autoCompletePath(input, {
                  cwd,
                  fs: state.fs,
                  network: state.network,
                  bootMode: state.bootMode,
                  dosOnly,
                })
                if (completed) setInput(completed)
              }
            }}
            autoFocus
          />
        </form>
      </div>
    </div>
  )
}
