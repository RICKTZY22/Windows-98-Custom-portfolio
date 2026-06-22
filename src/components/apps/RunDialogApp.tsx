import './RunDialogApp.css'
import { useState } from 'react'
import type { AppId, AppProps } from '../../types'
import { win98Icons } from '../../data/icons'
import { getNode, normalizePath } from '../../os/filesystem'
import { useOs } from '../../os/useOs'

const commands: Record<string, { appId: AppId; path?: string; url?: string; filePath?: string }> = {
  cmd: { appId: 'terminal' },
  command: { appId: 'terminal' },
  control: { appId: 'controlPanel' },
  mspaint: { appId: 'paint' },
  paint: { appId: 'paint' },
  kodakimg: { appId: 'imageViewer' },
  imaging: { appId: 'imageViewer' },
  calc: { appId: 'calculator' },
  calculator: { appId: 'calculator' },
  notepad: { appId: 'notepad' },
  wordpad: { appId: 'wordpad' },
  write: { appId: 'wordpad' },
  sndrec32: { appId: 'soundRecorder' },
  iexplore: { appId: 'internetExplorer' },
  explorer: { appId: 'explorer', path: 'C:\\' },
  resume: { appId: 'wordpad', filePath: 'C:\\My Documents\\Resume.doc' },
  network: { appId: 'network' },
  taskmgr: { appId: 'taskManager' },
  wmplayer: { appId: 'mediaPlayer' },
  mplayer: { appId: 'mediaPlayer' },
  vidplay: { appId: 'videoPlayer' },
  videoplayer: { appId: 'videoPlayer' },
  antivirus: { appId: 'antivirus' },
  av98: { appId: 'antivirus' },
  scan: { appId: 'antivirus' },
  viruslab: { appId: 'antivirus' },
}

export function RunDialogApp({ windowId }: AppProps) {
  const { state, closeWindow, openApp, openNode } = useOs()
  const [command, setCommand] = useState('')
  const [message] = useState('Type the name of a program, folder, document, command, or Internet resource.')

  function run() {
    const value = command.trim()
    if (!value) return
    const lower = value.toLowerCase()
    const target = commands[lower]
    if (target) {
      openApp(target.appId, { path: target.path, url: target.url, filePath: target.filePath })
      closeWindow(windowId)
      return
    }

    if (/^https?:\/\//i.test(value) || value.toLowerCase().startsWith('www.')) {
      openApp('internetExplorer', { url: value })
      closeWindow(windowId)
      return
    }

    const node = getNode(state.fs, normalizePath(value))
    if (node) {
      openNode(node.path)
      closeWindow(windowId)
      return
    }

    // Not an app/URL/file — hand it to the command prompt and run it there, so any
    // shell command (dir, ipconfig, echo, ping, ...) works like a PowerShell/Run combo.
    openApp('terminal', { command: value })
    closeWindow(windowId)
  }

  return (
    <div className="run-dialog-app">
      <div className="identity-row">
        <img src={win98Icons.run} alt="" />
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
        <button type="button" onClick={() => closeWindow(windowId)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
