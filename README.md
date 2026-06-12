# Windows 98 Portfolio OS

A React, TypeScript, Vite, and 98.css portfolio that behaves like a small simulated Windows 98 desktop in the browser.

The OS simulation includes a 10-second startup sequence, draggable windows, Start menu, File Manager, MS-DOS Prompt, Control Panel, Paint, Network Neighborhood, System Properties, Task Manager, and resume/project apps.

## Run Locally

```bash
npm install
npm run dev
```

The dev server defaults to `http://localhost:5173`.

## Edit Portfolio Content

Update placeholder profile, project, resume, contact, and credits data in:

```text
src/data/portfolioData.ts
```

Desktop apps and window defaults live in:

```text
src/data/apps.ts
src/data/icons.ts
```

The simulated C drive, System32 tree, and terminal-visible files live in:

```text
src/data/filesystem.ts
```

Network defaults and Control Panel sections live in:

```text
src/data/system.ts
```

## Checks

```bash
npm run lint
npm run build
```

`98.css` uses an older media query that the Vite 8 Lightning CSS minifier rejects, so CSS minification is disabled in `vite.config.ts` for compatibility.
