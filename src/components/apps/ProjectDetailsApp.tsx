import { portfolioData } from '../../data/portfolioData'
import { win98Icons } from '../../data/icons'

type ProjectDetailsAppProps = {
  projectId?: string
}

export function ProjectDetailsApp({ projectId }: ProjectDetailsAppProps) {
  const project = portfolioData.projects.find((item) => item.id === projectId) ?? portfolioData.projects[0]

  return (
    <div className="app-content project-detail-app">
      <div className="identity-row">
        <img src={win98Icons.internet} alt="" />
        <div>
          <h2>{project.name}</h2>
          <p>{project.summary}</p>
        </div>
      </div>
      <div className="sunken-panel inset-copy">
        <p>{project.details}</p>
      </div>
      <fieldset>
        <legend>Stack</legend>
        <div className="tag-list">
          {project.stack.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </fieldset>
      <div className="button-row">
        <a className="button-like" href={project.links.demo}>
          Demo
        </a>
        <a className="button-like" href={project.links.source}>
          Source
        </a>
      </div>
    </div>
  )
}
