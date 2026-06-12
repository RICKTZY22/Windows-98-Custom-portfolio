import { useState } from 'react'
import { getNode, getParentPath, normalizePath } from '../../data/filesystem'
import { win98Icons } from '../../data/icons'
import type { AppId, WindowPayload } from '../../types'

type RunDialogAppProps = {
  openApp: (appId: AppId, payload?: WindowPayload) => void
}

export function RunDialogApp({ openApp }: RunDialogAppProps) {
  const [command, setCommand] = useState('')
  const [message, setMessage] = useState('Type the name of a program, folder, or document.')

  function run() {
    const value = command.trim()
    const lower = value.toLowerCase()
    const commands: Record<string, AppId> = {
      cmd: 'terminal',
      command: 'terminal',
      control: 'controlPanel',
      mspaint: 'paint',
      paint: 'paint',
      calc: 'calculator',
      calculator: 'calculator',
      notepad: 'notepad',
      sndrec32: 'soundRecorder',
      iexplore: 'internetExplorer',
      explorer: 'computer',
      resume: 'resume',
      network: 'network',
      sysdm: 'systemProperties',
      taskmgr: 'taskManager',
      themes: 'themes',
    }
    if (commands[lower]) {
      openApp(commands[lower])
      return
    }
    const node = getNode(normalizePath(value))
    if (node?.kind === 'folder') {
      openApp('computer', { path: node.path })
      return
    }
    if (node?.appId) {
      openApp(
        node.appId,
        node.fileType === 'Application' ? { path: getParentPath(node.path) } : { filePath: node.path },
      )
      return
    }
    setMessage('Windows cannot find the specified file.')
  }

  return (
    <div className="run-dialog-app">
      <div className="identity-row">
        <img src={win98Icons.windowsFile} alt="" />
        <p>{message}</p>
      </div>
      <div className="field-row">
        <label htmlFor="run-command">Open:</label>
        <input
          id="run-command"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              run()
            }
          }}
          autoFocus
        />
      </div>
      <div className="button-row run-buttons">
        <button type="button" className="default" onClick={run}>
          OK
        </button>
        <button type="button" onClick={() => setCommand('')}>
          Cancel
        </button>
      </div>
    </div>
  )
}
