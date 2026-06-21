import './ProjectsApp.css'
import { useState } from 'react'
import { portfolioData } from '../../data/portfolioData'
import { win98Icons } from '../../data/icons'
import type { AppId, WindowPayload } from '../../types'

type ProjectsAppProps = {
  openApp: (appId: AppId, payload?: WindowPayload) => void
}

export function ProjectsApp({ openApp }: ProjectsAppProps) {
  const [selectedId, setSelectedId] = useState(portfolioData.projects[0]?.id)
  const selectedProject = portfolioData.projects.find((project) => project.id === selectedId) ?? portfolioData.projects[0]

  function projectDir(project = selectedProject): string {
    return `C:\\Projects\\${project.name}`
  }

  function openDetails(): void {
    if (selectedProject) openApp('projectDetails', { projectId: selectedProject.id })
  }

  function openFolder(): void {
    if (selectedProject) openApp('explorer', { path: projectDir() })
  }

  function openDocs(): void {
    if (selectedProject) openApp('notepad', { filePath: `${projectDir()}\\Documentation\\Features.md` })
  }

  return (
    <div className="app-content projects-app">
      <div className="toolbar">
        <button type="button" onClick={openDetails}>
          Details
        </button>
        <button type="button" onClick={openFolder}>
          Folder
        </button>
        <button type="button" onClick={openDocs}>
          Docs
        </button>
        <button type="button" onClick={() => openApp('credits')}>
          Credits
        </button>
      </div>
      <div className="sunken-panel file-list">
        {portfolioData.projects.map((project) => (
          <button
            className={`file-row ${selectedProject?.id === project.id ? 'selected' : ''}`}
            key={project.id}
            type="button"
            aria-pressed={selectedProject?.id === project.id}
            onClick={() => setSelectedId(project.id)}
            onDoubleClick={() => openApp('projectDetails', { projectId: project.id })}
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
        <p className="status-bar-field">{selectedProject ? projectDir(selectedProject) : 'No project selected'}</p>
      </div>
    </div>
  )
}
