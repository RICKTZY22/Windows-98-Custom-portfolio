import { useState } from 'react'
import { win98Icons } from '../../data/icons'
import { portfolioData } from '../../data/portfolioData'
import type { AppId, WindowPayload } from '../../types'

type InternetExplorerAppProps = {
  openApp: (appId: AppId, payload?: WindowPayload) => void
}

const pages = {
  home: 'http://portfolio.local/',
  projects: 'http://portfolio.local/projects',
  contact: 'http://portfolio.local/contact',
  credits: 'http://portfolio.local/credits',
}

export function InternetExplorerApp({ openApp }: InternetExplorerAppProps) {
  const [address, setAddress] = useState(pages.home)
  const [current, setCurrent] = useState(pages.home)

  function navigate(next = address) {
    setCurrent(next)
    setAddress(next)
  }

  return (
    <div className="app-content internet-explorer-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Favorites</li>
        <li>Tools</li>
        <li>Help</li>
      </ul>
      <div className="toolbar browser-toolbar">
        <button type="button" onClick={() => navigate(pages.home)}>
          Home
        </button>
        <button type="button" onClick={() => navigate(pages.projects)}>
          Projects
        </button>
        <button type="button" onClick={() => navigate(pages.contact)}>
          Mail
        </button>
        <form
          className="address-form"
          onSubmit={(event) => {
            event.preventDefault()
            navigate()
          }}
        >
          <label htmlFor="ie-address">Address</label>
          <input id="ie-address" value={address} onChange={(event) => setAddress(event.target.value)} />
        </form>
      </div>
      <div className="sunken-panel browser-page">
        <header className="browser-page-header">
          <img src={win98Icons.html} alt="" />
          <div>
            <h2>{portfolioData.profile.name}</h2>
            <p>{portfolioData.profile.role}</p>
          </div>
        </header>
        {current.includes('/projects') ? (
          <div className="browser-projects">
            {portfolioData.projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => openApp('projectDetails', { projectId: project.id })}
              >
                <img src={win98Icons.internet} alt="" />
                <span>{project.name}</span>
              </button>
            ))}
          </div>
        ) : current.includes('/contact') ? (
          <div className="inset-copy">
            <p>Email: {portfolioData.contact.email}</p>
            <p>Location: {portfolioData.profile.location}</p>
            <button type="button" onClick={() => openApp('contact')}>Open Address Book</button>
          </div>
        ) : current.includes('/credits') ? (
          <div className="inset-copy">
            <p>Local Win98 icon assets are self-hosted from the Alex Meub Windows 98 icon viewer.</p>
            <button type="button" onClick={() => openApp('credits')}>Open Credits.txt</button>
          </div>
        ) : (
          <div className="browser-home">
            <p>{portfolioData.profile.headline}</p>
            <p>{portfolioData.profile.summary}</p>
            <div className="button-row">
              <button type="button" onClick={() => openApp('resume', { filePath: 'C:\\My Documents\\Resume.txt' })}>
                Resume.txt
              </button>
              <button type="button" onClick={() => navigate(pages.projects)}>
                Project Index
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">Done</p>
        <p className="status-bar-field">{current}</p>
      </div>
    </div>
  )
}
