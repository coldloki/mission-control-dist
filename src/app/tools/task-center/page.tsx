import { Suspense } from "react";
import { TaskCenterContent } from "./page-content";

export default function TaskCenterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading...</div>}>
      <TaskCenterContent />
    </Suspense>
  );
}
