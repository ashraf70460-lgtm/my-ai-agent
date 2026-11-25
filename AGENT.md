# Agent instructions — how a scheduled run publishes into the app

The app is a static site. Each agent run **adds a digest file and updates the index**, then commits and pushes to `main`. Vercel redeploys automatically within ~1 minute.

## 1. Read the current sources

Tasks and sources the user edits in the app live at `https://<app-domain>/api/state` (JSON: `{ "state": { "tasks": [...] } }`).
If that returns `state: null` or fails, fall back to `public/data/config.json` in this repo.
Only use sources of tasks with `"enabled": true`.

## 2. Write the digest file

Path: `public/data/digests/<YYYY-MM-DD>-<taskId>.json` (Riyadh date). Shape:

```json
{
  "id": "2026-11-26-daily-digest",
  "date": "2026-11-26",
  "taskId": "daily-digest",
  "generatedAt": "2026-11-26T03:40:00Z",
  "title":   { "en": "One-line headline of the day", "ar": "عنوان اليوم في سطر واحد" },
  "topPick": { "en": "…", "ar": "…" },
  "sections": [
    {
      "sourceId": "gold",
      "source": "GOLD",
      "type": "website",
      "items": [
        {
          "star": true,
          "headline": { "en": "…", "ar": "…" },
          "summary":  { "en": "1–2 sentences on clinical relevance", "ar": "…" },
          "url": "https://…"
        }
      ]
    }
  ]
}
```

Rules:
- Every text field is bilingual `{ "en", "ar" }` (proper Modern Standard Arabic; keep drug names, acronyms and guideline names in Latin script).
- `star: true` only for new/updated guidelines or practice-changing items.
- A source with nothing new gets one item: headline `{ "en": "No new updates", "ar": "لا توجد تحديثات جديدة" }`, no url. Telegram channels whose preview shows nothing: "Preview unavailable" / "المعاينة غير متاحة".
- Paraphrase; never paste long passages. Never download or attach files from channels.

## 3. Update the index

Prepend an entry to `public/data/digests/index.json` → `digests[]` (replace any entry with the same `id`):

```json
{ "id": "2026-11-26-daily-digest", "date": "2026-11-26", "taskId": "daily-digest",
  "file": "2026-11-26-daily-digest.json", "title": { "en": "…", "ar": "…" }, "starCount": 1, "itemCount": 9 }
```

Validate both files with `python3 -m json.tool` before committing.

## 4. Commit and push

```bash
git add public/data/digests
git commit -m "Digest <YYYY-MM-DD> (<taskId>)"
git push origin main
```

## Adding a new kind of task

Add it in the app (Tasks → New task) or to `public/data/config.json`. Give it a unique `id`; its digests use the same file format with that `taskId`, so the app shows them automatically with a filter chip.
