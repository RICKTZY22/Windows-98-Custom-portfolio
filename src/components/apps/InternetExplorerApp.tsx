import './InternetExplorerApp.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppProps } from '../../types'
import { win98Icons } from '../../data/icons'
import { useOs } from '../../os/useOs'

const HOME = 'http://www.google.com/'
// Default Wayback snapshot for typed/unlisted URLs. `if_` serves the page without
// the Wayback toolbar (and lets it load inside the iframe).
const DEFAULT_SNAPSHOT = '20150601000000'

// Per-host snapshot timestamps within the 2011–2017 window, in English. The
// crucial ones (Google/YouTube/Facebook/Instagram) were confirmed against the
// Wayback availability API (archive.org/wayback/available).
const SNAPSHOT_BY_HOST: Record<string, string> = {
  'google.com': '20140601000000',
  'youtube.com': '20140602000310',
  'facebook.com': '20140601235450',
  'instagram.com': '20150102001443',
  'twitter.com': '20150601000000',
  'wikipedia.org': '20150601000000',
  'en.wikipedia.org': '20150601000000',
  'amazon.com': '20150601000000',
  'reddit.com': '20150601000000',
  'yahoo.com': '20150601000000',
}

// Popular sites shown on the Links bar — English (.com / www) editions.
const POPULAR_SITES: Array<{ label: string; url: string }> = [
  { label: 'Google', url: 'www.google.com' },
  { label: 'YouTube', url: 'www.youtube.com' },
  { label: 'Facebook', url: 'www.facebook.com' },
  { label: 'Instagram', url: 'instagram.com' },
  { label: 'Twitter', url: 'twitter.com' },
  { label: 'Wikipedia', url: 'en.wikipedia.org' },
  { label: 'Amazon', url: 'www.amazon.com' },
  { label: 'Reddit', url: 'www.reddit.com' },
  { label: 'Yahoo', url: 'www.yahoo.com' },
]

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
  if (trimmed.startsWith('about:')) return HOME
  if (/^[a-z]+:/i.test(trimmed) && !/^[a-z]+:\/\//i.test(trimmed)) return trimmed
  if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed
  return `http://${trimmed.replace(/^www\./i, '')}`
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function archiveUrlFor(url: string): string {
  const host = hostOf(url)
  if (host === 'web.archive.org') return url
  const snapshot = SNAPSHOT_BY_HOST[host] ?? DEFAULT_SNAPSHOT
  return `https://web.archive.org/web/${snapshot}if_/${url}`
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return '/'
  }
}

