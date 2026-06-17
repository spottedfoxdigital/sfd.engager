import { prisma } from "./prisma";
import { getProvider } from "./meta/provider";
import { classifyComment, draftReply } from "./ai";

// Words that should hold a comment back from auto-like even if its overall
// tone reads positive (per the rule: profanity/offensive is never auto-liked).
const OFFENSIVE = /\b(damn|hell|crap|wtf|sucks|stupid|idiot|hate|ugly)\b/i;

/**
 * Pull new comments from the provider (mock today) and store any we haven't
 * seen. Returns the number of newly ingested comments.
 */
export async function ingestComments(): Promise<number> {
  const provider = getProvider();
  const incoming = await provider.fetchNewComments();
  let created = 0;

  for (const c of incoming) {
    const account = await prisma.account.findFirst({
      where: { OR: [{ id: c.accountExternalId }, { handle: c.accountExternalId }, { posts: { some: { externalId: c.postExternalId } } }] },
    });
    const post = await prisma.post.findFirst({ where: { externalId: c.postExternalId } });
    if (!account || !post) continue;

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

/**
 * Classify every pending comment and apply the agreed automation rules:
 *  - clear spam        -> auto-hide (if account.autoHideSpam) else spam_review
 *  - unsure spam       -> spam_review (ask the human)
 *  - negative/question/offensive -> flag + AI-draft a reply -> needs_reply
 *  - clean positive/neutral      -> auto-like (if account.autoLike)
 * Returns counts for a quick summary.
 */
export async function processPending(): Promise<{
  processed: number;
  autoLiked: number;
  autoHidden: number;
  needsReply: number;
  spamReview: number;
}> {
  const provider = getProvider();
  const pending = await prisma.comment.findMany({
    where: { status: "pending" },
    include: { account: true },
    take: 50,
  });

  const counts = { processed: 0, autoLiked: 0, autoHidden: 0, needsReply: 0, spamReview: 0 };

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
      // Flagged for a human reply — draft something for them to Send/Edit.
      status = "needs_reply";
      flagged = true;
      const { body, model } = await draftReply(comment.text, comment.authorName, {
        accountName: account.name,
        tone: account.voiceTone,
        dos: account.voiceDos,
        donts: account.voiceDonts,
        bannedWords: account.bannedWords,
      });
      await prisma.draft.upsert({
        where: { commentId: comment.id },
        create: { kind: "comment", commentId: comment.id, body, model },
        update: { body, model },
      });
      await log(account.id, comment.id, "draft", offensive ? "offensive — held from auto-like" : reason);
      counts.needsReply++;
    } else {
      // Clean, positive/neutral -> safe to auto-like.
      if (account.autoLike) {
        status = "auto_liked";
        liked = true;
        if (comment.externalId) await safe(() => provider.likeComment(comment.externalId!));
        await log(account.id, comment.id, "auto_like", reason);
        counts.autoLiked++;
      } else {
        status = "needs_reply";
      }
    }

    await prisma.comment.update({
      where: { id: comment.id },
      data: { sentiment, spamLabel, reason, flagged, liked, status, classifiedAt: new Date() },
    });
    counts.processed++;
  }

  return counts;
}

async function log(accountId: string, targetId: string, action: string, detail?: string) {
  await prisma.actionLog.create({ data: { accountId, targetId, action, detail } });
}

async function safe(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error("provider action failed:", err);
  }
}
