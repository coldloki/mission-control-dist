import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const target = path.resolve(process.cwd(), "../Haris Code Project/Copyshop App SMAG");
const backend = path.join(target, "Visual Studio Code Projects/Copyshop Backend");

const patterns: RegExp[] = [
  /BEGIN PRIVATE KEY/, /AuthKey_[A-Z0-9]+\.p8/, /ghp_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/,
  /ADMIN_TOKEN\s*=\s*['\"][^'\"]+['\"]/,
];

function walk(dir: string, out: string[] = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    if (["node_modules", ".git", ".next"].includes(item)) continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function parseEnvKeys(filePath: string): Set<string> {
  if (!fs.existsSync(filePath)) return new Set();
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  return new Set(lines.map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => l.split("=")[0].trim()));
}

export async function POST() {
  const findings: string[] = [];
  for (const file of walk(target)) {
    try {
      const content = fs.readFileSync(file, "utf8");
      for (const p of patterns) {
        if (p.test(content)) {
          findings.push(path.relative(target, file));
          break;
        }
      }
    } catch {}
  }

  const sample = parseEnvKeys(path.join(backend, ".env.example"));
  const actual = parseEnvKeys(path.join(backend, ".env"));
  const envMissing = [...sample].filter((k) => !actual.has(k));

  return NextResponse.json({ scannedPath: target, findings: [...new Set(findings)], envMissing });
}
