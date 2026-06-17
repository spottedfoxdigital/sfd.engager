import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GRAPH = "https://graph.facebook.com/v21.0";

// Diagnostic: for each connected account, try the key Graph call and report
// how many items came back (or the exact error). Visit while logged in:
//   /api/meta/diagnose
async function tryJson(url: string) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.json();
  } catch (e) {
    return { error: { message: String(e instanceof Error ? e.message : e) } };
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  const accounts = await prisma.account.findMany({
    where: { connected: true, pageAccessToken: { not: null } },
  });

  const results = await Promise.all(
    accounts.map(async (a) => {
      const token = a.pageAccessToken!;
      // DM probe (conversations) — same for both platforms, via the Page.
      const dmPlatform = a.platform === "instagram" ? "&platform=instagram" : "";
      const dmRes = a.metaPageId
        ? await tryJson(`${GRAPH}/${a.metaPageId}/conversations?fields=id${dmPlatform}&limit=5&access_token=${token}`)
        : { error: { message: "no page id" } };
      const dms = dmRes.error ? { dmError: dmRes.error.message } : { dmThreads: (dmRes.data ?? []).length };

      if (a.platform === "instagram" && a.igUserId) {
        const r = await tryJson(`${GRAPH}/${a.igUserId}/media?fields=id,comments_count&limit=5&access_token=${token}`);
        if (r.error) return { name: a.name, platform: "instagram", error: r.error.message, ...dms };
        const media = r.data ?? [];
        const totalComments = media.reduce((s: number, m: { comments_count?: number }) => s + (m.comments_count ?? 0), 0);
        return { name: a.name, platform: "instagram", media: media.length, comments: totalComments, ...dms };
      }
      if (a.metaPageId) {
        const r = await tryJson(`${GRAPH}/${a.metaPageId}/posts?fields=id,comments.summary(true).limit(0)&limit=5&access_token=${token}`);
        if (r.error) return { name: a.name, platform: "facebook", error: r.error.message, ...dms };
        const posts = r.data ?? [];
        const totalComments = posts.reduce((s: number, p: { comments?: { summary?: { total_count?: number } } }) => s + (p.comments?.summary?.total_count ?? 0), 0);
        return { name: a.name, platform: "facebook", posts: posts.length, comments: totalComments, ...dms };
      }
      return { name: a.name, platform: a.platform, error: "no page/ig id stored", ...dms };
    })
  );

  return NextResponse.json({ connectedAccounts: accounts.length, results }, { status: 200 });
}
