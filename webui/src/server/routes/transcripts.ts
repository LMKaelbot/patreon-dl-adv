import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { runWhisper } from '../services/whisper.js';
import { generateSummary } from '../services/ai.js';

const router = Router();

// GET /api/transcripts
router.get('/', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const { creator, from, to, limit = '50', offset = '0' } = req.query as Record<string, string>;

  let sql = 'SELECT id, user_id, post_id, post_title, creator, language, duration_seconds, summary, key_topics, created_at FROM transcripts WHERE 1=1';
  const params: (string | number)[] = [];

  if (!req.user!.is_admin) {
    sql += ' AND user_id=?';
    params.push(req.user!.id);
  }
  if (creator) {
    sql += ' AND creator LIKE ?';
    params.push(`%${creator}%`);
  }
  if (from) {
    sql += ' AND created_at >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND created_at <= ?';
    params.push(to);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// GET /api/transcripts/:id
router.get('/:id', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const t = db.prepare('SELECT * FROM transcripts WHERE id=?').get(Number(req.params.id)) as {
    user_id: number;
  } | undefined;
  if (!t) { res.status(404).json({ error: 'Not found' }); return; }
  if (!req.user!.is_admin && (t as { user_id: number }).user_id !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  res.json(t);
});

// POST /api/transcripts
router.post('/', (req: AuthRequest, res: Response): void => {
  const { post_id, post_title, creator, video_path, language } = req.body as Record<string, string>;
  if (!video_path) { res.status(400).json({ error: 'video_path required' }); return; }
  const db = getDb();
  const result = db
    .prepare(`INSERT INTO transcripts (user_id, post_id, post_title, creator, video_path, language)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(req.user!.id, post_id || null, post_title || '', creator || '', video_path, language || 'en');
  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

// PUT /api/transcripts/:id
router.put('/:id', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const t = db.prepare('SELECT * FROM transcripts WHERE id=?').get(Number(req.params.id)) as { user_id: number } | undefined;
  if (!t) { res.status(404).json({ error: 'Not found' }); return; }
  if (!req.user!.is_admin && t.user_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

  const allowed = ['post_title', 'creator', 'transcript_text', 'srt_content', 'language', 'duration_seconds', 'summary', 'key_topics'];
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (key in req.body) { fields.push(`${key}=?`); values.push(req.body[key]); }
  }
  if (!fields.length) { res.status(400).json({ error: 'No fields to update' }); return; }
  values.push(Number(req.params.id));
  db.prepare(`UPDATE transcripts SET ${fields.join(',')} WHERE id=?`).run(...values);
  res.json({ ok: true });
});

// DELETE /api/transcripts/:id
router.delete('/:id', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const t = db.prepare('SELECT * FROM transcripts WHERE id=?').get(Number(req.params.id)) as { user_id: number } | undefined;
  if (!t) { res.status(404).json({ error: 'Not found' }); return; }
  if (!req.user!.is_admin && t.user_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  db.prepare('DELETE FROM transcripts WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

// POST /api/transcripts/:id/transcribe
router.post('/:id/transcribe', async (req: AuthRequest, res: Response): Promise<void> => {
  const db = getDb();
  const t = db.prepare('SELECT * FROM transcripts WHERE id=?').get(Number(req.params.id)) as {
    user_id: number;
    video_path: string;
    language: string;
    transcript_text: string;
  } | undefined;
  if (!t) { res.status(404).json({ error: 'Not found' }); return; }
  if (!req.user!.is_admin && t.user_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

  try {
    const { text, srt } = await runWhisper(t.video_path, t.language);

    // Generate AI summary
    let summary = '';
    let keyTopics: string[] = [];
    try {
      const aiResult = await generateSummary(text);
      summary = aiResult.summary;
      keyTopics = aiResult.topics;
    } catch {
      // AI summary is optional
    }

    db.prepare(`UPDATE transcripts SET transcript_text=?, srt_content=?, summary=?, key_topics=? WHERE id=?`)
      .run(text, srt, summary, JSON.stringify(keyTopics), Number(req.params.id));

    res.json({ ok: true, transcript_text: text, summary, key_topics: keyTopics });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/transcripts/:id/export?format=md
router.get('/:id/export', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const t = db.prepare('SELECT * FROM transcripts WHERE id=?').get(Number(req.params.id)) as {
    user_id: number;
    post_title: string;
    creator: string;
    language: string;
    duration_seconds: number;
    summary: string;
    key_topics: string;
    transcript_text: string;
    srt_content: string;
    created_at: string;
  } | undefined;
  if (!t) { res.status(404).json({ error: 'Not found' }); return; }
  if (!req.user!.is_admin && t.user_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

  const format = (req.query.format as string) || 'md';
  if (format === 'srt') {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${t.post_title || 'transcript'}.srt"`);
    res.send(t.srt_content);
    return;
  }

  // Default: markdown
  let topics: string[] = [];
  try { topics = JSON.parse(t.key_topics); } catch { /* ignore */ }

  const md = `# ${t.post_title || 'Transcript'}

**Creator:** ${t.creator}
**Language:** ${t.language}
**Duration:** ${Math.round(t.duration_seconds)}s
**Date:** ${t.created_at}

## Summary

${t.summary || '_No summary available._'}

## Key Topics

${topics.length ? topics.map((k) => `- ${k}`).join('\n') : '_None_'}

## Transcript

${t.transcript_text}
`;
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${t.post_title || 'transcript'}.md"`);
  res.send(md);
});

export default router;
