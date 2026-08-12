# React Rerender Counter

Chrome DevTools extension for analyzing React component re-renders in real time.

## Stack

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | ^7.0.2 | Type safety |
| React | ^19.2.8 | Panel UI |
| esbuild | 0.28.2 | Build & bundling |
| Biome | ^2.5.7 | Linting & formatting |
| CSS Modules | — | Scoped styling |
| Manifest V3 | — | Chrome extensions platform |

## Project structure

```
src/
├── core/                          # Shared types, constants, utilities
│   ├── types.ts                   # Single source of truth for all types
│   └── colors.ts                  # Color mapping functions
│
├── entry-points/                  # Chrome execution contexts (thin wrappers)
│   ├── inject.ts                  # MAIN world — React DevTools hook
│   ├── content.ts                 # Isolated world — event bridge
│   ├── background.ts              # Service worker — state, messaging
│   └── devtools.ts                # DevTools context — panel creation
│
├── panel/                         # React application (DevTools panel)
│   ├── index.tsx                  # createRoot + mount
│   ├── App.tsx                    # Shell: toolbar, tabs, summary, status bar
│   ├── App.module.css
│   ├── hooks/
│   │   └── useRenderData.ts       # chrome.runtime.connect + state management
│   ├── views/
│   │   ├── TableView/             # Table view with sorting & filtering
│   │   ├── FlamegraphView/        # Flamegraph (cumulative render time)
│   │   └── TimelineView/          # Canvas timeline + render log
│   ├── components/
│   │   ├── Toolbar/               # Logo, tabs, search, recording toggle
│   │   ├── SummaryBar/            # Top-level statistics
│   │   ├── ReasonFilter/          # Render reason filter chips
│   │   ├── StatusBar/             # Bottom status bar
│   │   ├── DetailPanel/           # Side panel with component info
│   │   ├── Sparkline/             # SVG sparkline chart
│   │   ├── ReasonBar/             # Color-coded reason breakdown
│   │   └── ui/                    # Reusable primitives
│   │       ├── Badge/
│   │       ├── StatCell/
│   │       └── Label/
│   └── styles/
│       └── global.css             # CSS variables, normalization, fonts
│
├── devtools.html                  # DevTools page shell
└── panel.html                     # Panel page shell
```

## Architecture

```
┌─────────────┐   CustomEvent   ┌────────────┐  chrome.runtime  ┌──────────────┐
│  inject.ts  │ ──────────────→ │ content.ts │ ←──────────────→ │ background.ts│
│ (MAIN world)│                 │(ISOLATED)  │                  │(service work)│
└─────────────┘                 └────────────┘                  └──────┬───────┘
                                                                       │
                                                       ┌───────────────┼───────────┐
                                                       ↓               ↓           ↓
                                                     badge        devtools.ts   panel.html
```

### How it works

1. **inject.ts** runs at `document_start` in MAIN world (page context)
   - Creates `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` if missing
   - When React loads — calls `hook.inject(renderer)` → dispatches `REACT_DETECTED`
   - Subscribes to `onCommitFiberRoot` for fiber tree updates

2. **content.ts** bridges MAIN ↔ Extension
   - Listens for `REACT_DETECTED` and `RENDER_DATA` custom events
   - Forwards to background via `chrome.runtime.sendMessage`

3. **background.ts** manages state
   - Stores React detection status per tab
   - Updates badge (blue "R" when React found)
   - Handles `GET_REACT_STATE` requests from devtools

4. **devtools.ts** creates the panel
   - Asks background: "is React on this tab?"
   - If yes → creates "React Rerenders" panel in DevTools

## Development

### Requirements

- Node.js 18+
- Google Chrome 128+

### Setup

```bash
npm install
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build to `dist/` |
| `npm run watch` | Watch mode (rebuild on changes) |
| `npm run typecheck` | Type checking via tsc |
| `npm run lint` | Lint via Biome |
| `npm run lint:fix` | Auto-fix lint errors |
| `npm run format` | Format all files |

### Load in Chrome

1. `npm run build`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" → select `dist/` folder
5. Open any React page → F12 → Console → see `COMMIT!` logs

### IDE setup

VS Code with Biome extension (auto-configured via `.vscode/extensions.json`):
- Format on save
- Auto-fix on save
- Import sorting on save

## Key concepts

### React Fiber

Internal data structure of React. Each component is a `FiberNode` with:
- `type` — function/class component
- `child`, `sibling`, `return` — tree structure
- `alternate` — previous commit (for diff)
- `memoizedProps`, `memoizedState` — current values
- `actualDuration` — render time

### `__REACT_DEVTOOLS_GLOBAL_HOOK__`

React checks this hook on startup. If found — calls `hook.inject(renderer)` for registration. Then on each commit calls `hook.onCommitFiberRoot(rendererId, root)`. Our extension subscribes to this to receive all fiber tree updates.

### MAIN vs ISOLATED World

| World | Access | Used by |
|-------|--------|---------|
| MAIN | Page JS context, React internals | `inject.ts` |
| ISOLATED | DOM only, `chrome.runtime` API | `content.ts` |

Communication between worlds via `CustomEvent` on `window`.
