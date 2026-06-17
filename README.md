# SFD Engager

A unified dashboard for managing engagement across all your Facebook & Instagram
client accounts — one inbox instead of switching between accounts in Meta
Business Suite.

It pulls in comments (and, in a later phase, DMs), and:

- **Auto-likes** clean, positive/neutral comments.
- **Auto-hides** clear spam, and routes borderline spam to a **review** queue.
- **Flags** complaints, questions, and offensive comments, and **AI-drafts a
  reply** in each client's brand voice for you to **Send / Edit / Dismiss**.

Every automatic action is recorded in an audit log, so nothing happens invisibly.

---

## Status: scaffold + comments vertical slice

This is the first deliverable — the full app skeleton plus the **comments
workflow working end-to-end against mock data**. It's deliberately runnable
today, before any Meta approval, so you can see and feel the workflow.

**What works now**

- Shared-password login (small team, same access).
- A "Sync now" button that ingests mock comments and runs the classification +
  automation pass.
- Inbox with tabs: **Needs reply / Spam review / Auto-liked / Done / All**,
  filterable per account.
- Per-account brand-voice + automation settings (seeded; read-only this phase).
- Claude-powered spam + sentiment classification (Haiku 4.5) and reply drafting
  (Sonnet 4.6), with built-in heuristic fallbacks so it runs without an API key.

**What's stubbed for the next phases**

- The live Meta Graph API provider (currently `mock`).
- DM ingestion + drafting (needs Meta App Review — see below).
- Editable brand-voice settings + "seed voice from past posts".
- Background worker on a real queue (BullMQ/Redis) + Meta webhooks.

---

## Tech stack

- **Next.js 15** (App Router) — UI + API routes
- **PostgreSQL + Prisma** — data store
- **Anthropic Claude** — classification (`claude-haiku-4-5`) + drafting (`claude-sonnet-4-6`)
- A **provider abstraction** (`src/lib/meta/`) with a Mock implementation today and a
  live Meta implementation later — flip `META_PROVIDER` to switch.
- A **background worker** (`worker/index.ts`) for continuous processing.

---

## Local development

Requires Node 20+ and a PostgreSQL database.

```bash
cp .env.example .env        # then fill in DATABASE_URL, APP_PASSWORD, AUTH_SECRET
npm install
npm run db:push             # create tables
npm run db:seed             # seed 3 sample accounts + posts
npm run dev                 # http://localhost:3000
```

Log in with the `APP_PASSWORD` you set, then click **Sync now** a few times to
pull in mock comments and watch them get classified, liked, hidden, or drafted.

Set `ANTHROPIC_API_KEY` to use real Claude classification/drafting; leave it
unset to use the heuristic fallbacks.

To run the continuous worker instead of clicking Sync:

```bash
npm run worker
```

---

## Deploying to Railway

1. Create a new Railway project from this repo.
2. Add the **PostgreSQL** plugin — it sets `DATABASE_URL` automatically.
3. Set environment variables (see `.env.example`): `APP_PASSWORD`, `AUTH_SECRET`,
   and optionally `ANTHROPIC_API_KEY`.
4. The web service uses `railway.json` (`npm run build` / `npm run start`,
   health check at `/api/health`).
5. After the first deploy, run `npm run db:push` and `npm run db:seed` once
   (Railway shell or a one-off command).
6. **Optional — background worker:** add a second service from the same repo with
   start command `npm run worker` so processing runs continuously.

---

## Meta integration — what's needed to go live

The dashboard is fully usable in mock mode now. To connect real accounts:

1. **Create a Meta Developer App** (developers.facebook.com) with the
   *Instagram Graph API* and *Facebook Login* products.
2. Ensure each client's **Instagram account is a Business/Creator account
   connected to a Facebook Page**.
3. Request these permissions and submit for **App Review**:
   - `pages_show_list`, `pages_read_engagement`, `pages_manage_engagement`
     (read + like + reply to comments)
   - `instagram_basic`, `instagram_manage_comments`
   - `instagram_manage_messages` (DMs — **this one gates the DM features**)
4. Set up **webhooks** for comments and messages.
5. Implement the live provider (`src/lib/meta/meta.ts`) against the
   `MetaProvider` interface and set `META_PROVIDER=meta`.

> Note: DMs cannot work against the live API until App Review approves
> `instagram_manage_messages`, and Meta enforces a **24-hour reply window** for
> messaging. Comments/likes have lighter requirements.

---

## Project layout

```
prisma/schema.prisma        Data model (accounts, posts, comments, drafts, logs, DMs stub)
prisma/seed.ts              Sample accounts + posts
src/lib/prisma.ts           Prisma client
src/lib/auth.ts             Shared-password cookie auth
src/lib/ai.ts               Claude classification + drafting (+ heuristic fallback)
src/lib/meta/provider.ts    Provider interface + selector
src/lib/meta/mock.ts        Mock provider (sample comment pool)
src/lib/process.ts          Ingestion + classification + automation rules
src/app/(dashboard)/        Inbox + Accounts UI
src/app/api/                sync, login, health, per-comment actions
worker/index.ts             Background processing loop
```
