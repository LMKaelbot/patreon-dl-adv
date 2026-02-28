import React, { useEffect, useRef, useState } from 'react';
import { api, Download } from '../lib/api.js';
import ProgressBar from '../components/ProgressBar.js';
import { getToken } from '../lib/auth.js';

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const sseRefs = useRef<Map<number, EventSource>>(new Map());

  useEffect(() => {
    loadDownloads();
    return () => {
      for (const es of sseRefs.current.values()) es.close();
    };
  }, []);

  async function loadDownloads() {
    try {
      const data = await api.getDownloads();
      setDownloads(data);
      // Subscribe to SSE for active jobs
      for (const job of data) {
        if (job.status === 'running' || job.status === 'pending') {
          subscribeSSE(job.id);
        }
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }

  function subscribeSSE(id: number) {
    if (sseRefs.current.has(id)) return;
    const token = getToken();
    const es = new EventSource(`/api/downloads/progress/${id}?token=${token}`);
    sseRefs.current.set(id, es);
    es.onmessage = (e) => {
      const update = JSON.parse(e.data) as Download;
      setDownloads((prev) => prev.map((d) => (d.id === update.id ? { ...d, ...update } : d)));
      if (update.status !== 'running' && update.status !== 'pending') {
        es.close();
        sseRefs.current.delete(id);
      }
    };
    es.onerror = () => { es.close(); sseRefs.current.delete(id); };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const job = await api.createDownload(url.trim());
      setDownloads((prev) => [job, ...prev]);
      setUrl('');
      subscribeSSE(job.id);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteDownload(id);
      setDownloads((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }

  const statusColor = (s: Download['status']): 'brand' | 'green' | 'red' | 'yellow' => {
    if (s === 'done') return 'green';
    if (s === 'error') return 'red';
    if (s === 'running') return 'brand';
    return 'yellow';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Downloads</h1>

      {/* Add download form */}
      <form onSubmit={handleSubmit} className="card p-4 flex gap-3">
        <input
          className="input flex-1"
          type="url"
          placeholder="Patreon post URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary shrink-0" disabled={submitting}>
          {submitting ? 'Adding…' : 'Download'}
        </button>
      </form>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Download list */}
      <div className="space-y-3">
        {downloads.length === 0 && <p className="text-gray-500 text-sm">No downloads yet.</p>}
        {downloads.map((d) => (
          <div key={d.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline truncate flex-1"
              >
                {d.url}
              </a>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={d.status} />
                <button
                  onClick={() => handleDelete(d.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-xs px-1"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
            {(d.status === 'running' || d.status === 'done') && (
              <ProgressBar value={d.progress} color={statusColor(d.status)} />
            )}
            {d.status === 'running' && (
              <p className="text-xs text-gray-500">{d.progress.toFixed(1)}%</p>
            )}
            {d.error && <p className="text-xs text-red-500">{d.error}</p>}
            <p className="text-xs text-gray-400">{new Date(d.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Download['status'] }) {
  const map: Record<Download['status'], string> = {
    pending: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    running: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    done: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-400',
  };
  return <span className={`badge ${map[status]}`}>{status}</span>;
}
