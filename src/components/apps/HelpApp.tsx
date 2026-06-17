import { useState } from 'react'
import { win98Icons } from '../../data/icons'
import { portfolioData } from '../../data/portfolioData'

type Topic = 'start' | 'programs' | 'commands'

const TOPICS: Array<{ id: Topic; label: string }> = [
  { id: 'start', label: 'Getting Started' },
  { id: 'programs', label: 'The Programs' },
  { id: 'commands', label: 'MS-DOS Prompt Commands' },
]

const DOS_COMMANDS: Array<{ cmd: string; desc: string }> = [
  { cmd: 'dir', desc: 'List the files and folders in the current directory.' },
  { cmd: 'cd / chdir', desc: 'Change directory. Use "cd .." to go up one level.' },
  { cmd: 'tree', desc: 'Show the folder structure as a tree.' },
  { cmd: 'type', desc: 'Print a text file to the screen.' },
  { cmd: 'md / mkdir', desc: 'Create a new folder.' },
  { cmd: 'rd / rmdir', desc: 'Remove a folder.' },
  { cmd: 'del / erase', desc: 'Delete a file (sent to the Recycle Bin).' },
  { cmd: 'copy', desc: 'Copy a file to another location.' },
  { cmd: 'move', desc: 'Move a file to another location.' },
  { cmd: 'ren / rename', desc: 'Rename a file or folder.' },
  { cmd: 'attrib', desc: 'Show file attributes (read-only, system, hidden).' },
  { cmd: 'cls', desc: 'Clear the screen.' },
  { cmd: 'echo', desc: 'Print text back to the screen.' },
  { cmd: 'ver / winver', desc: 'Show the Windows version.' },
  { cmd: 'date / time', desc: 'Show the current date or time.' },
  { cmd: 'mem', desc: 'Show simulated memory usage.' },
  { cmd: 'chkdsk / scandisk', desc: 'Check the simulated disk for errors.' },
  { cmd: 'format', desc: 'Pretend to format a drive (it is only simulated!).' },
  { cmd: 'ping', desc: 'Ping a host through the simulated Ethernet adapter.' },
  { cmd: 'ipconfig / winipcfg', desc: 'Show the network adapter configuration.' },
  { cmd: 'scanreg', desc: 'Scan or restore the registry (system recovery).' },
  { cmd: 'sfc', desc: 'System File Checker — verify protected system files.' },
  { cmd: 'start <name>', desc: 'Launch a program, e.g. "start notepad".' },
  { cmd: 'notepad / mspaint / calc / iexplore', desc: 'Open that accessory directly.' },
  { cmd: 'win', desc: 'Return to the Windows desktop (from the DOS-only screen).' },
  { cmd: 'help', desc: 'List the available commands inside the prompt.' },
  { cmd: 'exit', desc: 'Close the MS-DOS Prompt.' },
]

export function HelpApp() {
  const [topic, setTopic] = useState<Topic>('start')

  return (
    <div className="app-content help-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>Bookmark</li>
        <li>Options</li>
        <li>Help</li>
      </ul>
      <div className="help-layout">
        <div className="sunken-panel help-nav">
          <p className="help-nav-title">
            <img src={win98Icons.help} alt="" /> Help Topics
          </p>
          <ul>
            {TOPICS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`help-nav-btn ${topic === item.id ? 'selected' : ''}`}
                  onClick={() => setTopic(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="sunken-panel help-body">
          {topic === 'start' && (
            <article className="help-article">
              <h2>Welcome to {portfolioData.profile.name}'s Windows 98 Portfolio</h2>
              <p>
                This whole page is a simulated Windows 98 desktop running in your browser. Everything below works
                like the real thing — explore it the way you would an old PC.
              </p>
              <h3>Opening things</h3>
              <ul className="help-list">
                <li><b>Double-click</b> a desktop icon (or select it and press <b>Enter</b>) to open it.</li>
                <li>Click <b>Start</b> in the bottom-left for the full list of Programs, Settings and Documents.</li>
                <li>Drag a rubber-band box across the desktop to select several icons at once.</li>
                <li>Right-click the desktop for Refresh, Arrange Icons and display options.</li>
              </ul>
              <h3>Working with windows</h3>
              <ul className="help-list">
                <li>Drag a window's <b>title bar</b> to move it; drag an edge or corner to resize.</li>
                <li>Use the <b>_ □ ✕</b> buttons to minimize, maximize and close.</li>
                <li>Click a button on the <b>taskbar</b> to switch between open windows.</li>
              </ul>
              <h3>Sound</h3>
              <p>
                Browsers block audio until you interact with the page, so click anywhere once and the startup sound and
                effects will kick in. Toggle sound from the speaker icon in the taskbar tray or in Control Panel → Sounds.
              </p>
            </article>
          )}

          {topic === 'programs' && (
            <article className="help-article">
              <h2>The Programs</h2>
              <dl className="help-defs">
                <dt>My Computer</dt>
                <dd>Browse the virtual C: drive — create, rename, copy, move and delete files.</dd>
                <dt>My Pictures</dt>
                <dd>A gallery of your images and videos (from C:\My Pictures and C:\My Videos).</dd>
                <dt>Notepad &amp; WordPad</dt>
                <dd>Plain-text and rich-text editors. WordPad saves fonts, sizes and colours with the document.</dd>
                <dt>Paint</dt>
                <dd>Draw with pencil, brush, shapes, fill bucket, eyedropper and text. Undo/redo and save as PNG.</dd>
                <dt>Internet Explorer</dt>
                <dd>Browse real Web Archive snapshots. It opens on archived Google and routes typed sites through Wayback.</dd>
                <dt>Media Player</dt>
                <dd>Plays local clips you add under public/media (listed in src/data/media.ts).</dd>
                <dt>Control Panel</dt>
                <dd>Change the colour scheme and wallpaper, the mouse pointer, and sound settings.</dd>
                <dt>MS-DOS Prompt</dt>
                <dd>A working command line — see the next topic for the commands it understands.</dd>
                <dt>Recycle Bin</dt>
                <dd>Holds deleted files so you can restore them, or empty it to remove them for good.</dd>
              </dl>
            </article>
          )}

          {topic === 'commands' && (
            <article className="help-article">
              <h2>MS-DOS Prompt Commands</h2>
              <p>
                Open <b>Start → Programs → MS-DOS Prompt</b> and type any of these, then press Enter. Paths use the
                Windows style, e.g. <code>cd "C:\My Documents"</code>.
              </p>
              <table className="help-commands">
                <thead>
                  <tr>
                    <th>Command</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {DOS_COMMANDS.map((entry) => (
                    <tr key={entry.cmd}>
                      <td><code>{entry.cmd}</code></td>
                      <td>{entry.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{portfolioData.profile.name} — Windows 98 Portfolio Edition</p>
        <p className="status-bar-field">Help</p>
      </div>
    </div>
  )
}
