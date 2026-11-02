# Operations

The Russian [`README.md`](../README.md) has the step-by-step setup (local, own VPS, Vercel). This page
is the short technical reference.

## Environments

| Where | Database | Files | Notes |
|---|---|---|---|
| Local | PostgreSQL 16, `DATABASE_URL` from `.env` | `UPLOAD_DIR` on disk | `npm run dev` |
| Vercel (production) | Neon | Vercel Blob | build runs `prisma migrate deploy && next build` |
| Own VPS | PostgreSQL in Docker | disk volume | Caddy terminates HTTPS, nightly backups at 03:00 kept 14 days |

Production is **www.codov.uz** on Vercel.

## Environment variables

| Name | Used for |
|---|---|
| `DATABASE_URL` | Postgres connection (pooled on Vercel) |
| `SESSION_SECRET` | signs the session cookie — rotating it logs everyone out |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI review of submissions |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_CHANNEL` | The gift bot (optional, see below) |
| `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID` | Vercel Blob uploads |
| `UPLOAD_DIR` | upload folder when not on Vercel |
| `GOOGLE_SITE_VERIFICATION` | Search Console meta tag |

A local `.env.neon` (never committed, never printed) holds the production connection string for
one-off maintenance scripts.

## Branches and releases

- `main` — what is live. Pushing to it triggers a Vercel production deploy.
- `landing-demo` — the working branch; Vercel builds a preview URL for it.

Release:

```powershell
git checkout main; if ($?) { git pull --ff-only origin main }; if ($?) { git merge --ff-only landing-demo }; if ($?) { git push origin main }; git checkout landing-demo
```

PowerShell 5.1 has no `&&`, hence the `if ($?)` chain.

Deploy status for a commit:

```bash
curl -s https://api.github.com/repos/Sokhibjonow/codov/commits/<sha>/status
```

## Migrations on a live database

`prisma migrate deploy` runs as part of the build, before the new code serves traffic. Keep changes
additive (new tables, new columns with defaults); anything destructive needs its own data migration
step and a separate release.

## Scripts

| Command | What it does |
|---|---|
| `npm run create-admin -- [login] [name]` | create the teacher account or reset its password (prints the password once) |
| `npm run move-to-vercel -- --yes` | copy local data (courses, users, submissions, files) to Neon + Blob |
| `scripts/copy-monaco.mjs` | runs on `postinstall`, copies the editor assets into `public/monaco` |
| `scripts/pack-for-server.ps1` | builds the `to-server` bundle for the VPS deployment |

Course content is imported by scripts kept with the content, outside this repository — see
[content-pipeline.md](content-pipeline.md).

## Health and backups

- `GET /api/health` — liveness check.
- Neon keeps point-in-time history; the VPS setup writes nightly dumps to `data/backups`.
- The course sources (lesson texts, model solutions, handouts, layouts) live only on the teacher's
  machine — they are the one thing without an automatic copy.


## Telegram gift bot

The first stop after a video. The bot works only for subscribers of the Telegram channel
(`TELEGRAM_CHANNEL`, default `@codovvv`, checked with getChatMember on every action).
Then the viewer gets the PDF promised in the video and,
from the menu under the input field («Sovg‘alar», «Bepul darslar», «Onlayn guruh», «Savol berish»),
goes to the free lessons on the site (`/register?kurs=start|js`), the channel or the online group
(`src/app/api/telegram/webhook/route.ts`). A deep link `t.me/<bot>?start=<video>` records which video brought
the person (`BotUser.source`); `giftForSource` in `src/lib/gifts.ts` picks the PDF (`js…`/`viral…` →
JavaScript cheat sheet, anything else → the 30-day plan; a bare /start — typed after a Short — gets both).
The PDFs live in `public/sovga`. Everyone who pressed Start is listed on /admin/leads.

1. @BotFather → /newbot → copy the token.
2. Vercel env (Production): `TELEGRAM_BOT_TOKEN`. Optional: `TELEGRAM_CHANNEL` (default `@codovvv`),
   `TELEGRAM_WEBHOOK_SECRET` (otherwise derived from the token).
   Make the bot an **administrator** of the channel — without that Telegram won't tell it who is subscribed and
   the check lets everyone through (/admin/leads shows a red warning).
3. Redeploy, then /admin/leads → «Botni ulash»: sets the webhook, the command menu and the bot's description.
