import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import './PortfolioApp.css'
import { certificates } from '../../data/certificates'
import { win98Icons } from '../../data/icons'
import { portfolioData, type PortfolioProject } from '../../data/portfolioData'
import { deleteLocalMediaRef, storeLocalMediaFile } from '../../os/localMedia'
import { extensionOf, formatSize, getNode, listDirectory } from '../../os/filesystem'
import { useOs } from '../../os/useOs'
import { useResolvedMediaUrl } from '../../os/useResolvedMediaUrl'
import type { FsNode, IconKey } from '../../types'

type PortfolioSectionId = 'overview' | 'about' | 'projects' | 'certificates' | 'resume' | 'contact' | 'credits'
type ProjectTabId = `project:${string}`
type PortfolioTabId = PortfolioSectionId | ProjectTabId
type ProjectPanel = 'details' | 'documentation' | 'uploads'

type PortfolioSection = {
  id: PortfolioSectionId
  label: string
  icon: IconKey
  hint: string
}

type ImportResult = {
  added: number
  failed: number
}

const sections: PortfolioSection[] = [
  { id: 'overview', label: 'Home', icon: 'student', hint: 'Quick summary' },
  { id: 'about', label: 'About', icon: 'about', hint: 'Story and highlights' },
  { id: 'projects', label: 'Projects', icon: 'projects', hint: 'Featured work' },
  { id: 'certificates', label: 'Certificates', icon: 'html', hint: 'Verified results' },
  { id: 'resume', label: 'Resume', icon: 'wordpad', hint: 'Experience notes' },
  { id: 'contact', label: 'Contact', icon: 'contact', hint: 'Links and availability' },
  { id: 'credits', label: 'Credits', icon: 'help', hint: 'Tools and thanks' },
]

const overviewCards = [
  {
    title: 'Frontend & UI/UX',
    body: 'Focused on polished React interfaces, expressive layouts, responsive details, and interactive browser experiences.',
  },
  {
    title: 'Creative builds',
    body: 'Projects lean into memorable presentation: retro desktops, animated stories, capstone dashboards, and playful app surfaces.',
  },
  {
    title: 'AI-assisted workflow',
    body: 'Uses AI to move faster while keeping the final work readable, testable, and portfolio-ready.',
  },
]

const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp'])
const videoExtensions = new Set(['mp4', 'avi', 'webm', 'mov', 'mkv', 'ogg'])
const audioExtensions = new Set(['wav', 'mp3', 'mid'])

