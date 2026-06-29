import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'

type ClarityFunction = {
  (...args: unknown[]): void
  q?: unknown[][]
}

declare global {
  interface Window {
    clarity?: ClarityFunction
  }
}

const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim()

function installClarity(projectId: string): void {
  if (!projectId || window.clarity || document.querySelector('script[data-portfolio-clarity="true"]')) {
    return
  }

  const clarity: ClarityFunction = (...args) => {
    clarity.q = clarity.q ?? []
    clarity.q.push(args)
  }
  window.clarity = clarity

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`
  script.dataset.portfolioClarity = 'true'
  document.head.appendChild(script)
}

export function AnalyticsScripts() {
  useEffect(() => {
    if (!import.meta.env.PROD || !CLARITY_PROJECT_ID) return
    installClarity(CLARITY_PROJECT_ID)
  }, [])

  return <Analytics />
}
