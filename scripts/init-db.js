/**
 * Mission Control — Database Initialization Script
 * Run once during first setup to create the SQLite schema.
 */

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_PATH = process.env.MEMORY_DB_PATH || path.join(__dirname, "..", "data", "tasks.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Remove existing database to start fresh (optional — safe since no real data exists yet)
if (fs.existsSync(DB_PATH)) {
  console.log(`  Database already exists at ${DB_PATH}`);
  console.log("  Skipping re-initialization. Delete the file to reset.");
  process.exit(0);
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // Tasks table
  db.run(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      details TEXT,
      type TEXT DEFAULT 'one-off',
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      schedule TEXT,
      milestones TEXT,
      automation_prompt TEXT,
      last_run_at TEXT,
      last_run_status TEXT,
      cron_job_id TEXT,
      version TEXT,
      phase INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      notes TEXT,
      parent_task_id TEXT,
      project TEXT,
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
    )
  `);

  // Indexes for performance
  db.run("CREATE INDEX idx_tasks_status ON tasks(status)");
  db.run("CREATE INDEX idx_tasks_due_date ON tasks(due_date)");
  db.run("CREATE INDEX idx_tasks_priority ON tasks(priority)");
  db.run("CREATE INDEX idx_tasks_type ON tasks(type)");
  db.run("CREATE INDEX idx_tasks_phase ON tasks(phase)");
  db.run("CREATE INDEX idx_tasks_version ON tasks(version)");

  // Auto-update trigger
  db.run(`
    CREATE TRIGGER update_task_updated_at
    AFTER UPDATE ON tasks
    FOR EACH ROW
    BEGIN
      UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
    END
  `);

  // Settings table
  db.run(`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Projects table
  db.run(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      services TEXT,
      runs TEXT,
      repo TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Node registry for system monitoring
  db.run(`
    CREATE TABLE node_registry (
      id TEXT PRIMARY KEY,
      name TEXT,
      command_pattern TEXT,
      port INTEGER,
      autostart INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Events log
  db.run(`
    CREATE TABLE events (
      id TEXT PRIMARY KEY,
      event_type TEXT,
      category TEXT,
      summary TEXT,
      details TEXT,
      task_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  console.log(`  ✓ Database created at: ${DB_PATH}`);
  console.log("  ✓ Tables: tasks, settings, projects, node_registry, events");
});

db.close(() => {
  process.exit(0);
});
