import { useMemo, useState } from 'react'
import './AboutApp.css'
import { portfolioData } from '../../data/portfolioData'
import { win98Icons } from '../../data/icons'
import type { IconKey } from '../../types'

type AboutTab = 'profile' | 'highlights' | 'projects' | 'contact'

// Per-project icons so the Projects tab differentiates each entry instead of
// repeating the Internet Explorer globe. Unknown ids fall back to that globe.
const projectIcons: Record<string, IconKey> = {
  'plmun-inventory-nexus': 'network',
  'canlas-inventory-system': 'hardDrive',
  'between-two-ruins': 'help',
  'win98-portfolio': 'windows',
}

function displayHref(href: string): string {
  return href.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

const aboutTabs: Array<{ id: AboutTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
]

const highlightRows = [
  {
    label: 'React',
    detail: 'Polished, interactive interfaces and creative browser experiences.',
  },
  {
    label: 'AI workflow',
    detail: 'Uses AI for speed and productivity while keeping the quality bar high.',
  },
  {
    label: 'Capstones',
    detail: 'PLMun Inventory Nexus and Canlas, built with React, Django, PostgreSQL, JWT, and WebSockets.',
  },
  {
    label: 'Creative work',
    detail: 'Between Two Ruins and the Windows 98 Portfolio OS.',
  },
  {
    label: 'Motion UI',
    detail: 'Flashy, distinctive interfaces with GSAP, Motion, Lottie, and Rive.',
  },
]

export function AboutApp() {
  const { contact, profile, projects } = portfolioData
  const [activeTab, setActiveTab] = useState<AboutTab>('profile')
  const summaryParagraphs = useMemo(() => profile.summary.split('\n\n'), [profile.summary])

  return (
    <div className="app-content about-app">
      <div className="identity-row about-header">
        <img src={win98Icons.student} alt="" />
        <div>
          <h2>{profile.name}</h2>
          <p>{profile.role}</p>
        </div>
      </div>
      <div className="about-tabs" role="tablist" aria-label="About Me sections">
        {aboutTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`about-tab${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="sunken-panel about-panel" role="tabpanel" aria-label={aboutTabs.find((tab) => tab.id === activeTab)?.label}>
        {activeTab === 'profile' && (
          <div className="about-profile-copy">
            <p className="about-headline">{profile.headline}</p>
            {summaryParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        )}

        {activeTab === 'highlights' && (
          <div className="about-detail-list">
            {highlightRows.map((item) => (
              <div className="about-detail-row" key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="about-project-list">
            {projects.map((project) => (
              <article className="about-project" key={project.id}>
                <img src={win98Icons[projectIcons[project.id] ?? 'internet']} alt="" />
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.summary}</p>
                  <span>{project.stack.slice(0, 5).join(', ')}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="about-contact">
            <div className="about-detail-list">
              <div className="about-detail-row">
                <strong>Email</strong>
                <span>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </span>
              </div>
              <div className="about-detail-row">
                <strong>Location</strong>
                <span>{profile.location}</span>
              </div>
              <div className="about-detail-row">
                <strong>Availability</strong>
                <span>{contact.availability}</span>
              </div>
              {contact.links.map((link) => (
                <div className="about-detail-row" key={link.href}>
                  <strong>{link.label}</strong>
                  <span>
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {displayHref(link.href)}
                    </a>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{profile.location}</p>
        <p className="status-bar-field">{aboutTabs.find((tab) => tab.id === activeTab)?.label}</p>
      </div>
    </div>
  )
}
