import { NextResponse } from "next/server";
import { runSync } from "@/lib/process";

// "Sync now" — pulls new comments and DMs from the provider (mock) and runs the
// classification + automation pass. In production this runs continuously in the
// background worker; the button gives an on-demand trigger for the demo.
export async function POST() {
  const r = await runSync();
  return NextResponse.json({
    ingested: r.ingestedComments + r.ingestedDMs,
    // comments
    autoLiked: r.comments.autoLiked,
    manualLike: r.comments.manualLike,
    autoHidden: r.comments.autoHidden + r.dms.autoHidden,
    needsReply: r.comments.needsReply,
    spamReview: r.comments.spamReview + r.dms.spamReview,
    // dms
    dmsIngested: r.ingestedDMs,
    dmsNeedReply: r.dms.needsReply,
  });
}
