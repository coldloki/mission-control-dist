import { execSync } from "node:child_process";
import { NextResponse } from "next/server";
import path from "node:path";

const repoPath = path.resolve(process.cwd(), "../Haris Code Project/Copyshop App SMAG");

const run = (cmd: string) => {
  try {
    return execSync(cmd, { cwd: repoPath, encoding: "utf8" }).trim();
  } catch {
    return "n/a";
  }
};

export async function GET() {
  const branch = run("git rev-parse --abbrev-ref HEAD");
  const dirty = run("git status --porcelain") !== "";
  const lastCommit = run("git log -1 --pretty=%h\ %s");
  const aheadBehind = run("git rev-list --left-right --count origin/main...HEAD");

  return NextResponse.json({ branch, dirty, lastCommit, aheadBehind });
}
