import { portfolioData } from '../../data/portfolioData'
import { win98Icons } from '../../data/icons'
import { getFileContent } from '../../data/filesystem'

type ResumeAppProps = {
  filePath?: string
}

export function ResumeApp({ filePath }: ResumeAppProps) {
  const fileContent = filePath ? getFileContent(filePath) : ''

  return (
    <div className="app-content resume-app">
      <div className="document-header">
        <img src={win98Icons.resume} alt="" />
        <div>
          <h2>{filePath ? 'Resume.txt' : 'Resume'}</h2>
          <p>Editable placeholder resume content</p>
        </div>
      </div>
      <div className="sunken-panel resume-document">
        {fileContent ? (
          <pre>{fileContent}</pre>
        ) : (
          portfolioData.resume.sections.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
      <div className="button-row">
        <a className="button-like" href={portfolioData.resume.downloadUrl}>
          Download Resume
        </a>
      </div>
    </div>
  )
}
