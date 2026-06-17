# App.css Modularization — Refactor Plan (no-regression)

**Goal:** split the ~4,400-line `src/App.css` into small, per-component / per-area
stylesheets, with **zero visual regression**.

**Rollback safety:** everything is committed + pushed at `fd69add` on `main`.
At any point: `git checkout -- <file>` (one file) or `git reset --hard fd69add` (everything).

---

## How "no regression" is guaranteed

Splitting CSS *moves* rules. Two things can break rendering, and each has a guard:

1. **A rule gets dropped or duplicated** → caught by **rule-set check**: the total rule
   count across ALL compiled CSS must equal the baseline, and every moved selector must
   appear exactly once.
2. **Equal-specificity rules get reordered** (the split co-locates scattered rules) →
   caught by a **computed-style diff**: open the affected app and confirm key elements'
   `getComputedStyle` values are unchanged.

Plus a **build/lint/tsc gate** after every file.

**Baseline already captured:** `../css-baseline.css` (105 KB, 698 rule blocks) — the
ground truth to diff against. (Outside the repo; nothing committed for it.)

### The one hard rule that prevents most regressions
**Shared/global utility classes stay GLOBAL and load first.** Anything used by many apps
— `.toolbar`, `.sunken-panel`, `.status-bar`, `.button-row`, `.os-menu-bar`,
`.property-grid`, `.window*`, resets — must live in an eagerly-imported global file
(loaded before any app CSS), never inside a lazy app chunk. Only truly app-specific
selectors move into per-app files.

---

## Per-file procedure (the loop — repeat for each target file)

1. **Locate** the rule blocks by grepping their selectors (NOT by line number — the audit's
   line numbers are stale).
2. **Create** the new `.css` file with those blocks copied **verbatim** (exact text).
3. **Import** it:
   - App-specific → `import './XxxApp.css'` at the top of `XxxApp.tsx` (becomes a lazy CSS
     chunk for lazy apps — bonus: loads only when the app opens).
   - Global/shell → `import './styles/xxx.css'` in `main.tsx` (eager, **keep original order**).
4. **Remove** those blocks from `App.css`.
5. **Build:** `npm run build` — must exit 0.
6. **Rule-set check:** `cat dist/assets/*.css | grep -c '{'` must still equal **698**;
   the moved selectors appear exactly once across `dist/assets/*.css`.
7. **Computed-style spot-check:** open the app in the preview, compare key elements'
   computed styles to the baseline. Any diff = stop and fix.
8. (Optional) **commit** per file/group so each step is independently revertable.

If a step fails: revert that one file and investigate before continuing.

---

## Split map (target files)

### Phase A — Global / shell (do first, carefully; all eager via `main.tsx`)
| New file | Holds (selectors) |
| :-- | :-- |
| `src/styles/cursors.css` | `html[data-cursor="win98"] …` block |
| `src/styles/desktop.css` | `.desktop*`, desktop icon grid, selection box |
| `src/styles/common.css` | resets, `.os-menu-bar`, `.status-bar`, `.toolbar`, `.button-row`, `.button-like`, `.sunken-panel` overrides, `.property-grid`, `.identity-row`, context rows |
| `src/components/WindowFrame.css` | `.window*`, title bar, drag/resize handles (`.resize-*`) |
| `src/components/system/BootScreen.css` | `.boot-*` |
| `src/components/system/BiosSetupScreen.css` | `.bios-*` |
| `src/components/system/BootMenu.css` | `.boot-device-quick-*`, boot menu |
| `src/components/system/RecoveryConsole.css` | recovery console |
| `src/components/system/ShutdownScreen.css` | shutdown / CRT-off |
| `src/components/system/CrashScreen.css` | blue-screen |
| `src/components/system/StartMenu.css` | `.start-*`, `.submenu`, `.has-submenu`, `.nested-submenu` |
| `src/components/system/Taskbar.css` | `.taskbar`, `.task-button`, `.tray*` |
| `src/components/DesktopContextMenu.css` | `.context-*` |
| `src/components/MessageBox.css` | `.message-box*`, `.message-icon` |

