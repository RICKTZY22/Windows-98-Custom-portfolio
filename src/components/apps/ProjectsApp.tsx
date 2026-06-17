import './ProjectsApp.css'
import { portfolioData } from '../../data/portfolioData'
import { win98Icons } from '../../data/icons'
import type { AppId, WindowPayload } from '../../types'

type ProjectsAppProps = {
  openApp: (appId: AppId, payload?: WindowPayload) => void
}

export function ProjectsApp({ openApp }: ProjectsAppProps) {
  return (
    <div className="app-content projects-app">
      <div className="toolbar">
        <button type="button" onClick={() => openApp('projectDetails', { projectId: portfolioData.projects[0].id })}>
          Open
        </button>
        <button type="button" onClick={() => openApp('credits')}>
          Credits
        </button>
      </div>
      <div className="sunken-panel file-list">
        {portfolioData.projects.map((project) => (
          <button
            className="file-row"
            key={project.id}
            type="button"
            onClick={() => openApp('projectDetails', { projectId: project.id })}
          >
            <img src={win98Icons.internet} alt="" />
            <span className="file-name">{project.fileName}</span>
            <span>{project.name}</span>
            <span>{project.stack.slice(0, 2).join(', ')}</span>
          </button>
        ))}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{portfolioData.projects.length} object(s)</p>
      </div>
    </div>
  )
}
