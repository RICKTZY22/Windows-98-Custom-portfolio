import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import type { AppProps } from '../../types'
import { baseName, getNode, joinPath, nowStamp } from '../../os/filesystem'
import { useOs } from '../../os/useOs'

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
  '<span style="color:#0000ff">colour</span> — all formatting is saved with the document.</div>'

function normalizeDocumentName(name: string): string {
  const trimmed = name.trim() || 'Document.doc'
  if (/\.[a-z0-9]+$/i.test(trimmed)) {
    return trimmed
  }
  return `${trimmed.replace(/\.+$/, '') || 'Document'}.doc`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Documents saved by this editor are HTML; legacy seeds are plain text. */
function looksLikeHtml(content: string): boolean {
  return /<[a-z!/][\s\S]*>/i.test(content)
}

function contentToHtml(content: string): string {
  if (looksLikeHtml(content)) {
    return content
  }
  return escapeHtml(content).replace(/\r?\n/g, '<br>') || '<br>'
}

function initialHtmlFor(path: string | undefined, content: string | undefined): string {
  if (!path) {
    return DEFAULT_HTML
  }
  return content ? contentToHtml(content) : '<br>'
}

/** execCommand reports the active font name wrapped in quotes; map it back to a known option. */
function matchFamily(reported: string): string {
  const clean = reported.replace(/['"]/g, '').trim().toLowerCase()
  return FONT_FAMILIES.find((family) => family.toLowerCase() === clean) ?? FONT_FAMILIES[0]
}

export function WordPadApp({ windowId, payload }: AppProps) {
  const { state, fsOps, setWindowTitle, showMessageBox, openApp, closeWindow } = useOs()
  const payloadPath = payload?.filePath
  const file = payloadPath ? getNode(state.fs, payloadPath) : undefined

  const editorRef = useRef<HTMLDivElement | null>(null)
  const savedRangeRef = useRef<Range | null>(null)

  const [documentPath, setDocumentPath] = useState<string | undefined>(() => payloadPath)
  const [saveAsName, setSaveAsName] = useState(() => file?.name ?? 'Document.doc')
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

  function recomputeStats() {
    const text = editorRef.current?.textContent ?? ''
    const trimmed = text.trim()
    setStats({ words: trimmed ? trimmed.split(/\s+/).length : 0, chars: text.length })
  }

  // Load the document into the editable surface exactly once per opened file.
  // Keying on the path (not on content) keeps the caret stable while typing.
  const loadKey = payloadPath ?? '__new__'
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    try {
      document.execCommand('styleWithCSS', false, 'true')
    } catch {
      /* not supported in non-browser test envs */
    }
    el.innerHTML = initialHtmlFor(payloadPath, file?.content)
    setDirty(false)
    recomputeStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey])

  useEffect(() => {
    const titleName = saveAsName || (documentPath ? baseName(documentPath) : 'Document.doc')
    setWindowTitle(windowId, `${dirty ? '*' : ''}${titleName} - WordPad`)
  }, [dirty, documentPath, saveAsName, setWindowTitle, windowId])

  // Remember the most recent selection that lived inside the editor so toolbar
  // controls (which steal focus) can restore it before running a command.
  const saveSelection = useCallback(() => {
    const sel = window.getSelection()
    const el = editorRef.current
    if (sel && sel.rangeCount && el && el.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
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
    } catch {
      /* queryCommand* unavailable */
    }
  }, [])

  useEffect(() => {
    function onSelectionChange() {
      const el = editorRef.current
      const sel = window.getSelection()
      if (sel && sel.rangeCount && el && el.contains(sel.anchorNode)) {
        saveSelection()
        syncActive()
      }
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [saveSelection, syncActive])

  const focusEditor = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    }
  }, [])

  const markDirty = useCallback(() => {
    setDirty(true)
    setStatus('Modified')
  }, [])

  const exec = useCallback(
    (command: string, value?: string) => {
      focusEditor()
      document.execCommand(command, false, value)
      saveSelection()
      syncActive()
      markDirty()
      recomputeStats()
    },
    [focusEditor, saveSelection, syncActive, markDirty],
  )

  function applyFont(family: string) {
    setFontName(family)
    exec('fontName', family)
  }

  // execCommand('fontSize') only understands the 1–7 scale, so we tag the
  // selection with a sentinel size and rewrite it to a real point value.
  function applyFontSize(pt: string) {
    setFontSize(pt)
    focusEditor()
    document.execCommand('fontSize', false, '7')
    const el = editorRef.current
    if (el) {
      el.querySelectorAll('font[size="7"]').forEach((node) => {
        node.removeAttribute('size')
        ;(node as HTMLElement).style.fontSize = `${pt}pt`
      })
    }
    saveSelection()
    markDirty()
  }

  function applyColor(value: string) {
    setColorValue(value)
    setColorOpen(false)
    exec('foreColor', value)
  }

  const showError = useCallback((message: string) => {
    showMessageBox({ title: 'WordPad', message, icon: 'error', buttons: ['ok'] })
  }, [showMessageBox])

  const save = useCallback(
    (path = documentPath) => {
      const target = path ?? joinPath('C:\\My Documents', normalizeDocumentName(saveAsName))
      const html = editorRef.current?.innerHTML ?? ''
      const error = fsOps.writeFile(target, { content: html })
      if (error) {
        showError(error)
        return
      }
      setDocumentPath(target)
      setSaveAsName(baseName(target))
      setDirty(false)
      setStatus(`Saved ${target}`)
    },
    [documentPath, saveAsName, fsOps, showError],
  )

  function saveAs() {
    save(joinPath('C:\\My Documents', normalizeDocumentName(saveAsName)))
  }

  function newDocument() {
    if (editorRef.current) {
      editorRef.current.innerHTML = '<br>'
    }
    savedRangeRef.current = null
    setDocumentPath(undefined)
    setSaveAsName('Document.doc')
    setDirty(true)
    setStatus('New document')
    recomputeStats()
  }

  function insertDateTime() {
    exec('insertText', nowStamp())
  }

  function preserveFocus(event: ReactMouseEvent) {
    // Keep the document selection alive when a toolbar button is pressed.
    event.preventDefault()
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
      items: [{ label: 'Date and Time', action: insertDateTime }],
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
              detail: 'A rich-text editor. Fonts, sizes, and colours are saved with each document.',
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
                        <span className="wp-menu-check">{item.checked ? '✓' : ''}</span>
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
      </div>

      <div className="wordpad-formatbar">
        <select aria-label="Font" value={fontName} onChange={(event) => applyFont(event.target.value)}>
          {FONT_FAMILIES.map((family) => (
            <option key={family} value={family}>
              {family}
            </option>
          ))}
        </select>
        <select aria-label="Font size" value={fontSize} onChange={(event) => applyFontSize(event.target.value)}>
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
            <span className="wp-color-caret">▾</span>
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
          ≡
        </button>
        <button type="button" onMouseDown={preserveFocus} onClick={() => exec('justifyCenter')} title="Center">
          ☰
        </button>
        <button type="button" onMouseDown={preserveFocus} onClick={() => exec('justifyRight')} title="Align right">
          ≡
        </button>
        <button
          type="button"
          onMouseDown={preserveFocus}
          onClick={() => exec('insertUnorderedList')}
          title="Bullets"
        >
          •
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
        <div
          ref={editorRef}
          className="wordpad-page"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="WordPad document"
          spellCheck={false}
          onInput={() => {
            markDirty()
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
      </div>

      <div className="status-bar">
        <p className="status-bar-field">{documentPath ?? 'C:\\My Documents\\Document.doc'}</p>
        <p className="status-bar-field">{stats.words} word(s)</p>
        <p className="status-bar-field">{stats.chars} char(s)</p>
        <p className="status-bar-field">{dirty ? 'Modified' : status}</p>
      </div>
    </div>
  )
}