function paramOf(url: string, key: string): string {
  try {
    return new URL(url).searchParams.get(key) ?? ''
  } catch {
    return ''
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .trim()
}

type SearchResult = { title: string; snippet: string; url: string }
type SearchState = { query: string; status: 'idle' | 'loading' | 'done' | 'error'; results: SearchResult[] }

type Page =
  | { kind: 'search'; query: string }
  | { kind: 'archive'; host: string; originalUrl: string; archiveUrl: string }
  | { kind: 'notfound'; host: string }

function resolvePage(url: string): Page {
  const host = hostOf(url)
  if ((host === 'google.com' || host === 'bing.com' || host === 'duckduckgo.com') && pathOf(url).startsWith('/search')) {
    return { kind: 'search', query: paramOf(url, 'q') }
  }
  if (isHttpUrl(url)) {
    return { kind: 'archive', host: host || url, originalUrl: url, archiveUrl: archiveUrlFor(url) }
  }
  return { kind: 'notfound', host: host || url }
}

export function InternetExplorerApp({ windowId, payload }: AppProps) {
  const { state, openApp, networkOps, showMessageBox, setWindowTitle } = useOs()
  const initial = normalizeUrl(payload?.url ?? HOME)
  const [address, setAddress] = useState(initial)
  const [history, setHistory] = useState([initial])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const loadTimerRef = useRef<number | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState<SearchState>({ query: '', status: 'idle', results: [] })
  const lastSearchRef = useRef<string>('')

  const current = history[index] ?? initial
  const page = useMemo(() => resolvePage(current), [current])
  const online = state.network.connected
  const currentHost = hostOf(current) || current

  useEffect(() => {
    setWindowTitle(windowId, `${currentHost || 'Internet Explorer'} - Microsoft Internet Explorer`)
  }, [currentHost, setWindowTitle, windowId])

  useEffect(
    () => () => {
      if (loadTimerRef.current !== null) window.clearTimeout(loadTimerRef.current)
    },
    [],
  )

  // Real web search: archived search-engine result pages can't run a live index, so we
  // query the CORS-enabled Wikipedia API and render our own results list. Clicking a
  // result opens that page in the 2016–2017 Web Archive.
  useEffect(() => {
    if (!online || page.kind !== 'search') return
    const query = page.query.trim()
    // Empty query: nothing to fetch, and we must not setState synchronously here (it would
    // cascade renders — react-hooks/set-state-in-effect). renderSearch already falls back to
    // the prompt because the results are gated on `search.query === query`.
    if (!query) return
    if (lastSearchRef.current === query) return
    lastSearchRef.current = query
    setSearch({ query, status: 'loading', results: [] })
    const controller = new AbortController()
    const endpoint =
      'https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=12&format=json&origin=*&srsearch=' +
      encodeURIComponent(query)
    fetch(endpoint, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        const hits = (data?.query?.search ?? []) as Array<{ title: string; snippet: string }>
        const results: SearchResult[] = hits.map((hit) => ({
          title: hit.title,
          snippet: stripHtml(hit.snippet ?? ''),
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`,
        }))
        setSearch({ query, status: 'done', results })
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setSearch({ query, status: 'error', results: [] })
      })
    return () => controller.abort()
  }, [online, page])

  function beginLoading() {
    if (loadTimerRef.current !== null) window.clearTimeout(loadTimerRef.current)
    setLoading(true)
    loadTimerRef.current = window.setTimeout(() => {
      setLoading(false)
      loadTimerRef.current = null
    }, 650)
  }

  function stopLoading() {
    if (loadTimerRef.current !== null) window.clearTimeout(loadTimerRef.current)
    loadTimerRef.current = null
    setLoading(false)
  }

  function navigate(nextRaw = address) {
    const next = normalizeUrl(nextRaw)
    setAddress(next)
    if (next !== current) {
      setHistory((items) => [...items.slice(0, index + 1), next])
      setIndex((value) => value + 1)
    }
    networkOps.recordTraffic(2, online ? 4 : 0)
    beginLoading()
  }

  function go(delta: -1 | 1) {
    const next = Math.max(0, Math.min(history.length - 1, index + delta))
    setIndex(next)
    setAddress(history[next] ?? HOME)
    beginLoading()
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
        <p className="web-muted">Cannot find server or DNS Error - Internet Explorer (Simulated)</p>
        <button type="button" onClick={() => openApp('network')}>Open Network</button>
      </div>
    )
  }

  function renderArchive(originalUrl: string, archiveUrl: string) {
    return (
      <div className="web-page web-archive">
        <iframe
          className="web-archive-frame"
          title={`Archived page for ${originalUrl}`}
          src={archiveUrl}
          sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-modals allow-popups"
          allow="fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  function renderNotFound(host: string) {
    return (
      <div className="web-error">
        <h3>The page cannot be displayed</h3>
        <p>
          Internet Explorer cannot open <b>{host || 'that address'}</b>. It may not be a valid Web address.
        </p>
        <p className="web-muted">
          Type a site like <b>google.com</b> or <b>wikipedia.org</b>, or a few words to search Google.
        </p>
        <p className="web-muted">Cannot find server or DNS Error - Internet Explorer (Simulated)</p>
        <button type="button" onClick={() => navigate(HOME)}>Go to Google</button>
      </div>
    )
  }

  function renderSearch(query: string) {
    // Only show fetched results/status when they belong to the query currently displayed,
    // so stale results never leak under a different or empty query.
    const matches = search.query === query
    return (
      <div className="web-page web-search">
        <div className="web-search-head">
          <span className="web-search-logo" aria-hidden="true">
            <span style={{ color: '#4285f4' }}>G</span>
            <span style={{ color: '#ea4335' }}>o</span>
            <span style={{ color: '#fbbc05' }}>o</span>
            <span style={{ color: '#4285f4' }}>g</span>
            <span style={{ color: '#34a853' }}>l</span>
            <span style={{ color: '#ea4335' }}>e</span>
          </span>
          {query && (
            <span className="web-search-query">
              Results for <b>{query}</b>
            </span>
          )}
        </div>
        {matches && search.status === 'loading' && <p className="web-muted">Searching the Web&hellip;</p>}
        {matches && search.status === 'error' && (
          <p className="web-muted">Could not reach the search service. Check the Ethernet connection and try again.</p>
        )}
        {matches && search.status === 'done' && query && search.results.length === 0 && (
          <p className="web-muted">
            No results found for <b>{query}</b>.
          </p>
        )}
        {!query && <p className="web-muted">Type a few words in the Address bar or the Search box to search the Web.</p>}
        <ul className="web-search-results">
          {matches &&
            search.results.map((result) => (
              <li key={result.url} className="web-search-result">
                <button type="button" className="web-result-link" onClick={() => navigate(result.url)}>
                  {result.title}
                </button>
                <span className="web-result-url">{result.url}</span>
                {result.snippet && <p className="web-result-snippet">{result.snippet}</p>}
              </li>
            ))}
        </ul>
        {matches && search.results.length > 0 && (
          <p className="web-search-foot">
            Results from Wikipedia &mdash; click any result to open it in the 2016&ndash;2017 Web Archive.
          </p>
        )}
      </div>
    )
  }

  function renderPage() {
    if (!online) return renderOffline()
    if (page.kind === 'search') return renderSearch(page.query)
    if (page.kind === 'archive') return renderArchive(page.originalUrl, page.archiveUrl)
    return renderNotFound(page.host)
  }

  const statusText = !online
    ? 'Working Offline'
    : page.kind === 'notfound'
      ? 'Cannot find server'
      : page.kind === 'search'
        ? search.status === 'loading'
          ? 'Searching the Web...'
          : `${search.results.length} result(s) found`
        : 'Done (Web Archive)'
  const statusZone = !online ? 'Offline' : page.kind === 'archive' ? 'Archive zone' : 'Internet zone'

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
      <div className="ie-toolbar">
        <button type="button" className="ie-tool" onClick={() => go(-1)} disabled={index <= 0}>
          <span className="ie-tool-glyph ie-back">&lt;</span>
          <span>Back</span>
        </button>
        <button type="button" className="ie-tool" onClick={() => go(1)} disabled={index >= history.length - 1}>
          <span className="ie-tool-glyph ie-fwd">&gt;</span>
          <span>Forward</span>
        </button>
        <button type="button" className="ie-tool ie-tool-mini" onClick={stopLoading} disabled={!loading} title="Stop">
          <span className="ie-tool-glyph ie-stop">X</span>
          <span>Stop</span>
        </button>
        <button type="button" className="ie-tool ie-tool-mini" onClick={() => navigate(current)} title="Refresh">
          <span className="ie-tool-glyph ie-refresh">R</span>
          <span>Refresh</span>
        </button>
        <button type="button" className="ie-tool ie-tool-mini" onClick={() => navigate(HOME)} title="Home">
          <span className="ie-tool-glyph ie-home">H</span>
          <span>Home</span>
        </button>
        <span className="ie-tool-sep" aria-hidden="true" />
        <button type="button" className="ie-tool" onClick={() => navigate(HOME)} title="Search">
          <img src={win98Icons.search} alt="" />
          <span>Search</span>
        </button>
        <button type="button" className="ie-tool" onClick={() => navigate('web.archive.org')} title="Favorites">
          <img src={win98Icons.favorites} alt="" />
          <span>Favorites</span>
        </button>
        <button type="button" className="ie-tool" onClick={() => navigate(HOME)} title="History">
          <img src={win98Icons.world} alt="" />
          <span>History</span>
        </button>
        <span className="ie-tool-sep" aria-hidden="true" />
        <button
          type="button"
          className="ie-tool"
          onClick={() =>
            showMessageBox({
              title: 'Internet Explorer',
              message: 'There is no printer installed.',
              detail: 'Printing is not available in this simulated environment.',
              icon: 'info',
              buttons: ['ok'],
            })
          }
          title="Print"
        >
          <img src={win98Icons.printer} alt="" />
          <span>Print</span>
        </button>
      </div>
      <div className="ie-address-row">
        <label htmlFor="ie-address">Address</label>
        <form
          className="ie-address-form"
          onSubmit={(event) => {
            event.preventDefault()
            navigate()
          }}
        >
          <img className="ie-address-icon" src={win98Icons.html} alt="" />
          <input id="ie-address" value={address} onChange={(event) => setAddress(event.target.value)} />
        </form>
        <button type="button" className="ie-go" onClick={() => navigate()}>
          <img src={win98Icons.internet} alt="" />
          Go
        </button>
        <div className={`ie-throbber ${loading ? 'is-loading' : ''}`} aria-hidden="true" title="Internet Explorer">
          <img src={win98Icons.internet} alt="" />
        </div>
      </div>
      <div className="ie-links-row">
        <span className="ie-links-label">Links</span>
        {POPULAR_SITES.map((site) => (
          <button
            key={site.url}
            type="button"
            className="ie-link"
            onClick={() => navigate(site.url)}
            title={`${site.url} — 2016–2017 archive`}
          >
            {site.label}
          </button>
        ))}
        <form
          className="ie-search-form"
          onSubmit={(event) => {
            event.preventDefault()
            const query = searchInput.trim()
            if (query) navigate(query)
          }}
        >
          <img src={win98Icons.search} alt="" aria-hidden="true" />
          <input
            aria-label="Search the Web"
            placeholder="Search the Web"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </div>
      <div className="sunken-panel browser-page">{renderPage()}</div>
      <div className="status-bar ie-status">
        <p className="status-bar-field ie-status-msg">
          {loading ? `Opening ${currentHost}...` : statusText}
          {loading && (
            <span className="ie-progress" aria-hidden="true">
              <span />
            </span>
          )}
        </p>
        <p className="status-bar-field ie-status-zone">
          <img src={win98Icons.world} alt="" />
          {statusZone}
        </p>
      </div>
    </div>
  )
}
