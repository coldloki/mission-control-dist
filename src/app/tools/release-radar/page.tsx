"use client";

import { useEffect, useMemo, useState } from "react";

type ReleaseData = {
  branch: string;
  dirty: boolean;
  lastCommit: string;
  aheadBehind: string;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-5">
      <p className="kicker">{label}</p>
      <p className="mt-2 text-lg font-semibold text-black">{value}</p>
    </div>
  );
}

function getScore(data: ReleaseData) {
  let score = 100;
  if (data.branch === "main") score -= 30;
  if (data.dirty) score -= 25;

  const parts = data.aheadBehind.split(" ");
  const behind = Number(parts[0] || 0);
  if (!Number.isNaN(behind) && behind > 0) score -= 15;

  return Math.max(0, Math.min(100, score));
}

export default function ReleaseRadarPage() {
  const [data, setData] = useState<ReleaseData | null>(null);

  useEffect(() => {
    fetch("/api/release")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ branch: "unknown", dirty: false, lastCommit: "n/a", aheadBehind: "0 0" }));
  }, []);

  const score = useMemo(() => (data ? getScore(data) : 0), [data]);

  if (!data) return <p className="text-sm text-black/55">Loading release status...</p>;

  return (
    <div className="space-y-4">
      <div>
        <p className="kicker">Tool</p>
        <h2 className="title-xl mt-1">Release Radar</h2>
      </div>

      <div className="surface p-5">
        <div className="flex items-center justify-between">
          <p className="kicker">Release readiness score</p>
          <p className="text-sm font-semibold text-black">{score}/100</p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full bg-black" style={{ width: `${score}%` }} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Current branch" value={data.branch} />
        <StatCard label="Uncommitted changes" value={data.dirty ? "Yes" : "No"} />
        <StatCard label="Last commit" value={data.lastCommit} />
        <StatCard label="Behind or ahead origin" value={data.aheadBehind} />
      </div>

      <div className="surface p-5">
        <p className="kicker">Quick checklist</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-black/70">
          <li>Keep commits small and topic-focused</li>
          <li>Do security first, then bugs, then features</li>
          <li>Merge to main only after explicit confirmation</li>
        </ul>
      </div>
    </div>
  );
}
