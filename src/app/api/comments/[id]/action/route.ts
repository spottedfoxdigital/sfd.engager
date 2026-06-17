import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/meta/provider";

// Human actions from the inbox: send a (possibly edited) reply, like, dismiss,
// confirm spam, or mark not-spam.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action, body } = await req.json().catch(() => ({ action: "" }));

  const comment = await prisma.comment.findUnique({ where: { id }, include: { draft: true } });
  if (!comment) return NextResponse.json({ error: "not found" }, { status: 404 });

  const provider = getProvider();

  switch (action) {
    case "reply": {
      const message = (body ?? comment.draft?.body ?? "").trim();
      if (!message) return NextResponse.json({ error: "empty reply" }, { status: 400 });
      if (comment.externalId) await safe(() => provider.replyToComment(comment.externalId!, message));
      // Persist any edits the human made before sending.
      if (comment.draft) await prisma.draft.update({ where: { id: comment.draft.id }, data: { body: message } });
      await prisma.comment.update({ where: { id }, data: { status: "replied" } });
      await log(comment.accountId, id, "reply_sent", message.slice(0, 140));
      break;
    }
    case "like": {
      if (comment.externalId) await safe(() => provider.likeComment(comment.externalId!));
      await prisma.comment.update({ where: { id }, data: { liked: true, status: "auto_liked" } });
      await log(comment.accountId, id, "auto_like", "manual like");
      break;
    }
    case "dismiss": {
      await prisma.comment.update({ where: { id }, data: { status: "dismissed" } });
      await log(comment.accountId, id, "dismissed", null);
      break;
    }
    case "confirm_spam": {
      if (comment.externalId) await safe(() => provider.hideComment(comment.externalId!));
      await prisma.comment.update({ where: { id }, data: { status: "spam_hidden", spamLabel: "spam" } });
      await log(comment.accountId, id, "spam_confirmed", null);
      break;
    }
    case "not_spam": {
      await prisma.comment.update({ where: { id }, data: { status: "dismissed", spamLabel: "clean" } });
      await log(comment.accountId, id, "dismissed", "marked not spam");
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
