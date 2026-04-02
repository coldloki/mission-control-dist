"use client";

import { useCallback, useEffect, useState } from "react";

type ProcessInfo = {
  id: string;
  pid: number | null;
  owner: string;
  name: string;
  command: string;
  cwd?: string;
  cpu: number;
  memory: number;
  started: string;
  port?: number;
  autostart: boolean;
  notes: string;
  inRegistry: boolean;
  status?: string;
};

export default function SystemOverviewPage() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchProcesses = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/system-overview", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed to load");
      setProcesses(json.processes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading processes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, [fetchProcesses]);

  const handleAction = async (action: string, data: any) => {
    setActionLoading(data.pid?.toString() || data.id);
    try {
      const res = await fetch("/api/system-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...data }),
      });
      if (!res.ok) throw new Error("Action failed");
      await fetchProcesses();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const editRegistry = (proc: ProcessInfo) => {
    const newName = prompt("Service Name:", proc.name) ?? proc.name;
    const newPortStr = prompt("Expected Port:", proc.port?.toString() || "");
    const newNotes = prompt("Notes:", proc.notes || "") ?? proc.notes;
    
    if (newName !== null) {
      handleAction("save_registry", {
        id: proc.inRegistry ? proc.id : null,
        name: newName,
        command_pattern: proc.inRegistry ? proc.command : (prompt("Command Pattern to match:", proc.command.split(' ')[0]) || proc.command),
        port: newPortStr ? parseInt(newPortStr, 10) : null,
        autostart: proc.autostart,
        notes: newNotes,
      });
    }
  };

  const toggleAutostart = (proc: ProcessInfo) => {
    if (!proc.inRegistry) {
      alert("Must add notes/edit first to track this process before setting autostart.");
      return;
    }
    handleAction("save_registry", {
      id: proc.id,
      name: proc.name,
      command_pattern: proc.command,
      port: proc.port,
      autostart: !proc.autostart,
      notes: proc.notes,
    });
  };

  const filtered = processes.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase()) || 
    p.command.toLowerCase().includes(filter.toLowerCase()) || 
    (p.port && p.port.toString().includes(filter))
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🖥️ System Nodes & Servers
          </h1>
          <p className="mt-1 text-sm text-gray-500">Monitor Next.js, Node, and Python processes with persistent tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filter processes..."
            className="px-3 py-1.5 border rounded-lg text-sm"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <button onClick={fetchProcesses} className="px-3 py-1.5 bg-white border shadow-sm rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      <div className="bg-white shadow rounded-lg border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status/PID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Service</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Port</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">CPU/Mem</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Auto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Notes / Path / Command</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && processes.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500">No processes match your filter.</td></tr>
            ) : (
              filtered.map((proc, i) => (
                <tr key={i} className={proc.pid === null ? "bg-gray-50" : ""}>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {proc.pid ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {proc.pid}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      proc.owner === "jerome" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {proc.owner}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{proc.name}</div>
                    {proc.inRegistry && <span className="text-[10px] uppercase tracking-wide text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">Tracked</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {proc.port ? <span className="text-indigo-600 font-mono text-sm">{proc.port}</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {proc.pid ? `${proc.cpu}% / ${proc.memory}%` : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => toggleAutostart(proc)}
                      className={`text-xl ${proc.autostart ? "text-emerald-500" : "text-gray-200 hover:text-gray-400"} transition`}
                      title="Toggle Autostart"
                    >
                      ⚡
                    </button>
                  </td>
                  <td className="px-4 py-3 min-w-0">
                    {proc.notes && <div className="text-sm text-amber-700 mb-1 font-medium">{proc.notes}</div>}
                    {proc.cwd && (
                      <div className="text-xs font-mono text-gray-500 mb-0.5 break-all" title={proc.cwd}>
                        <span className="text-gray-400 mr-1">cwd:</span>{proc.cwd}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 break-all" title={proc.command}>{proc.command}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => editRegistry(proc)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>

                      {proc.pid ? (
                        <button
                          onClick={() => {
                            if(confirm(`Kill process ${proc.pid}?`)) handleAction("kill", { pid: proc.pid });
                          }}
                          className="text-red-600 hover:text-red-900"
                          disabled={actionLoading === proc.pid.toString()}
                        >
                          Kill
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            handleAction("remove_registry", { id: proc.id });
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          Untrack
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
