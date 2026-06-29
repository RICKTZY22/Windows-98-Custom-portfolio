import './HelpApp.css'
import { useState } from 'react'
import { win98Icons } from '../../data/icons'
import { portfolioData } from '../../data/portfolioData'
import { SYSTEM_FILE_CATALOG } from '../../data/systemFileCatalog'
import { systemFileDeletionConsequence, systemFileRole } from '../../os/systemFiles'
import type { IconKey } from '../../types'

type Topic = 'start' | 'whatsNew' | 'programs' | 'files' | 'safety' | 'recovery' | 'commands' | 'troubleshooting'

const TOPICS: Array<{ id: Topic; label: string; hint: string; icon: IconKey }> = [
  { id: 'start', label: 'Getting Started', hint: 'Desktop, windows, sound, and navigation.', icon: 'windows' },
  { id: 'whatsNew', label: "What's New", hint: 'Recently added features and behaviors.', icon: 'inbox' },
  { id: 'programs', label: 'The Programs', hint: 'What each app is for.', icon: 'programGroup' },
  { id: 'files', label: 'Files and Drivers', hint: 'Virtual C: drive, Recycle Bin, and simulated drivers.', icon: 'hardDrive' },
  { id: 'safety', label: 'Safety Guide', hint: 'Educational simulations and what is never real.', icon: 'help' },
  { id: 'recovery', label: 'BIOS and Recovery', hint: 'Boot setup, protected cache, and system repair.', icon: 'gears' },
  { id: 'commands', label: 'MS-DOS Commands', hint: 'Prompt commands supported by the portfolio OS.', icon: 'terminal' },
  { id: 'troubleshooting', label: 'Troubleshooting', hint: 'Common fixes when something looks broken.', icon: 'search' },
]

const QUICK_START = [
  'Double-click a desktop icon, or select it and press Enter, to open an app.',
  'Use the Start button for Programs, Documents, Settings, Run, Help, and Credits.',
  'Drag a window title bar to move it. Drag an edge or corner to resize it.',
  'Use the taskbar buttons to switch between open apps.',
  'Right-click the desktop for refresh, arrange icons, and display options.',
]

const WHATS_NEW: Array<{ name: string; icon: IconKey; text: string }> = [
  {
    name: 'New essay: The AI Uprising',
    icon: 'wordpad',
    text: 'A new document in My Documents, "The AI Uprising," is an honest take on AI tools, vibe coding, and why foundations still matter. Double-click it to read in WordPad.',
  },
  {
    name: 'Inbox (release history)',
    icon: 'inbox',
    text: "Open Inbox on the desktop to read this project's version history, delivered as Microsoft Exchange mail. Each message is a release with its patch notes.",
  },
  {
    name: 'Memory limit (RAM)',
    icon: 'taskManager',
    text: 'The simulated PC has 64 MB of RAM. Opening too many programs at once can run it out of memory and cause a protection fault that closes every program. Open fewer at a time.',
  },
  {
    name: 'Disk space limit',
    icon: 'hardDrive',
    text: 'The virtual C: drive holds a limited number of files. Creating too many shows "not enough free disk space"; delete some files to free space.',
  },
  {
    name: 'Delete notifications',
    icon: 'recycleBin',
    text: 'Deleting a file or folder shows a tray notice of what was affected (file and folder counts), plus a warning if a simulated device was disabled.',
  },
  {
    name: 'Maintenance tools',
    icon: 'hardDrive',
    text: 'ScanDisk and Disk Defragmenter live under Programs > System Tools. A startup ScanDisk also runs automatically after an improper shutdown.',
  },
  {
    name: 'Device Manager',
    icon: 'computer',
    text: 'Under System Tools. Shows simulated device and driver health and flags problems with a yellow badge.',
  },
  {
    name: 'Startup Menu (F8)',
    icon: 'gears',
    text: 'Press F8 during boot for the BIOS-styled Startup Menu: Normal, Safe mode, Command prompt only, and Recovery mode.',
  },
  {
    name: 'System File Checker',
    icon: 'terminal',
    text: 'In MS-DOS Prompt, sfc /scannow scans protected files, lists any that are missing, and offers to restore them on the next restart.',
  },
]

