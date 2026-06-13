import { portfolioData } from '../../data/portfolioData'
import { win98Icons } from '../../data/icons'

export function AboutApp() {
  const { profile } = portfolioData

  return (
    <div className="app-content about-app">
      <div className="identity-row">
        <img src={win98Icons.student} alt="" />
        <div>
          <h2>{profile.name}</h2>
          <p>{profile.role}</p>
        </div>
      </div>
      <div className="sunken-panel inset-copy">
        <p>{profile.headline}</p>
        <p>{profile.summary}</p>
      </div>
      <fieldset>
        <legend>Highlights</legend>
        <ul className="compact-list">
          {profile.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      </fieldset>
      <div className="status-bar">
        <p className="status-bar-field">{profile.location}</p>
      </div>
    </div>
  )
}
