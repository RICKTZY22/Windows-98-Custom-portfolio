import { win98Icons } from '../data/icons'
import type { AppId, NetworkStatus, WindowPayload } from '../types'

type StartMenuProps = {
  openApp: (appId: AppId, payload?: WindowPayload) => void
  onRestart: () => void
  network: NetworkStatus
}

export function StartMenu({ openApp, onRestart, network }: StartMenuProps) {
  const launch = (appId: AppId, payload?: WindowPayload) => () => openApp(appId, payload)

  return (
    <nav className="start-menu" aria-label="Start menu">
      <div className="start-rail">
        <span>Windows</span>
        <strong>98</strong>
      </div>
      <ul className="start-list">
        <li className="start-row has-submenu" tabIndex={0}>
          <span className="start-row-label">
            <img src={win98Icons.folder} alt="" />
            Programs
          </span>
          <span className="submenu-arrow">&gt;</span>
          <ul className="submenu programs-submenu">
            <li className="has-submenu" tabIndex={0}>
              <button type="button">
                <img src={win98Icons.programGroup} alt="" />
                Accessories
                <span className="submenu-arrow">&gt;</span>
              </button>
              <ul className="submenu nested-submenu">
                <li>
                  <button type="button" onClick={launch('paint')}>
                    <img src={win98Icons.paint} alt="" />
                    Paint
                  </button>
                </li>
                <li>
                  <button type="button" onClick={launch('notepad')}>
                    <img src={win98Icons.notepad} alt="" />
                    Notepad
                  </button>
                </li>
                <li>
                  <button type="button" onClick={launch('calculator')}>
                    <img src={win98Icons.calculator} alt="" />
                    Calculator
                  </button>
                </li>
                <li>
                  <button type="button" onClick={launch('soundRecorder')}>
                    <img src={win98Icons.soundRecorder} alt="" />
                    Sound Recorder
                  </button>
                </li>
              </ul>
            </li>
            <li>
              <button type="button" onClick={launch('internetExplorer')}>
                <img src={win98Icons.internet} alt="" />
                Internet Explorer
              </button>
            </li>
            <li>
              <button type="button" onClick={launch('terminal')}>
                <img src={win98Icons.terminal} alt="" />
                MS-DOS Prompt
              </button>
            </li>
            <li>
              <button type="button" onClick={launch('computer', { path: 'C:\\' })}>
                <img src={win98Icons.computer} alt="" />
                Windows Explorer
              </button>
            </li>
            <li className="has-submenu" tabIndex={0}>
              <button type="button">
                <img src={win98Icons.folder} alt="" />
                Portfolio
                <span className="submenu-arrow">&gt;</span>
              </button>
              <ul className="submenu nested-submenu">
                <li>
                  <button type="button" onClick={launch('about')}>
                    <img src={win98Icons.about} alt="" />
                    About Me
                  </button>
                </li>
                <li>
                  <button type="button" onClick={launch('projects')}>
                    <img src={win98Icons.projects} alt="" />
                    Projects
                  </button>
                </li>
                <li>
                  <button type="button" onClick={launch('resume', { filePath: 'C:\\My Documents\\Resume.txt' })}>
                    <img src={win98Icons.resume} alt="" />
                    Resume.txt
                  </button>
                </li>
                <li>
                  <button type="button" onClick={launch('contact')}>
                    <img src={win98Icons.contact} alt="" />
                    Contact
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </li>
        <li className="start-row has-submenu" tabIndex={0}>
          <span className="start-row-label">
            <img src={win98Icons.projects} alt="" />
            Documents
          </span>
          <span className="submenu-arrow">&gt;</span>
          <ul className="submenu documents-submenu">
            <li>
              <button type="button" onClick={launch('resume', { filePath: 'C:\\My Documents\\Resume.txt' })}>
                <img src={win98Icons.resume} alt="" />
                Resume.txt
              </button>
            </li>
            <li>
              <button type="button" onClick={launch('documents')}>
                <img src={win98Icons.projects} alt="" />
                My Documents
              </button>
            </li>
            <li>
              <button type="button" onClick={launch('pictures')}>
                <img src={win98Icons.folder} alt="" />
                My Pictures
              </button>
            </li>
          </ul>
        </li>
        <li className="start-row has-submenu" tabIndex={0}>
          <span className="start-row-label">
            <img src={win98Icons.controlPanel} alt="" />
            Settings
          </span>
          <span className="submenu-arrow">&gt;</span>
          <ul className="submenu settings-submenu">
            <li>
              <button type="button" onClick={() => openApp('controlPanel')}>
                <img src={win98Icons.controlPanel} alt="" />
                Control Panel
              </button>
            </li>
            <li>
              <button type="button" onClick={launch('controlPanel', { controlPanelSection: 'printers' })}>
                <img src={win98Icons.printer} alt="" />
                Printers
              </button>
            </li>
            <li>
              <button type="button" onClick={() => openApp('network')}>
                <img src={win98Icons.network} alt="" />
                Network
              </button>
            </li>
            <li>
              <button type="button" onClick={() => openApp('systemProperties')}>
                <img src={win98Icons.gears} alt="" />
                System
              </button>
            </li>
            <li>
              <button type="button" onClick={launch('themes')}>
                <img src={win98Icons.desktop} alt="" />
                Display
              </button>
            </li>
          </ul>
        </li>
        <li className="start-row has-submenu" tabIndex={0}>
          <span className="start-row-label">
            <img src={win98Icons.favorites} alt="" />
            Favorites
          </span>
          <span className="submenu-arrow">&gt;</span>
          <ul className="submenu favorites-submenu">
            <li>
              <button type="button" onClick={launch('internetExplorer')}>
                <img src={win98Icons.html} alt="" />
                Portfolio.local
              </button>
            </li>
            <li>
              <button type="button" onClick={launch('credits')}>
                <img src={win98Icons.help} alt="" />
                CREDITS.txt
              </button>
            </li>
          </ul>
        </li>
        <li>
          <button className="start-row-button" type="button" onClick={() => openApp('computer', { path: 'C:\\' })}>
            <img src={win98Icons.computer} alt="" />
            My Computer
          </button>
        </li>
        <li>
          <button className="start-row-button" type="button" onClick={launch('computer', { path: 'C:\\' })}>
            <img src={win98Icons.search} alt="" />
            Find
          </button>
        </li>
        <li>
          <button className="start-row-button" type="button" onClick={launch('credits')}>
            <img src={win98Icons.help} alt="" />
            Help
          </button>
        </li>
        <li>
          <button className="start-row-button" type="button" onClick={() => openApp('run')}>
            <img src={win98Icons.windowsFile} alt="" />
            Run...
          </button>
        </li>
        <li>
          <button className="start-row-button" type="button" onClick={() => openApp('taskManager')}>
            <img src={win98Icons.taskManager} alt="" />
            Task Manager
          </button>
        </li>
        <li>
          <button className="start-row-button" type="button" onClick={() => openApp('credits')}>
            <img src={win98Icons.help} alt="" />
            Credits
          </button>
        </li>
        <li className="start-separator" aria-hidden="true"></li>
        <li className="start-network-row">
          <img src={win98Icons.network} alt="" />
          Ethernet: {network.connected ? 'Online' : 'Offline'}
        </li>
        <li>
          <button className="start-row-button" type="button" onClick={onRestart}>
            <img src={win98Icons.shutdownComputer} alt="" />
            Restart...
          </button>
        </li>
      </ul>
    </nav>
  )
}