// Manual reinstall sequence used when the whole System32 folder is wiped and the
// protected cache can no longer rebuild it. Run from Command prompt only mode.
const REINSTALL_STEPS: Array<{ cmd: string; text: string }> = [
  { cmd: 'format C:', text: 'Prepare the simulated disk. Safe simulation only; it never touches your real computer.' },
  { cmd: 'sys C:', text: 'Write the system boot files to the drive.' },
  { cmd: 'setup', text: 'Run the simulated Windows installation and copy the system files back.' },
  { cmd: 'win', text: 'Start Windows and return to the desktop.' },
]

type Program = { name: string; icon: IconKey; text: string }

// Desktop and core shell apps.
const PROGRAMS_CORE: Program[] = [
  {
    name: 'My Computer / File Manager',
    icon: 'computer',
    text: 'Browse the virtual C: drive, create folders, rename items, copy, move, delete, and inspect simulated system files.',
  },
  {
    name: 'Recycle Bin',
    icon: 'recycleBin',
    text: 'Deleted virtual files go here first. Restore them safely or empty the bin to test recovery behavior.',
  },
  {
    name: 'Internet Explorer',
    icon: 'internet',
    text: 'Retro browser surface for archive-style browsing. Network-driver checks keep the educational simulation consistent.',
  },
  {
    name: 'Network Neighborhood',
    icon: 'network',
    text: 'Classic network browser with safe sample hosts. It depends on simulated network drivers and never touches the real network.',
  },
  {
    name: 'Inbox',
    icon: 'inbox',
    text: 'A Microsoft Exchange style mailbox. Every message is a release of this portfolio with its patch notes; Reply, Forward, and New all work.',
  },
]

// Accessories.
const PROGRAMS_ACCESSORIES: Program[] = [
  { name: 'Notepad', icon: 'notepad', text: 'Plain-text editor for quick notes and .txt files inside the portfolio OS.' },
  {
    name: 'WordPad',
    icon: 'wordpad',
    text: 'Rich-text editor that opens .doc files like the resume and the AI Uprising essay, with formatting and Save As.',
  },
  {
    name: 'Paint',
    icon: 'paint',
    text: 'Draw with pencil, brush, shapes, fill, picker, and text. Save browser-only images into the virtual Paint folder.',
  },
  { name: 'Calculator', icon: 'calculator', text: 'The standard Windows 98 calculator for quick arithmetic.' },
  { name: 'My Pictures', icon: 'gallery', text: 'Picture gallery for the virtual image library, with thumbnail previews.' },
  { name: 'Imaging Preview', icon: 'imageFile', text: 'Kodak-style image viewer for opening individual picture files.' },
  {
    name: 'Media Player / Sound Recorder / Video Player',
    icon: 'mediaPlayer',
    text: 'Audio and video surfaces demonstrate driver dependencies without accessing your real device drivers.',
  },
  {
    name: 'MS-DOS Prompt',
    icon: 'terminal',
    text: 'A simulated command line for file commands, network checks, system file scans, app launching, and help output.',
  },
]

// System tools and settings.
const PROGRAMS_SYSTEM: Program[] = [
  {
    name: 'Control Panel',
    icon: 'controlPanel',
    text: 'Change wallpaper, colors, pointer style, sounds, display settings, and network status inside the portfolio OS.',
  },
  {
    name: 'System Information',
    icon: 'adminTools',
    text: 'Microsoft System Information: OS, processor, memory map, BIOS, and component details for the simulated machine.',
  },
  {
    name: 'Device Manager',
    icon: 'computer',
    text: 'Lists simulated devices and driver health, flagging any problem with a yellow badge.',
  },
  {
    name: 'System Configuration Utility',
    icon: 'gears',
    text: 'MSConfig: startup programs and the Config.sys, Autoexec.bat, System.ini, and Win.ini tabs.',
  },
  { name: 'Registry Editor', icon: 'gears', text: 'Browse the simulated registry hives in a read-only RegEdit surface.' },
  {
    name: 'ScanDisk',
    icon: 'hardDrive',
    text: 'Checks the simulated disk for errors. Also runs automatically at startup after an improper shutdown.',
  },
  { name: 'Disk Defragmenter', icon: 'hardDrive', text: 'Optimizes the simulated disk with the classic block animation.' },
  {
    name: 'Task Manager',
    icon: 'taskManager',
    text: 'Shows running programs and simulated memory use. End a task to close its window.',
  },
]

