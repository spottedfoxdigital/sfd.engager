import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DMCard, { DMCardData } from "@/components/DMCard";

export const dynamic = "force-dynamic";

const WINDOW_MS = 24 * 60 * 60 * 1000;

const TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: "needs_reply", label: "Needs reply", statuses: ["needs_reply"] },
  { key: "spam_review", label: "Spam review", statuses: ["spam_review"] },
  { key: "done", label: "Done", statuses: ["replied", "dismissed", "spam_hidden"] },
  { key: "all", label: "All", statuses: [] },
];

export default async function MessagesPage({
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

  const conversations = await prisma.conversation
    .findMany({
      where,
      include: { account: true, draft: true, messages: { orderBy: { sentAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    })
    .catch(() => []);

  const counts: Record<string, number> = {};
  for (const t of TABS) {
    if (!t.statuses.length) continue;
    counts[t.key] = await prisma.conversation
      .count({ where: { ...(account ? { accountId: account } : {}), status: { in: t.statuses } } })
      .catch(() => 0);
  }

  const cards: DMCardData[] = conversations.map((c) => ({
    id: c.id,
    participantName: c.participantName,
    participantHandle: c.participantHandle,
    accountName: c.account.name,
    platform: c.account.platform,
    sentiment: c.sentiment,
    spamLabel: c.spamLabel,
    reason: c.reason,
    status: c.status,
    draftBody: c.draft?.body ?? null,
    messages: c.messages.map((m) => ({ fromUs: m.fromUs, text: m.text })),
    windowOpen: Date.now() - c.lastInboundAt.getTime() <= WINDOW_MS,
  }));

  const qs = (t: string) => (account ? `?account=${account}&tab=${t}` : `?tab=${t}`);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="text-xl font-semibold text-zinc-900">Direct messages</h2>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/messages${qs(t.key)}`}
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
            No messages here. Click <span className="font-medium text-zinc-600">Sync now</span> to pull
            in DMs.
          </div>
        ) : (
          cards.map((c) => <DMCard key={c.id} data={c} />)
        )}
      </div>
    </div>
  );
}
