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
    date: 'June 26, 2026',
    shortDate: '6/26/2026',
    status: 'current',
    headline: 'Maintenance tools & deep system files (in development)',
    summary:
      'The current build. Windows 98 maintenance tools arrive, system files and drivers become deeply tied to apps and errors, and system repair is reworked end-to-end. This release is still in development.',
    sections: [
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
        title: 'Other',
        items: [
          'Inbox (this app): the release history delivered as Microsoft Exchange mail.',
          'Boot disclaimer expanded with Microsoft and Windows context.',
          'Run dialog temporarily marked work-in-progress while it is rebuilt.',
        ],
      },
    ],
    commits: ['(in development, not yet committed)'],
  },
]
