"use client";

import { useState, useEffect } from 'react';

export default function TestPage() {
    const [stats, setStats] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadStats();
        loadTasks();
    }, []);

    async function loadStats() {
        try {
            const response = await fetch('/api/tasks/stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadTasks() {
        try {
            const response = await fetch('/api/tasks');
            const data = await response.json();
            setTasks(data);
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    async function handleSync() {
        setSyncing(true);
        try {
            const response = await fetch('/api/sync', { method: 'POST' });
            const data = await response.json();
            alert(`✅ Sync: ${data.message || 'Success'}`);
            await loadStats();
            await loadTasks();
        } catch (error: any) {
            alert(`❌ Error: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    }

    async function handleChangeStatus(taskId: string, newStatus: string) {
        try {
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update-status', data: { taskId, status: newStatus } })
            });
            const data = await response.json();
            if (data.success) {
                await loadTasks();
            }
        } catch (error: any) {
            alert(`❌ Error: ${error.message}`);
        }
    }

    if (loading) {
        return <div className="p-8">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">🧪 Mission Control Test Page</h1>

                {/* Sync Status */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h2 className="text-lg font-semibold mb-2">📊 Sync Status</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-gray-600">Last Sync</div>
                            <div className="font-mono">{stats?.lastSync || 'Never'}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Tasks in DB</div>
                            <div className="font-mono">{stats?.taskCount || 0}</div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-gray-900">{stats?.total || 0}</div>
                        <div className="text-sm text-gray-500">Total</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-green-600">{stats?.done || 0}</div>
                        <div className="text-sm text-gray-500">Done</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-blue-600">{stats?.in_progress || 0}</div>
                        <div className="text-sm text-gray-500">In Progress</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-gray-600">{stats?.todo || 0}</div>
                        <div className="text-sm text-gray-500">Todo</div>
                    </div>
                </div>

                {/* Sync Button */}
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="w-full mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {syncing ? '🔄 Syncing...' : '🔄 Sync Now'}
                </button>

                {/* Tasks List */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold">Tasks ({tasks.length})</h2>
                    </div>
                    <div className="divide-y max-h-96 overflow-y-auto">
                        {tasks.map((task) => (
                            <div key={task.id} className="p-4 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="font-medium">{task.title}</div>
                                        {task.details && (
                                            <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                {task.details}
                                            </div>
                                        )}
                                        <div className="mt-2 text-xs text-gray-500">
                                            <span className="mr-3">Due: {task.due_date || 'N/A'}</span>
                                            <span className="mr-3">Phase: {task.phase || 1}</span>
                                            <span>Version: {task.version || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <select
                                        value={task.status}
                                        onChange={(e) => handleChangeStatus(task.id, e.target.value)}
                                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg"
                                    >
                                        <option value="todo">Todo</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="done">Done</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 bg-gray-100 rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-2">📖 How to Use</h3>
                    <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Click "Sync Now" to refresh task data from Mission Control JSON</li>
                        <li>• Change task status using the dropdown menu (auto-saves to SQLite)</li>
                        <li>• Stats update automatically after changes</li>
                        <li>• Last sync shows when data was last synced</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}