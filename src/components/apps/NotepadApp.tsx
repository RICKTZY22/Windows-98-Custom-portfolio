import { useEffect, useMemo, useState } from 'react'
import type { AppProps } from '../../types'
import { portfolioData } from '../../data/portfolioData'
import { baseName, getNode, joinPath, parentPath } from '../../os/filesystem'
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
  const openedPath = payload?.filePath
  const openedFile = openedPath ? getNode(state.fs, openedPath) : undefined
  const initialText = useMemo(() => {
    if (!openedPath) return defaultNote()
    return openedFile?.content ?? `${openedFile?.name ?? 'Untitled'} is empty.`
  }, [openedFile?.content, openedFile?.name, openedPath])

  const [text, setText] = useState(initialText)
  const [saved, setSaved] = useState(true)
  const [wordWrap, setWordWrap] = useState(true)
  const [currentPath, setCurrentPath] = useState(openedPath)
  const file = currentPath ? getNode(state.fs, currentPath) : undefined
  const [saveAsName, setSaveAsName] = useState(openedFile?.name ?? 'Untitled.txt')

  useEffect(() => {
    const title = `${saved ? '' : '*'}${file?.name ?? (saveAsName || 'Untitled.txt')} - Notepad`
    setWindowTitle(windowId, title)
  }, [file?.name, saveAsName, saved, setWindowTitle, windowId])

  const line = text.slice(0, text.length).split('\n').length
  const column = text.length - text.lastIndexOf('\n')

  function showError(message: string) {
    showMessageBox({ title: 'Notepad', message, icon: 'error', buttons: ['ok'] })
  }

  function writeTo(target: string) {
    const error = fsOps.writeFile(target, { content: text })
    if (error) {
      showError(error)
      return
    }
    setCurrentPath(target)
    setSaveAsName(baseName(target))
    setSaved(true)
  }

  // Save overwrites the current file (or creates one from the name box if this is a new note).
  function save() {
    writeTo(currentPath ?? joinPath('C:\\My Documents', saveAsName || 'Untitled.txt'))
  }

  // Save As writes the name box as a NEW file in the current folder and adopts it.
  function saveAs() {
    const folder = currentPath ? parentPath(currentPath) : 'C:\\My Documents'
    writeTo(joinPath(folder, saveAsName || 'Untitled.txt'))
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
        <button type="button" onClick={save}>
          Save
        </button>
        <input
          aria-label="Save As filename"
          value={saveAsName}
          onChange={(event) => setSaveAsName(event.target.value)}
        />
        <button type="button" onClick={saveAs}>
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
        <p className="status-bar-field">{currentPath ?? joinPath('C:\\My Documents', saveAsName || 'Untitled.txt')}</p>
        <p className="status-bar-field">{text.length} byte(s)</p>
        <p className="status-bar-field">Ln {line}, Col {column}</p>
        <p className="status-bar-field">{saved ? 'Saved' : 'Modified'}</p>
      </div>
    </div>
  )
}
