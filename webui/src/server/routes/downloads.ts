import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { runDownload } from '../services/downloader.js';

const router = Router();

// Track SSE clients: jobId -> Set of Response objects
const sseClients = new Map<number, Set<Response>>();

export function notifyProgress(jobId: number, data: object) {
  const clients = sseClients.get(jobId);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

// GET /api/downloads
router.get('/', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const rows = req.user!.is_admin
    ? db.prepare('SELECT dq.*, u.username FROM download_queue dq JOIN users u ON dq.user_id=u.id ORDER BY dq.created_at DESC').all()
    : db.prepare('SELECT * FROM download_queue WHERE user_id=? ORDER BY created_at DESC').all(req.user!.id);
  res.json(rows);
});

// POST /api/downloads
router.post('/', (req: AuthRequest, res: Response): void => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: 'url required' });
    return;
  }
  const db = getDb();
  const result = db
    .prepare('INSERT INTO download_queue (user_id, url, status, progress) VALUES (?, ?, ?, ?)')
    .run(req.user!.id, url, 'pending', 0);
  const jobId = Number(result.lastInsertRowid);

  // Start download in background
  runDownload(jobId, url, req.user!.id).catch(() => {});

  res.status(201).json({ id: jobId, url, status: 'pending' });
});

// DELETE /api/downloads/:id
router.delete('/:id', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const job = db.prepare('SELECT * FROM download_queue WHERE id=?').get(Number(req.params.id)) as {
    user_id: number;
    status: string;
  } | undefined;

  if (!job) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!req.user!.is_admin && job.user_id !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (job.status === 'running') {
    db.prepare("UPDATE download_queue SET status='cancelled' WHERE id=?").run(Number(req.params.id));
  } else {
    db.prepare('DELETE FROM download_queue WHERE id=?').run(Number(req.params.id));
  }
  res.json({ ok: true });
});

// SSE /api/downloads/progress/:id
router.get('/progress/:id', (req: AuthRequest, res: Response): void => {
  const jobId = Number(req.params.id);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!sseClients.has(jobId)) sseClients.set(jobId, new Set());
  sseClients.get(jobId)!.add(res);

  // Send current state immediately
  const db = getDb();
  const job = db.prepare('SELECT * FROM download_queue WHERE id=?').get(jobId);
  if (job) res.write(`data: ${JSON.stringify(job)}\n\n`);

  req.on('close', () => {
    sseClients.get(jobId)?.delete(res);
    if (sseClients.get(jobId)?.size === 0) sseClients.delete(jobId);
  });
});

export default router;
