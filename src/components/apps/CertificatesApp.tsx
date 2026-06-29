import './CertificatesApp.css'
import { useState } from 'react'
import { certificates } from '../../data/certificates'
import { win98Icons } from '../../data/icons'

function openExternal(url: string): void {
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (opened) {
    opened.opener = null
  }
}

export function CertificatesApp() {
  const [selectedId, setSelectedId] = useState(certificates[0]?.id)
  const selected = certificates.find((certificate) => certificate.id === selectedId) ?? certificates[0]

  function copySelectedLink(): void {
    if (!selected || !navigator.clipboard) return
    void navigator.clipboard.writeText(selected.verificationUrl)
  }

  return (
    <div className="app-content certificates-app">
      <div className="toolbar certificates-toolbar">
        <button type="button" disabled={!selected} onClick={() => selected && openExternal(selected.verificationUrl)}>
          Verify Online
        </button>
        <button type="button" disabled={!selected} onClick={copySelectedLink}>
          Copy Link
        </button>
      </div>

      <div className="certificates-layout">
        <div className="sunken-panel certificates-list" role="listbox" aria-label="Certificates">
          {certificates.map((certificate) => (
            <button
              type="button"
              key={certificate.id}
              className={`certificates-row ${selected?.id === certificate.id ? 'selected' : ''}`}
              aria-selected={selected?.id === certificate.id}
              onClick={() => setSelectedId(certificate.id)}
              onDoubleClick={() => openExternal(certificate.verificationUrl)}
            >
              <img src={win98Icons.html} alt="" />
              <span>
                <strong>{certificate.title}</strong>
                <small>{certificate.issuer}</small>
              </span>
            </button>
          ))}
        </div>

        <fieldset className="certificates-detail">
          <legend>Certificate Details</legend>
          {selected ? (
            <>
              <div className="certificates-heading">
                <img src={win98Icons.html} alt="" />
                <div>
                  <h2>{selected.title}</h2>
                  <p>{selected.category}</p>
                </div>
              </div>

              <dl className="certificates-meta">
                <div>
                  <dt>Issuer</dt>
                  <dd>{selected.issuer}</dd>
                </div>
                <div>
                  <dt>Credential ID</dt>
                  <dd>{selected.credentialId}</dd>
                </div>
                <div>
                  <dt>Verification</dt>
                  <dd>
                    <a href={selected.verificationUrl} target="_blank" rel="noreferrer">
                      {selected.verificationUrl}
                    </a>
                  </dd>
                </div>
              </dl>

              <div className="certificates-summary">
                <h3>Notes</h3>
                <p>{selected.summary}</p>
              </div>

              <div className="certificates-skills">
                <h3>Related Skills</h3>
                <ul>
                  {selected.skills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p>No certificates stored.</p>
          )}
        </fieldset>
      </div>

      <div className="status-bar">
        <p className="status-bar-field">{certificates.length} certificate(s)</p>
        <p className="status-bar-field">{selected ? selected.issuer : 'No certificate selected'}</p>
      </div>
    </div>
  )
}
