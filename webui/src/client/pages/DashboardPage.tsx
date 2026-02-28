import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Download, Transcript } from '../lib/api.js';
import { useAuth } from '../App.js';

interface Stats {
  totalDownloads: number;
  runningDownloads: number;
  totalTranscripts: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalDownloads: 0, runningDownloads: 0, totalTranscripts: 0 });
  const [recentDownloads, setRecentDownloads] = useState<Download[]>([]);
  const [recentTranscripts, setRecentTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDownloads(), api.getTranscripts({ limit: '5' })])
      .then(([downloads, transcripts]) => {
        setStats({
          totalDownloads: downloads.length,
          runningDownloads: downloads.filter((d) => d.status === 'running').length,
          totalTranscripts: transcripts.length,
        });
        setRecentDownloads(downloads.slice(0, 5));
        setRecentTranscripts(transcripts.slice(0, 5) as unknown as Transcript[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome, {user?.username}!</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">{stats.totalDownloads}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Downloads</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold text-yellow-600">{stats.runningDownloads}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Active Downloads</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold text-green-600">{stats.totalTranscripts}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Transcripts</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent downloads */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Downloads</h2>
            <Link to="/downloads" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">View all</Link>
          </div>
          {recentDownloads.length === 0 ? (
            <p className="text-sm text-gray-500">No downloads yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentDownloads.map((d) => (
                <li key={d.id} className="py-2 flex items-center justify-between gap-2">
                  <span className="text-sm truncate flex-1 text-gray-700 dark:text-gray-300">{d.url}</span>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent transcripts */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Transcripts</h2>
            <Link to="/transcripts" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">View all</Link>
          </div>
          {recentTranscripts.length === 0 ? (
            <p className="text-sm text-gray-500">No transcripts yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentTranscripts.map((t) => (
                <li key={t.id} className="py-2">
                  <p className="text-sm font-medium truncate">{t.post_title || 'Untitled'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.creator}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Download['status'] }) {
  const map = {
    pending: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    running: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    done: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
  };
  return <span className={`badge ${map[status]}`}>{status}</span>;
}
