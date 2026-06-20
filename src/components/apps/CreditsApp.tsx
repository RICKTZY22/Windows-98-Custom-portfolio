import { Fragment } from 'react'
import './CreditsApp.css'
import { portfolioData } from '../../data/portfolioData'
import { win98Icons } from '../../data/icons'

export function CreditsApp() {
  const sections = [...new Set(portfolioData.credits.map((credit) => credit.section))]
  return (
    <div className="app-content credits-app">
      <div className="identity-row">
        <img src={win98Icons.help} alt="" />
        <div>
          <h2>Credits</h2>
          <p>People, games, and software this portfolio shell builds on.</p>
        </div>
      </div>
      <div className="sunken-panel credits-list">
        {sections.map((section) => (
          <Fragment key={section}>
            <h3 className="credits-section-title">{section}</h3>
            {portfolioData.credits
              .filter((credit) => credit.section === section)
              .map((credit) => (
                <article key={credit.href}>
                  <a href={credit.href} target="_blank" rel="noreferrer">
                    {credit.label}
                  </a>
                  <p>{credit.note}</p>
                </article>
              ))}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