### Phase B — Per app (co-located, imported in each `.tsx`)
`ExplorerApp.css`*, `MinesweeperApp.css`, `ProjectsApp.css` (+ProjectDetails),
`ContactApp.css` (+Credits), `TerminalApp.css`, `NotepadApp.css`, `WordPadApp.css`,
`CalculatorApp.css`, `SoundRecorderApp.css`, `InternetExplorerApp.css`*,
`GalleryApp.css`, `ImageViewerApp.css`, `VideoPlayerApp.css` (+MediaPlayer)*,
`HelpApp.css`, `ControlPanelApp.css` (incl. `.arp-*`), `NetworkApp.css`*,
`TaskManagerApp.css`*, `RunDialogApp.css`, `PaintApp.css`, `RecycleBinApp.css`,
`AboutApp.css`.

\* **Scattered** — these have CSS in 2–3 separate places in `App.css`. Gathering them
reorders the bundle, so they get the **extra computed-style spot-check** in step 7. Do
these LAST, once the pattern is proven on the contiguous ones.

### Suggested first file (proof-of-pattern)
`CalculatorApp.css` — small, contiguous (`.calculator-app`, `.calculator-display`,
`.calculator-keys`, `.calculator-keys button`), self-contained. Prove steps 1–7 on it,
then proceed.

---

## Execution order
1. Phase A globals (cursors → common → WindowFrame → system screens → StartMenu/Taskbar/
   ContextMenu/MessageBox). Build + check after each.
2. Phase B contiguous apps (Calculator, Notepad, WordPad, Paint, Help, etc.).
3. Phase B scattered apps (Explorer, IE, Media/Video, TaskManager, Network) — with the
   computed-style spot-check.
4. **Final sweep:** full build/lint/tsc; `grep -c '{'` across `dist/assets/*.css` == 698;
   open every app and compare computed styles to baseline.

`App.css` ends up nearly empty (only any genuinely-global leftovers).

---

## Optional: ultracode adversarial audit (after the split)
Run parallel agents for an independent safety pass — each checks one dimension on the
final result:
- rule-set equality vs `../css-baseline.css` (nothing dropped/duplicated),
- no duplicate selectors introduced,
- every `className` in TSX still has a matching CSS rule (no "classless" orphans),
- `npm run build` + `eslint .` + `tsc -b` all clean.
A critic agent synthesizes. (Note: the computed-style diff is browser-bound, so it stays
serial; agents cover the static checks.)

---

## Status
- [x] Checkpoint pushed (`fd69add`)
- [x] Baseline captured (`../css-baseline.css`)
- [x] Phase A — globals
- [x] Phase B — contiguous apps
- [x] Phase B — scattered apps
- [x] Final verification sweep
- [x] ultracode audit (multi-agent classification + 3 adversarial critics)

## Outcome (executed 2026-06-17/18)
`App.css` (4503 lines, 631 top-level blocks) was split into **38 stylesheets** — 15 eager
globals imported in original-source order from `main.tsx`, 23 lazy per-app files imported
in each app component (About needs none — it uses only shared classes). `src/App.css` is
now an empty stub.

Adapted to the real codebase (the plan's `components/system/*` layout didn't exist — those
screens are inline in `App.tsx`): eager globals are `styles/{base,cursors,desktop,common,
file-manager,responsive,system-screens,bios,message-box}.css` + `components/{WindowFrame,
BootScreen,CrashScreen,StartMenu,Taskbar,DesktopContextMenu}.css`.

**Verification (all green):** `npm run build` exits 0; **698** `{` across `dist/assets/*.css`
(== baseline); selector multiset identical to `../css-baseline.css` (nothing dropped/added/
altered); every lazy selector absent from the eager bundle; eager cascade order — only 2
equal-specificity inversions, both provably harmless (`img` sizing in mutually-exclusive UI
regions: tray-button vs context-menu vs shutdown card); eslint clean; 19/19 tests pass;
browser DOM-measure QA confirmed eager shell at boot + lazy chunks loading on app open +
responsive `@media(720)` at mobile width.

Deterministic split tooling (out of repo): `C:\Users\Erick\css-refactor\` —
`parse.mjs` (verbatim tokenize/emit with partition invariant), `verify.mjs`,
`checkOrder.mjs` (conflict-aware order check), `manifest.json`.
