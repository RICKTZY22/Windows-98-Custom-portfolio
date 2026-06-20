<div align="center">

# 🖥️ Windows 98 Portfolio Edition

A browser-based **Windows 98 desktop** — it boots like a real PC, then opens into a
draggable desktop full of working apps. Built as an interactive portfolio.

[![Play it live](https://img.shields.io/badge/▶%20Play%20it%20live-windows--98--custom--portfolio.vercel.app-000?style=for-the-badge&logo=vercel)](https://windows-98-custom-portfolio.vercel.app/)

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
&nbsp;![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
&nbsp;![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white)
&nbsp;![License: MIT](https://img.shields.io/badge/License-MIT-22c55e)

</div>

> Fan-made simulation — not affiliated with, endorsed by, or sponsored by Microsoft.

## ✨ Features

- **Authentic shell** — BIOS cold boot, startup menu, splash, and shutdown / restart /
  crash / recovery flows.
- **A desktop you can mess with** — draggable icons (drop one on the Recycle Bin to delete
  it), Start menu, taskbar with a live clock and volume flyout, focusable / resizable
  windows, right-click menus.
- **Working apps** — Explorer, Notepad, WordPad, Paint, Media Player, Sound Recorder,
  Image / Gallery viewer, Calculator, Minesweeper, Control Panel, Task Manager, Run,
  About, Contact, Projects, and Credits.
- **MS-DOS Prompt** — a real command parser (`dir`, `cd`, `type`, `del`, `scanreg`, …),
  with safeguards before deleting protected system files.
- **Internet Explorer** — browses period-accurate snapshots through the Web Archive.
- **DOS games** — DOOM and Wolfenstein 3D run fully in-browser via
  [js-dos](https://js-dos.com) (DOSBox compiled to WebAssembly), self-hosted with no
  click-to-start.
- **Virtual filesystem** — a persistent `C:\` drive; delete the wrong System32 files and
  you get the crash-and-recovery console.

## 🚀 Getting started

```bash
npm install
npm run dev      # dev server (Vite — usually http://localhost:5173)
npm run build    # type-check + production build
npm run lint     # eslint
npm test         # vitest
```

## 🗂️ Project structure

```text
src/
  components/   app UIs (apps/), shell, and system screens
  data/         app registry, icons, initial filesystem, portfolio content, themes
  os/           command processor, filesystem ops, central store, hooks
  styles/       per-area stylesheets
public/
  games/        self-hosted .jsdos game bundles
  js-dos/       js-dos player + WebAssembly emulator backends
  icons/        Windows 98–style icons
```

Personal content lives in `src/data/portfolioData.ts` · desktop & Start-menu entries in
`src/data/apps.ts` · the seeded `C:\` drive in `src/data/initialFilesystem.ts`.

## 🛠️ Tech

React 19 · TypeScript · Vite · Vitest · ESLint · [98.css](https://jdan.github.io/98.css/)

## 🙏 Credits

Game IP © **id Software / Bethesda (ZeniMax)** · DOS emulation by **js-dos** & **DOSBox** ·
game files preserved by the **Internet Archive** · UI foundation by **98.css**.
Full attributions live in the in-app **Credits** window.

Built by **John Erick Mendoza**, with development help from **Claude (Anthropic)** and
**OpenAI Codex**.

## 📄 License

MIT — see [LICENSE](LICENSE).
