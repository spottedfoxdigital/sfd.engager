import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/baseUrl";

const GRAPH = "https://graph.facebook.com/v21.0";

// Handles the Facebook Login redirect: exchanges the code for a token, lists
// the user's Pages (and their connected Instagram Business accounts), and
// upserts an Account row per Page with a long-lived page access token.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = getBaseUrl(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("meta_oauth_state="))
    ?.split("=")[1];

  if (!code) return redirectToAccounts(base, "error=missing_code");
  if (!state || state !== cookieState) return redirectToAccounts(base, "error=bad_state");

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return redirectToAccounts(base, "error=not_configured");

  const redirectUri = `${base}/api/meta/oauth/callback`;

  try {
    // 1. Code -> short-lived user token
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    ).then((r) => r.json());
    const userToken = tokenRes.access_token;
    if (!userToken) throw new Error(JSON.stringify(tokenRes));

    // 2. Exchange for a long-lived token
    const longLived = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`
    ).then((r) => r.json());
    const longUserToken = longLived.access_token ?? userToken;

    // 3. List Pages + connected IG business accounts
    const pages = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username},picture&access_token=${longUserToken}`
    ).then((r) => r.json());

    for (const page of pages.data ?? []) {
      // Upsert a Facebook account for the Page.
      await upsertAccount({
        name: page.name,
        platform: "facebook",
        handle: page.id,
        metaPageId: page.id,
        pageAccessToken: page.access_token,
        avatarUrl: page.picture?.data?.url ?? null,
      });

      // If the Page has a connected IG Business account, upsert that too.
      const ig = page.instagram_business_account;
      if (ig?.id) {
        await upsertAccount({
          name: ig.username ? `@${ig.username}` : page.name,
          platform: "instagram",
          handle: ig.username ?? ig.id,
          metaPageId: page.id,
          igUserId: ig.id,
          pageAccessToken: page.access_token,
          avatarUrl: page.picture?.data?.url ?? null,
        });
      }
    }
  } catch (err) {
    console.error("meta oauth callback failed:", err);
    return redirectToAccounts(base, "error=exchange_failed");
  }

  return redirectToAccounts(base, "connected=1");
}

async function upsertAccount(data: {
  name: string;
  platform: string;
  handle: string;
  metaPageId: string;
  igUserId?: string;
  pageAccessToken: string;
  avatarUrl: string | null;
}) {
  const existing = await prisma.account.findFirst({
    where: {
      platform: data.platform,
      OR: [{ metaPageId: data.metaPageId }, ...(data.igUserId ? [{ igUserId: data.igUserId }] : [])],
    },
  });
  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { pageAccessToken: data.pageAccessToken, connected: true, name: data.name, avatarUrl: data.avatarUrl },
    });
  } else {
    await prisma.account.create({
      data: {
        name: data.name,
        platform: data.platform,
        handle: data.handle,
        metaPageId: data.metaPageId,
        igUserId: data.igUserId,
        pageAccessToken: data.pageAccessToken,
        avatarUrl: data.avatarUrl,
        connected: true,
      },
    });
  }
}

function redirectToAccounts(origin: string, query: string) {
  return NextResponse.redirect(`${origin}/accounts?${query}`);
}
