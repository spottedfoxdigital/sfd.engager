// Background worker.
//
// In production this runs as a separate Railway service (start command:
// `npm run worker`). It continuously ingests new comments and runs the
// classification + automation pass, so the dashboard stays current without
// anyone clicking "Sync now". For the slice it shares the same logic the
// /api/sync endpoint uses.
//
// Next phase: replace the polling loop with Meta webhook delivery + a proper
// job queue (BullMQ/Redis) and add DM ingestion.

import { runSync } from "../src/lib/process";

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 30_000);

async function tick() {
  try {
    const r = await runSync();
    if (r.ingestedComments || r.comments.processed || r.ingestedDMs || r.dms.processed) {
      console.log(
        `[worker] comments: ingested=${r.ingestedComments} liked=${r.comments.autoLiked} ` +
          `manualLike=${r.comments.manualLike} needsReply=${r.comments.needsReply} ` +
          `spamReview=${r.comments.spamReview} hidden=${r.comments.autoHidden} | ` +
          `dms: ingested=${r.ingestedDMs} needsReply=${r.dms.needsReply} hidden=${r.dms.autoHidden}`
      );
    }
  } catch (err) {
    console.error("[worker] tick failed:", err);
  }
}

async function main() {
  console.log(`[worker] starting — polling every ${INTERVAL_MS}ms`);
  // Run immediately, then on an interval.
  await tick();
  setInterval(tick, INTERVAL_MS);
}

main();
