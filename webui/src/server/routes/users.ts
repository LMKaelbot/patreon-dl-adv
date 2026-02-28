import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/database.js';
import { AuthRequest, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/users  (admin only)
router.get('/', requireAdmin, (_req: AuthRequest, res: Response): void => {
  const db = getDb();
  const users = db.prepare('SELECT id, username, folder, is_admin, created_at FROM users ORDER BY created_at ASC').all();
  res.json(users);
});

// DELETE /api/users/:id  (admin only)
router.delete('/:id', requireAdmin, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  if (Number(req.params.id) === req.user!.id) {
    res.status(400).json({ error: 'Cannot delete yourself' });
    return;
  }
  db.prepare('DELETE FROM users WHERE id=?').run(Number(req.params.id));
  res.json({ ok: true });
});

// PUT /api/users/:id/password  (self or admin)
router.put('/:id/password', async (req: AuthRequest, res: Response): Promise<void> => {
  const targetId = Number(req.params.id);
  if (!req.user!.is_admin && req.user!.id !== targetId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const { password } = req.body as { password?: string };
  if (!password) { res.status(400).json({ error: 'password required' }); return; }

  const hash = await bcrypt.hash(password, 12);
  const db = getDb();
  const result = db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, targetId);
  if ((result.changes as number) === 0) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ ok: true });
});

// PUT /api/users/:id/folder  (self or admin)
router.put('/:id/folder', (req: AuthRequest, res: Response): void => {
  const targetId = Number(req.params.id);
  if (!req.user!.is_admin && req.user!.id !== targetId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const { folder } = req.body as { folder?: string };
  if (folder === undefined) { res.status(400).json({ error: 'folder required' }); return; }

  const db = getDb();
  db.prepare('UPDATE users SET folder=? WHERE id=?').run(folder, targetId);
  res.json({ ok: true });
});

export default router;
