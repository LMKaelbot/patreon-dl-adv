import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/database.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

function makeToken(payload: { id: number; username: string; is_admin: boolean }) {
  const secret = process.env.JWT_SECRET || 'change-me';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

// POST /api/auth/register
// First registered user becomes admin; subsequent registrations require admin token
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, password, folder } = req.body as { username?: string; password?: string; folder?: string };
  if (!username || !password) {
    res.status(400).json({ error: 'username and password required' });
    return;
  }

  const db = getDb();
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const isFirst = userCount === 0;

  // If not the first user, require admin auth
  if (!isFirst) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Admin token required to register additional users' });
      return;
    }
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me') as { is_admin: boolean };
      if (!payload.is_admin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  }

  const hash = await bcrypt.hash(password, 12);
  try {
    const result = db
      .prepare('INSERT INTO users (username, password_hash, folder, is_admin) VALUES (?, ?, ?, ?)')
      .run(username, hash, folder || '', isFirst ? 1 : 0);
    const token = makeToken({ id: Number(result.lastInsertRowid), username, is_admin: isFirst });
    res.status(201).json({ token, is_admin: isFirst });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Username already taken' });
    } else {
      res.status(500).json({ error: 'Internal error' });
    }
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: 'username and password required' });
    return;
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as {
    id: number;
    username: string;
    password_hash: string;
    is_admin: number;
  } | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = makeToken({ id: user.id, username: user.username, is_admin: Boolean(user.is_admin) });
  res.json({ token, is_admin: Boolean(user.is_admin) });
});

// GET /api/auth/me
router.get('/me', verifyToken, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, folder, is_admin, created_at FROM users WHERE id = ?').get(req.user!.id);
  res.json(user);
});

export default router;
