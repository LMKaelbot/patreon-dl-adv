import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/search?q=&creator=&from=&to=
router.get('/', (req: AuthRequest, res: Response): void => {
  const { q, creator, from, to } = req.query as Record<string, string>;
  const db = getDb();

  if (q && q.trim()) {
    // FTS5 search
    let sql = `
      SELECT t.id, t.user_id, t.post_id, t.post_title, t.creator, t.language,
             t.duration_seconds, t.summary, t.key_topics, t.created_at,
             snippet(transcripts_fts, 2, '<mark>', '</mark>', '...', 32) AS snippet
      FROM transcripts_fts
      JOIN transcripts t ON t.id = transcripts_fts.rowid
      WHERE transcripts_fts MATCH ?
    `;
    const params: (string | number)[] = [q.trim()];

    if (!req.user!.is_admin) {
      sql += ' AND t.user_id=?';
      params.push(req.user!.id);
    }
    if (creator) {
      sql += ' AND t.creator LIKE ?';
      params.push(`%${creator}%`);
    }
    if (from) {
      sql += ' AND t.created_at >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND t.created_at <= ?';
      params.push(to);
    }
    sql += ' ORDER BY rank LIMIT 50';

    try {
      const rows = db.prepare(sql).all(...params);
      res.json(rows);
    } catch (err: unknown) {
      res.status(400).json({ error: 'Invalid search query', detail: (err as Error).message });
    }
  } else {
    // No full-text query – filter only
    let sql = `SELECT id, user_id, post_id, post_title, creator, language,
                      duration_seconds, summary, key_topics, created_at
               FROM transcripts WHERE 1=1`;
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
    sql += ' ORDER BY created_at DESC LIMIT 50';

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  }
});

export default router;
