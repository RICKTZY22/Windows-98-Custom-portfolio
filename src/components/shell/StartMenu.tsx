import { startMenuModel, type StartMenuModel } from '../../data/apps'
import { win98Icons } from '../../data/icons'
import type { AppId, NetworkState, WindowPayload } from '../../types'

type StartMenuProps = {
  openApp: (appId: AppId, payload?: WindowPayload) => void
  onRestart: () => void
  onShutdown: () => void
  network: NetworkState
}

function MenuItems({ items, openApp }: { items: StartMenuModel; openApp: StartMenuProps['openApp'] }) {
  return (
    <>
      {items.map((item) => {
        if (item.kind === 'separator') {
          return <li key={item.id} className="start-separator" aria-hidden="true" />
        }

        if (item.kind === 'submenu') {
          return (
            <li key={item.id} className="has-submenu" tabIndex={0}>
              <button type="button">
                <img src={win98Icons[item.icon]} alt="" />
                {item.label}
                <span className="submenu-arrow">&gt;</span>
              </button>
              <ul className="submenu nested-submenu">
                <MenuItems items={item.items} openApp={openApp} />
              </ul>
            </li>
          )
        }

        return (
          <li key={item.id}>
            <button type="button" onClick={() => openApp(item.appId, item.payload)}>
              <img src={win98Icons[item.icon]} alt="" />
              {item.label}
            </button>
          </li>
        )
      })}
    </>
  )
}

export function StartMenu({ openApp, onRestart, onShutdown, network }: StartMenuProps) {
  return (
    <nav className="start-menu" aria-label="Start menu">
      <div className="start-rail">
        <span>Windows</span>
        <strong>98</strong>
      </div>
      <ul className="start-list">
        <MenuItems items={startMenuModel} openApp={openApp} />
        <li>
          <button className="start-row-button" type="button" onClick={() => openApp('explorer', { path: 'C:\\' })}>
            <img src={win98Icons.computer} alt="" />
            My Computer
          </button>
        </li>
        <li>
          <button className="start-row-button" type="button" onClick={() => openApp('explorer', { path: 'C:\\' })}>
            <img src={win98Icons.search} alt="" />
            Find
          </button>
        </li>
        <li>
          <button className="start-row-button" type="button" onClick={() => openApp('help')}>
            <img src={win98Icons.help} alt="" />
            Help
          </button>
        </li>
        <li>
          <button className="start-row-button" type="button" onClick={() => openApp('run')}>
            <img src={win98Icons.run} alt="" />
            Run...
          </button>
        </li>
        <li>
          <button className="start-row-button" type="button" onClick={() => openApp('taskManager')}>
            <img src={win98Icons.taskManager} alt="" />
            Task Manager
          </button>
        </li>
        <li className="start-separator" aria-hidden="true" />
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
        <li>
          <button className="start-row-button" type="button" onClick={onShutdown}>
            <img src={win98Icons.shutdown} alt="" />
            Shut Down...
          </button>
        </li>
      </ul>
    </nav>
  )
}
