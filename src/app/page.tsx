"use client";

import Link from "next/link";
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
  status: string;
  created_at: string;
  updated_at: string;
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
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return due.getTime() - now.getTime() <= sevenDays && due.getTime() >= now.getTime() - 86400000;
}

export default function MissionControlHome() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshData = useCallback(async () => {
    try {
      const [tasksRes, projRes] = await Promise.all([
        fetch("/api/sqlite/tasks", { cache: "no-store" }),
        fetch("/api/sqlite/projects", { cache: "no-store" }),
      ]);
      const tasksData = (await tasksRes.json()) as Task[] | { error?: string };
      const projData = (await projRes.json()) as Project[] | { error?: string };
      if (Array.isArray(tasksData)) setTasks(tasksData);
      if (Array.isArray(projData)) setProjects(projData);
    } catch {
      // keep whatever we have
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refreshData(); }, [refreshData]);

  const projectMap = useMemo(() => {
    const map: Record<string, Project> = {};
    for (const p of projects) map[p.slug] = p;
    return map;
  }, [projects]);

  // Project overview cards
  const projectCards = useMemo(() => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((t) => t.project === project.slug);
      const open = projectTasks.filter((t) => t.status !== "done").length;
      const done = projectTasks.filter((t) => t.status === "done").length;
      const urgent = projectTasks
        .filter((t) => t.status !== "done" && t.dueDate)
        .sort((a, b) => {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return da - db;
        })[0] ?? null;
      return { project, open, done, urgent };
    });
  }, [projects, tasks]);

  // Tasks due within 7 days
  const dueSoon = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "done" && isDueSoon(t.dueDate))
      .sort((a, b) => {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      })
      .map((t) => ({ ...t, projectName: t.project ? projectMap[t.project]?.name ?? null : null }));
  }, [tasks, projectMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-6 pb-24">
      <div className="surface p-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">📋 Mission Control</h1>
          <p className="text-sm text-black/50 mt-0.5">Summary & Overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/projects" className="btn-primary text-sm">Projects</Link>
          <Link href="/tools/task-center" className="btn-primary text-sm">Task Center</Link>
        </div>
      </div>

      <div>
        {/* Summary strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="surface p-4">
            <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
            <div className="text-sm text-gray-500">Total Tasks</div>
          </div>
          <div className="surface p-4">
            <div className="text-2xl font-bold text-emerald-600">{doneTasks}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="surface p-4">
            <div className="text-2xl font-bold text-blue-600">{totalTasks - doneTasks}</div>
            <div className="text-sm text-gray-500">Open</div>
          </div>
        </div>

        {/* Project overview grid */}
        {projectCards.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projectCards.map(({ project, open, done, urgent }) => {
                const status = statusConfig[project.status] ?? { label: project.status, className: "bg-zinc-100 text-zinc-700" };
                return (
                  <div
                    key={project.id}
                    className="surface p-4 flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/projects/${project.slug}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-black">{project.name}</h3>
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-black/55">
                      <span className="font-medium text-emerald-700">{done} done</span>
                      <span>·</span>
                      <span className="font-medium text-blue-700">{open} open</span>
                    </div>
                    {urgent ? (
                      <div className="text-xs text-black/55">
                        <span className="text-rose-600 font-medium">Due soon: </span>
                        <span className="text-black/70">{urgent.title}</span>
                        <span className="ml-1 text-black/40">({formatDate(urgent.dueDate)})</span>
                      </div>
                    ) : open > 0 ? (
                      <p className="text-xs text-black/40">No due date set</p>
                    ) : (
                      <p className="text-xs text-black/40">All tasks done</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tasks due soon */}
        {dueSoon.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Tasks due within 7 days</h2>
            <div className="space-y-2">
              {dueSoon.map((task) => (
                <div key={task.id} className="surface p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-black break-words">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.projectName ? (
                        <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full">
                          {task.projectName}
                        </span>
                      ) : null}
                      <span className="text-xs text-black/45 capitalize">{task.type}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-xs font-medium text-rose-600">{formatDate(task.dueDate)}</p>
                    <p className="text-xs text-black/40 capitalize">{task.priority}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Data source + quick actions */}
        <div className="surface p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 text-lg">✅</span>
              <div>
                <div className="text-sm font-semibold text-emerald-900">Data Source Active</div>
                <div className="text-xs text-emerald-700">Connected to local SQLite database</div>
              </div>
            </div>
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/tools/task-center" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition">
              Go to Task Center <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link href="/projects" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition">
              Go to Projects <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
