import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '98.css/dist/98.css'
import './index.css'
import App from './App.tsx'
import { OsProvider } from './os/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OsProvider>
      <App />
    </OsProvider>
  </StrictMode>,
)
