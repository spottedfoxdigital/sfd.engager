import { NextResponse } from "next/server";
import crypto from "crypto";
import { runSync } from "@/lib/process";

// Meta webhook endpoint.
//
// GET  — subscription verification handshake (hub.challenge).
// POST — receives comment/message change notifications. We verify the
//        signature, then trigger a sync so the new content is pulled in and
//        classified. (A later optimization can fetch just the changed object.)

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();

  // Verify the payload signature when an app secret is configured.
  const secret = process.env.META_APP_SECRET;
  if (secret) {
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
    if (!safeEqual(signature, expected)) {
      return new NextResponse("invalid signature", { status: 401 });
    }
  }

  // Acknowledge fast (Meta requires a quick 200), then pull + classify.
  // Best-effort: don't fail the webhook if the sync errors.
  runSync().catch((err) => console.error("webhook-triggered sync failed:", err));

  return NextResponse.json({ received: true });
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
