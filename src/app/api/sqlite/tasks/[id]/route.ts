import { NextResponse } from "next/server";
import sqlite3 from "sqlite3";

const DB_PATH = process.env.MEMORY_DB_PATH || "/Users/jerome/.openclaw/workspace/mission-control/data/tasks.db";
const db = new sqlite3.Database(DB_PATH);

async function run(sql: string, params: any[] = []) {
  return await new Promise<void>((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function getOne<T = any>(sql: string, params: any[] = []) {
  return await new Promise<T | undefined>((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

function normalizeMilestonesToDb(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map((v) => String(v).trim()).filter(Boolean));
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "[]";
    // allow pre-serialized json
    if (trimmed.startsWith("[")) return trimmed;
    // allow comma-separated
    return JSON.stringify(trimmed.split(",").map((s) => s.trim()).filter(Boolean));
  }
  return "[]";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const payload = (await req.json()) as any;

    // Only allow a safe subset to update for now.
    const fields: { key: string; sql: string; value: any }[] = [];

    if (payload.title !== undefined) fields.push({ key: "title", sql: "title = ?", value: String(payload.title) });
    if (payload.details !== undefined)
      fields.push({ key: "details", sql: "details = ?", value: String(payload.details) });
    if (payload.type !== undefined) fields.push({ key: "type", sql: "type = ?", value: String(payload.type) });
    if (payload.status !== undefined) fields.push({ key: "status", sql: "status = ?", value: String(payload.status) });
    if (payload.priority !== undefined)
      fields.push({ key: "priority", sql: "priority = ?", value: String(payload.priority) });
    if (payload.dueDate !== undefined)
      fields.push({ key: "due_date", sql: "due_date = ?", value: payload.dueDate ? String(payload.dueDate) : null });
    if (payload.schedule !== undefined)
      fields.push({ key: "schedule", sql: "schedule = ?", value: payload.schedule ? String(payload.schedule) : null });
    if (payload.milestones !== undefined)
      fields.push({ key: "milestones", sql: "milestones = ?", value: normalizeMilestonesToDb(payload.milestones) });
    if (payload.automationPrompt !== undefined)
      fields.push({ key: "automation_prompt", sql: "automation_prompt = ?", value: payload.automationPrompt ? String(payload.automationPrompt) : null });
    if (payload.project !== undefined)
      fields.push({ key: "project", sql: "project = ?", value: payload.project ? String(payload.project) : null });

    if (fields.length === 0) {
      return NextResponse.json({ error: "No supported fields to update." }, { status: 400 });
    }

    // handle completed_at when status changes
    const statusField = fields.find((f) => f.key === "status");
    if (statusField) {
      const status = String(statusField.value);
      if (status === "done") {
        fields.push({ key: "completed_at", sql: "completed_at = date('now')", value: undefined });
      } else {
        fields.push({ key: "completed_at", sql: "completed_at = NULL", value: undefined });
      }
    }

    const setSql = fields
      .map((f) => f.sql)
      .join(", ");

    const values = fields.filter((f) => !f.sql.includes("NULL") && !f.sql.includes("date('now')")).map((f) => f.value);

    await run(`UPDATE tasks SET ${setSql} WHERE id = ?`, [...values, id]);

    const updated = await getOne("SELECT * FROM tasks WHERE id = ?", [id]);
    return NextResponse.json(updated ?? { ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update task." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await run("DELETE FROM tasks WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to delete task." }, { status: 500 });
  }
}