function displayHref(href: string): string {
  return href.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

function projectTabId(projectId: string): ProjectTabId {
  return `project:${projectId}`
}

function isProjectTab(tabId: PortfolioTabId): tabId is ProjectTabId {
  return tabId.startsWith('project:')
}

function projectIdFromTab(tabId: ProjectTabId): string {
  return tabId.slice('project:'.length)
}

function projectRoot(project: PortfolioProject): string {
  return `C:\\Projects\\${project.name}`
}

function projectUploadDir(project: PortfolioProject): string {
  return `${projectRoot(project)}\\Uploads`
}

function shortProjectLabel(project: PortfolioProject): string {
  if (project.name.length <= 18) return project.name
  return `${project.name.slice(0, 16)}...`
}

function uniqueUploadName(existingNames: Set<string>, desired: string): string {
  if (!existingNames.has(desired.toLowerCase())) {
    existingNames.add(desired.toLowerCase())
    return desired
  }
  const ext = extensionOf(desired)
  const stem = ext ? desired.slice(0, desired.length - ext.length - 1) : desired
  for (let index = 2; index < 1000; index += 1) {
    const candidate = ext ? `${stem} (${index}).${ext}` : `${stem} (${index})`
    if (!existingNames.has(candidate.toLowerCase())) {
      existingNames.add(candidate.toLowerCase())
      return candidate
    }
  }
  return desired
}

function projectDocumentation(project: PortfolioProject) {
  return [
    {
      title: 'Project Brief',
      lines: [project.summary],
    },
    {
      title: 'Implementation Notes',
      lines: [project.details],
    },
    {
      title: 'Virtual Documentation',
      lines: [
        `C:\\Projects\\${project.name}\\Documentation\\Features.md`,
        `Project launcher: ${project.fileName}`,
        'This project tab keeps the project writeup, docs, and uploaded assets in one place.',
      ],
    },
    {
      title: 'Stack Snapshot',
      lines: project.stack.slice(0, 12),
    },
  ]
}

function ProjectUploadItem({ node }: { node: FsNode }) {
  const resolvedSrc = useResolvedMediaUrl(node.dataUrl)
  const ext = extensionOf(node.name)
  const isImage = imageExtensions.has(ext)
  const isVideo = videoExtensions.has(ext)
  const isAudio = audioExtensions.has(ext)

  return (
    <article className="portfolio-upload-item">
      <div className="portfolio-upload-preview">
        {isImage && resolvedSrc ? (
          <img src={resolvedSrc} alt={node.name} />
        ) : isVideo && resolvedSrc ? (
          <video src={resolvedSrc} controls />
        ) : isAudio && resolvedSrc ? (
          <audio src={resolvedSrc} controls />
        ) : (
          <img src={win98Icons[node.icon]} alt="" />
        )}
      </div>
      <div className="portfolio-upload-meta">
        <strong>{node.name}</strong>
        <span>
          {node.fileType} - {formatSize(node.size) || '0 KB'}
        </span>
        {resolvedSrc ? (
          <a href={resolvedSrc} target="_blank" rel="noreferrer" download={node.name}>
            Open saved copy
          </a>
        ) : (
          <small>Stored locally in this browser</small>
        )}
      </div>
    </article>
  )
}

export function PortfolioApp() {
  const { contact, creditsStack, profile, projects, resume, specialThanks } = portfolioData
  const { fsOps, notify, showMessageBox, state } = useOs()
  const [activeTab, setActiveTab] = useState<PortfolioTabId>('overview')
  const [projectTabIds, setProjectTabIds] = useState<string[]>([])
  const [projectPanel, setProjectPanel] = useState<ProjectPanel>('details')
  const [draggingUpload, setDraggingUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeProjectId = isProjectTab(activeTab) ? projectIdFromTab(activeTab) : null
  const activeProject = projects.find((project) => project.id === activeProjectId)
  const activeMeta = activeProject
    ? { label: activeProject.name, icon: 'projects' as IconKey, hint: 'Project tab' }
    : sections.find((section) => section.id === activeTab) ?? sections[0]
  const summaryParagraphs = profile.summary.split('\n\n')

  const uploadItems = useMemo(() => {
    if (!activeProject) return []
    return listDirectory(state.fs, projectUploadDir(activeProject)).filter((node) => node.kind === 'file')
  }, [activeProject, state.fs])

  const statusDetail = activeProject
    ? `${activeProject.name} - ${projectPanel}`
    : activeTab === 'projects'
      ? 'Click a project to open a new project tab'
      : contact.availability

  function openProjectTab(project: PortfolioProject): void {
    setProjectTabIds((current) => (current.includes(project.id) ? current : [...current, project.id]))
    setProjectPanel('details')
    setActiveTab(projectTabId(project.id))
  }

  function closeProjectTab(projectId: string): void {
    setProjectTabIds((current) => current.filter((id) => id !== projectId))
    if (activeTab === projectTabId(projectId)) {
      setActiveTab('projects')
    }
  }

  function ensureUploadFolder(project: PortfolioProject): string | null {
    const root = projectRoot(project)
    const uploads = projectUploadDir(project)
    if (!getNode(state.fs, root)) {
      showMessageBox({
        title: 'Project Folder Missing',
        message: 'The project folder could not be found.',
        detail: `${root}\n\nRestore the simulated files or recreate this project folder before uploading files.`,
        icon: 'warning',
        buttons: ['ok'],
      })
      return null
    }
    if (!getNode(state.fs, uploads)) {
      const error = fsOps.createFolder(root, 'Uploads')
      if (error && !/already exists/i.test(error)) {
        showMessageBox({
          title: 'Upload Folder Error',
          message: 'The upload folder could not be created.',
          detail: error,
          icon: 'warning',
          buttons: ['ok'],
        })
        return null
      }
    }
    return uploads
  }

  async function importProjectFiles(project: PortfolioProject, files: FileList | File[]): Promise<void> {
    if (uploading) return
    const uploads = ensureUploadFolder(project)
    if (!uploads) return
    const fileList = Array.from(files)
    if (!fileList.length) return

    setUploading(true)
    const result: ImportResult = { added: 0, failed: 0 }
    const existingNames = new Set(listDirectory(state.fs, uploads).map((node) => node.name.toLowerCase()))

    for (const file of fileList) {
      try {
        const stored = await storeLocalMediaFile(file)
        const name = uniqueUploadName(existingNames, file.name)
        const error = fsOps.createFile(uploads, name, {
          dataUrl: stored.ref,
          size: stored.size,
          content: `Local browser upload\nName: ${file.name}\nType: ${stored.type || 'application/octet-stream'}\nSize: ${stored.size}`,
        })
        if (error) {
          await deleteLocalMediaRef(stored.ref)
          result.failed += 1
        } else {
          result.added += 1
        }
      } catch {
        result.failed += 1
      }
    }

    setUploading(false)
    if (result.added) {
      notify('Project files imported', `${result.added} file(s) saved to ${project.name}.`, {
        kind: 'success',
        icon: 'projects',
        dedupeKey: `project-import-${project.id}`,
      })
      setProjectPanel('uploads')
    }
    if (result.failed) {
      showMessageBox({
        title: 'Import Complete',
        message: `${result.added} file(s) imported, ${result.failed} failed.`,
        detail:
          'Files are stored locally in this browser using IndexedDB. If storage quota is full, remove unused local uploads or clear site data.',
        icon: result.added ? 'info' : 'warning',
        buttons: ['ok'],
      })
    }
  }

  function handleProjectDrop(event: DragEvent<HTMLDivElement>, project: PortfolioProject): void {
    event.preventDefault()
    event.stopPropagation()
    setDraggingUpload(false)
    if (!event.dataTransfer.files.length) return
    void importProjectFiles(project, event.dataTransfer.files)
  }

  function handleProjectFileInput(event: ChangeEvent<HTMLInputElement>, project: PortfolioProject): void {
    const { files } = event.currentTarget
    if (files?.length) {
      void importProjectFiles(project, files)
    }
    event.currentTarget.value = ''
  }

  return (
    <div className="app-content portfolio-app">
      <div className="toolbar portfolio-tabs" role="tablist" aria-label="Portfolio sections">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeTab === section.id}
            className={activeTab === section.id ? 'is-active' : ''}
            title={section.hint}
            onClick={() => setActiveTab(section.id)}
          >
            <img src={win98Icons[section.icon]} alt="" />
            {section.label}
          </button>
        ))}
        {projectTabIds.map((projectId) => {
          const project = projects.find((item) => item.id === projectId)
          if (!project) return null
          const tabId = projectTabId(project.id)
          return (
            <span className={`portfolio-open-tab${activeTab === tabId ? ' is-active' : ''}`} key={project.id}>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === tabId}
                title={project.name}
                onClick={() => setActiveTab(tabId)}
              >
                <img src={win98Icons.projects} alt="" />
                {shortProjectLabel(project)}
              </button>
              <button
                className="portfolio-tab-close"
                type="button"
                aria-label={`Close ${project.name}`}
                onClick={() => closeProjectTab(project.id)}
              >
                x
              </button>
            </span>
          )
        })}
      </div>

      <div className="portfolio-shell" role="tabpanel" aria-label={activeMeta.label}>
        {!activeProject && (
          <section className="portfolio-hero sunken-panel" aria-label="Portfolio introduction">
            <div className="portfolio-hero-title">
              <img src={win98Icons.student} alt="" />
              <div>
                <p className="portfolio-kicker">Portfolio Center</p>
                <h2>{profile.name}</h2>
                <p>{profile.role}</p>
              </div>
            </div>
            <p className="portfolio-headline">{profile.headline}</p>
          </section>
        )}

        {activeTab === 'overview' && (
          <div className="portfolio-section">
            <div className="portfolio-card-grid">
              {overviewCards.map((card) => (
                <article className="portfolio-card" key={card.title}>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
            <div className="portfolio-jump-grid">
              {sections
                .filter((section) => section.id !== 'overview')
                .map((section) => (
                  <button
                    className="portfolio-jump"
                    key={section.id}
                    type="button"
                    onClick={() => setActiveTab(section.id)}
                  >
                    <img src={win98Icons[section.icon]} alt="" />
                    <span>{section.label}</span>
                    <small>{section.hint}</small>
                  </button>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="portfolio-section">
            <div className="portfolio-copy">
              {summaryParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="portfolio-list">
              {profile.highlights.map((highlight) => (
                <div className="portfolio-list-row" key={highlight}>
                  <img src={win98Icons.windowsSmall} alt="" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="portfolio-section">
            <div className="portfolio-project-list portfolio-project-launcher" role="listbox" aria-label="Projects">
              {projects.map((project) => (
                <button
                  className="portfolio-project-card"
                  key={project.id}
                  role="option"
                  type="button"
                  onClick={() => openProjectTab(project)}
                >
                  <div className="portfolio-project-heading">
                    <img src={win98Icons.projects} alt="" />
                    <div>
                      <h3>{project.name}</h3>
                      <small>{project.fileName}</small>
                    </div>
                  </div>
                  <p>{project.summary}</p>
                  <div className="portfolio-tags">
                    {project.stack.slice(0, 6).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <small className="portfolio-project-action">Click to open a new project tab</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeProject && (
          <div
            className={`portfolio-section portfolio-project-tab-body${draggingUpload ? ' is-dragging-upload' : ''}`}
            data-local-media-dropzone="true"
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'copy'
              setDraggingUpload(true)
            }}
            onDragLeave={(event) => {
              const nextTarget = event.relatedTarget
              if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                setDraggingUpload(false)
              }
            }}
            onDrop={(event) => handleProjectDrop(event, activeProject)}
          >
            <section className="portfolio-project-detail sunken-panel">
              <div className="portfolio-project-detail-header">
                <img src={win98Icons.projects} alt="" />
                <div>
                  <h3>{activeProject.name}</h3>
                  <p>{activeProject.fileName}</p>
                </div>
              </div>

              <div className="portfolio-project-modebar" role="tablist" aria-label="Selected project detail type">
                <button
                  className={projectPanel === 'details' ? 'is-active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={projectPanel === 'details'}
                  onClick={() => setProjectPanel('details')}
                >
                  Full Details
                </button>
                <button
                  className={projectPanel === 'documentation' ? 'is-active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={projectPanel === 'documentation'}
                  onClick={() => setProjectPanel('documentation')}
                >
                  Documentation
                </button>
                <button
                  className={projectPanel === 'uploads' ? 'is-active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={projectPanel === 'uploads'}
                  onClick={() => setProjectPanel('uploads')}
                >
                  Uploads ({uploadItems.length})
                </button>
              </div>

              {projectPanel === 'details' && (
                <div className="portfolio-project-detail-body">
                  <p>{activeProject.details}</p>
                  <dl className="portfolio-project-meta">
                    <div>
                      <dt>Project file</dt>
                      <dd>{activeProject.fileName}</dd>
                    </div>
                    <div>
                      <dt>Stack</dt>
                      <dd>{activeProject.stack.join(', ')}</dd>
                    </div>
                    <div>
                      <dt>Demo</dt>
                      <dd>{activeProject.links.demo === '#' ? 'Pending' : activeProject.links.demo}</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{activeProject.links.source === '#' ? 'Pending' : activeProject.links.source}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {projectPanel === 'documentation' && (
                <div className="portfolio-document-grid">
                  {projectDocumentation(activeProject).map((docSection) => (
                    <article className="portfolio-document-card" key={docSection.title}>
                      <h4>{docSection.title}</h4>
                      {docSection.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </article>
                  ))}
                </div>
              )}

              {projectPanel === 'uploads' && (
                <div className="portfolio-upload-panel">
                  <div className="portfolio-upload-drop">
                    <img src={win98Icons.projects} alt="" />
                    <div>
                      <strong>{uploading ? 'Saving files locally...' : draggingUpload ? 'Drop files here' : 'Project uploads'}</strong>
                      <p>
                        Add screenshots, demo videos, PDFs, notes, or any file. Files stay in this browser using IndexedDB.
                      </p>
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      Add Files...
                    </button>
                    <input
                      ref={fileInputRef}
                      className="portfolio-file-input"
                      type="file"
                      multiple
                      onChange={(event) => handleProjectFileInput(event, activeProject)}
                    />
                  </div>

                  {uploadItems.length ? (
                    <div className="portfolio-upload-list">
                      {uploadItems.map((node) => (
                        <ProjectUploadItem key={node.path} node={node} />
                      ))}
                    </div>
                  ) : (
                    <div className="portfolio-upload-empty">
                      <img src={win98Icons.folder} alt="" />
                      <p>No local files saved for this project yet.</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="portfolio-section">
            <div className="portfolio-certificate-grid">
              {certificates.map((certificate) => (
                <article className="portfolio-certificate" key={certificate.id}>
                  <div className="portfolio-certificate-heading">
                    <img src={win98Icons.html} alt="" />
                    <div>
                      <h3>{certificate.title}</h3>
                      <small>{certificate.issuer}</small>
                    </div>
                    <strong>{certificate.ranking}</strong>
                  </div>
                  <dl>
                    <div>
                      <dt>Passed</dt>
                      <dd>{certificate.passedOn}</dd>
                    </div>
                    <div>
                      <dt>Credential</dt>
                      <dd>{certificate.credentialId}</dd>
                    </div>
                  </dl>
                  <p>{certificate.summary}</p>
                  <a href={certificate.verificationUrl} target="_blank" rel="noreferrer">
                    Verify on TestDome
                  </a>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'resume' && (
          <div className="portfolio-section">
            <div className="portfolio-resume-grid">
              {resume.sections.map((section) => (
                <fieldset className="portfolio-resume-card" key={section.title}>
                  <legend>{section.title}</legend>
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </fieldset>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="portfolio-section">
            <div className="portfolio-contact-card sunken-panel">
              <h3>Contact & Availability</h3>
              <p>{contact.summary}</p>
              <div className="portfolio-contact-list">
                <div>
                  <strong>Email</strong>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </div>
                <div>
                  <strong>Location</strong>
                  <span>{contact.location}</span>
                </div>
                <div>
                  <strong>Availability</strong>
                  <span>{contact.availability}</span>
                </div>
                {contact.links.map((link) => (
                  <div key={link.href}>
                    <strong>{link.label}</strong>
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {displayHref(link.href)}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'credits' && (
          <div className="portfolio-section">
            <div className="portfolio-credit-columns">
              <fieldset>
                <legend>Tools</legend>
                {creditsStack.tools.map((tool) => (
                  <p key={tool.n}>
                    <strong>{tool.n}</strong> - {tool.d}
                  </p>
                ))}
              </fieldset>
              <fieldset>
                <legend>Frameworks & Languages</legend>
                {[...creditsStack.frameworks, ...creditsStack.languages].map((item) => (
                  <p key={`${item.n}-${item.d}`}>
                    <strong>{item.n}</strong> - {item.d}
                  </p>
                ))}
              </fieldset>
              <fieldset>
                <legend>Special Thanks</legend>
                {specialThanks.map((item) => (
                  <p key={item.label}>
                    <strong>{item.label}</strong> - {item.note}
                  </p>
                ))}
              </fieldset>
            </div>
          </div>
        )}
      </div>

      <div className="status-bar">
        <p className="status-bar-field">{activeMeta.label}</p>
        <p className="status-bar-field">{statusDetail}</p>
      </div>
    </div>
  )
}