// Games, security, and the portfolio surfaces.
const PROGRAMS_MORE: Program[] = [
  {
    name: 'Antivirus 98',
    icon: 'sysFile',
    text: 'A period-styled antivirus scan surface. Educational only; it never touches real files.',
  },
  { name: 'Minesweeper', icon: 'minesweeper', text: 'The classic Windows 98 Minesweeper game.' },
  {
    name: 'DOOM & Wolfenstein 3D',
    icon: 'dos',
    text: 'The free shareware episodes, running entirely in the browser via js-dos. Controls use the keyboard and mouse.',
  },
  { name: 'About Me', icon: 'student', text: "John Erick Mendoza's background, story, and highlights." },
  { name: 'My Projects', icon: 'projects', text: 'Project gallery. Open a project for its details, stack, and links.' },
  { name: 'Contact', icon: 'contact', text: 'Email, GitHub, LinkedIn, and availability.' },
  { name: 'Certificates', icon: 'html', text: 'Certificate cabinet with verification links for online credentials.' },
  {
    name: 'Credits',
    icon: 'help',
    text: 'Tools, libraries, AI assistants, and preservation projects behind this portfolio OS.',
  },
]

const PROGRAM_GROUPS: Array<{ title: string; items: Program[] }> = [
  { title: 'Desktop & Core', items: PROGRAMS_CORE },
  { title: 'Accessories', items: PROGRAMS_ACCESSORIES },
  { title: 'System Tools', items: PROGRAMS_SYSTEM },
  { title: 'Games, Security & Portfolio', items: PROGRAMS_MORE },
]

const DRIVER_RULES = [
  {
    name: 'Network drivers',
    files: 'winsock.dll, wsock32.dll, netcfg.dll, ndis.vxd, tcpip.sys, el90xnd3.sys',
    result: 'Network Neighborhood, Internet Explorer networking, ping, ipconfig, and network status become unavailable.',
  },
  {
    name: 'Audio drivers',
    files: 'sound.drv, wdmaud.drv, winmm.dll, dsound.dll, mmsystem.dll',
    result: 'Startup sounds, Media Player sound, Sound Recorder, and sound settings enter a disabled state.',
  },
  {
    name: 'Video drivers',
    files: 'display.drv, vga.drv, gpu.vxd, ddraw.dll',
    result: 'Paint, image preview, video rendering, gallery previews, and display settings can be blocked.',
  },
  {
    name: 'Core System32 files',
    files: 'Protected shell, kernel, registry, and boot files',
    result: 'Missing critical files can trigger load failure, crash screens, or safe-mode failure.',
  },
]

function displayPath(path: string): string {
  return path.replace(/^C:\\Windows\\/i, '')
}

function fileName(path: string): string {
  return path.slice(path.lastIndexOf('\\') + 1)
}

function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function systemFileCategory(path: string): string {
  const role = systemFileRole(path)
  switch (role.kind) {
    case 'critical':
      return 'Boot critical'
    case 'driver':
      return `${titleCase(role.driver)} driver`
    case 'feature':
      return role.feature
    case 'app':
      return 'App dependency'
    case 'minimal':
      return 'Low impact'
  }
}

const SYSTEM_FILE_ROWS = SYSTEM_FILE_CATALOG.map((path) => ({
  path,
  name: fileName(path),
  location: displayPath(path),
  category: systemFileCategory(path),
  consequence: systemFileDeletionConsequence(path),
}))

