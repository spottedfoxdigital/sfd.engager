import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseUrl";

// Kicks off Facebook Login so the user can connect their Pages / IG accounts.
// Requires META_APP_ID. Until the Meta Developer App exists, this returns a
// helpful message instead of redirecting.
export async function GET(req: Request) {
  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json(
      {
        error: "not_configured",
        message:
          "Set META_APP_ID / META_APP_SECRET and complete the Meta Developer App setup (see META_SETUP.md) to connect real accounts.",
      },
      { status: 503 }
    );
  }

  const redirectUri = `${getBaseUrl(req)}/api/meta/oauth/callback`;
  const state = crypto.randomUUID();

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");

  const configId = process.env.META_LOGIN_CONFIG_ID;
  if (configId) {
    // Facebook Login for Business: permissions come from the saved
    // configuration, NOT a scope list. Sending scopes triggers "Invalid Scopes".
    url.searchParams.set("config_id", configId);
  } else {
    // Classic Facebook Login fallback (non-Business apps).
    const scopes = [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_engagement",
      "pages_manage_metadata",
      "business_management",
      "instagram_basic",
      "instagram_manage_comments",
      "instagram_manage_messages",
      "pages_messaging",
    ].join(",");
    url.searchParams.set("scope", scopes);
  }

  const res = NextResponse.redirect(url.toString());
  // Store state in a short-lived cookie for CSRF protection on callback.
  res.cookies.set("meta_oauth_state", state, { httpOnly: true, maxAge: 600, path: "/" });
  return res;
}
