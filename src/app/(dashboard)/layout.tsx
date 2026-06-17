import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SyncButton from "@/components/SyncButton";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const accounts = await prisma.account
    .findMany({ orderBy: { name: "asc" }, include: { _count: { select: { comments: { where: { status: { in: ["needs_reply", "spam_review"] } } } } } } })
    .catch(() => []);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white p-4">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-zinc-900">SFD Engager</h1>
          <p className="text-xs text-zinc-400">Unified FB &amp; IG inbox</p>
        </div>

        <SyncButton />

        <nav className="mt-6 space-y-1">
          <Link href="/inbox" className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            Inbox
          </Link>
          <Link href="/accounts" className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            Accounts
          </Link>
        </nav>

        <div className="mt-6 flex-1 overflow-y-auto">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Accounts</p>
          <div className="mt-2 space-y-1">
            <Link href="/inbox" className="block rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100">
              All accounts
            </Link>
            {accounts.map((a) => (
              <Link
                key={a.id}
                href={`/inbox?account=${a.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
              >
                <span className="truncate">{a.name}</span>
                {a._count.comments > 0 && (
                  <span className="ml-2 rounded-full bg-zinc-900 px-1.5 text-xs text-white">{a._count.comments}</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-zinc-200 pt-4">
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-zinc-50">{children}</main>
    </div>
  );
}
