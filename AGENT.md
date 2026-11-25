# Agent instructions — how a scheduled run publishes into Pulmonologist

The app is a static site plus a few Vercel Functions. Each agent run **adds one report file and updates the index**, then commits and pushes to `main`. Vercel redeploys within about a minute, and at 07:50 Riyadh a Vercel cron sends the day's report to Dr. Ashraf's Telegram.

## 1. Read the current settings

`https://my-ai-agent-coral.vercel.app/api/state` → `{ "state": { "tasks": [...], "topics": [...] } }`.
If it fails or `state` is null, use `public/data/config.json` in this repo.

- Use only tasks with `"enabled": true`. The main task is `daily-digest`.
- `task.sections` says which of the four sections to build (`websites`, `guidelines`, `papers`, `telegram`).
- `task.sources` = the websites to check (section **websites**). Do not add sites of your own.
- `state.topics` = `[{ "k": "COPD", "on": 1 }, …]`. Topics with `on: 1` steer the **papers** and **telegram** sections. Default if missing: COPD, asthma, bronchiectasis, interstitial lung disease, pulmonary embolism, pleural disease, tuberculosis, sleep apnea, ARDS.

## 2. Research, by section

**websites** — each site in `task.sources`: new items from roughly the last 24–48 h (WebFetch the news page; if unreadable, WebSearch `site:<domain>` with the current month). Prioritise guidelines, statements and practice-changing news over awards and elections. Nothing new → one item "No new updates".

**guidelines** — new or updated guidelines, official statements, technical standards and major reports in respiratory medicine published in the last ~7 days (GOLD, GINA, ERS, ATS, BTS, ACCP/CHEST, NICE, WHO, ESC for PE/PH, IDSA/ATS for infections, AASM for sleep, Saudi Thoracic Society). Use WebSearch and the PubMed connector (`"Practice Guideline"[pt] OR guideline[ti] OR consensus[ti]` with respiratory terms, last 14 days). Don't repeat items from the previous 7 reports unless something changed.

**papers** — the most important new papers (last ~3 days) on the active topics: use the PubMed connector, newest first. Favour RCTs, meta-analyses and papers in NEJM, Lancet, Lancet Respir Med, AJRCCM, ERJ, Thorax, CHEST, JAMA, BMJ. 4–8 items; summary = design, population, main result with numbers, why it matters. Put `PMID` and the DOI link in `url`.

**telegram** — there is no fixed channel list. Discover public Telegram channels and posts about pulmonology/respiratory medicine (English and Arabic) from the last ~48 h:
- WebSearch e.g. `site:t.me pulmonology`, `site:t.me respiratory medicine <month year>`, `site:t.me COPD guideline`, `site:t.me الأمراض الصدرية`, `site:t.me طب الصدر`, plus the active topics.
- WebFetch promising channels as `https://t.me/s/<username>` (public preview) one at a time.
- Report only posts that are **important or genuinely interesting** clinically (new guideline news, notable trials, teaching cases, conference highlights). Skip ads, file-sharing and pirated books; never download or forward files. Each item: headline, 1–2 sentence summary, `url` = the post link `https://t.me/<channel>/<id>`, section `source` = channel title.
- Nothing worthwhile → one item "No important Telegram posts today".

## 3. Write the report file

Path: `public/data/digests/<YYYY-MM-DD>-<taskId>.json` (Riyadh date).

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
      "category": "guidelines",
      "sourceId": "gold",
      "source": "GOLD",
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

- `category` is one of `websites`, `guidelines`, `papers`, `telegram` (the app groups and colours sections by it). Several sections may share a category (one per source).
- Every text field is bilingual `{ "en", "ar" }` in good Modern Standard Arabic; keep drug names, acronyms and guideline names in Latin script.
- `star: true` only for new/updated guidelines or practice-changing items.
- Paraphrase; never paste long passages.

## 4. Update the index

Prepend to `public/data/digests/index.json` → `digests[]` (replace any entry with the same `id`, newest first):

```json
{ "id": "2026-11-26-daily-digest", "date": "2026-11-26", "taskId": "daily-digest",
  "file": "2026-11-26-daily-digest.json", "title": { "en": "…", "ar": "…" }, "starCount": 1, "itemCount": 12 }
```

Validate both files with `python3 -m json.tool` before committing.

## 5. Commit and push

```bash
git add public/data/digests
git commit -m "Report <YYYY-MM-DD> (<taskId>)"
git -c push.negotiate=true push origin main
```

## Other tasks

Tasks added in the app (Agent → New scheduled task) use the same file format with their own `taskId`; the app shows them automatically.