const DOS_COMMANDS: Array<{ cmd: string; desc: string }> = [
  { cmd: 'dir', desc: 'List files and folders in the current directory.' },
  { cmd: 'cd / chdir', desc: 'Change directory. Use "cd .." to go up one level.' },
  { cmd: 'tree', desc: 'Show the folder structure as a tree.' },
  { cmd: 'type', desc: 'Print a text file to the screen.' },
  { cmd: 'md / mkdir', desc: 'Create a new folder.' },
  { cmd: 'rd / rmdir', desc: 'Remove a folder.' },
  { cmd: 'del / erase', desc: 'Delete a virtual file and send it to the Recycle Bin when possible.' },
  { cmd: 'copy', desc: 'Copy a file to another virtual location.' },
  { cmd: 'move', desc: 'Move a file to another virtual location.' },
  { cmd: 'ren / rename', desc: 'Rename a file or folder.' },
  { cmd: 'attrib', desc: 'Show read-only, hidden, system, and critical attributes.' },
  { cmd: 'cls', desc: 'Clear the prompt screen.' },
  { cmd: 'echo', desc: 'Print text back to the screen.' },
  { cmd: 'ver / winver', desc: 'Show the simulated Windows version.' },
  { cmd: 'date / time', desc: 'Show the current simulated date or time.' },
  { cmd: 'mem', desc: 'Show simulated memory usage.' },
  { cmd: 'chkdsk / scandisk', desc: 'Check the simulated disk for problems.' },
  { cmd: 'defrag', desc: 'Open Disk Defragmenter to optimize the simulated disk.' },
  { cmd: 'format', desc: 'Prepare the simulated C: drive. First step of a manual reinstall; only available in Command prompt only mode. Never touches the real computer.' },
  { cmd: 'sys', desc: 'Write system boot files to the drive during a manual reinstall.' },
  { cmd: 'setup / install', desc: 'Run the simulated Windows installation that copies system files back.' },
  { cmd: 'ping', desc: 'Ping through the simulated network adapter when network drivers are present.' },
  { cmd: 'ipconfig / winipcfg', desc: 'Show simulated TCP/IP adapter details.' },
  { cmd: 'scanreg', desc: 'Scan or restore simulated registry health.' },
  { cmd: 'sfc /scannow', desc: 'Verify protected system files, list any that are missing, and offer to restore them on the next restart.' },
  { cmd: 'start <name>', desc: 'Launch an app, for example "start notepad" or "start paint".' },
  { cmd: 'notepad / mspaint / calc / iexplore', desc: 'Open a classic accessory directly.' },
  { cmd: 'win', desc: 'Return to the Windows desktop from DOS-only mode.' },
  { cmd: 'help', desc: 'List supported commands inside the prompt.' },
  { cmd: 'exit', desc: 'Close MS-DOS Prompt.' },
]

const TROUBLESHOOTING = [
  {
    issue: 'An app says a driver is missing',
    fix: 'Open BIOS Setup or Recovery Mode and restore missing simulated drivers from the protected cache.',
  },
  {
    issue: 'The system fails to boot after deleting files',
    fix: 'Use Recovery Mode. Missing critical System32 files are intentionally treated as boot-breaking in the simulation.',
  },
  {
    issue: 'Audio does not play',
    fix: 'Click once anywhere on the desktop first. Browsers block sound until the page receives user interaction.',
  },
  {
    issue: 'Paint or video preview is blocked',
    fix: 'Check video drivers in BIOS System Health or run Recovery Mode to restore display.drv, vga.drv, gpu.vxd, or ddraw.dll.',
  },
  {
    issue: 'Network Neighborhood or ping is unavailable',
    fix: 'Restore network drivers such as winsock.dll, wsock32.dll, netcfg.dll, ndis.vxd, tcpip.sys, or el90xnd3.sys.',
  },
  {
    issue: 'Everything closed and a memory error appeared',
    fix: 'Too many programs were open and the simulated 64 MB of RAM ran out, so the system closed all programs to recover. Open fewer programs at a time.',
  },
  {
    issue: 'Cannot create a file: "not enough free disk space"',
    fix: 'The virtual C: drive is full. Delete some files or empty the Recycle Bin to free space, then try again.',
  },
  {
    issue: 'Recovery fails after deleting System32',
    fix: 'A full System32 wipe removes the protected cache, so Recovery can no longer rebuild it. Restart, press F8, choose Command prompt only, then run format C:, sys C:, setup, and win to reinstall. See BIOS and Recovery.',
  },
]

