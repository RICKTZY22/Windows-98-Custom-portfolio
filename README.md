# Windows 98 Portfolio Edition

A browser-based, Windows 98–inspired portfolio OS built with **React 19, TypeScript, Vite,
and 98.css**.

**🕹️ [Play it live →](https://windows-98-custom-portfolio.vercel.app/)**

This isn't a normal landing page. It boots like a small simulated PC — BIOS, startup menu,
splash — then opens into a draggable desktop that presents John Erick Mendoza's resume,
projects, and contact details through classic desktop apps.

> Not affiliated with, endorsed by, or sponsored by Microsoft. A fan-made simulation.

## Features

- **Authentic shell** — cold boot, startup menu, splash, shutdown/restart/crash/recovery
  flows; draggable desktop icons (drag one onto the Recycle Bin to delete it), Start menu,
  taskbar with clock + volume flyout, tray indicators, window focus/minimize/resize.
- **Working apps** — Explorer / My Computer, Recycle Bin, Notepad, WordPad (resume),
  Paint, Media Player, Sound Recorder, Image/Gallery viewer, Calculator, Minesweeper,
  Control Panel, Network Neighborhood, Run, Task Manager, About, Contact, Projects, Credits.
- **MS-DOS Prompt** — a real command parser (`dir`, `cd`, `type`, `del`, `scanreg`, …),
  with safeguards before deleting protected system files.
- **Internet Explorer** — browses period-accurate snapshots through the Web Archive.
- **DOS games** — DOOM and Wolfenstein 3D run fully client-side via
  [js-dos](https://js-dos.com) (DOSBox compiled to WebAssembly); shareware bundles are
  self-hosted.
- **Virtual filesystem** — a mutable `C:\` drive persisted in the browser; deleting
  critical System32 files triggers the crash-and-recovery console.

## Getting started

```bash
npm install
npm run dev      # start the dev server (Vite, usually http://localhost:5173)
npm run build    # type-check + production build
npm run lint     # eslint
npm test         # vitest
```

## Project structure

```text
src/
  components/      app UIs (apps/), shell, and system screens
  data/            app registry, icons, initial filesystem, portfolio content, themes
  os/              command processor, filesystem ops, central store, hooks
  styles/          per-area stylesheets
public/
  games/           self-hosted .jsdos game bundles
  js-dos/          js-dos player + WebAssembly emulator backends
  icons/           Windows 98–style icons
```

Most personal content lives in `src/data/portfolioData.ts`; the desktop/Start-menu app
entries in `src/data/apps.ts`; the seeded `C:\` drive in `src/data/initialFilesystem.ts`.

## Tech

React 19 · TypeScript · Vite · Vitest · ESLint · [98.css](https://jdan.github.io/98.css/)

## Credits

Game IP belongs to **id Software** / **Bethesda (ZeniMax)**; DOS emulation by **js-dos** and
**DOSBox**; original game files preserved by the **Internet Archive**; UI foundation by
**98.css**. Full attributions are in the in-app **Credits** window.

Built by **John Erick Mendoza**, with development assistance from **Claude (Anthropic)** and
**OpenAI Codex**.

## License

MIT — see [LICENSE](LICENSE).
