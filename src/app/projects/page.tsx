"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  paused: { label: "Paused", className: "bg-amber-100 text-amber-700" },
  "in development": { label: "In Development", className: "bg-blue-100 text-blue-700" },
};

const statusBadgeClass: Record<TaskStatus, string> = {
  todo: "bg-zinc-100 text-zinc-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
  blocked: "bg-rose-100 text-rose-700",
};

const priorityBadgeClass: Record<TaskPriority, string> = {
  low: "bg-zinc-100 text-zinc-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newServices, setNewServices] = useState("");
  const [newRuns, setNewRuns] = useState("");
  const [newRepo, setNewRepo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const router = useRouter();

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/sqlite/projects", { cache: "no-store" });
      const data = (await res.json()) as Project[];
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/sqlite/tasks", { cache: "no-store" });
      const data = (await res.json()) as Task[];
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    void loadProjects();
    void loadTasks();
  }, [loadProjects, loadTasks]);

  const handleCreateProject = async () => {
    if (!newName.trim()) {
      setError("Project name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const services = newServices
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/sqlite/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          services,
          runs: newRuns.trim(),
          repo: newRepo.trim(),
        }),
      });
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error || "Failed to create project");
      await loadProjects();
      setShowNew(false);
      setNewName("");
      setNewDescription("");
      setNewServices("");
      setNewRuns("");
      setNewRepo("");
      router.push(`/projects/${(json as Project).slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  const projectMap = useMemo(() => {
    const map: Record<string, Project> = {};
    for (const p of projects) map[p.slug] = p;
    return map;
  }, [projects]);

  const updateTask = async (taskId: string, patch: Partial<Task>) => {
    try {
      const res = await fetch(`/api/sqlite/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Update failed");
      await loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const removeTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/sqlite/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = useMemo(() => {
    const base = tasks.filter((t) => t.status !== "done");
    const filtered = filterProject ? base.filter((t) => t.project === filterProject) : base;
    return {
      recurring: filtered.filter((t) => t.type === "recurring"),
      oneOff: filtered.filter((t) => t.type === "one-off"),
      goal: filtered.filter((t) => t.type === "goal"),
    };
  }, [tasks, filterProject]);

  const renderTaskLane = (title: string, list: Task[]) => (
    <section className="surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-black">{title}</h3>
        <span className="text-xs text-black/45">{list.length} tasks</span>
      </div>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-black/50">No tasks.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {list.map((task) => (
            <div key={task.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-black">{task.title}</p>
                  <p className="mt-1 text-xs text-black/45">updated {formatDate(task.updatedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass[task.status]}`}>
                    {task.status}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityBadgeClass[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
              {task.details ? <p className="mt-2 text-sm text-black/70">{task.details}</p> : null}
              <div className="mt-3 grid gap-1 text-xs text-black/60">
                <p>Due: {formatDate(task.dueDate)}</p>
                <p>Schedule: {task.schedule ?? "-"}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(["todo", "in_progress", "done", "blocked"] as TaskStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => void updateTask(task.id, { status: s })}
                    className={`rounded-lg border px-2 py-1 text-xs transition ${
                      task.status === s
                        ? "border-black bg-black text-white"
                        : "border-black/10 bg-white text-black/70 hover:border-black/25"
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <button
                  onClick={() => void removeTask(task.id)}
                  className="ml-auto rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="pb-24">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            All active, paused, and in-development projects with their infrastructure details.
          </p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary shrink-0">
          {showNew ? "Cancel" : "+ New Project"}
        </button>
      </header>

      {/* New project form */}
      {showNew && (
        <section className="surface mb-6 p-5">
          <h3 className="text-base font-semibold text-black">New Project</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="input" placeholder="Project name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="input" placeholder="GitHub repo (e.g. coldloki/my-project)" value={newRepo} onChange={(e) => setNewRepo(e.target.value)} />
            <input className="input md:col-span-2" placeholder="Description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            <input className="input" placeholder="Runs on (e.g. Mac mini)" value={newRuns} onChange={(e) => setNewRuns(e.target.value)} />
            <input className="input" placeholder="Services/APIs (comma-separated)" value={newServices} onChange={(e) => setNewServices(e.target.value)} />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button className="btn-primary" onClick={() => void handleCreateProject()} disabled={saving}>
              {saving ? "Creating…" : "Create project"}
            </button>
            <button onClick={() => setShowNew(false)} className="rounded-xl border border-black/10 px-4 py-2 text-sm text-black/70">Cancel</button>
          </div>
          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        </section>
      )}

      {/* Show all tasks toggle */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setShowAllTasks((v) => !v)}
          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${showAllTasks ? "bg-black text-white border-black" : "border-black/15 bg-white text-black/70 hover:border-black/30"}`}
        >
          {showAllTasks ? "✓ Showing all tasks" : "Show all tasks"}
        </button>
        {showAllTasks && (
          <span className="text-xs text-black/40">Click a project filter below to scope lanes</span>
        )}
      </div>

      {/* All-tasks view */}
      {showAllTasks && (
        <div className="space-y-4">
          {/* Project filter pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterProject(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${!filterProject ? "bg-black text-white border-black" : "border-black/15 bg-white text-black/70 hover:border-black/30"}`}
            >
              All projects
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setFilterProject(p.slug)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition ${filterProject === p.slug ? "bg-violet-600 text-white border-violet-600" : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"}`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-black/45">Loading tasks…</p>
          ) : (
            <div className="grid gap-4">
              {renderTaskLane("Recurring", filteredTasks.recurring)}
              {renderTaskLane("One-off", filteredTasks.oneOff)}
              {renderTaskLane("Long-term goals", filteredTasks.goal)}
            </div>
          )}
        </div>
      )}

      {/* Project cards */}
      {!showAllTasks && (
        <>
          {loading ? (
            <p className="text-sm text-black/45">Loading…</p>
          ) : projects.length === 0 ? (
            <div className="surface p-8 text-center">
              <p className="text-sm text-black/45">No projects yet.</p>
              <button onClick={() => setShowNew(true)} className="mt-3 btn-primary text-sm">
                + Create first project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {projects.map((project) => {
                const status = statusConfig[project.status] ?? { label: project.status, className: "bg-zinc-100 text-zinc-700" };
                const services = project.services ? project.services.split(",").map((s) => s.trim()).filter(Boolean) : [];
                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col cursor-pointer"
                    onClick={() => router.push(`/projects/${project.slug}`)}
                  >
                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-base font-semibold text-gray-900 leading-tight">{project.name}</h2>
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-600 leading-relaxed flex-1">{project.description}</p>
                      )}
                      {services.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {services.map((service) => (
                            <span key={service} className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full">
                              {service}
                            </span>
                          ))}
                        </div>
                      )}
                      {project.runs && (
                        <p className="text-sm text-gray-700"><span className="text-xs font-semibold text-gray-400 uppercase">Runs: </span>{project.runs}</p>
                      )}
                      {project.repo && (
                        <a
                          href={`https://github.com/${project.repo}`}
                          onClick={(e) => e.stopPropagation()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {project.repo}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