export function HelpApp() {
  const [topic, setTopic] = useState<Topic>('start')
  const activeTopic = TOPICS.find((item) => item.id === topic) ?? TOPICS[0]

  return (
    <div className="app-content help-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>Bookmark</li>
        <li>Options</li>
        <li>Help</li>
      </ul>
      <div className="help-header">
        <img src={win98Icons[activeTopic.icon]} alt="" />
        <div>
          <h2>{activeTopic.label}</h2>
          <p>{activeTopic.hint}</p>
        </div>
      </div>
      <div className="help-layout">
        <div className="sunken-panel help-nav">
          <p className="help-nav-title">
            <img src={win98Icons.help} alt="" /> Help Topics
          </p>
          <ul>
            {TOPICS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`help-nav-btn ${topic === item.id ? 'selected' : ''}`}
                  onClick={() => setTopic(item.id)}
                >
                  <img src={win98Icons[item.icon]} alt="" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="sunken-panel help-body">
          {topic === 'start' && (
            <article className="help-article">
              <h2>Welcome to {portfolioData.profile.name}'s Windows 98 Portfolio</h2>
              <p>
                This is a simulated Windows 98-style desktop running in the browser. It behaves like a tiny portfolio
                operating system, but it is still just a React app with a virtual filesystem.
              </p>
              <div className="help-callout">
                Nothing here can read, change, delete, download, or repair files on the real computer. All risky-looking
                behavior stays inside the portfolio OS simulation.
              </div>
              <h3>Quick start</h3>
              <ul className="help-list">
                {QUICK_START.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3>Window controls</h3>
              <div className="help-card-grid">
                <section>
                  <strong>Move and resize</strong>
                  <p>Drag the title bar, borders, or corners just like a classic desktop window.</p>
                </section>
                <section>
                  <strong>Minimize and restore</strong>
                  <p>Use the taskbar buttons to bring hidden windows back.</p>
                </section>
                <section>
                  <strong>Maximize</strong>
                  <p>Some apps open wide by default; smaller utilities like Calculator stay compact.</p>
                </section>
              </div>
            </article>
          )}

          {topic === 'whatsNew' && (
            <article className="help-article">
              <h2>What's New</h2>
              <p>
                Recent additions to the portfolio OS. Everything below stays inside the browser-only simulation and
                never touches the real computer.
              </p>
              <div className="help-program-grid">
                {WHATS_NEW.map((feature) => (
                  <section key={feature.name} className="help-program-card">
                    <img src={win98Icons[feature.icon]} alt="" />
                    <div>
                      <strong>{feature.name}</strong>
                      <p>{feature.text}</p>
                    </div>
                  </section>
                ))}
              </div>
              <div className="help-callout">
                Tip: open the Inbox on the desktop to browse the full version history as mail, one message per release.
              </div>
            </article>
          )}

          {topic === 'programs' && (
            <article className="help-article">
              <h2>The Programs</h2>
              <p>
                Every program in the OS, grouped the way you find them on the Start menu and desktop. Some are
                functional tools, some are educational simulations, and some are nostalgic wrappers around the projects.
              </p>
              {PROGRAM_GROUPS.map((group) => (
                <section key={group.title}>
                  <h3>{group.title}</h3>
                  <div className="help-program-grid">
                    {group.items.map((program) => (
                      <section key={program.name} className="help-program-card">
                        <img src={win98Icons[program.icon]} alt="" />
                        <div>
                          <strong>{program.name}</strong>
                          <p>{program.text}</p>
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              ))}
            </article>
          )}

          {topic === 'files' && (
            <article className="help-article">
              <h2>Files, Drivers, and the Virtual C: Drive</h2>
              <p>
                The portfolio keeps its own browser-only file tree. Files can be created, renamed, copied, moved, and
                deleted without touching the host machine.
              </p>
              <h3>Driver dependency model</h3>
              <p>
                Driver files are educational switches. Deleting one disables related simulated features while the rest
                of the portfolio keeps running.
              </p>
              <table className="help-commands">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Example files</th>
                    <th>Effect when missing</th>
                  </tr>
                </thead>
                <tbody>
                  {DRIVER_RULES.map((rule) => (
                    <tr key={rule.name}>
                      <td><strong>{rule.name}</strong></td>
                      <td>{rule.files}</td>
                      <td>{rule.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="help-callout">
                Input drivers may show warnings only. The app will not intentionally trap the real mouse or keyboard.
              </div>
              <h3>System file consequences</h3>
              <p>
                This list covers the seeded files marked as system files inside <code>C:\Windows</code>. Consequences
                match the portfolio OS dependency model: boot-critical files can stop startup, driver files degrade a
                device category, and low-impact files are kept mostly for realism.
              </p>
              <table className="help-commands help-system-file-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Role</th>
                    <th>If deleted</th>
                  </tr>
                </thead>
                <tbody>
                  {SYSTEM_FILE_ROWS.map((file) => (
                    <tr key={file.path}>
                      <td>
                        <strong>{file.name}</strong>
                        <code>{file.location}</code>
                      </td>
                      <td>{file.category}</td>
                      <td>{file.consequence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}

          {topic === 'safety' && (
            <article className="help-article">
              <h2>Safety Guide</h2>
              <p>
                This portfolio uses words like driver, virus, malware, setup.bat, BIOS, recovery, crash, and System32
                for educational awareness. They describe browser-only UI states, not real host-machine actions.
              </p>
              <div className="help-card-grid">
                <section>
                  <strong>Educational only</strong>
                  <p>Risky-looking files and prompts exist to teach users not to click random files or links blindly.</p>
                </section>
                <section>
                  <strong>No real OS access</strong>
                  <p>The app cannot inspect or modify the real operating system, real drivers, or real System32.</p>
                </section>
                <section>
                  <strong>Recovery is simulated</strong>
                  <p>Recovery restores virtual files from the app's protected cache, not from the actual computer.</p>
                </section>
                <section>
                  <strong>Clear user messaging</strong>
                  <p>Error dialogs should say "simulated driver", "portfolio OS", and "Recovery Mode" when possible.</p>
                </section>
              </div>
            </article>
          )}

          {topic === 'recovery' && (
            <article className="help-article">
              <h2>BIOS Setup and Recovery Mode</h2>
              <p>
                BIOS Setup is a retro control panel for the simulated machine. It reports boot settings, driver health,
                device status, and recovery options.
              </p>
              <h3>BIOS sections</h3>
              <dl className="help-defs">
                <dt>Standard CMOS Setup</dt>
                <dd>Shows browser-PC date, time, disk, CD-ROM, floppy, memory, and display information.</dd>
                <dt>BIOS Features Setup</dt>
                <dd>Controls boot behavior, safe mode, quick boot, warnings, and educational protection toggles.</dd>
                <dt>Integrated Peripherals</dt>
                <dd>Shows simulated network, sound, display, storage, mouse, and keyboard device status.</dd>
                <dt>System Health Status</dt>
                <dd>Reports missing core files and missing network, audio, video, or input drivers.</dd>
                <dt>Recovery Mode</dt>
                <dd>Scans the protected cache and restores missing critical files and simulated drivers.</dd>
              </dl>
              <h3>When to use Recovery</h3>
              <ul className="help-list">
                <li>An app says a simulated driver is missing.</li>
                <li>Network, sound, video, Paint, or preview features are disabled.</li>
                <li>The system reports missing critical System32 files.</li>
                <li>Safe mode warns that too many core files are missing.</li>
              </ul>

              <h3>If System32 is deleted: manual reinstall</h3>
              <p>
                Recovery Mode restores individual missing files from the protected cache. But if the entire{' '}
                <code>C:\Windows\System32</code> folder is wiped, that cache is gone too, so Recovery can no longer
                rebuild it and reports the system as unrecoverable.
              </p>
              <p>
                You then reinstall Windows by hand. Restart, press <strong>F8</strong>, choose{' '}
                <strong>Command prompt only</strong>, and run these commands in order:
              </p>
              <table className="help-commands">
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {REINSTALL_STEPS.map((step) => (
                    <tr key={step.cmd}>
                      <td><code>{step.cmd}</code></td>
                      <td>{step.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="help-callout">
                This is a safe, browser-only simulation of a classic Windows reinstall. It does not format any real
                drive or touch the host computer.
              </div>
            </article>
          )}

          {topic === 'commands' && (
            <article className="help-article">
              <h2>MS-DOS Prompt Commands</h2>
              <p>
                Open Start - Programs - MS-DOS Prompt and type a command, then press Enter. Paths use Windows style,
                for example <code>cd "C:\My Documents"</code>.
              </p>
              <table className="help-commands">
                <thead>
                  <tr>
                    <th>Command</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {DOS_COMMANDS.map((entry) => (
                    <tr key={entry.cmd}>
                      <td><code>{entry.cmd}</code></td>
                      <td>{entry.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}

          {topic === 'troubleshooting' && (
            <article className="help-article">
              <h2>Troubleshooting</h2>
              <p>
                Most issues are intentional states in the simulation. Use this page to decide whether to restore a
                driver, restore a core file, or simply interact with the page once.
              </p>
              <div className="help-troubleshooting">
                {TROUBLESHOOTING.map((item) => (
                  <section key={item.issue}>
                    <strong>{item.issue}</strong>
                    <p>{item.fix}</p>
                  </section>
                ))}
              </div>
            </article>
          )}
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{portfolioData.profile.name} - Windows 98 Portfolio Edition</p>
        <p className="status-bar-field">{activeTopic.label}</p>
      </div>
    </div>
  )
}
