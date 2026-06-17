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

import { ingestComments, processPending } from "../src/lib/process";

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 30_000);

async function tick() {
  try {
    const ingested = await ingestComments();
    const counts = await processPending();
    if (ingested || counts.processed) {
      console.log(
        `[worker] ingested=${ingested} processed=${counts.processed} liked=${counts.autoLiked} ` +
          `needsReply=${counts.needsReply} spamReview=${counts.spamReview} hidden=${counts.autoHidden}`
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
