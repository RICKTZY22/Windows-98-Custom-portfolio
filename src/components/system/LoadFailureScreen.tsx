import { useEffect, useMemo, useState } from 'react'
import { missingRequiredSystemFiles } from '../../os/recovery'
import { baseName } from '../../os/filesystem'
import { useOs } from '../../os/useOs'

export function LoadFailureScreen() {
  const { state, restart } = useOs()
  const [rebooting, setRebooting] = useState(false)
  const missing = useMemo(() => missingRequiredSystemFiles(state.fs), [state.fs])
  const damaged = missing.map((path) => baseName(path).toUpperCase()).slice(0, 3)
  const primary = missing[0] ?? 'C:\\Windows\\System32'

  function reboot() {
    if (rebooting) return
    setRebooting(true)
    window.setTimeout(() => restart('normal', { bootProfile: 'warm' }), 900)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault()
      reboot()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebooting])

  return (
    <main className="load-failure-screen" role="alert" aria-label="Windows failed to load" onClick={reboot}>
      <section className="load-failure-panel">
        <p className="load-failure-lead">Windows could not start because the following file is missing or corrupt:</p>
        <p className="load-failure-path">&lt;Windows root&gt;\SYSTEM32\{baseName(primary).toUpperCase()}</p>

        <p>Status: 0xc0000098</p>
        <p>
          Info: The operating system could not be loaded because a critical
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;system file is corrupted.
        </p>

        <div className="load-failure-fault">
          <p>Faulting module&nbsp;&nbsp;&nbsp;: VMM32.VXD</p>
          <p>Address&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 0028:C0011E36</p>
          <p>Damaged files&nbsp;&nbsp;&nbsp;&nbsp;: {damaged.length ? damaged.join(', ') : 'UNKNOWN'}</p>
        </div>

        <p>You can repair this installation from BIOS Setup.</p>
        <p>Restart, press F12, then choose Recovery Mode.</p>

        <p className="load-failure-restart">
          <span>{rebooting ? 'Restarting...' : 'Press any key to restart your computer'}</span>
          <i aria-hidden="true" />
        </p>
      </section>
    </main>
  )
}
