"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  build: string;
  tester: string;
  device: string;
  result: "pass" | "fail";
  notes: string;
};

const KEY = "mission-control-qa-board";
const CHECK_KEY = "mission-control-release-checklist";

const checklistItems = [
  "No blocker bugs on latest build",
  "Secrets scan passed",
  "Push notifications tested on real device",
  "End-to-end order flow tested",
  "Rollback note prepared",
];

export default function TestFlightQAPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ build: "", tester: "", device: "", result: "pass", notes: "" });

  useEffect(() => {
    const rawChecks = localStorage.getItem(CHECK_KEY);
    if (rawChecks) setChecks(JSON.parse(rawChecks));

    const rawLocalEntries = localStorage.getItem(KEY);
    const localEntries: Entry[] = rawLocalEntries ? JSON.parse(rawLocalEntries) : [];

    fetch("/api/qa-entries")
      .then((r) => r.json())
      .then((serverEntries: Entry[]) => {
        if (serverEntries.length > 0) {
          setEntries(serverEntries);
        } else {
          setEntries(localEntries);
          if (localEntries.length > 0) {
            Promise.all(
              localEntries.map((entry) =>
                fetch("/api/qa-entries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(entry),
                })
              )
            ).catch(() => null);
          }
        }
      })
      .catch(() => setEntries(localEntries));
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(CHECK_KEY, JSON.stringify(checks));
  }, [checks]);

  const addEntry = async () => {
    if (!form.build || !form.tester) return;
    const entry: Entry = { id: crypto.randomUUID(), ...(form as Omit<Entry, "id">) };

    setEntries((prev) => [entry, ...prev]);
    setForm({ build: "", tester: "", device: "", result: "pass", notes: "" });

    await fetch("/api/qa-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => null);
  };

  const readyCount = useMemo(() => checklistItems.filter((item) => checks[item]).length, [checks]);

  const copyChecklist = async () => {
    const text = checklistItems.map((item) => `- [${checks[item] ? "x" : " "}] ${item}`).join("\n");
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="kicker">Tool</p>
        <h2 className="title-xl mt-1">TestFlight QA Board</h2>
      </div>

      <div className="surface p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-black">One-click release checklist</h3>
          <p className="text-sm text-black/55">{readyCount}/{checklistItems.length} done</p>
        </div>
        <div className="mt-3 space-y-2">
          {checklistItems.map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm text-black/75">
              <input
                type="checkbox"
                checked={!!checks[item]}
                onChange={(e) => setChecks((prev) => ({ ...prev, [item]: e.target.checked }))}
              />
              {item}
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={copyChecklist} className="btn-primary">Copy checklist</button>
          <button onClick={() => setChecks({})} className="rounded-xl border border-black/10 px-4 py-2 text-sm">Reset</button>
        </div>
      </div>

      <div className="surface grid gap-2 p-5 md:grid-cols-5">
        <input className="input" placeholder="Build (0.1.5)" value={form.build} onChange={(e) => setForm({ ...form, build: e.target.value })} />
        <input className="input" placeholder="Tester" value={form.tester} onChange={(e) => setForm({ ...form, tester: e.target.value })} />
        <input className="input" placeholder="Device/iOS" value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} />
        <select className="input" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as "pass" | "fail" })}>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
        <button onClick={addEntry} className="btn-primary">Add entry</button>
        <textarea className="input md:col-span-5 min-h-20" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>

      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.id} className="surface p-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-black/80">
                <span className="font-semibold text-black">Build {e.build}</span> · {e.tester} · {e.device}
              </p>
              <span className={e.result === "pass" ? "badge-pass" : "badge-fail"}>{e.result.toUpperCase()}</span>
            </div>
            <p className="mt-2 leading-relaxed text-black/65">{e.notes}</p>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-black/50">No QA entries yet.</p>}
      </div>
    </div>
  );
}
