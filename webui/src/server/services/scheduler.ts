import cron from 'node-cron';
import { getDb } from '../db/database.js';

let scheduledTask: cron.ScheduledTask | null = null;

async function checkNewPatreonPosts() {
  const db = getDb();
  const apiKeyRow = db.prepare("SELECT value FROM settings WHERE key='patreon_api_key'").get() as { value: string } | undefined;
  const apiKey = apiKeyRow?.value || '';

  if (!apiKey) {
    console.log('[Scheduler] No Patreon API key configured, skipping.');
    return;
  }

  // Placeholder: integrate with patreon-dl-adv CLI or Patreon API
  // In a real implementation this would call the main downloader package
  console.log('[Scheduler] Checking for new Patreon posts...');
}

export function startScheduler() {
  const db = getDb();

  function getSchedulerConfig() {
    const enabled = (db.prepare("SELECT value FROM settings WHERE key='scheduler_enabled'").get() as { value: string } | undefined)?.value === 'true';
    const hours = parseInt(
      (db.prepare("SELECT value FROM settings WHERE key='scheduler_interval_hours'").get() as { value: string } | undefined)?.value || '6',
      10,
    );
    return { enabled, hours };
  }

  function applySchedule() {
    if (scheduledTask) {
      scheduledTask.stop();
      scheduledTask = null;
    }
    const { enabled, hours } = getSchedulerConfig();
    if (!enabled) {
      console.log('[Scheduler] Disabled.');
      return;
    }
    const expression = `0 */${hours} * * *`;
    scheduledTask = cron.schedule(expression, () => {
      checkNewPatreonPosts().catch(console.error);
    });
    console.log(`[Scheduler] Running every ${hours} hour(s). Cron: ${expression}`);
  }

  applySchedule();

  // Re-apply schedule every 5 minutes in case settings changed
  cron.schedule('*/5 * * * *', applySchedule);
}
