import { prisma } from "./prisma";
import { getProvider } from "./meta/provider";
import { classifyComment, draftReply } from "./ai";

// Words that should hold a comment back from auto-like even if its overall
// tone reads positive (per the rule: profanity/offensive is never auto-liked).
const OFFENSIVE = /\b(damn|hell|crap|wtf|sucks|stupid|idiot|hate|ugly)\b/i;

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/** Pull new comments from the provider and store any we haven't seen. */
export async function ingestComments(): Promise<number> {
  const provider = getProvider();
  const incoming = await provider.fetchNewComments();
  let created = 0;

  for (const c of incoming) {
    const account = await prisma.account.findFirst({
      where: {
        OR: [
          { id: c.accountExternalId },
          { handle: c.accountExternalId },
          { posts: { some: { externalId: c.postExternalId } } },
        ],
      },
    });
    if (!account) continue;

    // Find the post, or create a minimal record for it (live media/posts aren't
    // pre-seeded the way mock data is).
    let post = await prisma.post.findFirst({ where: { externalId: c.postExternalId } });
    if (!post) {
      post = await prisma.post.create({
        data: { accountId: account.id, externalId: c.postExternalId, caption: "" },
      });
    }

    // Dedupe by external id.
    const exists = await prisma.comment.findFirst({ where: { externalId: c.externalId } });
    if (exists) continue;

    await prisma.comment.create({
      data: {
        accountId: account.id,
        postId: post.id,
        externalId: c.externalId,
        authorName: c.authorName,
        authorHandle: c.authorHandle,
        text: c.text,
        commentedAt: c.commentedAt,
        status: "pending",
      },
    });
    created++;
  }
  return created;
}

export interface CommentCounts {
  processed: number;
  autoLiked: number;
  manualLike: number;
  autoHidden: number;
  needsReply: number;
  spamReview: number;
}

/**
 * Classify pending comments and apply the agreed rules:
 *  - clear spam        -> auto-hide (if autoHideSpam) else spam_review
 *  - unsure spam       -> spam_review
 *  - negative/question/offensive -> flag + AI-draft reply -> needs_reply
 *  - clean positive/neutral:
 *      Facebook  -> auto-like via API
 *      Instagram -> manual-like queue (IG API can't like comments)
 */
