import { useEffect, useMemo, useState } from 'react'
import type { AppProps } from '../../types'
import { portfolioData } from '../../data/portfolioData'
import { getNode, joinPath } from '../../os/filesystem'
import { useOs } from '../../os/useOs'

function defaultNote() {
  return [
    `${portfolioData.profile.name} - Portfolio Notes`,
    '',
    'This is a simulated Windows 98 Notepad document.',
    'Open README.txt, About Me.txt, or System32 placeholder files from Explorer to inspect them here.',
    'Use WordPad for Resume.doc and richer portfolio documents.',
  ].join('\n')
}

export function NotepadApp({ windowId, payload }: AppProps) {
  const { state, fsOps, setWindowTitle, showMessageBox } = useOs()
  const filePath = payload?.filePath
  const file = filePath ? getNode(state.fs, filePath) : undefined
  const initialText = useMemo(() => {
    if (!filePath) return defaultNote()
    return file?.content ?? `${file?.name ?? 'Untitled'} is empty.`
  }, [file?.content, file?.name, filePath])

  const [text, setText] = useState(initialText)
  const [saved, setSaved] = useState(true)
  const [wordWrap, setWordWrap] = useState(true)
  const [saveAsName, setSaveAsName] = useState(file?.name ?? 'Untitled.txt')

  useEffect(() => {
    const title = `${saved ? '' : '*'}${file?.name ?? (saveAsName || 'Untitled.txt')} - Notepad`
    setWindowTitle(windowId, title)
  }, [file?.name, saveAsName, saved, setWindowTitle, windowId])

  const line = text.slice(0, text.length).split('\n').length
  const column = text.length - text.lastIndexOf('\n')

  function showError(message: string) {
    showMessageBox({ title: 'Notepad', message, icon: 'error', buttons: ['ok'] })
  }

  function save(path = filePath) {
    const target = path ?? joinPath('C:\\My Documents', saveAsName || 'Untitled.txt')
    const error = fsOps.writeFile(target, { content: text })
    if (error) {
      showError(error)
      return
    }
    setSaved(true)
  }

  return (
    <div className="app-content notepad-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>Search</li>
        <li>Help</li>
      </ul>
      <div className="toolbar">
        <button type="button" onClick={() => save()}>
          Save
        </button>
        <input
          aria-label="Save As filename"
          value={saveAsName}
          onChange={(event) => setSaveAsName(event.target.value)}
        />
        <button type="button" onClick={() => save(joinPath('C:\\My Documents', saveAsName || 'Untitled.txt'))}>
          Save As
        </button>
        <label>
          <input type="checkbox" checked={wordWrap} onChange={(event) => setWordWrap(event.target.checked)} /> Word Wrap
        </label>
      </div>
      <textarea
        className="notepad-textarea"
        aria-label="Notepad document"
        value={text}
        wrap={wordWrap ? 'soft' : 'off'}
        onChange={(event) => {
          setText(event.target.value)
          setSaved(false)
        }}
      />
      <div className="status-bar">
        <p className="status-bar-field">{file?.path ?? 'C:\\My Documents\\Untitled.txt'}</p>
        <p className="status-bar-field">{text.length} byte(s)</p>
        <p className="status-bar-field">Ln {line}, Col {column}</p>
        <p className="status-bar-field">{saved ? 'Saved' : 'Modified'}</p>
      </div>
    </div>
  )
}
