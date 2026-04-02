import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import sqlite3 from "sqlite3";
import { promisify } from "util";

const DB_PATH = process.env.MEMORY_DB_PATH || '/Users/jerome/.openclaw/workspace/mission-control/data/tasks.db';

type ProcessInfo = {
  pid: number;
  owner: string;
  name: string;
  command: string;
  cpu: number;
  memory: number;
  started: string;
  port?: number;
};

// Known service patterns to identify processes
const SERVICE_PATTERNS: Record<string, string> = {
  "qr-injection": "QR Injection Portal",
  "mission-control": "Mission Control",
  "whisper-ios": "Whisper iOS",
  "copyshop": "Copyshop Web App",
  "node": "Node.js",
  "python": "Python",
  "uvicorn": "Uvicorn Server",
  "next": "Next.js",
  "codex": "Codex Agent",
};

function detectService(cmd: string): string {
  const lower = cmd.toLowerCase();
  for (const [pattern, name] of Object.entries(SERVICE_PATTERNS)) {
    if (lower.includes(pattern)) return name;
  }
  return "Unknown";
}

function getProcessDetails(pid: number): { port: number | undefined, cwd: string } {
  try {
    const output = execSync(`/usr/sbin/lsof -p ${pid} -P -n 2>/dev/null`, {
      encoding: "utf8",
      timeout: 5000,
    });
    const lines = output.split('\n');
    let port = undefined;
    let cwd = '';
    
    for (const line of lines) {
      if (!port && line.includes('(LISTEN)')) {
         const match = line.match(/->?(\d+\.\d+\.\d+\.\d+):(\d+)/);
         if (match) port = parseInt(match[2], 10);
         else {
           const pMatch = line.match(/:(\d+)\s+\(LISTEN\)/);
           if (pMatch) port = parseInt(pMatch[1], 10);
         }
      }
      if (!cwd && line.includes(" cwd ")) {
         const dirIdx = line.indexOf('/');
         if (dirIdx !== -1) cwd = line.substring(dirIdx);
      }
    }
    return { port, cwd };
  } catch {
    return { port: undefined, cwd: '' };
  }
}

async function getDb() {
  const db: any = new sqlite3.Database(DB_PATH);
  db.allAsync = promisify(db.all).bind(db);
  db.runAsync = promisify(db.run).bind(db);
  
  // Ensure table exists
  await (db as any).runAsync(`
    CREATE TABLE IF NOT EXISTS node_registry (
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
  
  return db as any;
}

export async function GET() {
  try {
    // 1. Get saved node configs from DB
    const db = await getDb();
    const registryRows = await db.allAsync('SELECT * FROM node_registry');
    db.close();

    // 2. Get all running node/python processes owned by known users
    const psOutput = execSync(
      'ps -eo user,pid,ppid,pcpu,pmem,etime,comm,args | grep -v grep | grep -E -i "node|python|next" | grep -E "^(jerome|giamor)\\s" | head -100',
      { encoding: "utf8", timeout: 10000 }
    );

    const processes: any[] = [];
    const lines = psOutput.trim().split("\n");

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 8) continue;

      const owner = parts[0];
      const pid = parseInt(parts[1], 10);
      if (isNaN(pid)) continue;

      // Skip system processes and our own monitoring
      if (pid === 1 || pid === 0) continue;
      if (parts[6] === "ps" || parts[7]?.includes("ps -eo") || parts[7]?.includes("grep")) continue;

      const cpu = parseFloat(parts[3]) || 0;
      const memory = parseFloat(parts[4]) || 0;
      const elapsed = parts[5];
      const cmd = parts.slice(7).join(" ").substring(0, 200);

      const name = detectService(cmd);
      const details = getProcessDetails(pid);
      
      // Match with registry
      const regMatch = registryRows.find((r: any) => 
        (r.port && r.port === details.port) || 
        (r.command_pattern && cmd.includes(r.command_pattern)) ||
        (r.name === name && name !== "Unknown")
      );

      processes.push({
        id: regMatch?.id || `proc-${pid}`,
        pid,
        owner,
        name: regMatch?.name || name,
        command: cmd,
        cwd: details.cwd,
        cpu: Math.round(cpu * 100) / 100,
        memory: Math.round(memory * 100) / 100,
        started: elapsed,
        port: details.port || regMatch?.port,
        autostart: regMatch?.autostart === 1,
        notes: regMatch?.notes || "",
        inRegistry: !!regMatch
      });
    }

    // Add registered nodes that are currently offline
    for (const reg of registryRows) {
      if (!processes.find(p => p.id === reg.id)) {
        processes.push({
          id: reg.id,
          pid: null,
          owner: "jerome",
          name: reg.name,
          command: reg.command_pattern,
          cpu: 0,
          memory: 0,
          started: "-",
          port: reg.port,
          autostart: reg.autostart === 1,
          notes: reg.notes || "",
          inRegistry: true,
          status: 'offline'
        });
      }
    }

    // Sort: running first, then offline. Inside running, sort by CPU.
    processes.sort((a, b) => {
      if (a.pid && !b.pid) return -1;
      if (!a.pid && b.pid) return 1;
      return b.cpu - a.cpu;
    });

    return NextResponse.json({ processes });
  } catch (error) {
    console.error("Failed to get processes:", error);
    return NextResponse.json(
      { error: "Failed to retrieve system processes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, pid, command, id, name, command_pattern, port, autostart, notes } = body;

    // Actions: kill, restart, save_registry, remove_registry

    if (action === "kill" && pid) {
      try {
        process.kill(pid, "SIGKILL");
        return NextResponse.json({ success: true, message: `Process ${pid} terminated` });
      } catch (err: any) {
        if (err.code === "ESRCH") return NextResponse.json({ error: "Process not found" }, { status: 404 });
        if (err.code === "EPERM") return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        throw err;
      }
    }

    if (action === "restart" && command) {
      const detachedCommand = command.includes("&") ? command : `nohup ${command} > /dev/null 2>&1 &`;
      execSync(detachedCommand, { encoding: "utf8", timeout: 5000, shell: "/bin/zsh" });
      return NextResponse.json({ success: true, message: `Process started` });
    }

    if (action === "save_registry") {
      const db = await getDb();
      const rowId = id || `reg-${Date.now()}`;
      
      const existing = await db.allAsync('SELECT * FROM node_registry WHERE id = ?', [rowId]);
      
      if (existing.length > 0) {
        await db.runAsync(
          'UPDATE node_registry SET name=?, command_pattern=?, port=?, autostart=?, notes=?, updated_at=datetime("now") WHERE id=?',
          [name, command_pattern, port, autostart ? 1 : 0, notes, rowId]
        );
      } else {
        await db.runAsync(
          'INSERT INTO node_registry (id, name, command_pattern, port, autostart, notes) VALUES (?, ?, ?, ?, ?, ?)',
          [rowId, name, command_pattern, port, autostart ? 1 : 0, notes]
        );
      }
      db.close();
      return NextResponse.json({ success: true, id: rowId });
    }

    if (action === "remove_registry" && id) {
      const db = await getDb();
      await db.runAsync('DELETE FROM node_registry WHERE id = ?', [id]);
      db.close();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Action error:", error);
    return NextResponse.json({ error: "Failed to execute action" }, { status: 500 });
  }
}
