import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import type { AppProps } from '../../types'
import { baseName, getNode, joinPath, nowStamp } from '../../os/filesystem'
import { useOs } from '../../os/useOs'
import {
  EMPTY_WORDPAD_PAGE_HTML,
  applyWordPadInlineStyle,
  cleanWordPadHtml,
  rangeBelongsToElement,
  wordPadContentToPages,
  wordPadPagesToDocumentHtml,
  type WordPadInlineStyle,
} from '../../os/wordpadFormatting'

const FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'MS Sans Serif',
  'Verdana',
  'Tahoma',
  'Georgia',
  'Comic Sans MS',
]

const FONT_SIZES = ['8', '10', '12', '14', '18', '24', '36']

// The classic Windows 16-colour palette shown in the WordPad colour dropdown.
const COLORS: Array<{ name: string; value: string }> = [
  { name: 'Black', value: '#000000' },
  { name: 'Maroon', value: '#800000' },
  { name: 'Green', value: '#008000' },
  { name: 'Olive', value: '#808000' },
  { name: 'Navy', value: '#000080' },
  { name: 'Purple', value: '#800080' },
  { name: 'Teal', value: '#008080' },
  { name: 'Gray', value: '#808080' },
  { name: 'Silver', value: '#c0c0c0' },
  { name: 'Red', value: '#ff0000' },
  { name: 'Lime', value: '#00ff00' },
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Fuchsia', value: '#ff00ff' },
  { name: 'Aqua', value: '#00ffff' },
  { name: 'White', value: '#ffffff' },
]

const DEFAULT_HTML =
  '<div>Start typing here. Use the toolbar to change the <b>font</b>, <i>size</i>, and ' +
  '<span style="color:#0000ff">colour</span> - all formatting is saved with the document.</div>'

function normalizeDocumentName(name: string): string {
  const trimmed = name.trim() || 'Document.doc'
  if (/\.[a-z0-9]+$/i.test(trimmed)) {
    return trimmed
  }
  return `${trimmed.replace(/\.+$/, '') || 'Document'}.doc`
}

function initialPagesFor(path: string | undefined, content: string | undefined): string[] {
  if (!path) {
    return [DEFAULT_HTML]
  }
  return wordPadContentToPages(content)
}

function textFromPages(pages: string[]): string {
  const cleanPages = pages.map(cleanWordPadHtml)
  if (typeof document === 'undefined') {
    return cleanPages.join(' ').replace(/<[^>]*>/g, ' ')
  }
  const scratch = document.createElement('div')
  scratch.innerHTML = cleanPages.join(' ')
  return scratch.textContent ?? ''
}

