import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '98.css/dist/98.css'
import './index.css'
// Eager/global styles, imported here in original-source order so the cascade matches the
// pre-split App.css. App-specific styles are imported lazily inside each app component.
import './styles/base.css'
import './styles/cursors.css'
import './components/system/BootScreen.css'
import './styles/desktop.css'
import './components/shell/WindowFrame.css'
import './styles/common.css'
import './styles/file-manager.css'
import './components/system/CrashScreen.css'
import './components/shell/StartMenu.css'
import './components/shell/Taskbar.css'
import './components/shell/DesktopContextMenu.css'
import './styles/responsive.css'
import './styles/system-screens.css'
import './styles/bios.css'
import './styles/message-box.css'
import App from './App.tsx'
import { OsProvider } from './os/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OsProvider>
      <App />
    </OsProvider>
  </StrictMode>,
)
