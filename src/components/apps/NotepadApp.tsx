import { useMemo, useState } from 'react'
import { getFileContent, getNode } from '../../data/filesystem'
import { portfolioData } from '../../data/portfolioData'

type NotepadAppProps = {
  filePath?: string
}

function defaultNote() {
  return [
    `${portfolioData.profile.name} - Portfolio Notes`,
    '',
    'This is a simulated Windows 98 Notepad document.',
    'Open README.txt, About Me.txt, or System32 files from My Computer to inspect them here.',
  ].join('\n')
}

export function NotepadApp({ filePath }: NotepadAppProps) {
  const file = filePath ? getNode(filePath) : undefined
  const initialText = useMemo(() => {
    if (!filePath) {
      return defaultNote()
    }
    return getFileContent(filePath) || `${file?.name ?? 'Untitled'} is empty.`
  }, [file?.name, filePath])
  const [text, setText] = useState(initialText)
  const [saved, setSaved] = useState(true)

  return (
    <div className="app-content notepad-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>Search</li>
        <li>Help</li>
      </ul>
      <textarea
        className="notepad-textarea"
        aria-label="Notepad document"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setSaved(false)
        }}
      />
      <div className="status-bar">
        <p className="status-bar-field">{file?.name ?? 'Untitled.txt'}</p>
        <p className="status-bar-field">{text.length} byte(s)</p>
        <p className="status-bar-field">{saved ? 'Saved' : 'Modified'}</p>
        <button
          type="button"
          onClick={() => setSaved(true)}
          aria-label="Save document"
        >
          Save
        </button>
      </div>
    </div>
  )
}
