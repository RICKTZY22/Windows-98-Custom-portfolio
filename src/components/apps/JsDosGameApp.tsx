import { useCallback, useEffect, useRef } from 'react'
import type { AppProps } from '../../types'
import './JsDosGameApp.css'

declare global {
  interface Window {
    Dos?: (
      element: HTMLElement,
      opts: {
        url?: string
        pathPrefix?: string
        autoStart?: boolean
        workerThread?: boolean
        kiosk?: boolean
        onEvent?: (eventName: string, payload?: unknown) => void
        [key: string]: unknown
      },
    ) => JsDosInstance
  }
}

type JsDosCommandInterface = {
  sendKeyEvent: (keyCode: number, pressed: boolean) => void
}

type JsDosInstance = {
  stop: () => Promise<void>
}

const dosKey = {
  leftAlt: 342,
  left: 263,
  right: 262,
  down: 264,
  up: 265,
} as const

const modernFpsControls: Record<string, readonly number[]> = {
  KeyW: [dosKey.up],
  KeyS: [dosKey.down],
  KeyA: [dosKey.leftAlt, dosKey.left],
  KeyD: [dosKey.leftAlt, dosKey.right],
  KeyQ: [dosKey.left],
  KeyE: [dosKey.right],
}

let jsDosState: 'idle' | 'loading' | 'ready' = 'idle'
let jsDosPromise: Promise<void> | null = null

function loadJsDos(): Promise<void> {
  if (jsDosState === 'ready') return Promise.resolve()
  if (jsDosState === 'loading') return jsDosPromise!

  jsDosState = 'loading'
  jsDosPromise = new Promise<void>((resolve, reject) => {
    if (!document.querySelector('link[href="/js-dos/js-dos.css"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/js-dos/js-dos.css'
      document.head.appendChild(link)
    }
    const script = document.createElement('script')
    script.src = '/js-dos/js-dos.js'
    script.onload = () => {
      jsDosState = 'ready'
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load js-dos'))
    document.head.appendChild(script)
  })

  return jsDosPromise
}

function isCommandInterface(value: unknown): value is JsDosCommandInterface {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sendKeyEvent' in value &&
    typeof (value as { sendKeyEvent?: unknown }).sendKeyEvent === 'function'
  )
}

export function JsDosGameApp({ payload }: AppProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bundleUrl = payload?.url ?? ''
  const stopRef = useRef<(() => Promise<void>) | null>(null)
  const ciRef = useRef<JsDosCommandInterface | null>(null)
  const pressedPhysicalKeysRef = useRef(new Set<string>())
  const heldVirtualKeysRef = useRef(new Map<number, number>())

  const sendVirtualKey = useCallback((keyCode: number, pressed: boolean) => {
    const ci = ciRef.current
    if (!ci) return

    const currentHoldCount = heldVirtualKeysRef.current.get(keyCode) ?? 0
    if (pressed) {
      if (currentHoldCount === 0) {
        ci.sendKeyEvent(keyCode, true)
      }
      heldVirtualKeysRef.current.set(keyCode, currentHoldCount + 1)
      return
    }

    if (currentHoldCount <= 1) {
      ci.sendKeyEvent(keyCode, false)
      heldVirtualKeysRef.current.delete(keyCode)
    } else {
      heldVirtualKeysRef.current.set(keyCode, currentHoldCount - 1)
    }
  }, [])

  const releasePhysicalKey = useCallback((code: string) => {
    const mapping = modernFpsControls[code]
    if (!mapping || !pressedPhysicalKeysRef.current.delete(code)) return

    for (const keyCode of [...mapping].reverse()) {
      sendVirtualKey(keyCode, false)
    }
  }, [sendVirtualKey])

  const releaseAllControls = useCallback(() => {
    for (const code of [...pressedPhysicalKeysRef.current]) {
      releasePhysicalKey(code)
    }

    const ci = ciRef.current
    if (ci) {
      for (const keyCode of [...heldVirtualKeysRef.current.keys()].reverse()) {
        ci.sendKeyEvent(keyCode, false)
      }
    }
    heldVirtualKeysRef.current.clear()
  }, [releasePhysicalKey])

  useEffect(() => {
    function hasActiveGameWindow() {
      const frame = containerRef.current?.closest('.win-window')
      return frame?.classList.contains('is-active') ?? false
    }

    function handleKeyEvent(event: KeyboardEvent) {
      const mapping = modernFpsControls[event.code]
      const trackedKey = pressedPhysicalKeysRef.current.has(event.code)
      if (!mapping || (!trackedKey && !hasActiveGameWindow())) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      if (event.type === 'keyup') {
        releasePhysicalKey(event.code)
        return
      }

      if (event.repeat || trackedKey || event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      pressedPhysicalKeysRef.current.add(event.code)
      for (const keyCode of mapping) {
        sendVirtualKey(keyCode, true)
      }
    }

    window.addEventListener('keydown', handleKeyEvent, true)
    window.addEventListener('keyup', handleKeyEvent, true)
    window.addEventListener('blur', releaseAllControls)
    document.addEventListener('visibilitychange', releaseAllControls)

    return () => {
      window.removeEventListener('keydown', handleKeyEvent, true)
      window.removeEventListener('keyup', handleKeyEvent, true)
      window.removeEventListener('blur', releaseAllControls)
      document.removeEventListener('visibilitychange', releaseAllControls)
      releaseAllControls()
    }
  }, [releaseAllControls, releasePhysicalKey, sendVirtualKey])

  useEffect(() => {
    if (!containerRef.current || !bundleUrl) return
    let cancelled = false

    loadJsDos()
      .then(() => {
        if (cancelled || !containerRef.current || !window.Dos) return
        const ci = window.Dos(containerRef.current, {
          url: bundleUrl,
          pathPrefix: '/js-dos/emulators/',
          autoStart: true,
          workerThread: false,
          // Hide the js-dos sidebar (save / keyboard / fullscreen / settings)
          // so the game fills the window like a real DOS app.
          kiosk: true,
          onEvent: (eventName, eventPayload) => {
            if (eventName === 'ci-ready' && isCommandInterface(eventPayload)) {
              ciRef.current = eventPayload
            }
          },
        })
        stopRef.current = ci.stop.bind(ci)
      })
      .catch((err: unknown) => {
        console.error('[JsDosGameApp] failed to start:', err)
      })

    return () => {
      cancelled = true
      releaseAllControls()
      ciRef.current = null
      stopRef.current?.()
      stopRef.current = null
    }
  }, [bundleUrl, releaseAllControls])

  return (
    <div className="jsdos-game-wrapper">
      <div ref={containerRef} className="jsdos-game-container" />
      <div className="jsdos-controls-hint" aria-label="Game controls">
        <strong>WASD</strong> move · <strong>Q/E</strong> turn · arrows classic
      </div>
    </div>
  )
}
