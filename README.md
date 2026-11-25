# Pulmonologist

Dr. Ashraf Ahmed's AI agent for respiratory medicine. One installable, bilingual (English / العربية) app that combines:

- **Daily agent report**: a scheduled Claude agent checks every morning and publishes a report in four sections: **Websites** (your society and education sites), **Guidelines** (new or updated guidelines and statements), **Papers** (important new PubMed papers on your topics) and **Telegram** (important or interesting pulmonary posts discovered across public Telegram channels). Practice-changing items are starred.
- **Reports archive**: every report, with full-text search.
- **Live PubMed**: check now for new papers on your topics, a guideline watch, and any number of custom PubMed watches; a Claude briefing; "Explain" for any paper.
- **Guidelines, Conferences** (live countdowns), **Videos**, **People to follow**, **Books**, **Reading links**.
- **Ask**: chat with the agent; it searches PubMed live and cites PMIDs.
- **Saved**: bookmarked report items and papers, synced across devices.
- **Telegram bot**: the daily report is sent to your Telegram at 07:50 Riyadh, and you can chat with the agent there (`/today`, `/papers <topic>`, `/guidelines`, `/events`, or any question).

Live at https://my-ai-agent-coral.vercel.app. Install from the browser (Android "Install", iPhone Share → "Add to Home Screen", Chrome/Edge on a computer).

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Needed for |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Set. Syncs settings, lists and saved items across devices. |
| `APP_PIN` | Set. Required to change settings, use AI and send to Telegram; enter it in Settings. |
| `ANTHROPIC_API_KEY` | Briefings, Explain, Ask, suggestions, and Telegram questions. |
| `CLAUDE_MODEL` | Optional; defaults to `claude-sonnet-5-5`. |
| `NCBI_API_KEY` | Optional; faster PubMed. |
| `TELEGRAM_BOT_TOKEN` | Your bot from @BotFather. Then Settings → "Connect bot". |
| `TELEGRAM_CHAT_ID` | Your chat ID (the bot tells you when you send `/start`). Makes the bot private and enables the daily send. |

## Files

- `public/index.html`, `public/app.css`, `public/app.js` — the app (comment at the top of `app.js` explains how to add a section)
- `public/data.js` — starter lists (guidelines, conferences, videos, people, books, links, topics). Raise `PULMO_SEED_VERSION` after adding items so existing devices receive them.
- `public/data/config.json` — the agent's default tasks and websites
- `public/data/digests/` — daily reports written by the agent (format in [AGENT.md](AGENT.md))
- `api/state.js` — synced state · `api/pubmed.js`, `api/_pubmed.js` — PubMed · `api/claude.js`, `api/_claude.js` — Claude · `api/telegram.js` — Telegram bot, daily send (Vercel cron in `vercel.json`)