/** execCommand reports the active font name wrapped in quotes; map it back to a known option. */
function matchFamily(reported: string): string {
  const clean = reported.replace(/['"]/g, '').trim().toLowerCase()
  return FONT_FAMILIES.find((family) => family.toLowerCase() === clean) ?? FONT_FAMILIES[0]
}

function elementFromNode(node: Node | null): HTMLElement | null {
  if (!node) return null
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  return element instanceof HTMLElement ? element : null
}

function colorToHex(value: string): string | null {
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(value)
  if (!rgb) return null
  return `#${rgb
    .slice(1, 4)
    .map((part) => Number(part).toString(16).padStart(2, '0'))
    .join('')}`
}

function closestFontSize(pxValue: string): string | null {
  const px = Number.parseFloat(pxValue)
  if (!Number.isFinite(px)) return null
  const pt = px * 0.75
  return FONT_SIZES.reduce((best, size) =>
    Math.abs(Number(size) - pt) < Math.abs(Number(best) - pt) ? size : best,
  )
}

export function WordPadApp({ windowId, payload }: AppProps) {
  const { state, fsOps, setWindowTitle, showMessageBox, openApp, closeWindow } = useOs()
  const payloadPath = payload?.filePath
  const file = payloadPath ? getNode(state.fs, payloadPath) : undefined

  const pageRefs = useRef<Array<HTMLDivElement | null>>([])
  const savedRangeRef = useRef<Range | null>(null)

  const [documentPath, setDocumentPath] = useState<string | undefined>(() => payloadPath)
  const [saveAsName, setSaveAsName] = useState(() => file?.name ?? 'Document.doc')
  const [pageHtmls, setPageHtmls] = useState(() => initialPagesFor(payloadPath, file?.content))
  const [activePage, setActivePage] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState(() => (payloadPath ? `Opened ${baseName(payloadPath)}` : 'Ready'))
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [colorOpen, setColorOpen] = useState(false)
  const [showRuler, setShowRuler] = useState(true)
  const [fontName, setFontName] = useState('Arial')
  const [fontSize, setFontSize] = useState('10')
  const [colorValue, setColorValue] = useState('#000000')
  const [active, setActive] = useState({ bold: false, italic: false, underline: false })
  const [stats, setStats] = useState({ words: 0, chars: 0 })

  function readPagesFromDom(): string[] {
    const source = pageHtmls.length ? pageHtmls : [EMPTY_WORDPAD_PAGE_HTML]
    return source.map((fallback, index) =>
      wordPadContentToPages(cleanWordPadHtml(pageRefs.current[index]?.innerHTML ?? fallback))[0],
    )
  }

  function currentRange(): Range | null {
    const sel = window.getSelection()
    if (sel?.rangeCount) {
      const liveRange = sel.getRangeAt(0)
      const activeEditor = pageRefs.current.find((page) => page && rangeBelongsToElement(liveRange, page))
      if (activeEditor) return liveRange
    }
    return savedRangeRef.current
  }

  function recomputeStats(nextPages = readPagesFromDom()) {
    const text = textFromPages(nextPages)
    const trimmed = text.trim()
    setStats({ words: trimmed ? trimmed.split(/\s+/).length : 0, chars: text.length })
  }

  // Load the document exactly when a different file is opened. Kept path-based
  // para hindi nagja-jump ang caret habang nagta-type sa same document.
  const loadKey = payloadPath ?? '__new__'
  useEffect(() => {
    try {
      document.execCommand('styleWithCSS', false, 'true')
    } catch {
      /* not supported in non-browser test envs */
    }
    const nextPages = initialPagesFor(payloadPath, file?.content)
    const timer = window.setTimeout(() => {
      pageRefs.current = []
      savedRangeRef.current = null
      setDocumentPath(payloadPath)
      setSaveAsName(file?.name ?? 'Document.doc')
      setPageHtmls(nextPages)
      setActivePage(0)
      setDirty(false)
      setStatus(payloadPath ? `Opened ${baseName(payloadPath)}` : 'Ready')
      recomputeStats(nextPages)
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey])

  useEffect(() => {
    const titleName = saveAsName || (documentPath ? baseName(documentPath) : 'Document.doc')
    setWindowTitle(windowId, `${dirty ? '*' : ''}${titleName} - WordPad`)
  }, [dirty, documentPath, saveAsName, setWindowTitle, windowId])

  useLayoutEffect(() => {
    pageHtmls.forEach((html, index) => {
      const page = pageRefs.current[index]
      if (page && page.innerHTML !== html) {
        page.innerHTML = html
      }
    })
  }, [pageHtmls])

  const saveSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const pageIndex = pageRefs.current.findIndex((page) => Boolean(page && page.contains(sel.anchorNode)))
    if (pageIndex >= 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
      setActivePage(pageIndex)
    }
  }, [])

  const syncActive = useCallback(() => {
    try {
      setActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      })
      const reported = document.queryCommandValue('fontName')
      if (reported) setFontName(matchFamily(reported))

      const sel = window.getSelection()
      const activeElement = elementFromNode(sel?.anchorNode ?? null)
      if (activeElement) {
        const computed = window.getComputedStyle(activeElement)
        const computedFamily = FONT_FAMILIES.find((family) =>
          computed.fontFamily.toLowerCase().includes(family.toLowerCase()),
        )
        const computedSize = closestFontSize(computed.fontSize)
        const computedColor = colorToHex(computed.color)
        if (computedFamily) setFontName(computedFamily)
        if (computedSize) setFontSize(computedSize)
        if (computedColor) setColorValue(computedColor)
      }
    } catch {
      /* queryCommand* unavailable */
    }
  }, [])

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount) return
      const insideWordPad = pageRefs.current.some((page) => Boolean(page && page.contains(sel.anchorNode)))
      if (insideWordPad) {
        saveSelection()
        syncActive()
      }
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [saveSelection, syncActive])

  const focusEditor = useCallback(
    (pageIndex = activePage) => {
      const el = pageRefs.current[pageIndex] ?? pageRefs.current[0] ?? null
      if (!el) return null
      el.focus()
      const sel = window.getSelection()
      if (!sel) return el
      if (rangeBelongsToElement(savedRangeRef.current, el)) {
        sel.removeAllRanges()
        sel.addRange(savedRangeRef.current as Range)
        return el
      }
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
      savedRangeRef.current = range.cloneRange()
      return el
    },
    [activePage],
  )

  const markDirty = useCallback(() => {
    setDirty(true)
    setStatus('Modified')
  }, [])

  function exec(command: string, value?: string) {
    focusEditor()
    document.execCommand(command, false, value)
    saveSelection()
    syncActive()
    markDirty()
    recomputeStats()
  }

  function runNativeEditCommand(command: string, value?: string): boolean {
    try {
      focusEditor()
      return document.execCommand(command, false, value)
    } catch {
      return false
    }
  }

  function applyInlineStyle(style: WordPadInlineStyle) {
    const el = focusEditor()
    if (!el) return
    const range = currentRange()
    if (!range) return
    const nextRange = applyWordPadInlineStyle(el, range, style)
    if (!nextRange) return

    const sel = window.getSelection()
    if (!sel) return
    sel.removeAllRanges()
    sel.addRange(nextRange)
    savedRangeRef.current = nextRange.cloneRange()

    // Taglish note: dito sinisigurado na real inline styles ang nasa document,
    // hindi browser-dependent execCommand output lang.
    syncActive()
    markDirty()
    recomputeStats()
  }

  function applyFont(family: string) {
    setFontName(family)
    runNativeEditCommand('fontName', family)
    applyInlineStyle({ fontFamily: family })
  }

  function applyFontSize(pt: string) {
    setFontSize(pt)
    const legacySize = Math.max(1, Math.min(7, Math.round(Number(pt) / 5)))
    runNativeEditCommand('fontSize', String(legacySize))
    applyInlineStyle({ fontSize: `${pt}pt` })
  }

  function applyColor(value: string) {
    setColorValue(value)
    setColorOpen(false)
    runNativeEditCommand('foreColor', value)
    applyInlineStyle({ color: value })
  }

  const showError = useCallback(
    (message: string) => {
      showMessageBox({ title: 'WordPad', message, icon: 'error', buttons: ['ok'] })
    },
    [showMessageBox],
  )

  function save(path = documentPath) {
    const target = path ?? joinPath('C:\\My Documents', normalizeDocumentName(saveAsName))
    const pages = readPagesFromDom()
    const error = fsOps.writeFile(target, { content: wordPadPagesToDocumentHtml(pages) })
    if (error) {
      showError(error)
      return
    }
    setPageHtmls(pages)
    setDocumentPath(target)
    setSaveAsName(baseName(target))
    setDirty(false)
    setStatus(`Saved ${target}`)
  }

  function saveAs() {
    save(joinPath('C:\\My Documents', normalizeDocumentName(saveAsName)))
  }

  function newDocument() {
    const nextPages = [EMPTY_WORDPAD_PAGE_HTML]
    pageRefs.current = []
    savedRangeRef.current = null
    setDocumentPath(undefined)
    setSaveAsName('Document.doc')
    setPageHtmls(nextPages)
    setActivePage(0)
    setDirty(true)
    setStatus('New document')
    recomputeStats(nextPages)
    window.setTimeout(() => focusEditor(0), 0)
  }

  function insertDateTime() {
    exec('insertText', nowStamp())
  }

  function insertPageBreak() {
    const snapshot = readPagesFromDom()
    const insertAt = Math.min(activePage + 1, snapshot.length)
    snapshot.splice(insertAt, 0, EMPTY_WORDPAD_PAGE_HTML)
    pageRefs.current = []
    savedRangeRef.current = null
    setPageHtmls(snapshot)
    setActivePage(insertAt)
    setStatus(`Inserted page ${insertAt + 1}`)
    markDirty()
    recomputeStats(snapshot)
    window.setTimeout(() => focusEditor(insertAt), 0)
  }

  function deleteCurrentPage() {
    const snapshot = readPagesFromDom()
    if (snapshot.length <= 1) {
      snapshot[0] = EMPTY_WORDPAD_PAGE_HTML
      setPageHtmls([...snapshot])
      setStatus('Cleared page 1')
      markDirty()
      recomputeStats(snapshot)
      window.setTimeout(() => focusEditor(0), 0)
      return
    }
    const removeAt = Math.min(activePage, snapshot.length - 1)
    snapshot.splice(removeAt, 1)
    const nextPage = Math.max(0, removeAt - 1)
    pageRefs.current = []
    savedRangeRef.current = null
    setPageHtmls(snapshot)
    setActivePage(nextPage)
    setStatus(`Deleted page ${removeAt + 1}`)
    markDirty()
    recomputeStats(snapshot)
    window.setTimeout(() => focusEditor(nextPage), 0)
  }

  function preserveFocus(event: ReactMouseEvent) {
    // Keep the document selection alive when a toolbar button is pressed.
    event.preventDefault()
    saveSelection()
  }

  function rememberSelection() {
    saveSelection()
  }

  function runMenu(action: () => void) {
    setOpenMenu(null)
    action()
  }

  function handleKeyDown(event: ReactKeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      save()
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
      event.preventDefault()
      newDocument()
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      insertPageBreak()
    }
  }

  const menus: Array<{
    id: string
    label: string
    items: Array<
      | { kind: 'sep' }
      | { label: string; shortcut?: string; checked?: boolean; action: () => void }
    >
  }> = [
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'New', shortcut: 'Ctrl+N', action: newDocument },
        { label: 'Open...', action: () => openApp('explorer', { path: 'C:\\My Documents' }) },
        { label: 'Save', shortcut: 'Ctrl+S', action: () => save() },
        { label: 'Save As...', action: saveAs },
        { kind: 'sep' },
        {
          label: 'Print...',
          action: () =>
            showMessageBox({
              title: 'WordPad',
              message: 'There is no printer installed.',
              detail: 'Printing is not available in this simulated environment.',
              icon: 'info',
              buttons: ['ok'],
            }),
        },
        {
          label: 'Page Setup...',
          action: () =>
            showMessageBox({
              title: 'Page Setup',
              message: 'Paper size: Letter',
              detail: 'Margins are simulated in the page view. Printing is not available in the browser OS.',
              icon: 'info',
              buttons: ['ok'],
            }),
        },
        { kind: 'sep' },
        { label: 'Exit', action: () => closeWindow(windowId) },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => exec('undo') },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => exec('redo') },
        { kind: 'sep' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => exec('cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => exec('copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => exec('paste') },
        { kind: 'sep' },
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => exec('selectAll') },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [{ label: 'Ruler', checked: showRuler, action: () => setShowRuler((value) => !value) }],
    },
    {
      id: 'insert',
      label: 'Insert',
      items: [
        { label: 'Date and Time', action: insertDateTime },
        { kind: 'sep' },
        { label: 'Page Break', shortcut: 'Ctrl+Enter', action: insertPageBreak },
      ],
    },
    {
      id: 'format',
      label: 'Format',
      items: [
        { label: 'Bold', shortcut: 'Ctrl+B', checked: active.bold, action: () => exec('bold') },
        { label: 'Italic', shortcut: 'Ctrl+I', checked: active.italic, action: () => exec('italic') },
        { label: 'Underline', shortcut: 'Ctrl+U', checked: active.underline, action: () => exec('underline') },
        { kind: 'sep' },
        { label: 'Align Left', action: () => exec('justifyLeft') },
        { label: 'Center', action: () => exec('justifyCenter') },
        { label: 'Align Right', action: () => exec('justifyRight') },
        { kind: 'sep' },
        { label: 'Bullets', action: () => exec('insertUnorderedList') },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        {
          label: 'About WordPad',
          action: () =>
            showMessageBox({
              title: 'About WordPad',
              message: 'WordPad for Portfolio 98',
              detail: 'A rich-text editor. Fonts, sizes, colours, and page breaks are saved with each document.',
              icon: 'info',
              buttons: ['ok'],
            }),
        },
      ],
    },
  ]

  return (
    <div className="app-content wordpad-app" onKeyDown={handleKeyDown}>
      <ul className="os-menu-bar" role="menubar">
        {/* eslint-disable-next-line react-hooks/refs */}
        {menus.map((menu) => (
          <li
            key={menu.id}
            className={`wp-menu ${openMenu === menu.id ? 'open' : ''}`}
            role="menuitem"
            onClick={() => setOpenMenu((current) => (current === menu.id ? null : menu.id))}
            onMouseEnter={() => setOpenMenu((current) => (current ? menu.id : current))}
          >
            {menu.label}
            {openMenu === menu.id && (
              <ul className="wp-menu-dropdown" role="menu" onClick={(event) => event.stopPropagation()}>
                {menu.items.map((item, index) =>
                  'kind' in item ? (
                    <li key={`sep-${index}`} className="wp-menu-sep" aria-hidden="true" />
                  ) : (
                    <li key={item.label}>
                      <button
                        type="button"
                        className="wp-menu-item"
                        onMouseDown={preserveFocus}
                        onClick={() => runMenu(item.action)}
                      >
                        <span className="wp-menu-check">{item.checked ? '*' : ''}</span>
                        <span className="wp-menu-text">{item.label}</span>
                        {item.shortcut && <span className="wp-menu-shortcut">{item.shortcut}</span>}
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {openMenu && <div className="wp-menu-backdrop" onClick={() => setOpenMenu(null)} aria-hidden="true" />}

      <div className="wordpad-toolbar">
        <button type="button" onClick={newDocument}>
          New
        </button>
        <button type="button" onClick={() => save()}>
          Save
        </button>
        <input
          aria-label="WordPad document name"
          value={saveAsName}
          onChange={(event) => {
            setSaveAsName(event.target.value)
            setDirty(true)
          }}
        />
        <button type="button" onClick={saveAs}>
          Save As
        </button>
        <span className="wp-toolbar-sep" aria-hidden="true" />
        <button type="button" onMouseDown={preserveFocus} onClick={insertPageBreak}>
          New Page
        </button>
        <button type="button" onMouseDown={preserveFocus} onClick={deleteCurrentPage}>
          Delete Page
        </button>
      </div>

      <div className="wordpad-formatbar">
        <select
          aria-label="Font"
          value={fontName}
          onMouseDown={rememberSelection}
          onChange={(event) => applyFont(event.target.value)}
        >
          {FONT_FAMILIES.map((family) => (
            <option key={family} value={family}>
              {family}
            </option>
          ))}
        </select>
        <select
          aria-label="Font size"
          value={fontSize}
          onMouseDown={rememberSelection}
          onChange={(event) => applyFontSize(event.target.value)}
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="wp-toolbar-sep" aria-hidden="true" />
        <button
          type="button"
          className={active.bold ? 'pressed' : ''}
          onMouseDown={preserveFocus}
          onClick={() => exec('bold')}
          aria-label="Bold"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          className={`wp-italic ${active.italic ? 'pressed' : ''}`}
          onMouseDown={preserveFocus}
          onClick={() => exec('italic')}
          aria-label="Italic"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          className={`wp-underline ${active.underline ? 'pressed' : ''}`}
          onMouseDown={preserveFocus}
          onClick={() => exec('underline')}
          aria-label="Underline"
          title="Underline"
        >
          U
        </button>
        <div className="wp-color">
          <button
            type="button"
            className="wp-color-btn"
            onMouseDown={preserveFocus}
            onClick={() => setColorOpen((value) => !value)}
            aria-label="Font color"
            title="Font color"
          >
            <span className="wp-color-glyph">A</span>
            <span className="wp-color-bar" style={{ background: colorValue }} />
            <span className="wp-color-caret">v</span>
          </button>
          {colorOpen && (
            <ul className="wp-color-menu" role="menu">
              {COLORS.map((color) => (
                <li key={color.name}>
                  <button
                    type="button"
                    className={`wp-color-row ${color.value === colorValue ? 'selected' : ''}`}
                    onMouseDown={preserveFocus}
                    onClick={() => applyColor(color.value)}
                  >
                    <span className="wp-color-chip" style={{ background: color.value }} />
                    <span>{color.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className="wp-toolbar-sep" aria-hidden="true" />
        <button type="button" onMouseDown={preserveFocus} onClick={() => exec('justifyLeft')} title="Align left">
          L
        </button>
        <button type="button" onMouseDown={preserveFocus} onClick={() => exec('justifyCenter')} title="Center">
          C
        </button>
        <button type="button" onMouseDown={preserveFocus} onClick={() => exec('justifyRight')} title="Align right">
          R
        </button>
        <button
          type="button"
          onMouseDown={preserveFocus}
          onClick={() => exec('insertUnorderedList')}
          title="Bullets"
        >
          Bul
        </button>
      </div>

      {showRuler && (
        <div className="wordpad-ruler" aria-hidden="true">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
          <span>6</span>
        </div>
      )}

      <div className="sunken-panel wordpad-workspace">
        <div className="wordpad-pages" role="document" aria-label="WordPad pages">
          {pageHtmls.map((_, index) => (
            <section
              key={`${loadKey}-${pageHtmls.length}-${index}`}
              className={`wordpad-page-shell ${activePage === index ? 'active' : ''}`}
            >
              <p className="wordpad-page-label">Page {index + 1}</p>
              <div
                ref={(node) => {
                  pageRefs.current[index] = node
                }}
                className="wordpad-page"
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-label={`WordPad document page ${index + 1}`}
                spellCheck={false}
                tabIndex={0}
                onPointerDown={() => setActivePage(index)}
                onFocus={() => setActivePage(index)}
                onInput={() => {
                  markDirty()
                  saveSelection()
                  recomputeStats()
                }}
                onMouseUp={() => {
                  saveSelection()
                  syncActive()
                }}
                onKeyUp={() => {
                  saveSelection()
                  syncActive()
                }}
                onBlur={saveSelection}
              />
            </section>
          ))}
        </div>
      </div>

      <div className="status-bar">
        <p className="status-bar-field">{documentPath ?? 'C:\\My Documents\\Document.doc'}</p>
        <p className="status-bar-field">
          Page {activePage + 1} of {pageHtmls.length}
        </p>
        <p className="status-bar-field">{stats.words} word(s)</p>
        <p className="status-bar-field">{stats.chars} char(s)</p>
        <p className="status-bar-field">{dirty ? 'Modified' : status}</p>
      </div>
    </div>
  )
}
