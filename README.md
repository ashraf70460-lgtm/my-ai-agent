# My Agent — وكيلي

Dr. Ashraf Ahmed's personal AI agent app. A scheduled Claude agent checks respiratory societies (ATS, BTS, ERS, GINA, GOLD) and chosen Telegram channels every morning and publishes a bilingual digest here.

- **Today** — latest digest per task, practice-changing items marked ⭐
- **Archive** — every past digest, full-text search
- **Saved** — bookmarked items (synced across devices)
- **Tasks** — tasks and their sources; add/remove sources, add new tasks
- **Settings** — English / العربية, light/dark, install as app, edit PIN

## Stack

Plain HTML/CSS/JS (no build step) in `public/`, one Vercel Function `api/state.js` storing editable state in Vercel Blob. Installable PWA (phone home screen, Windows/Mac desktop via Chrome/Edge "Install app").

## Configuration (Vercel → Project → Settings → Environment Variables)

| Variable | Purpose |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Added automatically when the Blob store is connected |
| `APP_PIN` | PIN required to change tasks/sources from the app |

## How the agent publishes

See [AGENT.md](AGENT.md).

---

# Pulmonologist — `/pulmonologist/`

A second app in this repo: an AI agent for respiratory medicine. It reads PubMed for new papers and guidelines on your topics, writes a briefing with Claude, and keeps conferences (with countdowns), videos, people to follow, books, websites and Telegram channels in one place. English / العربية, installable as an app (Android, iPhone "Add to Home Screen", Windows/Mac via Chrome/Edge "Install").

Open it at **`https://<your-domain>/pulmonologist/`**.

## Sections
Today (briefing, top papers, next events) · **Tasks** (the agent's jobs — topic watch, guideline watch, and any number of custom PubMed watches you add) · Papers · Guidelines · Conferences · Videos · People · Books · Sources & Telegram · Ask (chat that can search PubMed live).

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Needed for |
|---|---|
| `ANTHROPIC_API_KEY` | Briefings, “Explain”, “Ask the agent”, suggestions. Without it, PubMed papers and all lists still work. |
| `CLAUDE_MODEL` | Optional. Defaults to `claude-sonnet-5-5`. |
| `NCBI_API_KEY` | Optional. Faster PubMed (free key from your NCBI account). |
| `APP_PIN` | Already used by My Agent. If set, enter it in Pulmonologist → Settings to use AI and sync. |
| `BLOB_READ_WRITE_TOKEN` | Already set. Syncs Pulmonologist settings across devices (`state/pulmonologist.json`). |

## Files
- `public/pulmonologist/index.html` — page layout
- `public/pulmonologist/app.css` — styles
- `public/pulmonologist/app.js` — app logic (see the comment at the top for adding a new section)
- `public/pulmonologist/data.js` — starter lists (guidelines, conferences, videos, people, books, sources, topics). Raise `PULMO_SEED_VERSION` after adding items so existing devices receive them.
- `api/pubmed.js`, `api/_pubmed.js` — PubMed (NCBI E-utilities)
- `api/claude.js` — Claude, with a `pubmed_search` tool
- `api/pulmo-state.js` — cross-device sync
