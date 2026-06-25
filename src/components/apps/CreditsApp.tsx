import { Fragment, useEffect, useRef, useState } from 'react'
import './CreditsApp.css'
import { portfolioData } from '../../data/portfolioData'
import { win98Icons } from '../../data/icons'

const BOOT_TEXT = [
  'MENDOZA-BIOS (C) 1998              v98.1',
  '640K base memory ............... OK',
  'Detecting credits .............. OK',
  'Loading talent ................. OK',
  'Mounting toolchain ............. OK',
  'Rendering the star ............. OK',
].join('\n')

const TYPE_INTERVAL_MS = 16

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

type StackItem = { n: string; d: string }

const LOGOS = [
  {
    id: 'anthropic',
    role: 'AI CODING ASSISTANT',
    co: 'Anthropic / Claude Code',
    href: 'https://www.anthropic.com/',
    d: 'Claude Fable 5, Opus 4.8 & Sonnet 4.6 across refactoring, planning, assistance & edits throughout this build.',
  },
  {
    id: 'openai',
    role: 'AI CODING PARTNER',
    co: 'OpenAI',
    href: 'https://openai.com/',
    d: 'GPT 5.3 (planning), 5.4 (CSS split), 5.5 (polish) & Codex (implementation support). Marks belong to OpenAI.',
  },
  {
    id: 'google',
    role: 'AI TEST GENERATION',
    co: 'Google / Gemini',
    href: 'https://gemini.google.com/',
    d: 'Gemini 3.5 Pro authored the automated test scripts for portfolio OS quality assurance.',
  },
]

function LogoMark({ id }: { id: string }) {
  if (id === 'openai') {
    return <img src="/brand/openai-wordmark.webp" alt="" />
  }
  if (id === 'anthropic') {
    return (
      <span className="logo-badge anthropic-badge">
        <span className="logo-badge-icon" aria-hidden="true">
          A
        </span>
        <span className="logo-badge-text">
          <strong>Anthropic</strong>
          <small>Claude Code</small>
        </span>
      </span>
    )
  }
  if (id === 'google') {
    return (
      <span className="logo-badge gemini-badge">
        <span className="logo-badge-icon" aria-hidden="true">
          ✦
        </span>
        <span className="logo-badge-text">
          <strong>Gemini</strong>
          <small>by Google</small>
        </span>
      </span>
    )
  }
  return null
}

