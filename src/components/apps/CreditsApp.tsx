import './CreditsApp.css'
import { portfolioData } from '../../data/portfolioData'
import { win98Icons } from '../../data/icons'

export function CreditsApp() {
  return (
    <div className="app-content credits-app">
      <div className="identity-row">
        <img src={win98Icons.help} alt="" />
        <div>
          <h2>Credits</h2>
          <p>External resources used by this portfolio shell.</p>
        </div>
      </div>
      <div className="sunken-panel credits-list">
        {portfolioData.credits.map((credit) => (
          <article key={credit.href}>
            <a href={credit.href} target="_blank" rel="noreferrer">
              {credit.label}
            </a>
            <p>{credit.note}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
