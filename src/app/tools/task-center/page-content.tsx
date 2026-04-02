"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type TaskType = "recurring" | "one-off" | "goal";
type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
type TaskPriority = "low" | "high" | "critical";
type TaskRunStatus = "ok" | "error" | "skipped";

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
  lastRunStatus: TaskRunStatus | null;
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
  status: string;
};

const priorityOrder: Record<TaskPriority, number> = { critical: 0, high: 1, low: 2 };

type TaskPayload = {
  title?: string;
  details?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  schedule?: string | null;
  milestones?: string[];
  automationPrompt?: string | null;
  lastRunAt?: string | null;
  lastRunStatus?: TaskRunStatus | null;
  cronJobId?: string | null;
  project?: string | null;
};

const typeLabels: Record<TaskType, string> = {
  recurring: "Recurring",
  "one-off": "One-off",
  goal: "Long-term goal",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
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

const priorityLabels: Record<TaskPriority, string> = {
  critical: "Critical",
  high: "High",
  low: "Low",
};

const initialForm = {
  title: "",
  details: "",
  type: "one-off" as TaskType,
  priority: "high" as TaskPriority,
  dueDate: "",
  schedule: "",
  milestones: "",
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isDueToday(task: Task): boolean {
  if (!task.dueDate || task.status === "done") return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

function isArchived(task: Task): boolean {
  if (task.status !== "done") return false;
  const updated = new Date(task.updatedAt);
  if (Number.isNaN(updated.getTime())) return false;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return updated < sevenDaysAgo;
}

function TaskCenterContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "archived">("all");

  // Project dropdown state
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [creatingProject, setCreatingProject] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const [assigningProjectFor, setAssigningProjectFor] = useState<string | null>(null);
  const [assignProjectSearch, setAssignProjectSearch] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProject = searchParams.get("project");

  // Load tasks and projects
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      const [tasksRes, projRes] = await Promise.all([
        fetch("/api/sqlite/tasks", { cache: "no-store" }),
        fetch("/api/sqlite/projects", { cache: "no-store" }),
      ]);
      const tasksData = (await tasksRes.json()) as Task[] | { error?: string };
      const projData = (await projRes.json()) as Project[] | { error?: string };

      if (!tasksRes.ok) {
        const msg = "error" in tasksData && tasksData.error ? tasksData.error : "Failed to load tasks.";
        throw new Error(msg);
      }
      if (!projRes.ok) {
        const msg = "error" in projData && projData.error ? projData.error : "Failed to load projects.";
        throw new Error(msg);
      }

      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setProjects(Array.isArray(projData) ? projData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  // Pre-select project from URL param
  useEffect(() => {
    if (preselectedProject && projects.length > 0) {
      const found = projects.find((p) => p.slug === preselectedProject);
      if (found) {
        setSelectedProject(found);
        setProjectSearch(found.name);
      }
    }
  }, [preselectedProject, projects]);

  // Filter project dropdown
  useEffect(() => {
    if (!projectSearch.trim()) {
      setFilteredProjects(projects);
    } else {
      const q = projectSearch.toLowerCase();
      setFilteredProjects(projects.filter((p) => p.name.toLowerCase().includes(q)));
    }
  }, [projectSearch, projects]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const grouped = useMemo(() => {
    const activeTasks = tasks.filter((task) => !isArchived(task));
    const archivedTasks = tasks.filter((task) => isArchived(task));
    if (filter === "archived") {
      return { recurring: [], oneOff: [], goal: [], archived: archivedTasks };
    }
    return {
      recurring: activeTasks.filter((task) => task.type === "recurring"),
      oneOff: activeTasks.filter((task) => task.type === "one-off"),
      goal: activeTasks.filter((task) => task.type === "goal"),
      archived: archivedTasks,
    };
  }, [tasks, filter]);

  const priorityOverview = useMemo(
    () => ({
      critical: tasks.filter((task) => task.status !== "done" && task.priority === "critical").length,
      high: tasks.filter((task) => task.status !== "done" && task.priority === "high").length,
      low: tasks.filter((task) => task.status !== "done" && task.priority === "low").length,
    }),
    [tasks]
  );

  const stats = useMemo(() => {
    const open = tasks.filter((task) => task.status !== "done").length;
    const dueToday = tasks.filter((task) => isDueToday(task)).length;
    const goalsOpen = tasks.filter((task) => task.type === "goal" && task.status !== "done").length;
    return { open, dueToday, goalsOpen };
  }, [tasks]);

  // Inline create new project
  const handleCreateProjectInline = async () => {
    const name = projectSearch.trim();
    if (!name) return;
    setCreatingProject(true);
    setError(null);
    try {
      const res = await fetch("/api/sqlite/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error || "Failed to create project");
      const newProject: Project = json;
      setProjects((prev) => [...prev, newProject]);
      setSelectedProject(newProject);
      setShowProjectDropdown(false);
      setProjectSearch(newProject.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  };

  const handleCreateTask = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: TaskPayload = {
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
      project: selectedProject?.slug ?? null,
    };

    try {
      const res = await fetch("/api/sqlite/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as any;

      if (!res.ok) {
        const message = json?.error ? String(json.error) : "Could not create task.";
        throw new Error(message);
      }

      setForm(initialForm);
      setSelectedProject(null);
      setProjectSearch("");
      await refreshData();

      // Redirect to project page if a project was selected
      if (selectedProject) {
        router.push(`/projects/${selectedProject.slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task.");
    } finally {
      setSaving(false);
    }
  };

  const updateTask = async (taskId: string, patch: TaskPayload) => {
    try {
      setError(null);
      const res = await fetch(`/api/sqlite/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const json = (await res.json()) as any;
      if (!res.ok) {
        const message = json?.error ? String(json.error) : "Could not update task.";
        throw new Error(message);
      }

      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task.");
    }
  };

  const removeTask = async (taskId: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/sqlite/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Could not delete task.");
      }
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task.");
    }
  };

  const quickEditTask = async (task: Task) => {
    const title = window.prompt("Edit title", task.title);
    if (title === null) return;

    const details = window.prompt("Edit details", task.details ?? "");
    if (details === null) return;

    const dueDateInput = window.prompt(
      "Due date (YYYY-MM-DD). Leave empty to clear.",
      task.dueDate ? task.dueDate.slice(0, 10) : ""
    );
    if (dueDateInput === null) return;

    const priorityInput = window.prompt("Priority: critical, high, or low", task.priority);
    if (priorityInput === null) return;

    const nextPriority = priorityInput.trim().toLowerCase();
    if (!(["critical", "high", "low"] as string[]).includes(nextPriority)) {
      setError("Priority must be critical, high, or low.");
      return;
    }

    const normalizedDueDate = dueDateInput.trim();
    if (normalizedDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDueDate)) {
      setError("Due date must be YYYY-MM-DD.");
      return;
    }

    await updateTask(task.id, {
      title: title.trim(),
      details: details.trim(),
      dueDate: normalizedDueDate || null,
      priority: nextPriority as TaskPriority,
    });
  };

  const projectMap = useMemo(() => {
    const map: Record<string, Project> = {};
    for (const p of projects) map[p.slug] = p;
    return map;
  }, [projects]);

  const renderTaskList = (title: string, list: Task[]) => (
    <section className="surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-black">{title}</h3>
        <span className="text-xs text-black/45">{list.length} tasks</span>
      </div>

      {list.length === 0 ? (
        <p className="mt-3 text-sm text-black/50">No tasks in this lane.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {list.map((task) => (
            <div key={task.id} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-black">{task.title}</p>
                  <p className="mt-1 text-xs text-black/45">
                    {typeLabels[task.type]} · updated {formatDate(task.updatedAt)}
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

              {task.project && projectMap[task.project] ? (
                <button
                  onClick={() => { if (task.project) { setAssigningProjectFor(task.id); setAssignProjectSearch(projectMap[task.project]?.name ?? ''); } }}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-100 px-2.5 py-0.5 text-xs text-violet-700 hover:bg-violet-100 transition cursor-pointer"
                  title="Click to reassign project"
                >
                  {projectMap[task.project].name} ↗
                </button>
              ) : (
                <button
                  onClick={() => { setAssigningProjectFor(task.id); setAssignProjectSearch(""); }}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-200 transition"
                >
                  + Assign project
                </button>
              )}

              {assigningProjectFor === task.id && (
                <div className="mt-2 rounded-xl border border-black/10 bg-white shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-black/5">
                    <input
                      autoFocus
                      className="input w-full text-xs py-1"
                      placeholder="Search projects..."
                      value={assignProjectSearch}
                      onChange={(e) => setAssignProjectSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {(projects.filter(p => !assignProjectSearch || p.name.toLowerCase().includes(assignProjectSearch.toLowerCase()))).slice(0, 8).map(p => (
                      <button
                        key={p.id}
                        onClick={() => { void updateTask(task.id, { project: p.slug }); setAssigningProjectFor(null); }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-50 transition"
                      >
                        {p.name}
                      </button>
                    ))}
                    {assignProjectSearch && !projects.some(p => p.name.toLowerCase() === assignProjectSearch.toLowerCase()) && (
                      <button
                        onClick={() => { void handleCreateProjectInline(); setAssigningProjectFor(null); }}
                        className="w-full px-3 py-2 text-left text-xs text-violet-700 hover:bg-violet-50 font-medium"
                      >
                        Create "{assignProjectSearch.trim()}"
                      </button>
                    )}
                    <button
                      onClick={() => setAssigningProjectFor(null)}
                      className="w-full px-3 py-2 text-left text-xs text-black/40 hover:bg-zinc-50 border-t border-black/5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 grid gap-2 text-xs text-black/60 md:grid-cols-2">
                <p>Due: {task.dueDate ? formatDate(task.dueDate) : "-"}</p>
                <p>Schedule: {task.schedule ?? "-"}</p>
                <p>Last run: {task.lastRunAt ? formatDate(task.lastRunAt) : "-"}</p>
                <p>Run status: {task.lastRunStatus ?? "-"}</p>
              </div>

              {task.milestones.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-black/70">
                  {task.milestones.map((milestone) => (
                    <li key={milestone}>{milestone}</li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(["todo", "in_progress", "done", "blocked"] as TaskStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => void updateTask(task.id, { status })}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                      task.status === status
                        ? "border-black bg-black text-white"
                        : "border-black/10 bg-white text-black/70 hover:border-black/25"
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}

                <button
                  onClick={() => void quickEditTask(task)}
                  className="ml-auto rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs text-black/70 transition hover:border-black/30"
                >
                  Edit
                </button>

                <button
                  onClick={() => void removeTask(task.id)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-700 transition hover:bg-rose-100"
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

  const exactMatch = filteredProjects.some((p) => p.name.toLowerCase() === projectSearch.toLowerCase().trim());
  const showCreateOption = projectSearch.trim() && !exactMatch;

  return (
    <div className="space-y-4 pb-24">
      <div>
        <p className="kicker">Tool</p>
        <h2 className="title-xl mt-1">Task Center</h2>
        <p className="mt-2 max-w-3xl text-sm text-black/65">
          Track recurring routines, one-off tasks for today, and long-term goals in one place.
        </p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="surface p-4">
          <p className="kicker">Open tasks</p>
          <p className="mt-2 text-2xl font-semibold text-black">{stats.open}</p>
        </div>
        <div className="surface p-4">
          <p className="kicker">Due today</p>
          <p className="mt-2 text-2xl font-semibold text-black">{stats.dueToday}</p>
        </div>
        <div className="surface p-4">
          <p className="kicker">Open goals</p>
          <p className="mt-2 text-2xl font-semibold text-black">{stats.goalsOpen}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="surface p-4">
          <p className="kicker">Critical</p>
          <p className="mt-2 text-2xl font-semibold text-rose-700">{priorityOverview.critical}</p>
        </div>
        <div className="surface p-4">
          <p className="kicker">High</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{priorityOverview.high}</p>
        </div>
        <div className="surface p-4">
          <p className="kicker">Low</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-700">{priorityOverview.low}</p>
        </div>
      </section>

      <section className="surface p-5">
        <h3 className="text-base font-semibold text-black">New task</h3>
        <p className="mt-1 text-sm text-black/60">
          Use recurring for daily routines, one-off for today, and goal for long-term outcomes.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            className="input w-full md:col-span-2"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          />

          {/* Project dropdown */}
          <div className="relative md:col-span-2" ref={projectDropdownRef}>
            <label className="kicker mb-1 block">Project (optional)</label>
            {selectedProject ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedProject(null);
                    setProjectSearch("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-100 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-100 transition"
                >
                  {selectedProject.name}
                  <span className="text-violet-400 hover:text-violet-700">×</span>
                </button>
              </div>
            ) : (
              <>
                <input
                  className="input w-full"
                  placeholder="Search or create project…"
                  value={projectSearch}
                  onChange={(e) => {
                    setProjectSearch(e.target.value);
                    setShowProjectDropdown(true);
                  }}
                  onFocus={() => setShowProjectDropdown(true)}
                  autoComplete="off"
                />
                {showProjectDropdown && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-black/10 bg-white shadow-lg max-h-60 overflow-y-auto">
                    {filteredProjects.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 transition"
                        onClick={() => {
                          setSelectedProject(p);
                          setProjectSearch(p.name);
                          setShowProjectDropdown(false);
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                    {showCreateOption && (
                      <button
                        className="w-full px-4 py-2.5 text-left text-sm border-t border-black/5 text-violet-700 hover:bg-violet-50 font-medium transition"
                        onClick={() => void handleCreateProjectInline()}
                        disabled={creatingProject}
                      >
                        {creatingProject ? "Creating…" : `Create "${projectSearch.trim()}" as new project`}
                      </button>
                    )}
                    {filteredProjects.length === 0 && !showCreateOption && (
                      <p className="px-4 py-2.5 text-sm text-black/40">No projects yet.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

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
              className="input min-h-24 md:col-span-2"
              placeholder="Milestones (one per line)"
              value={form.milestones}
              onChange={(e) => setForm((prev) => ({ ...prev, milestones: e.target.value }))}
            />
          ) : null}

          <textarea
            className="input min-h-24 md:col-span-2"
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
            onClick={() => { setForm(initialForm); setSelectedProject(null); setProjectSearch(""); }}
            className="rounded-xl border border-black/10 px-4 py-2 text-sm text-black/70"
          >
            Reset
          </button>
          <button
            onClick={() => void refreshData()}
            className="rounded-xl border border-black/10 px-4 py-2 text-sm text-black/70"
          >
            Refresh
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      {loading ? (
        <p className="text-sm text-black/55">Loading tasks…</p>
      ) : (
        <div className="grid gap-4">
          {filter === "archived" && (
            <button
              onClick={() => setFilter("all")}
              className="self-start mb-2 rounded-xl border border-black/10 px-4 py-2 text-sm text-black/70 hover:bg-black/5"
            >
              ← Back to Active Tasks
            </button>
          )}
          {renderTaskList("Recurring", grouped.recurring)}
          {renderTaskList("One-off", grouped.oneOff)}
          {renderTaskList("Long-term goals", grouped.goal)}
          {filter === "all" && grouped.archived.length > 0 && (
            <button
              onClick={() => setFilter("archived")}
              className="surface p-4 text-center hover:bg-zinc-50 transition cursor-pointer"
            >
              <span className="text-sm text-zinc-500">View {grouped.archived.length} archived tasks →</span>
            </button>
          )}
          {filter === "archived" && renderTaskList("Archived (done > 7 days)", grouped.archived)}
        </div>
      )}
    </div>
  );
}
export { TaskCenterContent };
