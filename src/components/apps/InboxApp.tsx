import './InboxApp.css'
import { useMemo, useState } from 'react'
import { win98Icons } from '../../data/icons'
import { releaseNotes, type ReleaseNote, type ReleaseStatus } from '../../data/releaseNotes'

// Inbox — a Microsoft Exchange client whose Inbox is the project's release history:
// every version (grounded in real git history, see data/releaseNotes.ts) arrives as
// a mail message. Release messages render a structured changelog in the reading pane;
// everything else renders as plain mail. The client itself is fully working — folders,
// reading, compose / reply / forward, delete and a status toast.

type FolderName = 'Deleted Items' | 'Inbox' | 'Outbox' | 'Sent Items'

type Message = {
  id: number
  from: string
  addr: string
  to: string
  subject: string
  received: string
  read: boolean
  priority: boolean
  body: string
  release?: ReleaseNote
}

type ComposeState = { title: string; to: string; cc: string; subject: string; body: string }

const ME = 'John Erick Mendoza'
const ME_ADDR = 'johnerickmendoza567@gmail.com'
const RELEASES_ADDR = 'releases@portfolio98.dev'
const SIGNATURE = '\n\nJohn Erick Mendoza\ngithub.com/RICKTZY22'

const STATUS_LABEL: Record<ReleaseStatus, string> = {
  prerelease: 'Pre-release',
  released: 'Released',
  current: 'In development',
}

// Plain-text rendering of a release, used for the reply / forward quote block and as a
// fallback body. The reading pane uses the structured <ReleaseView> instead.
function releaseToPlainText(r: ReleaseNote): string {
  const head = `${r.label} "${r.codename}", ${r.date}  [${STATUS_LABEL[r.status]}]\n\n${r.summary}`
  const body = r.sections
    .map((section) => `${section.title}:\n${section.items.map((item) => `  - ${item}`).join('\n')}`)
    .join('\n\n')
  const commits = `Shipped commits:\n${r.commits.map((c) => `  * ${c}`).join('\n')}`
  return `${head}\n\n${body}\n\n${commits}`
}

function releaseMessage(r: ReleaseNote): Message {
  const launch = r.status !== 'prerelease' ? 'Deployed' : 'Logged'
  return {
    id: 100 + Number(r.version.replace(/\D/g, '')),
    from: 'Windows 98 Portfolio Releases',
    addr: RELEASES_ADDR,
    to: ME,
    subject: `${r.label} ${launch}: ${r.headline}`,
    received: r.shortDate,
    read: r.status !== 'current',
    priority: r.status === 'current' || r.version === '1.0.0',
    body: releaseToPlainText(r),
    release: r,
  }
}

function seedFolders(): Record<FolderName, Message[]> {
  const welcome: Message = {
    id: 1,
    from: ME,
    addr: ME_ADDR,
    to: ME,
    subject: 'Welcome to your release history Inbox',
    received: '6/26/2026',
    read: false,
    priority: false,
    body:
      'Welcome to the Inbox.\n\n' +
      'Every message below is a release of this Windows 98 portfolio, newest first. ' +
      'Double-click one to read its patch notes: what shipped, when, and the real git ' +
      'commits behind it.\n\n' +
      'The project began on May 28, 1998-in-spirit (2026 in reality) as a plain portfolio, ' +
      'went public on GitHub on June 13, and has been growing since. The build flagged ' +
      '"In development" at the top is what I am working on right now.\n\n' +
      'Reply, Forward and New all work, so give them a try.' +
      SIGNATURE,
  }

  // Newest first: welcome, then releases in reverse-chronological order.
  const inbox = [welcome, ...releaseNotes.map(releaseMessage).reverse()]

  const sent: Message[] = [
    {
      id: 50,
      from: ME,
      addr: RELEASES_ADDR,
      to: RELEASES_ADDR,
      subject: 'RE: v1.0 Deployed: Windows 98, in your browser',
      received: '6/13/2026',
      read: true,
      priority: false,
      body: 'It boots! Shipping v1.0 to GitHub now.' + SIGNATURE,
    },
  ]

  return { 'Deleted Items': [], Inbox: inbox, Outbox: [], 'Sent Items': sent }
}

const FOLDER_ORDER: FolderName[] = ['Deleted Items', 'Inbox', 'Outbox', 'Sent Items']

