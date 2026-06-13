# Windows 98 Custom Portfolio

A browser-based Windows 98-inspired portfolio OS built with React, TypeScript, Vite, and 98.css.

This is not a normal landing page. It boots like a small simulated PC, opens into a draggable desktop, and presents John Erick Mendoza's resume, projects, contact details, and credits through classic desktop apps.

## Features

- BIOS-style cold boot, startup menu, Windows 98 Portfolio Edition splash, shutdown, restart, crash, and recovery flows.
- Movable desktop icons, Start menu, taskbar clock, tray indicators, window focus, minimize, close, and app launching.
- Simulated Windows apps: Explorer / My Computer, Recycle Bin, MS-DOS Prompt, Notepad, WordPad resume viewer, Paint, Internet Explorer, Windows Media Player, Sound Recorder, Control Panel, Network Neighborhood, Run, Task Manager, Calculator, Projects, About, Contact, and Credits.
- Mutable virtual filesystem with folders such as `C:\`, `C:\Windows`, `C:\Windows\System32`, `C:\My Documents`, `C:\Projects`, and `C:\Program Files`.
- Simulated protected system files: deleting critical fake System32 files can trigger the crash and recovery flow.
- Resume and portfolio content sourced from one editable data file.
- Self-hosted selected Win98-style icons and browser-safe generated/retro sounds.

## Tech Stack

- React
- TypeScript
- Vite
- 98.css
- Vitest
- ESLint
- CSS custom properties for themes, cursors, and Windows-style UI states

## Getting Started

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Vite usually starts at `http://localhost:5173`. If that port is busy, Vite will choose the next available port.

Build for production:

```bash
npm run build
```

Run checks:

```bash
npm run lint
npm test
```

## Project Structure

```text
src/
  components/
    apps/          Windows-style application UIs
    *.tsx          Desktop shell pieces such as boot, taskbar, Start menu, icons, and windows
  data/
    apps.ts        App registry, Start menu, desktop icon definitions
    icons.ts       Local icon manifest
    initialFilesystem.ts
                   Initial virtual C drive and seeded portfolio files
    portfolioData.ts
                   Resume, About Me, projects, contact, and credits content
    system.ts      Control Panel and system defaults
    themes.ts      Theme and wallpaper data
    websites.ts    Simulated Internet Explorer pages
  os/
    commands.ts    MS-DOS command processor
    filesystem.ts  Virtual filesystem operations
    store.tsx      Central OS state provider/reducer
    useOs.ts       OS context hook
```

## Editing Portfolio Content

Most personal content lives in:

```text
src/data/portfolioData.ts
```

Update that file to change:

- About Me profile
- Resume document text
- Education
- Project names and descriptions
- Contact links
- Credits

The simulated desktop and Start menu app entries live in:

```text
src/data/apps.ts
```

The virtual C drive seed data lives in:

```text
src/data/initialFilesystem.ts
```

## Portfolio Projects Included

- PLMun Inventory Nexus
- Canlas Inventory System
- Between Two Ruins
- Windows 98 Portfolio Edition

## Notes For GitHub

This project is a Windows 98-inspired portfolio simulation and is not affiliated with, endorsed by, or sponsored by Microsoft.

The source code is licensed under the MIT License. Third-party assets, visual references, icons, fonts, sounds, and libraries may have their own rights and license terms. See [NOTICE.md](NOTICE.md) for attribution and asset notes.

## Credits

- Portfolio owner and project direction: John Erick Mendoza
- Coding and QA assistance: OpenAI Codex
- Planning/refactor assistance credited by request: Claude Fable and Opus 4.8
- Windows 98-style UI foundation: 98.css
- Selected icon references/assets: Windows 98 Icon Viewer by Alex Meub
