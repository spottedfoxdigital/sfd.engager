import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CommentCard, { CommentCardData } from "@/components/CommentCard";

export const dynamic = "force-dynamic";

const TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: "needs_reply", label: "Needs reply", statuses: ["needs_reply"] },
  { key: "spam_review", label: "Spam review", statuses: ["spam_review"] },
  { key: "auto_liked", label: "Auto-liked", statuses: ["auto_liked"] },
  { key: "done", label: "Done", statuses: ["replied", "dismissed", "spam_hidden"] },
  { key: "all", label: "All", statuses: [] },
];

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; tab?: string }>;
}) {
  const { account, tab = "needs_reply" } = await searchParams;
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const where: Record<string, unknown> = {};
  if (account) where.accountId = account;
  if (activeTab.statuses.length) where.status = { in: activeTab.statuses };
  else where.status = { not: "pending" };

  const comments = await prisma.comment
    .findMany({
      where,
      include: { account: true, draft: true },
      orderBy: { commentedAt: "desc" },
      take: 100,
    })
    .catch(() => []);

  // Counts per tab for the badges.
  const counts: Record<string, number> = {};
  for (const t of TABS) {
    if (!t.statuses.length) continue;
    counts[t.key] = await prisma.comment
      .count({ where: { ...(account ? { accountId: account } : {}), status: { in: t.statuses } } })
      .catch(() => 0);
  }

  const accountName = account
    ? (await prisma.account.findUnique({ where: { id: account } }).catch(() => null))?.name
    : null;

  const cards: CommentCardData[] = comments.map((c) => ({
    id: c.id,
    authorName: c.authorName,
    authorHandle: c.authorHandle,
    text: c.text,
    accountName: c.account.name,
    platform: c.account.platform,
    sentiment: c.sentiment,
    spamLabel: c.spamLabel,
    reason: c.reason,
    status: c.status,
    liked: c.liked,
    draftBody: c.draft?.body ?? null,
  }));

  const qs = (t: string) => (account ? `?account=${account}&tab=${t}` : `?tab=${t}`);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="text-xl font-semibold text-zinc-900">
        {accountName ? `${accountName} — Inbox` : "Inbox — all accounts"}
      </h2>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/inbox${qs(t.key)}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              t.key === activeTab.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.label}
            {counts[t.key] ? <span className="ml-1.5 opacity-70">{counts[t.key]}</span> : null}
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {cards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400">
            Nothing here. Click <span className="font-medium text-zinc-600">Sync now</span> to pull in comments.
          </div>
        ) : (
          cards.map((c) => <CommentCard key={c.id} data={c} />)
        )}
      </div>
    </div>
  );
}
