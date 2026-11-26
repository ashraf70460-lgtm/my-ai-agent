# Agent instructions — how scheduled runs publish into PULMONOLOGIST-AGENT

The app is a static site plus a few Vercel Functions. Each agent run **adds one report file and updates the index**, then commits and pushes to `main`. Vercel redeploys within about a minute.

## 1. Read the current settings

`https://my-ai-agent-coral.vercel.app/api/state` → `{ "state": { "tasks": [...], "topics": [...] } }`.
If it fails or `state` is null, use `public/data/config.json` in this repo.

- Use only tasks with `"enabled": true`. The main task is `daily-digest`.
- `task.sections` says which of the three sections to build (`websites`, `guidelines`, `papers`).
- `task.sources` = the websites to check (section **websites**). Do not add sites of your own.
- `state.topics` = `[{ "k": "COPD", "on": 1 }, …]`. Topics with `on: 1` steer the **papers** section. Default if missing: COPD, asthma, bronchiectasis, interstitial lung disease, pulmonary embolism, pleural disease, tuberculosis, sleep apnea, ARDS.

## 2. Research, by section

**websites** — each site in `task.sources`: new items from roughly the last 24–48 h (WebFetch the news page; if unreadable, WebSearch `site:<domain>` with the current month). Prioritise guidelines, statements and practice-changing news over awards and elections. Nothing new → one item "No new updates".

**guidelines** — new or updated guidelines, official statements, technical standards and major reports in respiratory medicine published in the last ~7 days (GOLD, GINA, ERS, ATS, BTS, ACCP/CHEST, NICE, WHO, ESC for PE/PH, IDSA/ATS for infections, AASM for sleep, Saudi Thoracic Society). Use WebSearch and the PubMed connector (`"Practice Guideline"[pt] OR guideline[ti] OR consensus[ti]` with respiratory terms, last 14 days). Don't repeat items from the previous 7 reports unless something changed.

**papers** — the most important new papers (last ~3 days) on the active topics: use the PubMed connector, newest first. Favour RCTs, meta-analyses and papers in NEJM, Lancet, Lancet Respir Med, AJRCCM, ERJ, Thorax, CHEST, JAMA, BMJ. 4–8 items; summary = design, population, main result with numbers, why it matters. Put `PMID` and the DOI link in `url`.


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

- `category` is one of `websites`, `guidelines`, `papers` (the app groups and colours sections by it). Several sections may share a category (one per source).
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

## Weekly and monthly consultant briefings

The weekly (Friday) and monthly (1st of the month) scheduled tasks write a **briefing** instead of a daily report.

Research window: weekly = previous 7 days; monthly = previous calendar month. Cover respiratory medicine, critical care and sleep. Sources: PubMed connector (RCTs, meta-analyses, systematic reviews, guidelines; top journals first), WebSearch of GOLD, GINA, ERS, ATS, BTS, ACCP/CHEST, NICE, WHO, ESC, AASM, ESICM, SCCM and Saudi Thoracic Society, ClinicalTrials.gov for major new or completed trials, and FDA/EMA safety communications. Never invent a study, number, date, PMID or DOI; give PMID/DOI only when verified on PubMed or doi.org. Flag preprints and conference abstracts. Mark retracted papers.

Path: `public/data/briefings/<YYYY-MM-DD>-weekly.json` or `<YYYY-MM-DD>-monthly.json` (Riyadh date of the run).

```json
{
  "id": "2026-11-27-weekly",
  "period": "weekly",
  "date": "2026-11-27",
  "range": "2026-11-20 → 2026-11-26",
  "title": { "en": "Weekly consultant briefing — 20–26 Nov 2026", "ar": "الملخص الأسبوعي — 20–26 نوفمبر 2026" },
  "en": { "concise": "markdown", "extended": "markdown" },
  "ar": { "concise": "markdown", "extended": "markdown" },
  "refs": [ { "label": "Short citation", "pmid": "…", "doi": "…", "url": "https://…" } ]
}
```

Markdown sections, in this order (both `concise` — one screen, bullets — and `extended` — full detail with tables):
`## Executive summary` · `## Top practice-changing developments` · `## New and updated guidelines` (table: Clinical area | Previous | Latest | What changed | Clinical importance) · `## Important RCTs` · `## Meta-analyses and systematic reviews` · `## Diagnostics and imaging` · `## New drugs, devices and safety alerts` · `## Topics to watch` · `## Sources`.
For each key paper: **Title**, Journal, date, design, population, intervention/comparator, primary outcome, main result with numbers, limitations, *Does it change practice?*, PMID/DOI.
Arabic in Modern Standard Arabic; keep drug, trial, guideline names and abbreviations in Latin script.

Prepend to `public/data/briefings/index.json` → `briefings[]` (replace same `id`, newest first):

```json
{ "id": "2026-11-27-weekly", "period": "weekly", "date": "2026-11-27", "range": "2026-11-20 → 2026-11-26",
  "file": "2026-11-27-weekly.json", "title": { "en": "…", "ar": "…" }, "items": 14 }
```

Validate with `python3 -m json.tool`, then `git add public/data/briefings && git commit -m "Briefing <date> (weekly|monthly)" && git -c push.negotiate=true push origin main`.

## Not included

Telegram is not part of this agent (a separate Telegram agent may be added later). Do not research or report Telegram channels, and do not include belalfadel.net.
