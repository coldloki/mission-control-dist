/**
 * SQLite Client Library
 * Direct database operations for Mission Control
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const DB_PATH = process.env.MEMORY_DB_PATH || '/Users/jerome/.openclaw/workspace/mission-control/data/tasks.db';

const db: any = new sqlite3.Database(DB_PATH);

// Promisify database methods
db.allAsync = promisify(db.all).bind(db);
db.runAsync = promisify(db.run).bind(db);

// Tasks
export async function getTasks() {
    return db.allAsync('SELECT * FROM tasks ORDER BY phase, due_date');
}

export async function getTaskById(id: string) {
    const tasks = await db.allAsync('SELECT * FROM tasks WHERE id = ?', [id]);
    return tasks[0] || null;
}

export async function updateTaskStatus(id: string, status: string) {
    const timestamp = new Date().toISOString().split('T')[0];
    await db.runAsync(
        'UPDATE tasks SET status = ?, updated_at = datetime("now"), completed_at = CASE WHEN ? = "done" THEN ? ELSE completed_at END WHERE id = ?',
        [status, status, timestamp, id]
    );
}

export async function createTask(data: any) {
    const id = data.id || `task-${Date.now()}`;
    const now = new Date().toISOString();
    
    await db.runAsync(
        `INSERT INTO tasks (id, title, details, type, status, priority, due_date, version, phase, milestones, schedule, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            data.title,
            data.details || '',
            data.type || 'one-off',
            data.status || 'todo',
            data.priority || 'medium',
            data.dueDate || null,
            data.version || null,
            data.phase || 1,
            data.milestones?.join(', ') || '',
            data.schedule || '',
            now,
            now
        ]
    );
    
    return { id, success: true };
}

export async function deleteTask(id: string) {
    await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
    return { success: true };
}

// Sync Status
export async function getSyncStatus() {
    const result = await db.allAsync('SELECT value FROM settings WHERE key = "last_sync"');
    return {
        lastSync: result[0]?.value || 'Never',
        timestamp: new Date()
    };
}

export async function updateSyncTimestamp() {
    await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES ("last_sync", datetime("now"))'
    );
}

// Stats
export async function getTaskStats() {
    const rows = await db.allAsync(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = "done" THEN 1 ELSE 0 END) as done,
            SUM(CASE WHEN status = "in_progress" THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN status = "todo" THEN 1 ELSE 0 END) as todo
        FROM tasks
    `);
    
    return rows[0] || { total: 0, done: 0, in_progress: 0, todo: 0 };
}

// Events
export async function logEvent(eventType: string, summary: string, details: string = '', taskId: string = '') {
    const id = `evt-${Date.now()}`;
    const now = new Date().toISOString();
    
    await db.runAsync(
        'INSERT INTO events (id, event_type, category, summary, details, task_id, created_at) VALUES (?, ?, "task", ?, ?, ?, ?)',
        [id, eventType, 'task', summary, details, taskId, now]
    );
}

// Initialize settings table if not exists
export async function initializeDatabase() {
    await db.runAsync(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);
    
    // Insert default last_sync if not exists
    await db.runAsync(
        'INSERT OR IGNORE INTO settings (key, value) VALUES ("last_sync", "never")'
    );
}

// Close database connection
export function closeDatabase() {
    db.close();
}

export default db;