// Release history for the Windows 98 Portfolio Edition, surfaced inside the Inbox
// app as Microsoft Exchange mail (one message per version). Each entry is grounded
// in the real git history of this repository — the `commits` field lists the actual
// commit subjects that shipped in that version so the changelog stays honest.
//
// Timeline note: development began on May 28, 2026 as a conventional portfolio; the
// first public push to GitHub (and the Windows 98 reimagining) landed June 13, 2026.

export type ReleaseStatus = 'prerelease' | 'released' | 'current'

export type ReleaseSection = {
  title: string
  items: string[]
}

export type ReleaseNote = {
  /** Full semantic version, e.g. "1.0.0". */
  version: string
  /** Short display label, e.g. "v1.0". */
  label: string
  /** Friendly build codename. */
  codename: string
  /** Human-readable release date, e.g. "June 13, 2026". */
  date: string
  /** Short date shown in the message list "Received" column, e.g. "6/13/2026". */
  shortDate: string
  status: ReleaseStatus
  /** One-line subject headline for the message list. */
  headline: string
  /** Lead paragraph shown at the top of the release body. */
  summary: string
  sections: ReleaseSection[]
  /** Real git commit subjects that shipped in this version. */
  commits: string[]
}

// Oldest first. The Inbox renders these newest-first as unread-on-arrival mail.
export const releaseNotes: ReleaseNote[] = [
  {
    version: '0.9.0',
    label: 'v0.9',
    codename: 'Genesis',
    date: 'May 28, 2026',
    shortDate: '5/28/2026',
    status: 'prerelease',
    headline: 'The original portfolio',
    summary:
      'Development started today as a conventional single-page developer portfolio, long before the Windows 98 reimagining. This pre-release baseline is the foundation everything else was built on.',
    sections: [
      {
        title: 'Foundation',
        items: [
          'Project scaffolded with React, TypeScript and Vite.',
          'Initial portfolio content drafted: About, Projects and Contact.',
          'Committed a clean baseline before the simulated-OS upgrade began.',
        ],
      },
      {
        title: 'Notes',
        items: [
          'Built locally for the first couple of weeks; not yet on GitHub.',
          'The decision to rebuild the whole thing as a bootable Windows 98 desktop came right after this.',
        ],
      },
    ],
    commits: ['Baseline before simulated-OS upgrade'],
  },
  {
    version: '1.0.0',
    label: 'v1.0',
    codename: 'Cold Boot',
    date: 'June 13, 2026',
    shortDate: '6/13/2026',
    status: 'released',
    headline: 'Windows 98, in your browser',
    summary:
      'First public push to GitHub. The portfolio is reborn as a bootable Windows 98 desktop you can actually use. This is the v1.0 launch build.',
    sections: [
      {
        title: 'Desktop shell',
        items: [
          'Full boot sequence into a working Windows 98 desktop.',
          'Taskbar, Start menu and a system tray clock.',
          'Draggable, resizable, minimisable and maximisable windows.',
        ],
      },
      {
        title: 'Applications',
        items: [
          'My Computer / Windows Explorer browsing an in-memory filesystem.',
          'Notepad, WordPad and Paint.',
          'Internet Explorer, Media Player, Calculator and Minesweeper.',
        ],
      },
      {
        title: 'Under the hood',
        items: [
          'Reducer-based OS store driving all window and app state.',
          'Immutable in-memory filesystem engine.',
          '98.css theming for an authentic late-90s look.',
          'Licensed MIT (attribution required).',
        ],
      },
    ],
    commits: ['Initial commit', 'Build Windows 98 portfolio OS', 'Merge remote license'],
  },
  {
    version: '1.1.0',
    label: 'v1.1',
    codename: 'Expansion',
    date: 'June 15, 2026',
    shortDate: '6/15/2026',
    status: 'released',
    headline: 'More of everything',
    summary:
      'A breadth pass that fleshed the simulation out with more apps, deeper window behaviour and richer filesystem content.',
    sections: [
      {
        title: "What's new",
        items: [
          'Expanded the Windows 98 portfolio OS simulation across the board.',
          'Additional applications and more faithful window interactions.',
          'A deeper, more realistic seeded filesystem.',
        ],
      },
    ],
    commits: ['Expand Windows 98 portfolio OS simulation'],
  },
  {
    version: '1.2.0',
    label: 'v1.2',
    codename: 'Time Capsule',
    date: 'June 17, 2026',
    shortDate: '6/17/2026',
    status: 'released',
    headline: 'The web, archived',
    summary:
      'Internet Explorer learned to browse real archived pages, and the bundle got noticeably leaner.',
    sections: [
      {
        title: "What's new",
        items: [
          'Internet Explorer browses real web-archive snapshots for a period-accurate web.',
          'WordPad gained a working "Save As" dialog.',
          'Add / Remove Programs added to Control Panel.',
        ],
      },
      {
        title: 'Performance',
        items: [
          'Apps are now code-split and lazy-loaded, keeping the initial desktop bundle small.',
        ],
      },
    ],
    commits: ['Web-archive IE, app code-splitting, editor Save As, Add/Remove Programs'],
  },
  {
    version: '1.3.0',
    label: 'v1.3',
    codename: 'Foundations',
    date: 'June 18, 2026',
    shortDate: '6/18/2026',
    status: 'released',
    headline: 'Architecture & stability',
    summary:
      'A heavy internal-engineering day: the codebase was reorganised for maintainability and a batch of app bugs were squashed.',
    sections: [
      {
        title: 'Architecture',
        items: [
          'Split the monolithic App.css into per-area eager and per-app lazy stylesheets.',
          'Grouped shell and system components into dedicated subfolders.',
          'Window opening is now idempotent, so duplicate windows no longer appear.',
        ],
      },
      {
        title: 'Fixes',
        items: [
          'Repaired Sound Recorder, Paint, Media Player, Gallery, Run and file opening.',
          'Sound Recorder now captures real microphone audio, saves it and plays it back.',
        ],
      },
    ],
    commits: [
      'Split App.css into per-area eager + lazy-per-app stylesheets',
      'Group shell/system components into subfolders',
      'Make OPEN_WINDOW idempotent to prevent duplicate windows',
      'Fix Sound Recorder, Paint, Media Player, Gallery, Run, file open + more',
      'Sound Recorder: capture real audio, save it, and play it back',
    ],
  },
  {
    version: '1.4.0',
    label: 'v1.4',
    codename: 'Arcade',
    date: 'June 20, 2026',
    shortDate: '6/20/2026',
    status: 'released',
    headline: 'Games, recovery & media',
    summary:
      'The big content drop: real DOS games in the browser, the first system-recovery groundwork, and an external media library.',
    sections: [
      {
        title: "What's new",
        items: [
          'DOS games run in-browser via self-hosted js-dos: DOOM and Wolfenstein 3D.',
          'Recovery scan animation for the system-repair flow.',
          'System-file delete safeguards protect boot-critical files.',
          'Env-driven external media library for pictures and video.',
        ],
      },
      {
        title: 'Project',
        items: [
          'Added a README with a live demo link and badges.',
        ],
      },
    ],
    commits: [
      'Add DOS games (js-dos), recovery scan animation, and system-file delete safeguards',
      'Add env-driven external media library',
      'Add README + live demo link and badges',
    ],
  },
  {
    version: '1.5.0',
    label: 'v1.5',
    codename: 'Buff & Shine',
    date: 'June 21, 2026',
    shortDate: '6/21/2026',
    status: 'released',
    headline: 'Polish pass',
    summary: 'A focused round of bug fixes and user-interface improvements across the shell and apps.',
    sections: [
      {
        title: 'Improvements',
        items: [
          'Numerous bug fixes throughout the desktop and applications.',
          'Assorted UI refinements for a more authentic feel.',
        ],
      },
    ],
    commits: ['bug fixes and ui improvements'],
  },
  {
    version: '1.6.0',
    label: 'v1.6',
    codename: 'Facelift',
    date: 'June 22, 2026',
    shortDate: '6/22/2026',
    status: 'released',
    headline: 'System screens & a fresh icon set',
    summary:
      'The system screens were refactored for consistency, the icon set was overhauled, and a little something was hidden in the OS.',
    sections: [
      {
        title: "What's new",
        items: [
          'Refactored the boot, BIOS and recovery system screens.',
          'Full icon revamp across the desktop and apps.',
          'Media handling fixes.',
        ],
      },
      {
        title: 'Secret',
        items: ['An easter egg was planted somewhere in the OS. Happy hunting.'],
      },
    ],
    commits: ['refactor system screens and media fixes', 'Icon revamp and easter egg planted'],
  },
  {
    version: '1.7.0',
    label: 'v1.7',
    codename: 'Fit & Finish',
    date: 'June 24, 2026',
    shortDate: '6/24/2026',
    status: 'released',
    headline: 'Refinement',
    summary: 'A refinement build focused on UI polish and a more believable BIOS Setup.',
    sections: [
      {
        title: 'Improvements',
        items: [
          'UI polish across the shell.',
          'BIOS Setup improvements for a more convincing power-on experience.',
          'Assorted minor improvements.',
        ],
      },
    ],
    commits: ['UI polish, BIOS improvements, and minor improvements'],
  },
  {
    version: '1.8.0',
    label: 'v1.8',
    codename: 'Service Pack',
    date: 'June 27, 2026',
    shortDate: '6/27/2026',
    status: 'released',
    headline: 'Maintenance tools, Inbox & deep system files',
    summary:
      'Windows 98 maintenance tools arrive, the release history becomes a working Exchange-style Inbox, system files and drivers become deeply tied to apps and errors, and the portfolio content gets a major accuracy pass.',
    sections: [
      {
        title: 'Inbox & release history',
        items: [
          'Added the Microsoft Exchange-style Inbox app that renders release notes as mail.',
          'Kept Inbox as a desktop-only app so the Start menu stays closer to classic Windows 98.',
          'Grounded the release-history messages in real git commit subjects.',
        ],
      },
      {
        title: 'Boot realism & system tools',
        items: [
          'Added the BIOS-style Startup Menu with Normal, Safe Mode, Command Prompt Only, and Recovery choices.',
          'Added System Information, Device Manager, MSConfig, Registry Editor, ScanDisk, and Disk Defragmenter.',
          'Added a startup ScanDisk flow that runs automatically after an improper shutdown.',
        ],
      },
      {
        title: 'Maintenance tools',
        items: [
          'ScanDisk surface with a visual disk check.',
          'Disk Defragmenter with the classic block animation.',
          'Startup scan that runs automatically after an improper shutdown.',
        ],
      },
      {
        title: 'System files & drivers',
        items: [
          'Every system file is now tied to a feature or app, with accurate error handling.',
          'Removing a driver file disables the matching device and raises real errors.',
          'Safe Mode loads generic drivers so the system stays repairable.',
          'Device Manager reflects live driver health with problem badges.',
          'Memory and virtual disk limits now produce period-accurate errors instead of unbounded localStorage growth.',
        ],
      },
      {
        title: 'System repair',
        items: [
          'Interactive SFC /SCANNOW with a Y/N prompt; the restore is staged and applied on restart.',
          'Taskbar balloons warn the moment a driver file is removed.',
          'When System32 is wiped, recovery fails and you must reinstall by hand from the terminal (format, sys, setup, win).',
        ],
      },
      {
        title: 'Portfolio content',
        items: [
          'Added the AI Uprising essay to My Documents.',
          'Expanded Help with a full program list and safer, clearer educational guidance.',
          'Moved resume REST API descriptions from frontend skills to backend skills for accuracy.',
          'Boot disclaimer expanded with Microsoft and Windows context.',
          'Run dialog temporarily marked work-in-progress while it is rebuilt.',
        ],
      },
    ],
    commits: [
      'Add Inbox app, BIOS-style startup menu, icon overhaul, and bug fixes',
      'Use the PC icon for the Desktop folder',
      'Show Inbox only on the desktop, not in the Start menu',
      'Add memory and disk guardrails, delete notifications, and Help docs',
      'Add AI Uprising essay, content accuracy pass, and full Help program list',
      'Resume: move REST APIs from frontend to backend skills',
    ],
  },
  {
    version: '1.9.0',
    label: 'v1.9',
    codename: 'Driver Lab',
    date: 'June 29, 2026',
    shortDate: '6/29/2026',
    status: 'released',
    headline: 'Driver effects, controls & repair notes',
    summary:
      'The current in-progress build focuses on making driver deletion feel more believable without making the simulation hostile: video failure is visual, game controls are modernized, and Help now documents what every system file does.',
    sections: [
      {
        title: 'Driver behavior',
        items: [
          'Deleting display drivers no longer throws a persistent desktop warning banner.',
          'Missing video drivers now push the desktop into a blurrier, grayscale Standard VGA-style degraded mode.',
          'Driver removals use targeted simulated errors and close or disable only the affected feature category.',
        ],
      },
      {
        title: 'System file education',
        items: [
          'Help > Files and Drivers now lists the seeded Windows system files and what happens if each one is deleted.',
          'Critical files, app dependencies, feature files, driver files, and low-impact files all share the same classifier used by runtime errors.',
          'Display-driver consequences now explain degraded visuals instead of implying a real OS failure.',
        ],
      },
      {
        title: 'Games',
        items: [
          'DOOM and Wolfenstein 3D now support modern WASD movement through the js-dos wrapper.',
          'A/D strafe, Q/E turn, and the original arrow/Ctrl/Alt/Space controls still work.',
          'A small in-game hint documents the updated control scheme.',
        ],
      },
      {
        title: 'Media hosting',
        items: [
          'Fixed Vercel Blob photo seeding so My Pictures loads hosted images consistently, matching the working video flow.',
          'The media env parser now tolerates extra JSON quoting, URL-only lists, and src/url keys for easier Vercel dashboard setup.',
          'Gallery, Explorer thumbnails, and Imaging Preview now recognize WebP, AVIF, and SVG in addition to the existing classic image types.',
          'Existing saved virtual disks refresh hosted media URLs without overwriting user-created Paint or gallery files.',
        ],
      },
      {
        title: 'Verification',
        items: [
          'Build, lint, and test pass after the driver, Help, control, and Vercel Blob media changes.',
        ],
      },
    ],
    commits: ['Add driver effects, system file docs, game controls, and Blob media fixes'],
  },
  {
    version: '1.10.0',
    label: 'v1.10',
    codename: 'Visual Labels',
    date: 'June 30, 2026',
    shortDate: '6/30/2026',
    status: 'released',
    headline: 'Certificates, clearer system files & Win98 notifications',
    summary:
      'This patch makes the portfolio easier to read at a glance: certificates now live in their own app, System32 files have clearer icons, audio driver deletion degrades gently, dialogs are easier to understand, and notifications now feel closer to Windows tray balloons.',
    sections: [
      {
        title: 'Certificates',
        items: [
          'Added the Certificates app under Start > Portfolio.',
          'Stored TestDome HTML/CSS, React, and JavaScript certificates with rankings, passed dates, credential IDs, and verification links.',
          'The certificate app remains lazy-loaded so the desktop startup bundle stays lean.',
        ],
      },
      {
        title: 'System file clarity',
        items: [
          'Audio driver files now use speaker-style icons and video driver files now use display-style icons.',
          'Boot-critical core system files now use a Windows-logo system icon to separate them from ordinary DLLs.',
          'Network and input driver files also use device-oriented icons so Explorer is easier to scan.',
          'Existing persisted virtual disks refresh these icon changes without restoring files the user intentionally deleted.',
        ],
      },
      {
        title: 'Audio driver behavior',
        items: [
          'Audio drivers now use a softer counter instead of failing on the first missing file.',
          'One missing audio driver shows a warning only; two missing files quiet system event sounds while media apps can still open.',
          'Three or more missing audio driver files disable Media Player audio, Video Player audio, Sound Recorder, and sound settings until Recovery restores the protected cache.',
          'Audio driver loss never crashes normal boot by itself, so Explorer, BIOS, and Recovery stay usable.',
        ],
      },
      {
        title: 'Dialog polish',
        items: [
          'Message boxes now include a Win98 title-bar close button.',
          'Error, warning, info, and question dialogs use distinct icons and cleaner detail formatting.',
          'Driver errors show consistent error codes without making the simulation feel hostile.',
        ],
      },
      {
        title: 'Notifications',
        items: [
          'Tray balloons now use notification types, classic icons, duplicate counters, and action buttons.',
          'Only a couple of balloons stay visible at once so repeated driver or file events do not spam the desktop.',
          'Added a compact, clearable System Log under Programs > Accessories > System Tools for recent driver, file, import, cleanup, restore, and system events.',
          'Restoring files now records success events so old missing/deleted entries read as history instead of live status.',
          'Common notices can open useful places directly, such as Device Manager, My Pictures, Recycle Bin, Network Neighborhood, or Help.',
        ],
      },
      {
        title: 'Help and Inbox',
        items: [
          'Help > What\'s New now mentions the Certificates app and the clearer System32 icon categories.',
          'Help > What\'s New now documents audio driver tiers, cleaner error dialogs, and the System Log notification overhaul.',
          'Help > Files and Drivers now shows the same icon language used by Explorer and explains audio/video driver counters.',
          'Inbox release history now has a new current release mail for this patch.',
        ],
      },
    ],
    commits: [
      'Add new system apps and certificates',
      'Update TestDome certificates',
      'Add system file icon clarity and release notes',
      'Add audio driver tiers and dialog polish',
      'Overhaul tray notifications and add System Log',
    ],
  },
  {
    version: '1.11.0',
    label: 'v1.11',
    codename: 'Safety & Phishing Audit',
    date: 'August 13, 2026',
    shortDate: '8/13/2026',
    status: 'released',
    headline: 'Enhanced Setup Safety simulation, phishing email test & realistic deletion modal',
    summary:
      'This release overhauls the educational testdontouch.exe setup simulation: error popups now spread across the desktop, popups double after a 2-second relief delay, simulated OS lag indicators trigger on resource spikes, a realistic flying-file deletion progress modal appears before BSOD, and a simulated phishing email with executable attachment tests real-life security awareness in Inbox.',
    sections: [
      {
        title: 'Setup Safety Simulation',
        items: [
          'Overhauled testdontouch.exe setup wizard with quadrant-based popup layout across the desktop.',
          'Closing or confirming an error popup now delays for 2 seconds before spawning double error popups.',
          'Added high-CPU simulated OS lag banner and screen thrum animation on resource escalation.',
          'Added simulated RAM consumption counter (+4 MB per popup) in the status bar.',
          'Added a realistic retro Win98 flying-file deletion progress modal before triggering BSOD.',
          'Included a Safety Bypass button and Shift+Esc shortcut to immediately open Safety Training.',
        ],
      },
      {
        title: 'Inbox Phishing Awareness',
        items: [
          'Added a simulated phishing email (Claim Your Free 10,000 Robux Code) with clickable testdontouch.exe attachment in Inbox to demonstrate real-world social engineering awareness.',
        ],
      },
    ],
    commits: [
      'Add Setup Safety simulation enhancements and phishing email attachment',
      'Add 2-second popup delay, spread out error layout, and realistic deletion modal',
    ],
  },
  {
    version: '1.12.0',
    label: 'v1.12',
    codename: 'Portfolio Center',
    date: 'August 30, 2026',
    shortDate: '8/30/2026',
    status: 'current',
    headline: 'Portfolio App tabs, local uploads & new backend certificates',
    summary:
      'This patch turns the Portfolio App into a cleaner single-window portfolio center with project tabs, local browser-only project uploads, and two new TestDome backend certificates.',
    sections: [
      {
        title: 'Portfolio App',
        items: [
          'Added a new Portfolio App to the desktop and Start > Portfolio.',
          'Converted the first version from shortcut launcher behavior into one contained app with internal sections.',
          'Project cards now open new project tabs with full details, documentation, and local browser-only uploads.',
          'Changed the Portfolio App icon to a human/profile-style icon and removed the extra app-summary card from the body.',
          'Hidden the old Portfolio OS desktop shortcut while keeping the underlying project files available in the virtual drive.',
        ],
      },
      {
        title: 'Certificates',
        items: [
          'Added the TestDome Node.js certificate, ranked Top 10%, passed on August 30, 2026.',
          'Added the TestDome Express.js certificate, ranked Top 10%, passed on August 30, 2026.',
          'Portfolio App and Certificates now read from the same shared certificate registry.',
        ],
      },
    ],
    commits: [
      'Add Portfolio App desktop hub',
      'Add project tabs and local portfolio uploads',
      'Add Node.js and Express.js TestDome certificates',
    ],
  },
]
