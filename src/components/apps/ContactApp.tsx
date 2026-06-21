import './ContactApp.css'
import { portfolioData } from '../../data/portfolioData'
import { win98Icons } from '../../data/icons'
import type { IconKey } from '../../types'

type ContactMethod = {
  label: string
  value: string
  href: string
  icon: IconKey
  action: string
}

function displayHref(href: string): string {
  return href.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

export function ContactApp() {
  const { contact, profile } = portfolioData
  const mailHref = `mailto:${contact.email}`
  const methods: ContactMethod[] = [
    {
      label: 'Email',
      value: contact.email,
      href: mailHref,
      icon: 'contact',
      action: 'Compose',
    },
    ...contact.links.map((link) => ({
      label: link.label,
      value: displayHref(link.href),
      href: link.href,
      icon: 'internet' as IconKey,
      action: 'Open',
    })),
  ]

  return (
    <div className="app-content contact-app">
      <div className="identity-row contact-header">
        <img src={win98Icons.contact} alt="" />
        <div>
          <h2>{profile.name}</h2>
          <p>{contact.availability}</p>
        </div>
        <a className="button-like contact-primary-action" href={mailHref}>
          Compose
        </a>
      </div>
      <div className="contact-layout">
        <fieldset className="contact-card">
          <legend>Contact Card</legend>
          <div className="contact-profile">
            <img src={win98Icons.student} alt="" />
            <strong>{profile.name}</strong>
            <span>{profile.role}</span>
          </div>
          <dl className="contact-meta">
            <div>
              <dt>Location</dt>
              <dd>{contact.location}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Available</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>Frontend, React, full-stack systems</dd>
            </div>
          </dl>
        </fieldset>

        <div className="contact-main">
          <fieldset className="contact-note">
            <legend>Message</legend>
            <p>{contact.summary}</p>
          </fieldset>

          <fieldset className="contact-methods">
            <legend>Internet</legend>
            <div className="sunken-panel contact-link-list">
              {methods.map((method) => {
                const external = /^https?:\/\//i.test(method.href)
                return (
                  <a
                    className="contact-link-row"
                    key={method.label}
                    href={method.href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noreferrer' : undefined}
                  >
                    <img src={win98Icons[method.icon]} alt="" />
                    <span>
                      <strong>{method.label}</strong>
                      <small>{method.value}</small>
                    </span>
                    <em>{method.action}</em>
                  </a>
                )
              })}
            </div>
          </fieldset>
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{contact.email}</p>
        <p className="status-bar-field">{methods.length} contact method(s)</p>
      </div>
    </div>
  )
}
