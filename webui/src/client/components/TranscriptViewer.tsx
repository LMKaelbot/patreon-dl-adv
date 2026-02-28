import React, { useState } from 'react';

interface SrtEntry {
  index: number;
  start: string;
  end: string;
  text: string;
}

function parseSrt(srt: string): SrtEntry[] {
  const blocks = srt.trim().split(/\n\n+/);
  return blocks
    .map((block) => {
      const lines = block.split('\n');
      if (lines.length < 3) return null;
      const index = parseInt(lines[0], 10);
      const [start, end] = lines[1].split(' --> ');
      const text = lines.slice(2).join('\n');
      return { index, start: start?.trim(), end: end?.trim(), text };
    })
    .filter(Boolean) as SrtEntry[];
}

interface Props {
  transcript: string;
  srt: string;
  summary?: string;
  keyTopics?: string[];
}

export default function TranscriptViewer({ transcript, srt, summary, keyTopics = [] }: Props) {
  const [view, setView] = useState<'text' | 'srt'>('text');
  const entries = parseSrt(srt);

  return (
    <div className="space-y-4">
      {summary && (
        <div className="card p-4">
          <h3 className="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Summary</h3>
          <p className="text-sm leading-relaxed">{summary}</p>
          {keyTopics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {keyTopics.map((t, i) => (
                <span key={i} className="badge bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View toggle */}
      {srt && (
        <div className="flex gap-2">
          <button
            onClick={() => setView('text')}
            className={`btn ${view === 'text' ? 'btn-primary' : 'btn-secondary'} text-xs`}
          >
            Plain text
          </button>
          <button
            onClick={() => setView('srt')}
            className={`btn ${view === 'srt' ? 'btn-primary' : 'btn-secondary'} text-xs`}
          >
            With timestamps
          </button>
        </div>
      )}

      {/* Transcript content */}
      <div className="card p-4 max-h-96 overflow-y-auto">
        {view === 'text' || !srt ? (
          <pre className="text-sm whitespace-pre-wrap leading-relaxed">{transcript || 'No transcript yet.'}</pre>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.index} className="flex gap-3">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0 pt-0.5 w-24">
                  {entry.start}
                </span>
                <p className="text-sm leading-relaxed">{entry.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
