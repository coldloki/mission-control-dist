import { NextResponse } from "next/server";
import sqlite3 from "sqlite3";

const DB_PATH = process.env.MEMORY_DB_PATH || "/Users/jerome/.openclaw/workspace/mission-control/data/tasks.db";

const db = new sqlite3.Database(DB_PATH);

export async function GET(): Promise<NextResponse> {
  try {
    return await new Promise((resolve, reject) => {
      db.get('SELECT value FROM settings WHERE key = "last_sync"', (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        db.get('SELECT COUNT(*) as count FROM tasks', (err2, row2: any) => {
          if (err2) {
            reject(err2);
            return;
          }

          db.all(
            'SELECT status, COUNT(*) as count FROM tasks GROUP BY status',
            (err3, rows3: any[]) => {
              if (err3) {
                reject(err3);
                return;
              }

              const counts: Record<string, number> = {};
              for (const r of rows3 || []) counts[String(r.status)] = Number(r.count) || 0;

              // Count archived (done > 7 days)
              db.get(
                "SELECT COUNT(*) as count FROM tasks WHERE status = 'done' AND updated_at < datetime('now', '-7 days')",
                (err4, row4: any) => {
                  if (err4) {
                    reject(err4);
                    return;
                  }

                  resolve(
                    NextResponse.json({
                      lastSync: row?.value || "Never",
                      taskCount: row2?.count || 0,
                      counts,
                      archived: Number(row4?.count || 0),
                    })
                  );
                }
              );
            }
          );
        });
      });
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch sqlite stats" }, { status: 500 });
  }
}
