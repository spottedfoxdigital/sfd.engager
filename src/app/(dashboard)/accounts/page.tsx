import { prisma } from "@/lib/prisma";
import AccountSettings, { AccountSettingsData } from "@/components/AccountSettings";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; pages?: string; ig?: string; error?: string; detail?: string }>;
}) {
  const sp = await searchParams;
  const accounts = await prisma.account
    .findMany({ orderBy: [{ metaPageId: "asc" }, { platform: "asc" }, { name: "asc" }] })
    .catch(() => []);

  let banner: { tone: "ok" | "warn" | "err"; text: string } | null = null;
  if (sp.connected) {
    banner = { tone: "ok", text: `Connected ${sp.pages ?? "?"} Page(s) and ${sp.ig ?? "0"} Instagram account(s). Click "Sync now" to pull in comments & DMs.` };
  } else if (sp.error === "no_pages") {
    banner = { tone: "warn", text: "Authorization succeeded, but Facebook returned no Pages. Make sure the account you logged in with is an admin of a Facebook Page (with an Instagram Business account linked), and that you selected that Page during login." };
  } else if (sp.error === "graph") {
    banner = { tone: "err", text: `Facebook API error: ${sp.detail ?? "unknown"}` };
  } else if (sp.error === "exchange_failed") {
    banner = { tone: "err", text: `Token exchange failed: ${sp.detail ?? "unknown"}` };
  } else if (sp.error) {
    banner = { tone: "err", text: `Connection error: ${sp.error}` };
  }

  const bannerStyle =
    banner?.tone === "ok"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : banner?.tone === "warn"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-red-50 text-red-800 border-red-200";

  const cards: AccountSettingsData[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    platform: a.platform,
    handle: a.handle,
    connected: a.connected,
    voiceTone: a.voiceTone,
    voiceDos: a.voiceDos,
    voiceDonts: a.voiceDonts,
    bannedWords: a.bannedWords,
    autoLike: a.autoLike,
    autoHideSpam: a.autoHideSpam,
  }));

  const connectedCount = cards.filter((c) => c.connected).length;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="text-xl font-semibold text-zinc-900">Accounts</h2>
      {banner && <div className={`mt-3 rounded-lg border px-4 py-3 text-sm ${bannerStyle}`}>{banner.text}</div>}
      <p className="mt-1 text-sm text-zinc-500">
        {accounts.length} account(s){connectedCount > 0 ? ` · ${connectedCount} connected` : ""}. Set each
        client&rsquo;s brand voice so AI replies sound like them.
      </p>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-zinc-900">Connect Facebook &amp; Instagram</h3>
            <p className="text-sm text-zinc-500">Link more Facebook Pages and connected Instagram Business accounts.</p>
          </div>
          <a href="/api/meta/oauth/start" className="rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Connect with Facebook
          </a>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {cards.map((a) => (
          <AccountSettings key={a.id} account={a} />
        ))}
      </div>
    </div>
  );
}
