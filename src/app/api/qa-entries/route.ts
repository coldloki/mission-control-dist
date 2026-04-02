import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const dataFile = path.resolve(process.cwd(), "data/qa-board.json");

function readEntries() {
  if (!fs.existsSync(dataFile)) return [];
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

export async function GET() {
  return NextResponse.json(readEntries());
}

export async function POST(req: Request) {
  const entry = await req.json();
  const all = readEntries();
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify([entry, ...all], null, 2));
  return NextResponse.json({ ok: true });
}