export function CreditsApp() {
  const [bootIdx, setBootIdx] = useState(() => (prefersReducedMotion() ? BOOT_TEXT.length : 0))
  const [mode, setMode] = useState<'interactive' | 'roll'>('interactive')
  const [hoverLogo, setHoverLogo] = useState<number | null>(null)
  const [clickLogo, setClickLogo] = useState<number | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [rollPaused, setRollPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sets up the typing interval only — the setState lives in the async callback,
  // so it never fires synchronously inside the mount effect.
  const startTypingInterval = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setBootIdx((idx) => {
        if (idx >= BOOT_TEXT.length) {
          if (timerRef.current) clearInterval(timerRef.current)
          return idx
        }
        return idx + 1
      })
    }, TYPE_INTERVAL_MS)
  }

  const replay = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (prefersReducedMotion()) {
      setBootIdx(BOOT_TEXT.length)
      return
    }
    setBootIdx(0)
    startTypingInterval()
  }

  useEffect(() => {
    // Reduced-motion already shows the full text via lazy state init.
    if (prefersReducedMotion()) return
    startTypingInterval()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const bootDone = bootIdx >= BOOT_TEXT.length
  const stack = portfolioData.creditsStack
  const sections = [...new Set(portfolioData.credits.map((credit) => credit.section))]

  const renderColumn = (title: string, prefix: string, items: StackItem[]) => (
    <div className="credits-stack-col">
      <div className="credits-stack-head">{title}</div>
      <div className="sunken-panel credits-stack-list">
        {items.map((item, i) => {
          const key = `${prefix}-${i}`
          const open = openKey === key
          return (
            <Fragment key={key}>
              <button
                type="button"
                className={`credits-stack-row ${open ? 'is-open' : ''}`}
                onClick={() => setOpenKey((current) => (current === key ? null : key))}
                aria-expanded={open}
              >
                <span className="credits-stack-chip" aria-hidden="true" />
                <span className="credits-stack-name">{item.n}</span>
                <span className="credits-stack-mark" aria-hidden="true">
                  {open ? '–' : '+'}
                </span>
              </button>
              {open && <div className="credits-stack-detail">{item.d}</div>}
            </Fragment>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="app-content credits-app">
      {/* Blue header band */}
      <div className="credits-hero">
        <div className="identity-row">
          <img src={win98Icons.help} alt="" />
          <div>
            <h2>Credits</h2>
            <p>Tools, people, libraries, AI assistants &amp; preservation projects behind this portfolio OS.</p>
          </div>
        </div>
      </div>

      {mode === 'interactive' ? (
        <div className="credits-scroll">
          {/* CRT boot reveal — the name is the star */}
          <div className="crt-screen" role="img" aria-label="Now starring John Erick Mendoza">
            <div className="crt-scanlines" aria-hidden="true" />
            <pre className="crt-boot">
              {BOOT_TEXT.slice(0, bootIdx)}
              {!bootDone && <span className="crt-cursor">█</span>}
            </pre>
            {bootDone && (
              <div className="crt-reveal">
                <div className="crt-now-starring">&gt;&gt;&gt; N O W &nbsp; S T A R R I N G &lt;&lt;&lt;</div>
                <div className="crt-star-name">
                  JOHN&nbsp;ERICK&nbsp;MENDOZA<span className="crt-cursor">_</span>
                </div>
                <div className="crt-role">as The Developer · portfolio architect</div>
              </div>
            )}
          </div>

          <div className="credits-controls">
            <button type="button" onClick={replay}>
              ▶ Replay intro
            </button>
            <button type="button" onClick={() => setMode('roll')}>
              🎬 Roll credits
            </button>
            <span className="credits-hint">Hover a logo to reveal its role · click a tool to expand.</span>
          </div>

          {/* Logo cards */}
          <div className="credits-logo-grid">
            {LOGOS.map((logo, i) => {
              const revealed = hoverLogo === i || clickLogo === i
              return (
                <a
                  key={logo.id}
                  className={`credits-logo-card ${revealed ? 'is-revealed' : ''}`}
                  href={logo.href}
                  target="_blank"
                  rel="noreferrer"
                  onMouseEnter={() => setHoverLogo(i)}
                  onMouseLeave={() => setHoverLogo(null)}
                  onClick={(event) => {
                    event.preventDefault()
                    setClickLogo((current) => (current === i ? null : i))
                  }}
                >
                  <span className="credits-logo-role">{logo.role}</span>
                  <span className="credits-logo-mark" aria-hidden="true">
                    <LogoMark id={logo.id} />
                  </span>
                  <strong className="credits-logo-co">{logo.co}</strong>
                  {revealed && <span className="credits-logo-desc">{logo.d}</span>}
                </a>
              )
            })}
          </div>

          {/* Trademark note */}
          <div className="credits-disclaimer sunken-panel">
            <strong>Trademark note:</strong> Microsoft, Windows, OpenAI, Anthropic, Google, Gemini, DOOM, Wolfenstein,
            and other names remain the property of their respective owners. This app is a fan-made, educational,
            browser-only portfolio and is not affiliated with or endorsed by those companies.
          </div>

          {/* Three tech columns */}
          <div className="credits-stack-grid">
            {renderColumn('TOOLS USED', 'tools', stack.tools)}
            {renderColumn('FRAMEWORKS & LIBRARIES', 'frameworks', stack.frameworks)}
            {renderColumn('LANGUAGES', 'languages', stack.languages)}
          </div>

          {/* Detailed people / games / preservation list */}
          <div className="sunken-panel credits-list">
            {sections.map((section) => (
              <Fragment key={section}>
                <h3 className="credits-section-title">{section}</h3>
                {portfolioData.credits
                  .filter((credit) => credit.section === section)
                  .map((credit) => (
                    <article key={`${credit.section}-${credit.label}`}>
                      <a href={credit.href} target="_blank" rel="noreferrer">
                        {credit.label}
                      </a>
                      <p>{credit.note}</p>
                    </article>
                  ))}
              </Fragment>
            ))}
          </div>

          {/* Special thanks */}
          <div className="credits-thanks">
            <h3 className="credits-section-title">Special Thanks</h3>
            {portfolioData.specialThanks.map((thanks) => (
              <article key={thanks.label}>
                <a href={thanks.href} target="_blank" rel="noreferrer">
                  {thanks.label}
                </a>
                <p>{thanks.note}</p>
              </article>
            ))}
          </div>
        </div>
      ) : (
        // Cinematic credits roll
        <div className="credits-roll-view">
          <div className="credits-controls">
            <button type="button" onClick={() => setMode('interactive')}>
              ← Back
            </button>
            <button type="button" onClick={() => setRollPaused((paused) => !paused)}>
              {rollPaused ? '▶ Play' : '❚❚ Pause'}
            </button>
            <span className="credits-hint">The roll loops · hover the screen to pause.</span>
          </div>

          <div className="crt-screen credits-roll-stage">
            <div className="crt-scanlines" aria-hidden="true" />
            <div className="credits-roll-fade-top" aria-hidden="true" />
            <div className="credits-roll-fade-bottom" aria-hidden="true" />
            <div className={`credits-roll-track ${rollPaused ? 'is-paused' : ''}`}>
              <div className="roll-label">DIRECTED · DESIGNED · DEVELOPED BY</div>
              <div className="roll-star">John Erick Mendoza</div>

              <div className="roll-label">FEATURING</div>
              {LOGOS.map((logo) => (
                <div className="roll-block" key={logo.id}>
                  <div className="roll-role">{logo.role}</div>
                  <div className="roll-co">{logo.co}</div>
                  <div className="roll-note">{logo.d}</div>
                </div>
              ))}

              <div className="roll-label">TOOLS USED</div>
              {stack.tools.map((item) => (
                <div className="roll-item" key={item.n}>
                  {item.n}
                </div>
              ))}

              <div className="roll-label">FRAMEWORKS & LIBRARIES</div>
              {stack.frameworks.map((item) => (
                <div className="roll-item" key={item.n}>
                  {item.n}
                </div>
              ))}

              <div className="roll-label">LANGUAGES</div>
              {stack.languages.map((item) => (
                <div className="roll-item" key={item.n}>
                  {item.n}
                </div>
              ))}

              <div className="roll-label">SPECIAL THANKS</div>
              {portfolioData.specialThanks.map((thanks) => (
                <div className="roll-item" key={thanks.label}>
                  {thanks.label}
                </div>
              ))}

              <div className="roll-end">THE END</div>
              <div className="roll-sign">John Erick Mendoza · Windows 98 Portfolio Edition · 2026</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
