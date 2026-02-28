import { spawn } from 'child_process';
import { getDb } from '../db/database.js';
import { notifyProgress } from '../routes/downloads.js';

export async function runDownload(jobId: number, url: string, userId: number): Promise<void> {
  const db = getDb();

  const downloadsDir = process.env.DOWNLOADS_DIR || './downloads';
  const userRow = db.prepare('SELECT folder FROM users WHERE id=?').get(userId) as { folder: string } | undefined;
  const folder = userRow?.folder || '';
  const outputDir = folder ? `${downloadsDir}/${folder}` : downloadsDir;

  db.prepare("UPDATE download_queue SET status='running', progress=0 WHERE id=?").run(jobId);
  notifyProgress(jobId, { id: jobId, status: 'running', progress: 0 });

  return new Promise((resolve, reject) => {
    // Use the patreon-dl-adv CLI if available, otherwise fallback to yt-dlp
    const proc = spawn('yt-dlp', [
      '--newline',
      '--progress-template', '%(progress._percent_str)s',
      '-o', `${outputDir}/%(title)s.%(ext)s`,
      url,
    ]);

    proc.stdout.on('data', (chunk: Buffer) => {
      const line = chunk.toString().trim();
      const match = line.match(/(\d+\.?\d*)%/);
      if (match) {
        const progress = parseFloat(match[1]);
        db.prepare('UPDATE download_queue SET progress=? WHERE id=?').run(progress, jobId);
        notifyProgress(jobId, { id: jobId, status: 'running', progress });
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      console.error(`[Download ${jobId}]`, chunk.toString().trim());
    });

    proc.on('close', (code) => {
      const cancelled = (db.prepare("SELECT status FROM download_queue WHERE id=?").get(jobId) as { status: string } | undefined)?.status === 'cancelled';
      if (cancelled) {
        resolve();
        return;
      }
      if (code === 0) {
        db.prepare("UPDATE download_queue SET status='done', progress=100 WHERE id=?").run(jobId);
        notifyProgress(jobId, { id: jobId, status: 'done', progress: 100 });
        resolve();
      } else {
        db.prepare("UPDATE download_queue SET status='error', error=? WHERE id=?").run(`Process exited with code ${code}`, jobId);
        notifyProgress(jobId, { id: jobId, status: 'error', error: `Process exited with code ${code}` });
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      db.prepare("UPDATE download_queue SET status='error', error=? WHERE id=?").run(err.message, jobId);
      notifyProgress(jobId, { id: jobId, status: 'error', error: err.message });
      reject(err);
    });
  });
}
