import React, { useState } from 'react';
import { api, SearchResult } from '../lib/api.js';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [creator, setCreator] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const params: Record<string, string> = {};
    if (query.trim()) params.q = query.trim();
    if (creator.trim()) params.creator = creator.trim();
    if (from) params.from = from;
    if (to) params.to = to;
    try {
      const data = await api.search(params);
      setResults(data);
      setSearched(true);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search Transcripts</h1>

      <form onSubmit={handleSearch} className="card p-4 space-y-3">
        <div className="flex gap-3">
          <input
            className="input flex-1"
            type="search"
            placeholder="Search text…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Creator</label>
            <input className="input" placeholder="Filter by creator" value={creator} onChange={(e) => setCreator(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </form>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {searched && (
        <div>
          <p className="text-sm text-gray-500 mb-3">{results.length} result{results.length !== 1 ? 's' : ''}</p>
          <div className="space-y-3">
            {results.length === 0 && <p className="text-gray-500 text-sm">No results found.</p>}
            {results.map((r) => {
              let topics: string[] = [];
              try { topics = JSON.parse(r.key_topics); } catch { /* ignore */ }
              return (
                <div key={r.id} className="card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{r.post_title || 'Untitled'}</h3>
                      <p className="text-xs text-gray-500">{r.creator} · {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <a
                      href={`/api/transcripts/${r.id}/export?format=md`}
                      download
                      className="btn-secondary text-xs shrink-0"
                    >
                      ↓ Export
                    </a>
                  </div>
                  {r.snippet && (
                    <p
                      className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: r.snippet }}
                    />
                  )}
                  {r.summary && !r.snippet && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">{r.summary.slice(0, 200)}…</p>
                  )}
                  {topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {topics.map((t, i) => (
                        <span key={i} className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