export async function processPendingComments(): Promise<CommentCounts> {
  const provider = getProvider();
  const pending = await prisma.comment.findMany({
    where: { status: "pending" },
    include: { account: true },
    take: 50,
  });

  const counts: CommentCounts = {
    processed: 0,
    autoLiked: 0,
    manualLike: 0,
    autoHidden: 0,
    needsReply: 0,
    spamReview: 0,
  };

  for (const comment of pending) {
    const { sentiment, spamLabel, reason } = await classifyComment(comment.text);
    const offensive = OFFENSIVE.test(comment.text);
    const account = comment.account;

    let status = "pending";
    let liked = false;
    let flagged = false;

    if (spamLabel === "spam") {
      if (account.autoHideSpam) {
        status = "spam_hidden";
        if (comment.externalId) await safe(() => provider.hideComment(comment.externalId!));
        await log(account.id, comment.id, "auto_hide_spam", reason);
        counts.autoHidden++;
      } else {
        status = "spam_review";
        await log(account.id, comment.id, "flag", "spam (auto-hide off)");
        counts.spamReview++;
      }
    } else if (spamLabel === "unsure") {
      status = "spam_review";
      flagged = true;
      await log(account.id, comment.id, "flag", "unsure spam — needs review");
      counts.spamReview++;
    } else if (sentiment === "negative" || sentiment === "question" || offensive) {
      status = "needs_reply";
      flagged = true;
      const { body, model } = await draftReply(comment.text, comment.authorName, voiceOf(account));
      await prisma.draft.upsert({
        where: { commentId: comment.id },
        create: { kind: "comment", commentId: comment.id, body, model },
        update: { body, model },
      });
      await log(account.id, comment.id, "draft", offensive ? "offensive — held from auto-like" : reason);
      counts.needsReply++;
    } else if (!account.autoLike) {
      status = "needs_reply";
    } else if (account.platform === "facebook") {
      // Facebook supports liking comments via the API.
      status = "auto_liked";
      liked = true;
      if (comment.externalId) await safe(() => provider.likeComment(comment.externalId!));
      await log(account.id, comment.id, "auto_like", reason);
      counts.autoLiked++;
    } else {
      // Instagram: no like endpoint — queue for a manual like in IG.
      status = "manual_like";
      flagged = true;
      await log(account.id, comment.id, "manual_like_queued", "IG positive — like manually");
      counts.manualLike++;
    }

    await prisma.comment.update({
      where: { id: comment.id },
      data: { sentiment, spamLabel, reason, flagged, liked, status, classifiedAt: new Date() },
    });
    counts.processed++;
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Direct messages
// ---------------------------------------------------------------------------

/** Pull new DM threads and store them (with their latest inbound message). */
export async function ingestDMs(): Promise<number> {
  const provider = getProvider();
  const incoming = await provider.fetchNewDMs();
  let created = 0;

  for (const d of incoming) {
    const account = await prisma.account.findFirst({
      where: { OR: [{ id: d.accountExternalId }, { handle: d.accountExternalId }] },
    });
    if (!account) continue;

    const existing = await prisma.conversation.findFirst({ where: { externalId: d.externalId } });
    if (existing) {
      // Append the new inbound message and re-open for processing.
      const msgExists = await prisma.message.findFirst({ where: { externalId: d.messageExternalId } });
      if (msgExists) continue;
      await prisma.message.create({
        data: { conversationId: existing.id, externalId: d.messageExternalId, fromUs: false, text: d.text, sentAt: d.sentAt },
      });
      await prisma.conversation.update({
        where: { id: existing.id },
        data: { lastMessageAt: d.sentAt, lastInboundAt: d.sentAt, status: "pending" },
      });
      created++;
      continue;
    }

    const conv = await prisma.conversation.create({
      data: {
        accountId: account.id,
        externalId: d.externalId,
        participantName: d.participantName,
        participantHandle: d.participantHandle,
        lastMessageAt: d.sentAt,
        lastInboundAt: d.sentAt,
        status: "pending",
      },
    });
    await prisma.message.create({
      data: { conversationId: conv.id, externalId: d.messageExternalId, fromUs: false, text: d.text, sentAt: d.sentAt },
    });
    created++;
  }
  return created;
}

export interface DMCounts {
  processed: number;
  needsReply: number;
  autoHidden: number;
  spamReview: number;
}

/** Classify pending DM threads and draft replies (DMs are never auto-liked). */
export async function processPendingDMs(): Promise<DMCounts> {
  const provider = getProvider();
  const pending = await prisma.conversation.findMany({
    where: { status: "pending" },
    include: { account: true, messages: { orderBy: { sentAt: "desc" }, take: 1 } },
    take: 50,
  });

  const counts: DMCounts = { processed: 0, needsReply: 0, autoHidden: 0, spamReview: 0 };

  for (const conv of pending) {
    const latest = conv.messages[0];
    if (!latest) continue;
    const { sentiment, spamLabel, reason } = await classifyComment(latest.text);
    const account = conv.account;

    let status = "open";
    let flagged = false;

    if (spamLabel === "spam") {
      status = account.autoHideSpam ? "spam_hidden" : "spam_review";
      await log(account.id, conv.id, account.autoHideSpam ? "auto_hide_spam" : "flag", reason);
      if (account.autoHideSpam) counts.autoHidden++;
      else counts.spamReview++;
    } else if (spamLabel === "unsure") {
      status = "spam_review";
      flagged = true;
      await log(account.id, conv.id, "flag", "unsure spam — needs review");
      counts.spamReview++;
    } else {
      // Everything else gets a drafted reply for the human to send.
      status = "needs_reply";
      flagged = sentiment === "negative" || sentiment === "question";
      const { body, model } = await draftReply(latest.text, conv.participantName, voiceOf(account), "dm");
      await prisma.draft.upsert({
        where: { conversationId: conv.id },
        create: { kind: "dm", conversationId: conv.id, body, model },
        update: { body, model },
      });
      await log(account.id, conv.id, "draft", reason);
      counts.needsReply++;
    }

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { sentiment, spamLabel, reason, flagged, status, classifiedAt: new Date() },
    });
    counts.processed++;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Combined sync (used by /api/sync and the worker)
// ---------------------------------------------------------------------------

export async function runSync() {
  const ingestedComments = await ingestComments();
  const comments = await processPendingComments();
  const ingestedDMs = await ingestDMs();
  const dms = await processPendingDMs();
  return { ingestedComments, comments, ingestedDMs, dms };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function voiceOf(account: {
  name: string;
  voiceTone: string | null;
  voiceDos: string | null;
  voiceDonts: string | null;
  bannedWords: string | null;
}) {
  return {
    accountName: account.name,
    tone: account.voiceTone,
    dos: account.voiceDos,
    donts: account.voiceDonts,
    bannedWords: account.bannedWords,
  };
}

async function log(accountId: string, targetId: string, action: string, detail?: string | null) {
  await prisma.actionLog.create({ data: { accountId, targetId, action, detail: detail ?? null } });
}

async function safe(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error("provider action failed:", err);
  }
}
