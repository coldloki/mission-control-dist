# Mission Control

A personal command center for tracking tasks, projects, and custom tooling workflows.

![Mission Control](https://img.shields.io/badge/Node.js-18+-green) ![SQLite](https://img.shields.io/badge/SQLite-3-orange) ![Next.js](https://img.shields.io/badge/Next.js-15-black)

## Features

- **Task Center** — Create, organize, and track tasks with priorities, due dates, and milestones. Powered by SQLite.
- **Projects** — Group tasks by project with status tracking and overview dashboard.
- **System Nodes** — Monitor local services and their health.
- **Release Radar** — Track git branches and release states across repos.
- **Secrets Doctor** — Scan for exposed secrets and configuration mismatches.
- **TestFlight QA Board** — Log and track QA test results.

## Tech Stack

- **Next.js 15** (App Router)
- **SQLite** via `better-sqlite3`
- **Tailwind CSS v4**
- TypeScript

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-username/mission-control.git
cd mission-control

# 2. Run the setup script
./setup.sh

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

> **Port:** The default port is `3001`. You can change it by setting the `PORT` environment variable.

## Production Deployment

```bash
npm run build
npm start
```

For persistent background hosting, use PM2:

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

See [SETUP.md](SETUP.md) for the full non-technical guide.