function StatusPill({ status }: Readonly<{ status: ReleaseStatus }>) {
  return <span className={`inbox-status-pill is-${status}`}>{STATUS_LABEL[status]}</span>
}

function ReleaseView({ release }: Readonly<{ release: ReleaseNote }>) {
  return (
    <div className="inbox-release">
      <div className="inbox-release-head">
        <span className="inbox-release-badge">{release.label}</span>
        <div className="inbox-release-titles">
          <strong>
            {release.codename} <span className="inbox-release-ver">({release.version})</span>
          </strong>
          <span className="inbox-release-date">{release.date}</span>
        </div>
        <StatusPill status={release.status} />
      </div>
      <p className="inbox-release-summary">{release.summary}</p>
      {release.sections.map((section) => (
        <section key={section.title} className="inbox-release-section">
          <h4>{section.title}</h4>
          <ul>
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <div className="inbox-release-commits">
        <h4>Shipped commits</h4>
        <ul>
          {release.commits.map((commit) => (
            <li key={commit}>
              <code>{commit}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function InboxApp() {
  const [folder, setFolder] = useState<FolderName>('Inbox')
  const [selected, setSelected] = useState<number | null>(null)
  const [reading, setReading] = useState<number | null>(null)
  const [compose, setCompose] = useState<ComposeState | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Record<FolderName, Message[]>>(seedFolders)

  const list = msgs[folder]
  const unread = useMemo(() => msgs.Inbox.filter((m) => !m.read).length, [msgs])

  function flash(text: string) {
    setToast(text)
    window.setTimeout(() => setToast((current) => (current === text ? null : current)), 2200)
  }

  function curMsg(): Message | null {
    const id = reading ?? selected
    if (id == null) return null
    return list.find((m) => m.id === id) ?? null
  }

  function openMsg(id: number) {
    setMsgs((current) => ({
      ...current,
      [folder]: current[folder].map((m) => (m.id === id ? { ...m, read: true } : m)),
    }))
    setReading(id)
    setSelected(id)
  }

  function deleteMsg(id: number | null) {
    if (id == null) return
    setMsgs((current) => {
      const source = current[folder]
      const target = source.find((m) => m.id === id)
      if (!target) return current
      const next: Record<FolderName, Message[]> = {
        ...current,
        [folder]: source.filter((m) => m.id !== id),
      }
      if (folder !== 'Deleted Items') {
        next['Deleted Items'] = [target, ...current['Deleted Items']]
      }
      return next
    })
    setSelected(null)
    if (reading === id) setReading(null)
    flash(folder === 'Deleted Items' ? 'Message permanently deleted.' : 'Message moved to Deleted Items.')
  }

  function startCompose(kind: 'new' | 'reply' | 'replyAll' | 'forward') {
    const m = curMsg()
    if (kind !== 'new' && !m) {
      flash('Select a message first.')
      return
    }
    if (kind === 'new' || !m) {
      setCompose({ title: 'New Message', to: '', cc: '', subject: '', body: SIGNATURE })
      return
    }
    const quote = `\n\n\n----- Original Message -----\nFrom: ${m.from} <${m.addr}>\nSubject: ${m.subject}\n\n${m.body}`
    if (kind === 'forward') {
      setCompose({ title: `FW: ${m.subject}`, to: '', cc: '', subject: `FW: ${m.subject}`, body: quote })
      return
    }
    setCompose({
      title: `RE: ${m.subject}`,
      to: m.addr,
      cc: kind === 'replyAll' ? m.to : '',
      subject: `RE: ${m.subject}`,
      body: quote,
    })
  }

  function sendCompose() {
    if (!compose) return
    if (!compose.to.trim()) {
      flash('Please enter a recipient in the To field.')
      return
    }
    const sent: Message = {
      id: Date.now(),
      from: ME,
      addr: compose.to,
      to: compose.to,
      subject: compose.subject || '(no subject)',
      received: 'Now',
      read: true,
      priority: false,
      body: compose.body,
    }
    setMsgs((current) => ({ ...current, 'Sent Items': [sent, ...current['Sent Items']] }))
    setCompose(null)
    flash('Message sent. Saved to Sent Items.')
  }

  function setComposeField(field: keyof ComposeState, value: string) {
    setCompose((current) => (current ? { ...current, [field]: value } : current))
  }

  const reader = reading != null ? list.find((m) => m.id === reading) ?? null : null
  const hasSel = selected != null || reading != null
  const actClass = hasSel ? '' : 'is-dim'

  return (
    <div className="app-content inbox-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Tools</li>
        <li>Compose</li>
        <li>Help</li>
      </ul>

      <div className="inbox-toolbar">
        <button type="button" className="inbox-tool" title="New Message" onClick={() => startCompose('new')}>
          <svg width="22" height="20" viewBox="0 0 24 22" aria-hidden="true">
            <rect x="2" y="4" width="18" height="14" fill="#fff" stroke="#000" />
            <path d="M2.5 4.5 L11 12 L19.5 4.5" fill="none" stroke="#000" />
            <circle cx="19" cy="5" r="4" fill="#ffd54a" stroke="#9a6b00" />
          </svg>
          <span>New</span>
        </button>
        <span className="inbox-tool-sep" />
        <button
          type="button"
          className={`inbox-tool ${actClass}`}
          title="Reply to Sender"
          onClick={() => startCompose('reply')}
        >
          <svg width="22" height="20" viewBox="0 0 24 22" aria-hidden="true">
            <rect x="6" y="5" width="15" height="12" fill="#fff" stroke="#000" />
            <path d="M6.5 5.5 L13.5 11 L20.5 5.5" fill="none" stroke="#000" />
            <path d="M9 11 L3 14 L9 17 Z" fill="#1450c8" stroke="#0a2a73" />
          </svg>
          <span>Reply</span>
        </button>
        <button
          type="button"
          className={`inbox-tool ${actClass}`}
          title="Reply to All"
          onClick={() => startCompose('replyAll')}
        >
          <svg width="22" height="20" viewBox="0 0 24 22" aria-hidden="true">
            <rect x="7" y="5" width="14" height="12" fill="#fff" stroke="#000" />
            <path d="M7.5 5.5 L14 11 L20.5 5.5" fill="none" stroke="#000" />
            <path d="M8 11 L2 14 L8 17 Z" fill="#1450c8" stroke="#0a2a73" />
            <path d="M12 11 L6 14 L12 17 Z" fill="#5b8df0" stroke="#0a2a73" />
          </svg>
          <span>Reply All</span>
        </button>
        <button
          type="button"
          className={`inbox-tool ${actClass}`}
          title="Forward"
          onClick={() => startCompose('forward')}
        >
          <svg width="22" height="20" viewBox="0 0 24 22" aria-hidden="true">
            <rect x="3" y="5" width="14" height="12" fill="#fff" stroke="#000" />
            <path d="M3.5 5.5 L10 11 L16.5 5.5" fill="none" stroke="#000" />
            <path d="M16 11 L22 14 L16 17 Z" fill="#1450c8" stroke="#0a2a73" />
          </svg>
          <span>Forward</span>
        </button>
        <span className="inbox-tool-sep" />
        <button
          type="button"
          className={`inbox-tool ${actClass}`}
          title="Delete"
          onClick={() => deleteMsg(reading ?? selected)}
        >
          <svg width="22" height="20" viewBox="0 0 24 22" aria-hidden="true">
            <path d="M5 5 H17 L16 18 H6 Z" fill="#d9d9d9" stroke="#000" />
            <path d="M3 5 H19" stroke="#000" />
            <path d="M9 3 H13 V5 H9 Z" fill="#d9d9d9" stroke="#000" />
            <path d="M9 8 V15 M11.5 8 V15 M14 8 V15" stroke="#000" />
          </svg>
          <span>Delete</span>
        </button>
      </div>

      <div className="inbox-body">
        <div className="sunken-panel inbox-folders">
          <div className="inbox-folder-root">
            <img src={win98Icons.network} alt="" />
            <span>Microsoft Exchange</span>
          </div>
          <div className="inbox-folder-personal">
            <img src={win98Icons.folder} alt="" />
            <span>Personal Folders</span>
          </div>
          <div className="inbox-folder-children">
            {FOLDER_ORDER.map((name) => {
              const active = name === folder
              const count = name === 'Inbox' ? unread : msgs[name].length
              const showCount = name === 'Inbox' ? unread > 0 : msgs[name].length > 0
              return (
                <button
                  type="button"
                  key={name}
                  className={`inbox-folder ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    setFolder(name)
                    setSelected(null)
                    setReading(null)
                  }}
                >
                  <img src={name === 'Inbox' ? win98Icons.inbox : win98Icons.folder} alt="" />
                  <span className="inbox-folder-name">{name}</span>
                  {showCount && <span className="inbox-folder-count">({count})</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="sunken-panel inbox-list">
          <div className="inbox-list-head">
            <span>!</span>
            <span>✉</span>
            <span>From</span>
            <span>Subject</span>
            <span>Received ▾</span>
          </div>
          <div className="inbox-rows">
            {list.length === 0 && <div className="inbox-empty">There are no items in this view.</div>}
            {list.map((m) => {
              const sel = m.id === selected
              return (
                <button
                  type="button"
                  key={m.id}
                  className={`inbox-row ${sel ? 'is-selected' : ''} ${m.read ? '' : 'is-unread'}`}
                  onClick={() => setSelected(m.id)}
                  onDoubleClick={() => openMsg(m.id)}
                >
                  <span className="inbox-cell-bang">{m.priority ? '!' : ''}</span>
                  <span className="inbox-cell-mail" aria-hidden="true">
                    {m.read ? '◇' : '✉'}
                  </span>
                  <span className="inbox-cell-text">{m.from}</span>
                  <span className="inbox-cell-text">{m.subject}</span>
                  <span className="inbox-cell-text">{m.received}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="status-bar inbox-statusbar">
        <p className="status-bar-field">
          {folder === 'Inbox' ? `${list.length} item(s), ${unread} unread` : `${list.length} item(s)`}
        </p>
        <p className="status-bar-field inbox-statusbar-folder">{folder}</p>
      </div>

      {reader && (
        <div className="inbox-overlay" role="dialog" aria-label={reader.subject}>
          <div className="inbox-window inbox-reader">
            <div className="title-bar">
              <div className="title-bar-text">{reader.subject}</div>
              <div className="title-bar-controls">
                <button type="button" aria-label="Close" onClick={() => setReading(null)} />
              </div>
            </div>
            <div className="window-body inbox-reader-body">
              <div className="inbox-reader-toolbar">
                <button type="button" onClick={() => startCompose('reply')}>
                  Reply
                </button>
                <button type="button" onClick={() => startCompose('replyAll')}>
                  Reply All
                </button>
                <button type="button" onClick={() => startCompose('forward')}>
                  Forward
                </button>
                <button type="button" onClick={() => deleteMsg(reader.id)}>
                  Delete
                </button>
              </div>
              <div className="inbox-reader-fields">
                <span>From:</span>
                <strong>
                  {reader.from} &lt;{reader.addr}&gt;
                </strong>
                <span>To:</span>
                <span>{reader.to}</span>
                <span>Subject:</span>
                <strong>{reader.subject}</strong>
                <span>Sent:</span>
                <span>{reader.received}</span>
              </div>
              <div className="inbox-reader-content">
                {reader.release ? <ReleaseView release={reader.release} /> : <pre>{reader.body}</pre>}
              </div>
            </div>
          </div>
        </div>
      )}

      {compose && (
        <div className="inbox-overlay" role="dialog" aria-label={compose.title}>
          <div className="inbox-window inbox-compose">
            <div className="title-bar">
              <div className="title-bar-text">{compose.title}</div>
              <div className="title-bar-controls">
                <button type="button" aria-label="Close" onClick={() => setCompose(null)} />
              </div>
            </div>
            <div className="window-body inbox-compose-body">
              <div className="inbox-compose-toolbar">
                <button type="button" className="inbox-send" onClick={sendCompose}>
                  Send
                </button>
              </div>
              <div className="inbox-compose-fields">
                <label htmlFor="inbox-to">To:</label>
                <input
                  id="inbox-to"
                  type="text"
                  value={compose.to}
                  placeholder="recipient@example.com"
                  onChange={(e) => setComposeField('to', e.target.value)}
                />
                <label htmlFor="inbox-cc">Cc:</label>
                <input
                  id="inbox-cc"
                  type="text"
                  value={compose.cc}
                  onChange={(e) => setComposeField('cc', e.target.value)}
                />
                <label htmlFor="inbox-subject">Subject:</label>
                <input
                  id="inbox-subject"
                  type="text"
                  value={compose.subject}
                  onChange={(e) => setComposeField('subject', e.target.value)}
                />
              </div>
              <textarea
                className="inbox-compose-text"
                value={compose.body}
                onChange={(e) => setComposeField('body', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {toast && <div className="inbox-toast">{toast}</div>}
    </div>
  )
}
