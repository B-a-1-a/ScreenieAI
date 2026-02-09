# IdeaForge

IdeaForge is a Tauri v2 + React desktop app for turning early app ideas into actionable plans.

It supports:
- project creation and resume flow
- AI interview chat to clarify requirements
- AI plan generation (deliverables + suggested screens)
- screen-based workspace with whiteboard canvas (tldraw)
- per-screen refinement chat + wireframe generation
- local-first save/export to `~/Documents/IdeaForge`
- open exported project folders in allowlisted IDEs (`cursor`, `code`, `windsurf`)

## Tech Stack

- Tauri v2 (Rust backend commands)
- React 19 + TypeScript + Vite
- Zustand (state management)
- Zod (payload validation)
- tldraw (canvas/whiteboard)
- Vitest (frontend tests)

## Prerequisites

- Node.js 20+ and npm
- Rust toolchain (stable) with Cargo
- macOS (primary target for current implementation)

Install Rust if needed:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Install

```bash
npm install
```

Note: the first Rust build/test will download Cargo dependencies.

## Run

Run frontend only (browser):

```bash
npm run dev
```

Run desktop app (Tauri + frontend):

```bash
npm run tauri:dev
```

Build a clickable macOS app bundle:

```bash
npm run tauri:build
```

After build, open the app bundle:

```bash
open src-tauri/target/release/bundle/macos/IdeaForge.app
```

## Gemini API Key

The app uses backend-managed Gemini calls.  
Set your key in the app during the Interview phase. The key is stored in your OS keychain via Rust (`keyring`) and is not exposed in frontend env vars.

## Test and Validate

Type-check:

```bash
npm run check
```

Frontend tests:

```bash
npm test
```

Production frontend build:

```bash
npm run build
```

Rust/Tauri unit tests:

```bash
cd src-tauri
cargo test
```

## Project Data and Export Output

Saved and exported projects are written under:

```text
~/Documents/IdeaForge/<project-slug>/
```

Typical exported files include:
- `appflow.md`
- `featurelist.md`
- `apphighlevel.md`
- `suggestedstack.md`
- `.cursorrules`, `.windsurfrules`, `.clinerules`
- `agents/ideaforge-context.md`
- `.ideaforge/project.json`
- `wireframes/*.png` (when generated)

## Useful Scripts

- `npm run dev` - Vite dev server
- `npm run tauri:dev` - desktop app in development
- `npm run tauri:build` - create production desktop bundle (`.app`)
- `npm run check` - TypeScript checks
- `npm test` - Vitest suite
- `npm run build` - production web build
