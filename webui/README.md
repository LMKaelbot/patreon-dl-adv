# Patreon DL Adv — Web UI

A self-hosted web interface for **patreon-dl-adv** featuring:

- Patreon post/video downloading via queue
- Automatic transcription with [Whisper](https://github.com/openai/whisper)
- AI-powered summaries and key topic extraction (OpenAI-compatible API)
- Full-text search across all transcripts (SQLite FTS5)
- Multi-user support with JWT auth
- Dark mode
- Optional HTTPS via Let's Encrypt (greenlock-express)
- Scheduled Patreon post checking

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| ffmpeg | any recent |
| whisper | via `pip install openai-whisper` |
| yt-dlp | optional (used for downloads) |

---

## Quick Start

```bash
cd webui
bash setup.sh        # installs deps, creates .env, optional systemd service

# Dev mode (hot-reload)
npm run dev

# Production
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000)

The **first registered user** automatically becomes admin. No invite system — subsequent registrations require an existing admin token.

---

## Configuration

All settings are stored in the SQLite database and editable via the **Settings** page. They can also be set in the `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `./data/patreon-dl-adv.db` | SQLite database path |
| `DOWNLOADS_DIR` | `./downloads` | Download root directory |
| `JWT_SECRET` | `change-me` | JWT signing secret — **change this!** |

Settings available in the UI:

| Key | Description |
|-----|-------------|
| `port` | Server port |
| `host_url` | Public URL |
| `https_enabled` | `true` to enable Let's Encrypt |
| `letsencrypt_domain` | Domain for SSL cert |
| `letsencrypt_email` | Email for Let's Encrypt |
| `patreon_api_key` | Patreon API key |
| `ai_api_key` | OpenAI-compatible API key |
| `ai_base_url` | API base URL (default: OpenAI) |
| `ai_model` | Model name (e.g. `gpt-4o-mini`) |
| `whisper_model` | Whisper model size (`tiny`, `base`, `small`, `medium`, `large`) |
| `scheduler_enabled` | `true` to enable scheduled downloads |
| `scheduler_interval_hours` | Hours between scheduler runs |

---

## API Overview

All endpoints are under `/api/`. Protected endpoints require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register (first user = admin) |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Get current user |

### Downloads
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/downloads` | List downloads |
| `POST` | `/api/downloads` | Add URL to queue |
| `DELETE` | `/api/downloads/:id` | Remove/cancel download |
| `GET` | `/api/downloads/progress/:id` | SSE stream for progress |

### Transcripts
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/transcripts` | List transcripts |
| `POST` | `/api/transcripts` | Create transcript record |
| `GET` | `/api/transcripts/:id` | Get transcript |
| `PUT` | `/api/transcripts/:id` | Update transcript |
| `DELETE` | `/api/transcripts/:id` | Delete transcript |
| `POST` | `/api/transcripts/:id/transcribe` | Run Whisper + AI summary |
| `GET` | `/api/transcripts/:id/export?format=md\|srt` | Export transcript |

### Search
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/search?q=&creator=&from=&to=` | Full-text search |

### Settings (admin only for PUT)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/settings` | Get all settings |
| `PUT` | `/api/settings` | Update settings |

### Users (admin only)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List users |
| `DELETE` | `/api/users/:id` | Delete user |
| `PUT` | `/api/users/:id/password` | Change password |
| `PUT` | `/api/users/:id/folder` | Change download folder |

---

## HTTPS / Let's Encrypt

1. Point your domain DNS to the server's IP
2. In Settings, set `https_enabled=true`, `letsencrypt_domain`, and `letsencrypt_email`
3. Restart the server — greenlock-express handles cert issuance automatically

---

## Architecture

```
webui/
├── src/
│   ├── server/
│   │   ├── db/           # SQLite schema + database helper
│   │   ├── middleware/   # JWT auth middleware
│   │   ├── routes/       # Express route handlers
│   │   ├── services/     # whisper, ai, scheduler, downloader
│   │   └── index.ts      # Express entry point
│   └── client/
│       ├── components/   # Layout, TranscriptViewer, ProgressBar
│       ├── lib/          # API client, auth helpers
│       ├── pages/        # React page components
│       ├── App.tsx       # Router + auth/dark-mode context
│       └── main.tsx      # React entry point
├── .env.example
├── package.json
├── setup.sh
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```
