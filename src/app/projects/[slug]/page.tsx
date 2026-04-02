"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

type TaskType = "recurring" | "one-off" | "goal";
type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
type TaskPriority = "low" | "high" | "critical";

type Task = {
  id: string;
  title: string;
  details: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  schedule: string | null;
  milestones: string[];
  automationPrompt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  cronJobId: string | null;
  project: string | null;
  createdAt: string;
  updatedAt: string;
};

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  services: string | null;
  runs: string | null;
  repo: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const statusBadgeClass: Record<TaskStatus, string> = {
  todo: "bg-zinc-100 text-zinc-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
  blocked: "bg-rose-100 text-rose-700",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
};

const priorityBadgeClass: Record<TaskPriority, string> = {
  low: "bg-zinc-100 text-zinc-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

const priorityLabels: Record<TaskPriority, string> = {
  critical: "Critical",
  high: "High",
  low: "Low",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  paused: { label: "Paused", className: "bg-amber-100 text-amber-700" },
  "in development": { label: "In Development", className: "bg-blue-100 text-blue-700" },
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type NewTaskForm = {
  title: string;
  details: string;
  type: TaskType;
  priority: TaskPriority;
  dueDate: string;
  schedule: string;
  milestones: string;
};

const initialForm: NewTaskForm = {
  title: "",
  details: "",
  type: "one-off",
  priority: "high",
  dueDate: "",
  schedule: "",
  milestones: "",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [form, setForm] = useState<NewTaskForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, tasksRes] = await Promise.all([
        fetch(`/api/sqlite/projects`, { cache: "no-store" }),
        fetch(`/api/sqlite/tasks`, { cache: "no-store" }),
      ]);
      const projects = (await projRes.json()) as Project[];
      const allTasks = (await tasksRes.json()) as Task[];

      const matched = projects.find((p) => p.slug === slug);
      setProject(matched ?? null);
      setTasks(Array.isArray(allTasks) ? allTasks.filter((t) => t.project === slug) : []);
    } catch {
      setError("Failed to load project data.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateTask = async (taskId: string, patch: Partial<Task>) => {
    try {
      const res = await fetch(`/api/sqlite/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Update failed");
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleCreateTask = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sqlite/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          details: form.details.trim(),
          type: form.type,
          priority: form.priority,
          dueDate: form.type === "recurring" ? null : form.dueDate || null,
          schedule: form.type === "recurring" ? form.schedule.trim() || null : null,
          milestones:
            form.type === "goal"
              ? form.milestones.split("\n").map((e) => e.trim()).filter(Boolean)
              : [],
          project: slug,
        }),
      });
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error || "Failed to create task");
      setForm(initialForm);
      setShowNewTask(false);
      setSuccess("Task created!");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push("/projects")}
          className="text-sm text-black/50 hover:text-black transition"
        >
          ← All Projects
        </button>
        <p className="text-sm text-black/50 mt-4">Loading project…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push("/projects")}
          className="text-sm text-black/50 hover:text-black transition"
        >
          ← All Projects
        </button>
        <p className="text-sm text-rose-600 mt-2">Project not found.</p>
      </div>
    );
  }

  const projectStatus = statusConfig[project.status] ?? { label: project.status, className: "bg-zinc-100 text-zinc-700" };
  const services: string[] = project.services ? project.services.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
  const openTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6 pb-24">
      {/* Back */}
      <button
        onClick={() => router.push("/projects")}
        className="text-sm text-black/50 hover:text-black transition"
      >
        ← All Projects
      </button>

      {/* Header */}
      <div className="surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black">{project.name}</h1>
            {project.description && (
              <p className="mt-2 text-sm text-black/60 max-w-2xl">{project.description}</p>
            )}
          </div>
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${projectStatus.className}`}>
            {projectStatus.label}
          </span>
        </div>

        {services.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {services.map((s) => (
              <span key={s} className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-2 text-sm text-black/60 md:grid-cols-2">
          {project.runs && (
            <p>
              <span className="font-semibold text-black/40">Runs on:</span> {project.runs}
            </p>
          )}
          {project.repo && (
            <p>
              <span className="font-semibold text-black/40">GitHub:</span>{" "}
              <a
                href={`https://github.com/${project.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {project.repo}
              </a>
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => setShowNewTask(!showNewTask)}
            className="btn-primary"
          >
            {showNewTask ? "Cancel" : "+ Add Task"}
          </button>
          <span className="text-sm text-black/45">
            {openTasks.length} open · {doneTasks.length} done
          </span>
        </div>
      </div>

      {/* Success toast */}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ {success}
        </div>
      )}

      {/* Inline new task form */}
      {showNewTask && (
        <section className="surface p-5">
          <h3 className="text-base font-semibold text-black">New task for {project.name}</h3>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="input md:col-span-2"
              placeholder="Task title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />

            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as TaskType }))}
            >
              <option value="recurring">Recurring</option>
              <option value="one-off">One-off</option>
              <option value="goal">Long-term goal</option>
            </select>

            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as TaskPriority }))}
            >
              <option value="critical">Critical priority</option>
              <option value="high">High priority</option>
              <option value="low">Low priority</option>
            </select>

            {form.type === "recurring" ? (
              <input
                className="input md:col-span-2"
                placeholder="Schedule (example: 0 6 * * * Europe/Zurich)"
                value={form.schedule}
                onChange={(e) => setForm((prev) => ({ ...prev, schedule: e.target.value }))}
              />
            ) : (
              <input
                className="input md:col-span-2"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            )}

            {form.type === "goal" ? (
              <textarea
                className="input min-h-20 md:col-span-2"
                placeholder="Milestones (one per line)"
                value={form.milestones}
                onChange={(e) => setForm((prev) => ({ ...prev, milestones: e.target.value }))}
              />
            ) : null}

            <textarea
              className="input min-h-20 md:col-span-2"
              placeholder="Optional details"
              value={form.details}
              onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
            />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button className="btn-primary" onClick={() => void handleCreateTask()} disabled={saving}>
              {saving ? "Saving…" : "Add task"}
            </button>
            <button
              onClick={() => { setShowNewTask(false); setForm(initialForm); }}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm text-black/70"
            >
              Cancel
            </button>
          </div>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        </section>
      )}

      {/* Tasks */}
      {tasks.length === 0 && !showNewTask ? (
        <div className="surface p-8 text-center">
          <p className="text-sm text-black/45">No tasks for this project yet.</p>
          <button onClick={() => setShowNewTask(true)} className="mt-3 btn-primary text-sm">
            + Add first task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {openTasks.map((task) => (
            <div key={task.id} className="surface p-4 rounded-xl">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-black">{task.title}</p>
                  <p className="mt-1 text-xs text-black/45">
                    {task.type} · updated {formatDate(task.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[task.status]}`}>
                    {statusLabels[task.status]}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadgeClass[task.priority]}`}>
                    {priorityLabels[task.priority]}
                  </span>
                </div>
              </div>
              {task.details ? <p className="mt-2 text-sm text-black/70">{task.details}</p> : null}
              <div className="mt-3 grid gap-1 text-xs text-black/50 md:grid-cols-2">
                <p>Due: {task.dueDate ? formatDate(task.dueDate) : "—"}</p>
                <p>Schedule: {task.schedule ?? "—"}</p>
              </div>
              {task.milestones.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-black/70">
                  {task.milestones.map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {(["todo", "in_progress", "done", "blocked"] as TaskStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => void updateTask(task.id, { status: s })}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition ${task.status === s ? "border-black bg-black text-white" : "border-black/10 bg-white text-black/70 hover:border-black/25"}`}
                  >
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {doneTasks.length > 0 && (
            <details className="surface rounded-xl">
              <summary className="cursor-pointer p-4 text-sm text-black/45 hover:text-black/70">
                {doneTasks.length} completed task{doneTasks.length > 1 ? "s" : ""}
              </summary>
              <div className="space-y-3 p-4 pt-0">
                {doneTasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between gap-2 rounded-lg border border-black/5 bg-black/5 p-3">
                    <div>
                      <p className="text-sm text-black/60 line-through">{task.title}</p>
                      <p className="text-xs text-black/35">{formatDate(task.updatedAt)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass[task.status]}`}>
                      {statusLabels[task.status]}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
