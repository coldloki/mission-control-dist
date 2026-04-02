import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type TaskType = "recurring" | "one-off" | "goal";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type TaskPriority = "low" | "high" | "critical";
export type TaskRunStatus = "ok" | "error" | "skipped";

export type Task = {
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
  createdAt: string;
  updatedAt: string;
};

export type TaskPayload = {
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
};

const dataFile = path.resolve(process.cwd(), "data/tasks.json");
const taskTypes: TaskType[] = ["recurring", "one-off", "goal"];
const taskStatuses: TaskStatus[] = ["todo", "in_progress", "done", "blocked"];
const taskPriorities: TaskPriority[] = ["low", "high", "critical"];
const taskRunStatuses: TaskRunStatus[] = ["ok", "error", "skipped"];

function isTaskType(value: unknown): value is TaskType {
  return typeof value === "string" && taskTypes.includes(value as TaskType);
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && taskStatuses.includes(value as TaskStatus);
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && taskPriorities.includes(value as TaskPriority);
}

function normalizePriority(value: unknown): TaskPriority {
  if (value === "medium") return "high";
  return isTaskPriority(value) ? value : "low";
}

function isTaskRunStatus(value: unknown): value is TaskRunStatus {
  return typeof value === "string" && taskRunStatuses.includes(value as TaskRunStatus);
}

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function cleanString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function cleanMilestones(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function normalizeTask(value: unknown): Task | null {
  if (!value || typeof value !== "object") return null;
  const task = value as Partial<Task>;
  const title = cleanString(task.title);
  if (!title) return null;

  const now = new Date().toISOString();

  return {
    id: typeof task.id === "string" && task.id ? task.id : randomUUID(),
    title,
    details: cleanString(task.details),
    type: isTaskType(task.type) ? task.type : "one-off",
    status: isTaskStatus(task.status) ? task.status : "todo",
    priority: normalizePriority(task.priority),
    dueDate: cleanOptionalString(task.dueDate),
    schedule: cleanOptionalString(task.schedule),
    milestones: cleanMilestones(task.milestones),
    automationPrompt: cleanOptionalString(task.automationPrompt),
    lastRunAt: cleanOptionalString(task.lastRunAt),
    lastRunStatus: isTaskRunStatus(task.lastRunStatus) ? task.lastRunStatus : null,
    cronJobId: cleanOptionalString(task.cronJobId),
    createdAt: typeof task.createdAt === "string" && task.createdAt ? task.createdAt : now,
    updatedAt: typeof task.updatedAt === "string" && task.updatedAt ? task.updatedAt : now,
  };
}

export function readTasks(): Task[] {
  if (!fs.existsSync(dataFile)) return [];

  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => normalizeTask(entry))
      .filter((entry): entry is Task => entry !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function writeTasks(tasks: Task[]): void {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(tasks, null, 2));
}

export function createTask(payload: TaskPayload): Task {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    title: cleanString(payload.title),
    details: cleanString(payload.details),
    type: isTaskType(payload.type) ? payload.type : "one-off",
    status: isTaskStatus(payload.status) ? payload.status : "todo",
    priority: normalizePriority(payload.priority),
    dueDate: cleanOptionalString(payload.dueDate),
    schedule: cleanOptionalString(payload.schedule),
    milestones: cleanMilestones(payload.milestones),
    automationPrompt: cleanOptionalString(payload.automationPrompt),
    lastRunAt: cleanOptionalString(payload.lastRunAt),
    lastRunStatus: isTaskRunStatus(payload.lastRunStatus) ? payload.lastRunStatus : null,
    cronJobId: cleanOptionalString(payload.cronJobId),
    createdAt: now,
    updatedAt: now,
  };
}

export function patchTask(task: Task, payload: TaskPayload): Task {
  const nextTitle = payload.title === undefined ? task.title : cleanString(payload.title);

  return {
    ...task,
    title: nextTitle || task.title,
    details: payload.details === undefined ? task.details : cleanString(payload.details),
    type: payload.type === undefined ? task.type : isTaskType(payload.type) ? payload.type : task.type,
    status: payload.status === undefined ? task.status : isTaskStatus(payload.status) ? payload.status : task.status,
    priority: payload.priority === undefined ? task.priority : normalizePriority(payload.priority),
    dueDate: payload.dueDate === undefined ? task.dueDate : cleanOptionalString(payload.dueDate),
    schedule: payload.schedule === undefined ? task.schedule : cleanOptionalString(payload.schedule),
    milestones: payload.milestones === undefined ? task.milestones : cleanMilestones(payload.milestones),
    automationPrompt:
      payload.automationPrompt === undefined ? task.automationPrompt : cleanOptionalString(payload.automationPrompt),
    lastRunAt: payload.lastRunAt === undefined ? task.lastRunAt : cleanOptionalString(payload.lastRunAt),
    lastRunStatus:
      payload.lastRunStatus === undefined
        ? task.lastRunStatus
        : isTaskRunStatus(payload.lastRunStatus)
          ? payload.lastRunStatus
          : null,
    cronJobId: payload.cronJobId === undefined ? task.cronJobId : cleanOptionalString(payload.cronJobId),
    updatedAt: new Date().toISOString(),
  };
}
