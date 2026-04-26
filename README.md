# Queenzy

A strict, local-first AI-powered productivity tracker and behavioral engine for desktop.

[![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-0F172A?style=flat&logo=tauri&logoColor=white)](https://tauri.app/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

<!-- ![Queenzy Dashboard](./assets/queenzy-dashboard-placeholder.png) -->

## Why Queenzy?

Queenzy is not another generic note app or gamified checklist. It is built for strict discipline and real consistency. Unlike broad tools like Notion or Habitica, Queenzy enforces progress through a locked progression system, local privacy, and a Rust-based backend that resists manipulation.

- **No cloud dependency** — all data is stored locally in SQLite.
- **Strict progression** — features unlock only when real-world consistency is demonstrated.
- **Anti-cheat by design** — no backdating, clock manipulation, or XP farming.
- **AI insights on your terms** — weekly reflections from scrubbed, anonymized local data.

## Key Features

- ✅ **Behavioral engine** using streak mechanics, loss aversion, and consistency incentives
- 🛡️ **Unhackable gamification** with XP, levels, and strict progress gates
- 🔒 **Rust backend anti-cheat** guarding against manual task abuse and clock fraud
- 🤖 **Local AI weekly insights** with privacy-first payload scrubbing
- 🗄️ **100% local-first SQLite storage** for tasks, diary entries, XP, and streak history
- 🔓 **Unlockable feature layers** activated only by sustained performance

## Architecture

Queenzy is a native desktop application built with a clear separation of concerns:

- **Shell:** Tauri v2 for lightweight desktop delivery
- **Backend:** Rust for secure anti-cheat logic, persistence, and platform-level protection
- **Frontend:** React 18 + TypeScript + Tailwind CSS for fast, polished UI
- **Database:** SQLite for reliable local-first storage

## Getting Started

### Prerequisites

- Node.js 20.x
- npm
- Rust toolchain
- On Windows, install Visual Studio Build Tools with the **Desktop development with C++** workload if native modules need compilation

### Install

```bash
npm install
```

### Development

```bash
npm run tauri dev
```

### Build

```bash
npm run build
```

### Package

```bash
npm run tauri:build
```

## Project Structure

```text
Queenzy/
├── src/
│   ├── domain.ts
│   ├── persistence.ts
│   ├── ai-reflections.ts
│   ├── schema.sql
│   └── ui/
│       ├── App.tsx
│       ├── main.tsx
│       ├── api.ts
│       ├── store.ts
│       ├── global.css
│       └── components/
│           ├── Dashboard.tsx
│           ├── TaskManager.tsx
│           ├── Diary.tsx
│           └── Report.tsx
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/main.rs
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## Contributing

Contributions should focus on strengthening the discipline model, improving anti-cheat safeguards, and expanding native desktop behavior. Submit clean PRs with focused updates and clear tests for new logic.

## License

This project is released under the **MIT License**. See `LICENSE` for details.
