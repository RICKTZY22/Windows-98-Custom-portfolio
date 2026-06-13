import { useMemo, useState } from 'react'
import type { AppProps } from '../../types'
import { portfolioData } from '../../data/portfolioData'
import { fakeSites, youtubeVideos, type FakeVideo } from '../../data/websites'
import { useOs } from '../../os/useOs'

const HOME = 'http://portfolio.local/'

function looksLikeSearchQuery(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return false
  if (/^[a-z]+:/i.test(trimmed)) return false
  if (trimmed.includes(' ')) return true
  return !trimmed.includes('.')
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return HOME
  if (looksLikeSearchQuery(trimmed)) return `http://google.com/search?q=${encodeURIComponent(trimmed)}`
  if (trimmed.startsWith('about:')) return trimmed
  if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed
  return `http://${trimmed.replace(/^www\./i, '')}`
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function paramOf(url: string, key: string): string {
  try {
    return new URL(url).searchParams.get(key) ?? ''
  } catch {
    return ''
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return '/'
  }
}

type Page =
  | { kind: 'home' }
  | { kind: 'contact' }
  | { kind: 'credits' }
  | { kind: 'google'; query: string }
  | { kind: 'youtube' }
  | { kind: 'youtubeWatch'; video: FakeVideo }
  | { kind: 'construction'; host: string; title: string }
  | { kind: 'notfound'; host: string }

function resolvePage(url: string): Page {
  const host = hostOf(url)
  const path = pathOf(url)
  if (host === 'portfolio.local' || url === 'about:home') {
    if (path.startsWith('/contact')) return { kind: 'contact' }
    if (path.startsWith('/credits')) return { kind: 'credits' }
    return { kind: 'home' }
  }
  if (host === 'google.com') {
    return { kind: 'google', query: paramOf(url, 'q') }
  }
  if (host === 'youtube.com' || host === 'youtu.be') {
    const videoId = host === 'youtu.be' ? path.replace(/^\//, '') : paramOf(url, 'v')
    if (videoId) {
      const video =
        youtubeVideos.find((item) => item.id === videoId || item.youtubeId === videoId) ??
        ({ id: videoId, title: 'Video', author: 'Unknown channel', views: '? views', uploaded: '2026', youtubeId: /^[\w-]{11}$/.test(videoId) ? videoId : undefined } satisfies FakeVideo)
      return { kind: 'youtubeWatch', video }
    }
    return { kind: 'youtube' }
  }
  if (host === 'plmunnexus.com') return { kind: 'construction', host, title: 'PLMUN Nexus' }
  if (host === 'betweentworuins.com') return { kind: 'construction', host, title: 'Between Two Ruins' }
  return { kind: 'notfound', host: host || url }
}

export function InternetExplorerApp({ payload }: AppProps) {
  const { state, openApp, networkOps } = useOs()
  const initial = normalizeUrl(payload?.url ?? HOME)
  const [address, setAddress] = useState(initial)
  const [history, setHistory] = useState([initial])
  const [index, setIndex] = useState(0)
  const [searchDraft, setSearchDraft] = useState('')

  const current = history[index] ?? initial
  const page = useMemo(() => resolvePage(current), [current])
  const online = state.network.connected
  const currentHost = hostOf(current) || current

  function navigate(nextRaw = address) {
    const next = normalizeUrl(nextRaw)
    setAddress(next)
    if (next !== current) {
      setHistory((items) => [...items.slice(0, index + 1), next])
      setIndex((value) => value + 1)
    }
    networkOps.recordTraffic(2, online ? 4 : 0)
  }

  function go(delta: -1 | 1) {
    const next = Math.max(0, Math.min(history.length - 1, index + delta))
    setIndex(next)
    setAddress(history[next] ?? HOME)
  }

  function searchResults(query: string) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return fakeSites
    const hits = fakeSites.filter((site) => {
      const haystack = `${site.host} ${site.title} ${site.description}`.toLowerCase()
      return words.some((word) => haystack.includes(word))
    })
    return hits.length ? hits : fakeSites
  }

  function renderOffline() {
    return (
      <div className="web-error">
        <h3>The page cannot be displayed</h3>
        <p>The network cable is unplugged or TCP/IP is not configured.</p>
        <ul className="compact-list">
          <li>Open Network Neighborhood and click Connect.</li>
          <li>Or run <b>ipconfig /renew</b> in the MS-DOS Prompt.</li>
        </ul>
        <p className="web-muted">Cannot find server or DNS Error — Internet Explorer (Simulated)</p>
        <button type="button" onClick={() => openApp('network')}>Open Network</button>
      </div>
    )
  }

  function renderHome() {
    return (
      <div className="web-page web-home">
        <div className="web-banner">
          <h2>{portfolioData.profile.name}'s Home Page</h2>
          <p>Best viewed in 800x600 — {portfolioData.profile.role}</p>
        </div>
        <p>{portfolioData.profile.headline}</p>
        <div className="web-link-grid">
          <button type="button" onClick={() => navigate('plmunnexus.com')}>
            <strong>PLMUN Nexus</strong>
            <span>plmunnexus.com</span>
          </button>
          <button type="button" onClick={() => navigate('betweentworuins.com')}>
            <strong>Between Two Ruins</strong>
            <span>betweentworuins.com</span>
          </button>
          <button type="button" onClick={() => navigate('youtube.com')}>
            <strong>My YouTube</strong>
            <span>youtube.com</span>
          </button>
          <button type="button" onClick={() => navigate('google.com')}>
            <strong>Search the Web</strong>
            <span>google.com</span>
          </button>
        </div>
        <div className="button-row">
          <button type="button" onClick={() => navigate('portfolio.local/contact')}>Contact</button>
          <button type="button" onClick={() => navigate('portfolio.local/credits')}>Credits</button>
        </div>
        <p className="web-counter">You are visitor no. 001998 since 1998</p>
      </div>
    )
  }

  function renderGoogle(query: string) {
    return (
      <div className="web-page web-google">
        <p className="web-google-logo" aria-label="Google">
          <span>G</span><span>o</span><span>o</span><span>g</span><span>l</span><span>e</span>
        </p>
        <form
          className="web-google-form"
          onSubmit={(event) => {
            event.preventDefault()
            navigate(`google.com/search?q=${encodeURIComponent(searchDraft)}`)
          }}
        >
          <input
            aria-label="Search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        {query ? (
          <div className="web-google-results">
            <p className="web-muted">
              The Portfolio Internet found {searchResults(query).length} result(s) for “{query}”
            </p>
            {searchResults(query).map((site) => (
              <article key={site.host}>
                <button type="button" className="web-result-link" onClick={() => navigate(site.host)}>
                  {site.title}
                </button>
                <p className="web-result-url">http://{site.host}/</p>
                <p>{site.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="web-muted">Searching the whole Portfolio Internet — all {fakeSites.length} websites of it.</p>
        )}
      </div>
    )
  }

  function renderYoutube() {
    return (
      <div className="web-page web-youtube">
        <div className="web-youtube-header">
          <span className="web-youtube-logo">▶ YouTube</span>
          <span className="web-muted">1998 Edition — videos by John Erick Mendoza</span>
        </div>
        <div className="web-video-grid">
          {youtubeVideos.map((video) => (
            <button key={video.id} type="button" className="web-video-card" onClick={() => navigate(`youtube.com/watch?v=${video.youtubeId ?? video.id}`)}>
              <span className={`web-thumb ${video.youtubeId ? 'is-ready' : ''}`}>▶</span>
              <strong>{video.title}</strong>
              <span className="web-muted">{video.author}</span>
              <span className="web-muted">{video.views} · {video.uploaded}</span>
            </button>
          ))}
        </div>
        <p className="web-muted">
          Add your real videos in src/data/websites.ts — slots without a video id show as coming soon.
        </p>
      </div>
    )
  }

  function renderYoutubeWatch(video: FakeVideo) {
    return (
      <div className="web-page web-youtube">
        <div className="web-youtube-header">
          <button type="button" className="web-result-link" onClick={() => navigate('youtube.com')}>
            ◀ Back to YouTube
          </button>
        </div>
        {video.youtubeId ? (
          <iframe
            className="web-video-frame"
            title={video.title}
            src={`https://www.youtube.com/embed/${video.youtubeId}`}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="web-thumb web-thumb-large">
            <p>This video slot is reserved.</p>
            <p className="web-muted">Add its YouTube id in src/data/websites.ts to play it here.</p>
          </div>
        )}
        <h3>{video.title}</h3>
        <p className="web-muted">{video.author} · {video.views} · {video.uploaded}</p>
      </div>
    )
  }

  function renderConstruction(title: string, host: string) {
    return (
      <div className="web-page web-construction">
        <div className="web-construction-stripes" aria-hidden="true" />
        <h2>{title}</h2>
        <p className="web-construction-badge">🚧 UNDER CONSTRUCTION 🚧</p>
        <p>
          {title} by John Erick Mendoza is coming soon to <b>{host}</b>.
        </p>
        <p className="web-muted">Check back in 2026. This page is part of the simulated Portfolio Internet.</p>
        <div className="web-construction-stripes" aria-hidden="true" />
      </div>
    )
  }

  function renderNotFound(host: string) {
    return (
      <div className="web-error">
        <h3>The page cannot be displayed</h3>
        <p>
          Internet Explorer cannot find <b>{host}</b>. The Portfolio Internet has exactly {fakeSites.length}{' '}
          websites, and that is not one of them.
        </p>
        <p>Try one of these instead:</p>
        <ul className="compact-list">
          {fakeSites.map((site) => (
            <li key={site.host}>
              <button type="button" className="web-result-link" onClick={() => navigate(site.host)}>
                http://{site.host}/
              </button>{' '}
              — {site.title}
            </li>
          ))}
        </ul>
        <p className="web-muted">Cannot find server or DNS Error — Internet Explorer (Simulated)</p>
      </div>
    )
  }

  function renderPage() {
    if (!online && page.kind !== 'home' && page.kind !== 'contact' && page.kind !== 'credits') {
      return renderOffline()
    }
    switch (page.kind) {
      case 'home':
        return renderHome()
      case 'contact':
        return (
          <div className="web-page">
            <h2>Contact</h2>
            <p>Email: {portfolioData.contact.email}</p>
            <p>Location: {portfolioData.profile.location}</p>
            <button type="button" onClick={() => openApp('contact')}>Open Address Book</button>
          </div>
        )
      case 'credits':
        return (
          <div className="web-page">
            <h2>Credits</h2>
            <p>Local Win98 icon assets are self-hosted from the Alex Meub Windows 98 icon viewer.</p>
            <button type="button" onClick={() => openApp('credits')}>Open Credits.txt</button>
          </div>
        )
      case 'google':
        return renderGoogle(page.query)
      case 'youtube':
        return renderYoutube()
      case 'youtubeWatch':
        return renderYoutubeWatch(page.video)
      case 'construction':
        return renderConstruction(page.title, page.host)
      case 'notfound':
      default:
        return renderNotFound(page.host)
    }
  }

  const statusText = !online ? 'Working Offline' : page.kind === 'notfound' ? 'Cannot find server' : 'Done'

  return (
    <div className="app-content internet-explorer-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Favorites</li>
        <li>Tools</li>
        <li>Help</li>
      </ul>
      <div className="toolbar browser-toolbar">
        <button type="button" onClick={() => go(-1)} disabled={index <= 0}>
          Back
        </button>
        <button type="button" onClick={() => go(1)} disabled={index >= history.length - 1}>
          Forward
        </button>
        <button type="button" onClick={() => navigate(current)}>
          Refresh
        </button>
        <button type="button" onClick={() => navigate(HOME)}>
          Home
        </button>
        <form
          className="address-form"
          onSubmit={(event) => {
            event.preventDefault()
            navigate()
          }}
        >
          <label htmlFor="ie-address">Address</label>
          <input id="ie-address" value={address} onChange={(event) => setAddress(event.target.value)} />
        </form>
      </div>
      <div className="sunken-panel browser-page">{renderPage()}</div>
      <div className="status-bar">
        <p className="status-bar-field">{statusText}</p>
        <p className="status-bar-field">{currentHost}</p>
        <p className="status-bar-field">{online ? 'Portfolio Ethernet' : 'Offline'}</p>
      </div>
    </div>
  )
}
