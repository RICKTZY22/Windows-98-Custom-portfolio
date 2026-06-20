import { useEffect, useRef } from 'react'
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
        [key: string]: unknown
      },
    ) => { stop: () => Promise<void> }
  }
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

export function JsDosGameApp({ payload }: AppProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bundleUrl = payload?.url ?? ''
  const stopRef = useRef<(() => Promise<void>) | null>(null)

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
        })
        stopRef.current = ci.stop.bind(ci)
      })
      .catch((err: unknown) => {
        console.error('[JsDosGameApp] failed to start:', err)
      })

    return () => {
      cancelled = true
      stopRef.current?.()
      stopRef.current = null
    }
  }, [bundleUrl])

  return (
    <div className="jsdos-game-wrapper">
      <div ref={containerRef} className="jsdos-game-container" />
    </div>
  )
}
