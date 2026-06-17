# Connecting real Facebook & Instagram accounts (Meta setup)

The app ships in **mock mode** (`META_PROVIDER=mock`) so you can use the full
workflow before any Meta approval. To connect real accounts, work through this
once. Budget time for **App Review** — it's the long pole (days to weeks),
especially for DMs.

## Prerequisites (per client account)

- Each client's **Instagram** account must be a **Business or Creator** account.
- That IG account must be **connected to a Facebook Page**.
- You (or the client) must grant your team **admin access** to the Page, ideally
  through a **Meta Business Manager** that holds all the client Pages.

## 1. Create a Meta Developer App

1. Go to **developers.facebook.com** → **My Apps** → **Create App**.
2. Type: **Business**.
3. Add products: **Facebook Login** and **Instagram Graph API** (and **Webhooks**).
4. Note your **App ID** and **App Secret** (Settings → Basic).

## 2. Configure OAuth

1. **Facebook Login → Settings → Valid OAuth Redirect URIs**, add:
   `https://YOUR-DOMAIN/api/meta/oauth/callback`
   (e.g. your `*.up.railway.app` URL, and `http://localhost:3000/...` for local).
2. Set these env vars on the app:
   - `META_PROVIDER=meta`
   - `META_APP_ID=...`
   - `META_APP_SECRET=...`
   - `META_VERIFY_TOKEN=...` (any random string you choose; used for webhooks)

## 3. Request permissions (App Review)

In **App Review → Permissions and Features**, request and submit for:

| Permission | Used for |
|---|---|
| `pages_show_list` | list the Pages you manage |
| `pages_read_engagement` | read Page posts & comments |
| `pages_manage_engagement` | like / reply / hide Facebook comments |
| `instagram_basic` | read IG account + media |
| `instagram_manage_comments` | read / reply / hide IG comments |
| `instagram_manage_messages` | **DMs** — read & send Instagram DMs |
| `pages_messaging` | Messenger DMs |
| `business_management` | manage assets via Business Manager |

> While in **Development mode**, these work for users with a role on the app
> (admins/testers/developers) without review — great for testing. Public use of
> the client accounts requires the app to be **Live** and the permissions
> **approved**.

## 4. Set up webhooks (real-time)

1. **Webhooks** product → add callback URL:
   `https://YOUR-DOMAIN/api/meta/webhook` and your `META_VERIFY_TOKEN`.
2. Subscribe the **Page** to the `feed` field (Facebook comments) and the
   **Instagram** object to `comments` and `messages`.

The app verifies the handshake and validates the `X-Hub-Signature-256` header
automatically.

## 5. Connect accounts in the app

1. Set `META_PROVIDER=meta` and the env vars above; redeploy.
2. In the app → **Accounts** → **Connect with Facebook**.
3. Approve the Pages/IG accounts. Each Page (and its connected IG account) is
   added as a connected account with a long-lived token.
4. Click **Sync now** (or let the background worker run) — real comments and DMs
   start flowing.

## Important real-world limits

- **Instagram comments can't be liked via the API** — only replied to, hidden,
  or deleted. The app routes positive IG comments to a **Manual like (IG)** queue
  so you can like them by hand. Facebook comments are liked automatically.
- **DMs have a 24-hour window** — you can only send a normal reply within 24h of
  the person's last message. The app disables sending past that window (a
  "message tag" would be required).
- **Rate limits** apply to likes/replies; the worker should pace actions to stay
  well under them.
