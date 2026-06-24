import './SafetyTrainingScreen.css'
import { useEffect } from 'react'
import { useOs } from '../../os/useOs'

const DO_LIST = [
  'Check who sent the file and why you need it before opening it.',
  'Verify the file name and extension, especially scripts and installers.',
  'Scan downloads before running installers, archives, or macro documents.',
  'Keep backups of important school, project, and portfolio files.',
  'Ask a trusted person when a file feels suspicious or unexpected.',
]

const DONT_LIST = [
  'Run random .bat, .exe, .scr, .cmd, .js, or macro-enabled files.',
  'Trust a file only because it uses a familiar icon or friendly name.',
  'Disable security warnings just to make an installer work faster.',
  'Open attachments from strangers or unexpected messages.',
  'Reuse passwords after a suspicious file incident.',
]

const RECOVERY_STEPS = [
  'Disconnect from the network if something suspicious is actively running.',
  'Close the unknown program and stop approving more prompts.',
  'Run an antivirus scan and review the detected item names.',
  'Change passwords from a clean device if accounts may be affected.',
  'Restore from backup if files were changed, deleted, or encrypted.',
]

export function SafetyTrainingScreen() {
  const { completeSafetyTraining, playSound } = useOs()

  useEffect(() => {
    // Celebratory "gotcha" chime when the safety lesson appears (TADA.WAV).
    playSound('tada')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="safety-training-screen" aria-label="Unknown file safety training">
      <section className="safety-training-window">
        <div className="safety-training-titlebar">
          <div className="safety-training-title">
            <span className="safety-training-icon" aria-hidden="true">
              !
            </span>
            Safety Training - Unknown Files
          </div>
          <div className="safety-training-controls" aria-hidden="true">
            <span>_</span>
            <span>[]</span>
            <span>x</span>
          </div>
        </div>

        <div className="safety-training-menu">
          <span>
            <u>F</u>ile
          </span>
          <span>
            <u>S</u>afety
          </span>
          <span>
            <u>T</u>ools
          </span>
          <span>
            <u>H</u>elp
          </span>
        </div>

        <div className="safety-training-address">
          <span>Address</span>
          <div>local://training/unknown-files</div>
        </div>

        <div className="safety-training-document">
          <header className="safety-training-hero">
            <div className="safety-training-warn" aria-hidden="true">
              !
            </div>
            <div>
              <h1>Gotcha - that was a simulation.</h1>
              <p>
                No real files were changed, no network request was sent, and no host command was executed. The scare
                happened only inside this portfolio OS, but the lesson is real: pause before running unknown files.
              </p>
            </div>
          </header>

          <div className="safety-training-grid">
            <section className="safety-training-card safety-training-do">
              <h2>Do</h2>
              {DO_LIST.map((item) => (
                <p key={item}>
                  <b>OK</b>
                  <span>{item}</span>
                </p>
              ))}
            </section>

            <section className="safety-training-card safety-training-dont">
              <h2>Do Not</h2>
              {DONT_LIST.map((item) => (
                <p key={item}>
                  <b>NO</b>
                  <span>{item}</span>
                </p>
              ))}
            </section>
          </div>

          <section className="safety-training-card safety-training-recovery">
            <h2>If you already clicked something suspicious</h2>
            <div className="safety-training-steps">
              {RECOVERY_STEPS.map((step, index) => (
                <p key={step}>
                  <b>{index + 1}</b>
                  <span>{step}</span>
                </p>
              ))}
            </div>
          </section>
        </div>

        <div className="safety-training-actions">
          <button type="button" className="default" onClick={completeSafetyTraining}>
            Return to Portfolio OS
          </button>
        </div>

        <div className="safety-training-status">
          <span>Local educational simulation complete.</span>
          <span>No real system access occurred.</span>
        </div>
      </section>
    </main>
  )
}
