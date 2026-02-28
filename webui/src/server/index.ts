import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import { getDb } from './db/database.js';
import authRouter from './routes/auth.js';
import settingsRouter from './routes/settings.js';
import downloadsRouter from './routes/downloads.js';
import transcriptsRouter from './routes/transcripts.js';
import searchRouter from './routes/search.js';
import usersRouter from './routes/users.js';
import { verifyToken } from './middleware/auth.js';
import { startScheduler } from './services/scheduler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialise DB on startup
const db = getDb();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/settings', verifyToken, settingsRouter);
app.use('/api/downloads', verifyToken, downloadsRouter);
app.use('/api/transcripts', verifyToken, transcriptsRouter);
app.use('/api/search', verifyToken, searchRouter);
app.use('/api/users', verifyToken, usersRouter);

// Serve React build in production
const clientBuild = join(__dirname, '../../client');
if (existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (_req, res) => {
    res.sendFile(join(clientBuild, 'index.html'));
  });
}

const PORT = parseInt(process.env.PORT || '3000', 10);

// Check if HTTPS / greenlock is enabled via DB setting
const httpsEnabled = db.prepare("SELECT value FROM settings WHERE key='https_enabled'").get() as { value: string } | undefined;

if (httpsEnabled?.value === 'true') {
  const leDomain = (db.prepare("SELECT value FROM settings WHERE key='letsencrypt_domain'").get() as { value: string } | undefined)?.value || '';
  const leEmail = (db.prepare("SELECT value FROM settings WHERE key='letsencrypt_email'").get() as { value: string } | undefined)?.value || '';

  if (leDomain && leEmail) {
    // Dynamic import so greenlock is only loaded when needed
    const { default: greenlock } = await import('greenlock-express');
    greenlock
      .init({
        packageRoot: join(__dirname, '../../../'),
        configDir: './greenlock.d',
        maintainerEmail: leEmail,
        cluster: false,
      })
      .ready((glx: { serveApp: (app: express.Application) => void }) => {
        glx.serveApp(app);
        console.log(`Server running with HTTPS (Let's Encrypt) for domain: ${leDomain}`);
      });
  } else {
    console.warn('HTTPS enabled but letsencrypt_domain or letsencrypt_email not set. Falling back to HTTP.');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  }
} else {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

// Start background scheduler
startScheduler();
