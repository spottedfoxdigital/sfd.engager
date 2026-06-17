import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } }).catch(() => []);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="text-xl font-semibold text-zinc-900">Accounts</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Brand voice &amp; automation per client. (Editable settings land in the next phase — values
        shown are seeded.)
      </p>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-zinc-900">Connect Facebook &amp; Instagram</h3>
            <p className="text-sm text-zinc-500">
              Link your clients&apos; Facebook Pages and connected Instagram Business accounts.
            </p>
          </div>
          <a
            href="/api/meta/oauth/start"
            className="rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Connect with Facebook
          </a>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Requires the Meta Developer App to be set up and approved — see <code>META_SETUP.md</code>.
          Until then this runs in mock mode with the sample accounts below.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-medium text-zinc-900">
                  {a.name}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.connected ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {a.connected ? "Connected" : "Mock"}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  {a.platform} · @{a.handle}
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className={`rounded-full px-2 py-1 ${a.autoLike ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                  Auto-like {a.autoLike ? "on" : "off"}
                </span>
                <span className={`rounded-full px-2 py-1 ${a.autoHideSpam ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                  Auto-hide spam {a.autoHideSpam ? "on" : "off"}
                </span>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Tone</dt>
                <dd className="text-zinc-700">{a.voiceTone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Banned words</dt>
                <dd className="text-zinc-700">{a.bannedWords ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Do</dt>
                <dd className="text-zinc-700">{a.voiceDos ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Don&apos;t</dt>
                <dd className="text-zinc-700">{a.voiceDonts ?? "—"}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
