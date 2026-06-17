# SFD Engager — Meta App Review submission guide

App Review is what unlocks, on **live client accounts**:
- **Facebook Page comments** (currently blocked by the `pages_read_user_content` / Page Public Content Access gate)
- **Direct messages** (Facebook Messenger + Instagram)
- Using the app on accounts beyond your own / test users (production)

Instagram **comments** already work in Development Mode. Everything else needs the
permissions below moved to **Advanced Access** via App Review.

> Plan for time: review typically takes a few days to a few weeks, and Meta
> often comes back with one round of clarifications. Submit early.

---

## 0. Prerequisites (do these first)

App Review won't pass without these in place:

- [x] **Business verification** — already green on your app. ✅
- [ ] **App is Live** — flip the toggle from "In development" to "Live" (top of the dashboard). You can submit for review while in dev, but permissions only take effect once Live + approved.
- [ ] **Privacy Policy URL** — a public page describing what data you collect and why. Set it in **App settings → Basic → Privacy Policy URL**. (You can host a simple one on your site, e.g. `spottedfoxdigital.com/sfd-engager-privacy`.)
- [ ] **Data Deletion** — either a **Data Deletion Instructions URL** or callback, in **App settings → Basic**. A page explaining how a user requests deletion is enough.
- [ ] **App icon + category** — App settings → Basic (1024×1024 icon, category e.g. "Business and Pages").
- [ ] **App Domains / valid URLs** — `sfdengager-production.up.railway.app`.
- [ ] **Test access for reviewers** — Meta's reviewer must be able to log in. Provide the app URL + the team password (set a dedicated `APP_PASSWORD` and include it in the submission notes), and make sure a Facebook **test user or your own page** is connected so the reviewer sees the flow work.

---

## 1. Permissions & features to request (Advanced Access)

In **App Review → Permissions and Features**, request **Advanced Access** for each
of these. The "why" column is paste-ready justification text — tailor names as needed.

| Permission / Feature | Why you need it (paste & adapt) |
|---|---|
| `pages_show_list` | "List the Facebook Pages our agency manages so the user can select which client accounts to connect to the dashboard." |
| `pages_read_engagement` | "Read posts and engagement on the connected client Pages to display them in a unified moderation inbox." |
| `pages_read_user_content` | "Read comments left by the public on our clients' Facebook Page posts so our team can review, reply to, hide, and moderate them from one dashboard instead of logging into each Page separately." |
| `pages_manage_engagement` | "Like, reply to, and hide comments on our clients' Facebook Pages on their behalf as part of community management." |
| `pages_manage_metadata` | "Subscribe to Page webhooks so new comments and messages appear in the dashboard in real time." |
| `pages_messaging` | "Read and respond to Facebook Messenger conversations for our clients' Pages within Meta's 24-hour messaging window." |
| `instagram_basic` | "Read the connected Instagram Business account profile and media to associate comments and messages with the right client." |
| `instagram_manage_comments` | "Read, reply to, and hide comments on our clients' Instagram media as part of community management." |
| `instagram_manage_messages` | "Read and respond to Instagram direct messages for our clients within Meta's 24-hour messaging window." |
| `business_management` | "Access the Pages and Instagram accounts our agency manages through Business Manager so clients can be connected in bulk." |
| **Page Public Content Access** (feature) | Request only if you need to read content on Pages **not** managed in your Business Manager. For agency-managed client Pages, `pages_read_user_content` is usually sufficient — request this feature only if review feedback asks for it. |

> **Tip:** Request only what you'll demonstrate. If you're submitting comments
> first and DMs later, you can split: do the `pages_*` + `instagram_*comments`
> permissions now, and `*_messages` / `pages_messaging` in a second submission.

---

## 2. App description & use case (paste-ready)

Meta asks for an overall description of what the app does. Use something like:

> **SFD Engager** is an internal social media management tool used by Spotted Fox
> Digital, a marketing agency, to manage community engagement across our clients'
> Facebook Pages and Instagram Business accounts from a single dashboard. Our team
> reviews incoming comments and direct messages, replies to them on the client's
> behalf, hides spam, and likes positive comments. The app connects to client
> accounts via Facebook Login for Business with the account owner's consent, and
> all actions are performed by authorized agency staff. It replaces the slow
> process of logging into Meta Business Suite separately for each client.

---

## 3. Screencast (required for each permission)

Meta requires a screen recording showing a **Facebook user logging in and the
permission being used**. Record one clear walkthrough (3–5 min) covering:

1. **Login:** Open `sfdengager-production.up.railway.app`, log in, go to **Accounts**, click **Connect with Facebook**, and show the **Facebook Login for Business consent screen** where you grant the Pages/Instagram permissions.
2. **Comments (pages_read_user_content, instagram_manage_comments, pages/instagram manage):** Open the **Comments** inbox, show real comments appearing for a connected account, then demonstrate **replying** to a comment and **hiding** a spam comment (show the action completing).
3. **Likes (pages_manage_engagement):** Show liking a Facebook comment from the dashboard.
4. **DMs (pages_messaging, instagram_manage_messages):** Open the **Messages** inbox, show a conversation, and demonstrate **sending a reply** within the 24-hour window.
5. **Narration/captions:** Briefly state which permission each step uses ("This uses instagram_manage_comments to reply to the comment").

Record at readable resolution. Upload the video in the submission for each permission (you can reuse the same video across related permissions).

---

## 4. Submission steps

1. App dashboard → **App Review → Permissions and Features**.
2. For each permission in the table above, click **Request Advanced Access**.
3. Fill in the **usage description** (from §1) and attach the **screencast** (§3).
4. Complete **Data Handling Questions** (how you store/secure tokens & content — say tokens are stored encrypted server-side, content is only shown to authorized agency staff, and data is deleted on request).
5. Add **reviewer instructions**: the app URL, the login password, and "Click Connect with Facebook, approve the test Page, then open Comments and Messages."
6. Switch the app to **Live** (toggle, top of dashboard).
7. Click **Submit for Review**.

---

## 5. Common rejection reasons (avoid these)

- **Privacy policy missing or generic** — it must specifically mention Facebook/Instagram data.
- **Screencast doesn't show the login + the permission in action** — reviewers reject if they can't see the consent screen and the feature working.
- **Reviewer can't reproduce** — make sure the test login works and an account is connected so the inbox isn't empty.
- **Requesting permissions you don't demonstrate** — only request what the screencast shows.
- **Business verification incomplete** — already done for you. ✅

---

## 6. After approval

1. In Railway, make sure `META_PROVIDER=meta` (already set).
2. The previously-blocked data starts flowing on the next **Sync** (or via the background worker).
3. Re-run `/api/meta/diagnose` — the Facebook `pages_read_user_content` errors should be gone and `comments` counts should populate for Pages too.

Once approved, no code changes are needed — the app already implements all of these
flows; App Review just removes Meta's gate on live client data.
