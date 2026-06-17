import { NextResponse } from "next/server";
import { ingestComments, processPending } from "@/lib/process";

// "Sync now" — pulls new comments from the provider (mock) and runs the
// classification + automation pass. In production this work runs continuously
// in the background worker; the button gives an on-demand trigger for the demo.
export async function POST() {
  const ingested = await ingestComments();
  const counts = await processPending();
  return NextResponse.json({ ingested, ...counts });
}
