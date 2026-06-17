import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/meta/provider";

const WINDOW_MS = 24 * 60 * 60 * 1000;

// Human actions on a DM thread: send (possibly edited) reply, dismiss, confirm
// spam, or mark not-spam.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action, body } = await req.json().catch(() => ({ action: "" }));

  const conv = await prisma.conversation.findUnique({ where: { id }, include: { draft: true } });
  if (!conv) return NextResponse.json({ error: "not found" }, { status: 404 });

  const provider = getProvider();

  switch (action) {
    case "reply": {
      const message = (body ?? conv.draft?.body ?? "").trim();
      if (!message) return NextResponse.json({ error: "empty reply" }, { status: 400 });

      // Meta only lets us message freely within 24h of the last inbound message.
      const outsideWindow = Date.now() - conv.lastInboundAt.getTime() > WINDOW_MS;
      if (outsideWindow) {
        return NextResponse.json(
          { error: "window_closed", message: "Outside Meta's 24-hour reply window — a message tag is required to send." },
          { status: 422 }
        );
      }

      if (conv.externalId) await safe(() => provider.sendDM(conv.externalId!, message));
      // Record our outbound message in the thread.
      await prisma.message.create({ data: { conversationId: conv.id, fromUs: true, text: message } });
      if (conv.draft) await prisma.draft.update({ where: { id: conv.draft.id }, data: { body: message } });
      await prisma.conversation.update({ where: { id }, data: { status: "replied", lastMessageAt: new Date() } });
      await log(conv.accountId, id, "reply_sent", message.slice(0, 140));
      break;
    }
    case "dismiss": {
      await prisma.conversation.update({ where: { id }, data: { status: "dismissed" } });
      await log(conv.accountId, id, "dismissed", null);
      break;
    }
    case "confirm_spam": {
      await prisma.conversation.update({ where: { id }, data: { status: "spam_hidden", spamLabel: "spam" } });
      await log(conv.accountId, id, "spam_confirmed", null);
      break;
    }
    case "not_spam": {
      await prisma.conversation.update({ where: { id }, data: { status: "dismissed", spamLabel: "clean" } });
      await log(conv.accountId, id, "dismissed", "marked not spam");
      break;
    }
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

async function log(accountId: string, targetId: string, action: string, detail: string | null) {
  await prisma.actionLog.create({ data: { accountId, targetId, action, detail } });
}

async function safe(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error("provider action failed:", err);
  }
}
