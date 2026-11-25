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
