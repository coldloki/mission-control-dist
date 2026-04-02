import { NextResponse } from "next/server";
import crypto from "node:crypto";
import sqlite3 from "sqlite3";

const DB_PATH = process.env.MEMORY_DB_PATH || "/Users/jerome/.openclaw/workspace/mission-control/data/tasks.db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function runQuery(sql: string, params: any[] = []): Promise<any[]> {
  return await new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.all(sql, params, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows as any[]);
    });
  });
}

async function runExec(sql: string, params: any[] = []): Promise<void> {
  return await new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    db.run(sql, params, function (err) {
      db.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function GET(): Promise<NextResponse> {
  try {
    const rows = await runQuery("SELECT * FROM projects ORDER BY name");
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch projects." }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const payload = await req.json() as any;
    const name = String(payload.name || "").trim();
    if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });

    const slug = payload.slug || slugify(name);
    const description = payload.description ? String(payload.description) : null;
    const services = payload.services ? JSON.stringify(payload.services) : null;
    const runs = payload.runs ? String(payload.runs) : null;
    const repo = payload.repo ? String(payload.repo) : null;
    const status = payload.status ? String(payload.status) : "active";

    const existing = await runQuery("SELECT id FROM projects WHERE slug = ?", [slug]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "A project with this name already exists." }, { status: 409 });
    }

    const id = payload.id || crypto.randomUUID();
    await runExec(
      `INSERT INTO projects (id, name, slug, description, services, runs, repo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, slug, description, services, runs, repo, status]
    );

    const row = await runQuery("SELECT * FROM projects WHERE id = ?", [id]);
    return NextResponse.json(row[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create project." }, { status: 500 });
  }
}
