# Mission Control — Setup Guide

This guide is written for anyone. No technical background required.

---

## What is Mission Control?

Mission Control is a local web app that helps you track tasks, projects, and run custom checks on your computer. It runs entirely on your own machine — nothing is sent to the internet.

Think of it like a private dashboard that lives on your computer.

---

## Prerequisites

You need two things installed on your computer:

### 1. Node.js

Node.js is a free tool that runs web apps. Download it here:

**macOS / Linux:**
```bash
# Using Homebrew (recommended on Mac)
brew install node
```

**Windows:**
Download the installer from [nodejs.org](https://nodejs.org) — choose the LTS version.

To verify Node is installed, open a terminal and type:
```bash
node --version
```
You should see a version number like `v20.x.x` or higher.

### 2. Git

**macOS:**
```bash
brew install git
```

**Windows:** Download from [git-scm.com](https://git-scm.com)

---

## Installation

### Step 1 — Download the app

Open a terminal and run:

```bash
git clone https://github.com/your-username/mission-control.git
cd mission-control
```

> Replace `your-username` with the actual GitHub username where Mission Control is hosted.

### Step 2 — Install the app

```bash
./setup.sh
```

This will:
- Install all required packages
- Create the database
- Set everything up automatically

### Step 3 — Start it

```bash
npm run dev
```

You'll see something like:
```
▲ Next.js
- Local: http://localhost:3001
```

Open your browser and go to: [http://localhost:3001](http://localhost:3001)

---

## Keeping it running (so it doesn't stop when you close the terminal)

For casual use, `npm run dev` is fine. If you want Mission Control to keep running in the background:

### Using PM2 (recommended)

```bash
# Install PM2
npm install -g pm2

# Start Mission Control in the background
pm2 start ecosystem.config.js

# Save the current process list (so it restarts after reboot)
pm2 save

# Set up auto-start on boot
pm2 startup
```

To check if it's running:
```bash
pm2 status
```

To restart:
```bash
pm2 restart mission-control
```

To view logs:
```bash
pm2 logs mission-control
```

### Using a Launch Agent (macOS only)

```bash
# Copy the service file
cp mission-control.plist ~/Library/LaunchAgents/

# Load it
launchctl load ~/Library/LaunchAgents/mission-control.plist
```

---

## Customization

### Change the port

Create a file called `.env` in the project folder:

```
PORT=8080
```

Then restart the app. It will now be available at `http://localhost:8080`.

### Change the database location

```
MEMORY_DB_PATH=/path/to/your/database.db
```

---

## Updating

```bash
cd mission-control
git pull
npm install
pm2 restart mission-control   # if using PM2
```

---

## Uninstall

```bash
# If using PM2
pm2 delete mission-control

# Remove the folder
cd ..
rm -rf mission-control
```

---

## Troubleshooting

### "Port 3001 is already in use"

Another app is using the same port. Either:
1. Stop the other app, or
2. Change Mission Control's port (see Customization above)

### "Permission denied" on setup.sh

Run:
```bash
chmod +x setup.sh
```
Then try `./setup.sh` again.

### "Module not found" errors

Run:
```bash
npm install
```

### The page is blank or looks broken

Make sure you're using a modern browser (Chrome, Firefox, Safari, Edge).

---

## What each tool does

| Tool | Purpose |
|------|---------|
| **Task Center** | Add, edit, and track your tasks |
| **Projects** | Group tasks together by project |
| **System Nodes** | See the health of local services |
| **Release Radar** | Track git branches across repos |
| **Secrets Doctor** | Check for accidentally exposed secrets |
| **TestFlight QA** | Log QA test results |

---

Questions? Open an issue on GitHub or reach out to the maintainer.
