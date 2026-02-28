import { Router, Response } from 'express';
import { getDb } from '../db/database.js';
import { AuthRequest, requireAdmin } from '../middleware/auth.js';

const router = Router();

const ALLOWED_KEYS = [
  'port',
  'host_url',
  'https_enabled',
  'letsencrypt_domain',
  'letsencrypt_email',
  'patreon_api_key',
  'ai_api_key',
  'ai_base_url',
  'ai_model',
  'whisper_model',
  'scheduler_enabled',
  'scheduler_interval_hours',
];

// GET /api/settings
router.get('/', (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    // Mask sensitive values for non-admins
    if (!req.user?.is_admin && (row.key === 'ai_api_key' || row.key === 'patreon_api_key')) {
      settings[row.key] = row.value ? '***' : '';
    } else {
      settings[row.key] = row.value;
    }
  }
  res.json(settings);
});

// PUT /api/settings
router.put('/', requireAdmin, (req: AuthRequest, res: Response): void => {
  const db = getDb();
  const updates = req.body as Record<string, string>;

  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  const updateMany = db.transaction((data: Record<string, string>) => {
    for (const [key, value] of Object.entries(data)) {
      if (ALLOWED_KEYS.includes(key)) {
        upsert.run(key, String(value));
      }
    }
  });

  updateMany(updates);
  res.json({ ok: true });
});

export default router;
