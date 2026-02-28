import React, { useEffect, useState } from 'react';
import { api, Transcript } from '../lib/api.js';
import TranscriptViewer from '../components/TranscriptViewer.js';

export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selected, setSelected] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ post_title: '', creator: '', video_path: '', language: 'en' });

  useEffect(() => { loadTranscripts(); }, []);

  async function loadTranscripts() {
    try {
      const data = await api.getTranscripts();
      setTranscripts(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(t: Transcript) {
    try {
      const full = await api.getTranscript(t.id);
      setSelected(full);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }

  async function handleTranscribe(id: number) {
    setTranscribing(true);
    setError('');
    try {
      const result = await api.transcribeVideo(id);
      setSelected((prev) => prev ? { ...prev, ...result } : prev);
      setTranscripts((prev) =>
        prev.map((t) => t.id === id ? { ...t, summary: result.summary } : t)
      );
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setTranscribing(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteTranscript(id);
      setTranscripts((prev) => prev.filter((t) => t.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { id } = await api.createTranscript(addForm);
      setShowAdd(false);
      setAddForm({ post_title: '', creator: '', video_path: '', language: 'en' });
      await loadTranscripts();
      const full = await api.getTranscript(id);
      setSelected(full);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transcripts</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add</button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Add form modal */}
      {showAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-lg">Add Transcript</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Post Title</label>
                <input className="input" value={addForm.post_title} onChange={(e) => setAddForm((f) => ({ ...f, post_title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Creator</label>
                <input className="input" value={addForm.creator} onChange={(e) => setAddForm((f) => ({ ...f, creator: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Video Path *</label>
                <input className="input" required value={addForm.video_path} onChange={(e) => setAddForm((f) => ({ ...f, video_path: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <input className="input" value={addForm.language} onChange={(e) => setAddForm((f) => ({ ...f, language: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-1 space-y-2">
          {transcripts.length === 0 && <p className="text-gray-500 text-sm">No transcripts yet.</p>}
          {transcripts.map((t) => (
            <div
              key={t.id}
              onClick={() => handleSelect(t)}
              className={`card p-3 cursor-pointer hover:border-brand-400 transition-colors ${
                selected?.id === t.id ? 'border-brand-500 dark:border-brand-500' : ''
              }`}
            >
              <p className="font-medium text-sm truncate">{t.post_title || 'Untitled'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.creator}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(t.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-lg">{selected.post_title || 'Untitled'}</h2>
                  <p className="text-sm text-gray-500">{selected.creator} · {selected.language.toUpperCase()} · {Math.round(selected.duration_seconds)}s</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleTranscribe(selected.id)}
                    disabled={transcribing}
                    className="btn-secondary text-xs"
                  >
                    {transcribing ? 'Transcribing…' : '▶ Transcribe'}
                  </button>
                  <a
                    href={api.exportTranscript(selected.id, 'md')}
                    download
                    className="btn-secondary text-xs"
                  >
                    ↓ MD
                  </a>
                  <a
                    href={api.exportTranscript(selected.id, 'srt')}
                    download
                    className="btn-secondary text-xs"
                  >
                    ↓ SRT
                  </a>
                  <button onClick={() => handleDelete(selected.id)} className="btn-danger text-xs">Delete</button>
                </div>
              </div>
              <TranscriptViewer
                transcript={selected.transcript_text}
                srt={selected.srt_content}
                summary={selected.summary}
                keyTopics={(() => { try { return JSON.parse(selected.key_topics); } catch { return []; } })()}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              Select a transcript to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
