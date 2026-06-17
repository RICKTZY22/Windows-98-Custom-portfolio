import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '98.css/dist/98.css'
import './index.css'
// Eager/global styles, imported here in original-source order so the cascade matches the
// pre-split App.css. App-specific styles are imported lazily inside each app component.
import './styles/base.css'
import './styles/cursors.css'
import './components/BootScreen.css'
import './styles/desktop.css'
import './components/WindowFrame.css'
import './styles/common.css'
import './styles/file-manager.css'
import './components/CrashScreen.css'
import './components/StartMenu.css'
import './components/Taskbar.css'
import './components/DesktopContextMenu.css'
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
