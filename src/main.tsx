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
import { AnalyticsScripts } from './analytics'
import { OsProvider } from './os/store'
import { stampOrigin } from './origin'

// Authorship watermark — woven into the entry so it ships in the built bundle.
// origin-fingerprint: JEM-W98P-ORIGIN-7f3a9c1e2b5d
stampOrigin()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OsProvider>
      <App />
    </OsProvider>
    <AnalyticsScripts />
  </StrictMode>,
)
