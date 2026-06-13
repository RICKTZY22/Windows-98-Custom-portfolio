import { portfolioData } from '../../data/portfolioData'
import { win98Icons } from '../../data/icons'

export function ContactApp() {
  const mailHref = `mailto:${portfolioData.contact.email}`

  return (
    <div className="app-content contact-app">
      <div className="identity-row">
        <img src={win98Icons.contact} alt="" />
        <div>
          <h2>Contact</h2>
          <p>{portfolioData.contact.availability}</p>
        </div>
      </div>
      <div className="sunken-panel inset-copy">
        <p>{portfolioData.contact.summary}</p>
        <p>{portfolioData.contact.location}</p>
      </div>
      <fieldset>
        <legend>Email</legend>
        <div className="field-row-stacked contact-field">
          <input readOnly value={portfolioData.contact.email} aria-label="Email address" />
          <a className="button-like" href={mailHref}>
            Compose
          </a>
        </div>
      </fieldset>
      <div className="sunken-panel contact-links">
        {portfolioData.contact.links.map((link) => (
          <a key={link.label} href={link.href}>
            <img src={win98Icons.internet} alt="" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  )
}
