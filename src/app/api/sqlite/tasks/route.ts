import { NextResponse } from "next/server";
import crypto from "node:crypto";
import sqlite3 from "sqlite3";

const DB_PATH = process.env.MEMORY_DB_PATH || "/Users/jerome/.openclaw/workspace/mission-control/data/tasks.db";
const db = new sqlite3.Database(DB_PATH);

type DbTaskRow = {
  id: string;
  title: string;
  details: string | null;
  type: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  schedule: string | null;
  milestones: string | null;
  automation_prompt: string | null;
  last_run_at: string | null;
  last_run_status: string | null;
  cron_job_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  project: string | null;
};

function normalizeMilestones(value: string | null): string[] {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  // Preferred: JSON array
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      // fall through
    }
  }

  // Back-compat: comma-separated string
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizePriority(value: string | null): "low" | "high" | "critical" {
  const v = (value || "").toLowerCase();
  if (v === "critical") return "critical";
  if (v === "high") return "high";
  // map medium->high to match Task Center UI
  if (v === "medium") return "high";
  return "low";
}

function normalizeStatus(value: string | null): "todo" | "in_progress" | "done" | "blocked" {
  const v = (value || "todo").toLowerCase();
  if (v === "in_progress") return "in_progress";
  if (v === "done") return "done";
  if (v === "blocked" || v === "cancelled") return "blocked";
  return "todo";
}

function normalizeType(value: string | null): "recurring" | "one-off" | "goal" {
  const v = (value || "one-off").toLowerCase();
  if (v === "recurring") return "recurring";
  if (v === "goal") return "goal";
  return "one-off";
}

function mapRow(row: DbTaskRow) {
  return {
    id: row.id,
    title: row.title,
    details: row.details ?? "",
    type: normalizeType(row.type),
    status: normalizeStatus(row.status),
    priority: normalizePriority(row.priority),
    dueDate: row.due_date,
    schedule: row.schedule,
    milestones: normalizeMilestones(row.milestones),
    automationPrompt: row.automation_prompt,
    lastRunAt: row.last_run_at,
    lastRunStatus: row.last_run_status,
    cronJobId: row.cron_job_id,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    project: row.project ?? null,
  };
}

async function run(sql: string, params: any[] = []) {
  return await new Promise<void>((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function GET(): Promise<NextResponse> {
  try {
    return await new Promise((resolve, reject) => {
      db.all("SELECT * FROM tasks ORDER BY phase, due_date", (err, rows: DbTaskRow[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(NextResponse.json(rows.map(mapRow)));
      });
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch sqlite tasks" }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const payload = (await req.json()) as any;

    const id = payload.id || crypto.randomUUID();
    const title = String(payload.title || "").trim();
    if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

    const details = String(payload.details || "");
    const type = String(payload.type || "one-off");
    const status = String(payload.status || "todo");
    const priority = String(payload.priority || "high");
    const dueDate = payload.dueDate ? String(payload.dueDate) : null;
    const schedule = payload.schedule ? String(payload.schedule) : null;
    const milestones = JSON.stringify(Array.isArray(payload.milestones) ? payload.milestones : []);
    const automationPrompt = payload.automationPrompt ? String(payload.automationPrompt) : null;
    const project = payload.project ? String(payload.project) : null;

    await run(
      `INSERT INTO tasks (id, title, details, type, status, priority, due_date, schedule, milestones, automation_prompt, project)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, details, type, status, priority, dueDate, schedule, milestones, automationPrompt, project]
    );

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create task." }, { status: 500 });
  }
}

export async function PATCH(req: Request): Promise<NextResponse> {
  try {
    const payload = (await req.json()) as any;
    const id = payload.id;
    if (!id) return NextResponse.json({ error: "Task ID is required." }, { status: 400 });

    const allowed = ["title", "details", "type", "status", "priority", "dueDate", "schedule", "milestones", "automationPrompt", "project"];
    const updates: string[] = [];
    const values: any[] = [];

    for (const key of allowed) {
      if (key in payload) {
        const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        updates.push(`${dbKey} = ?`);
        if (key === "milestones") {
          values.push(JSON.stringify(Array.isArray(payload.milestones) ? payload.milestones : []));
        } else {
          values.push(payload[key] === null ? null : String(payload[key]));
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No supported fields to update." }, { status: 400 });
    }

    await run(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, [...values, id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update task." }, { status: 500 });
  }
}
