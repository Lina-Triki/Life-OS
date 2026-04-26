# Queenzy LifeOS

A privacy-first, AI-powered personal desktop Life Operating System built with Tauri, React, Zustand, SQLite, and Rust.

## Project Overview

Queenzy LifeOS is designed as a local-first productivity hub with an anti-cheat XP system, task management, diary reflections, and queued AI-powered weekly insights. The app ships as a desktop wrapper powered by Tauri with a Rust backend and a React frontend.

## Architecture

### Frontend
- `src/ui/` contains the React-based UI
- `src/ui/App.tsx` defines the navigation graph and main layout
- `src/ui/components/` contains the four primary screens:
  - `Dashboard.tsx`
  - `TaskManager.tsx`
  - `Diary.tsx`
  - `Report.tsx`
- Global state is managed with `zustand` in `src/ui/store.ts`
- Secure IPC is performed with `@tauri-apps/api/core` in `src/ui/api.ts`
- Styling is centralized in `src/ui/global.css`

### Backend
- `src-tauri/src/main.rs` is the native Tauri backend
- The backend opens the SQLite database in the app data directory and runs a background reflection queue worker
- It exposes tightly controlled commands for the renderer only:
  - `get_tasks`
  - `complete_task`
  - `get_reflection_jobs`
  - `submit_weekly_reflection_job`
  - `process_queued_reflection_jobs`
  - `export_data`

### Domain and Persistence
- `src/domain.ts` defines the core anti-cheat and XP domain model
- `src/persistence.ts` manages SQLite schema, migrations, and exports
- `src/schema.sql` documents the full persistent schema for tasks, users, streaks, reflection jobs, and more
- `src/ai-reflections.ts` handles AI job scheduling, payload creation, and queue processing

## Features

- Local SQLite persistence with migration support
- Work/tasks tracking with XP, streaks, achievements, and anti-cheat safeguards
- Diary entries and mood-driven reflection journaling
- AI reflection job queue with secure PII scrubbing
- Responsive React UI with routing and state sync
- Tauri desktop wrapper for native distribution

## Getting Started

### Prerequisites
- Node 20.x
- npm
- Rust toolchain for Tauri builds
- Optional on Windows: Visual Studio Build Tools with "Desktop development with C++" if native packages need compilation

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Open the UI at `http://localhost:1420` or run the Tauri app in development mode:

```bash
npm run tauri:dev
```

### Build

```bash
npm run build
```

### Tauri Package

```bash
npm run tauri:build
```

## Testing

### Unit tests

```bash
npm run test:unit
```

### Integration tests

```bash
npm run test:integration
```

### E2E tests

```bash
npm run test:e2e
```

### Full CI pipeline

```bash
npm run ci
```

## CI / CD

A GitHub Actions workflow is configured in `.github/workflows/ci.yml` to:
- install dependencies
- build the frontend
- run unit tests
- build the Tauri app for Linux, Windows, and macOS
- upload packaged artifacts

## Design Decisions

### Why Tauri
- Smaller native binary size compared to Electron
- Lower memory footprint by using OS webviews
- Minimal IPC overhead through Rust-backed commands
- Better fit for a privacy-safe offline-first LifeOS app

### State Management
- `zustand` keeps the renderer lightweight
- store actions call backend IPC commands asynchronously
- UI remains responsive while database and reflection operations run

### Background Worker
- The Rust backend spawns a background thread on startup
- Processes queued AI reflection jobs every 15 minutes
- Prevents UI blocking and keeps heavy work off the renderer thread

### Security Contract
Renderer only uses a narrow safe API surface, and direct DB or shell access is forbidden.

## Project Structure

```text
Queenzy/
├── .github/
│   └── workflows/ci.yml
├── src/
│   ├── ai-reflections.ts
│   ├── domain.ts
│   ├── persistence.ts
│   ├── schema.sql
│   └── ui/
│       ├── App.tsx
│       ├── api.ts
│       ├── global.css
│       ├── main.tsx
│       ├── store.ts
│       ├── types.ts
│       └── components/
│           ├── Dashboard.tsx
│           ├── TaskManager.tsx
│           ├── Diary.tsx
│           └── Report.tsx
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/main.rs
├── vitest.config.ts
├── playwright.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Known Local Setup Caveat

On Windows, native packages such as `better-sqlite3` may require a C++ toolchain and Visual Studio Build Tools for compilation. If `npm install` fails with `node-gyp` / `Visual Studio` errors, install the "Desktop development with C++" workload.

## Future Improvements

- Add settings and profile management
- Add task creation and diary entry creation UI
- Add unlockables and achievement progress screens
- Wire a real Gemini/OpenAI backend securely
- Add package signing and auto-update manifest support

## Contact
For more advanced engineering work, extend the existing domain model and backend commands before adding UI features.
