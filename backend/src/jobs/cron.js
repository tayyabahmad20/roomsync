import cron from 'node-cron';

import { rotateDueChores } from '../services/choreRotationService.js';

/**
 * Starts background cron jobs.
 *
 * Note: This is suitable for a single-process prototype. In production (multi-instance),
 * move scheduled jobs to a dedicated worker.
 */
export function startJobs() {
  // Every day at 00:05
  cron.schedule('5 0 * * *', async () => {
    try {
      const result = await rotateDueChores();
      console.log(`[cron] chore rotation complete: rooms=${result.roomsProcessed}, chores=${result.choresRotated}`);
    } catch (err) {
      console.error('[cron] chore rotation failed:', err);
    }
  });

  console.log('[cron] scheduled jobs started');
}
