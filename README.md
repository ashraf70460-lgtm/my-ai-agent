# PULMONOLOGIST-AGENT

Consultant-level respiratory medicine intelligence, prepared for Ashraf Ahmed. One installable, bilingual (English / العربية) web app, light and dark, built for phones (Android/iPhone) and computers.

Live: https://my-ai-agent-coral.vercel.app · Install from the browser (Android "Install app", iPhone Share → "Add to Home Screen").

## Sections

| Tab | What it does |
|---|---|
| **Today** | Greeting, flow–volume hero, freshness strip (last report / radar / quick update / source health), latest daily report, weekly briefing, guideline changes, conferences, top papers |
| **Research** | **Quick update** (Today · 7 · 30 · 90 · 180 · 365 days: guidelines, high-level evidence, top journals, registered trials, FDA label changes and recalls) · **Deep research** (PICO plan → multi-database search → evidence table + GRADE report) · **Clinical intelligence** (consultant Q&A with guideline comparison table and certainty) |
| **Radar** | Filterable multi-source literature radar (PubMed + Europe PMC + preprints + ClinicalTrials.gov): subspecialty, study type, journal, date window, sort; de-duplication across sources; new-vs-seen; 7-part article appraisal; reference verification; literature watches |
| **Guidelines** | Guideline Tracker with previous/current editions, supersession, Change Detector tables (Clinical area · Previous · Latest · What changed · Importance), cross-organisation comparison (never merged into a fictional consensus), AI comparison of any two guidelines, PubMed guideline scan |
| **Trials** | Landmark Trials Library (44 trials, verified against PubMed): search, filter, compare up to 4, collections, PDF |
| **Topics** | 30 subspecialty centres: guidelines, trials, resources, live papers and registered trials |
| **Briefings** | Daily agent reports (websites · guidelines · papers), weekly and monthly consultant briefings (concise / extended, PDF), generate-now |
| **Library** | Personal knowledge library: folders, tags, notes, read/unread, importance, subspecialty, PDF uploads, AI reports, reading history, JSON/PDF export |
| **Books** | Medical books tracker verified against Google Books (edition, publisher, ISBN, date, reputable-publisher flag) + core textbooks |
| **More** | Conferences, videos, people to follow, links, the scheduled agent (sections, websites, topics, new tasks), connected-source status |

PDFs: cover page, contents, page X of Y, clickable PMID/DOI references, generation and search cut-off dates, limitations, watermark "PULMONOLOGIST-AGENT · Prepared for Ashraf Ahmed"; concise or comprehensive. Arabic PDFs use the browser's print-to-PDF.

## Data sources

Live from the server: PubMed (NCBI E-utilities), Europe PMC (incl. preprints, open access, citations), ClinicalTrials.gov v2, Crossref (DOIs, retractions, corrections), openFDA (labels, recalls), Google Books. Through Claude: analysis, synthesis and (if allowed for the organisation) web search of society websites. Scheduled agent: daily report, weekly and monthly briefings (see [AGENT.md](AGENT.md)). Google Scholar has no official API and is not integrated. More → Connected sources shows live status.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Needed for |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Set. Sync across devices, library documents and PDFs. |
| `APP_PIN` | Set. Required for saving, uploads and AI; enter it in Settings. |
| `ANTHROPIC_API_KEY` | **Required for** deep research, clinical intelligence, appraisal, guideline comparison, AI summaries, briefings-now, suggestions. |
| `CLAUDE_MODEL` / `CLAUDE_MODEL_DEEP` | Optional; default `claude-sonnet-5-5`. |
| `NCBI_API_KEY` | Optional; higher PubMed rate limit. |
| `GOOGLE_BOOKS_KEY` | Optional; higher Google Books quota. |
| `WEB_SEARCH` | Set to `off` to stop Claude using web search. |

## Files

- `public/index.html`, `public/app.css` — shell and styles; `public/js/core.js` (state, i18n, API, router, library), `pdf.js`, `v-*.js` (one file per area), `app.js` (settings, install, start-up). Add a section with `PA.view('name', { render(el, arg) {} })` and add it to `order` in core.js.
- `public/data/trials.js`, `guidelines.js`, `subspecialties.js` — curated, verified reference data (dated). `public/data.js` — starter lists.
- `public/data/digests/`, `public/data/briefings/` — written by the scheduled agent.
- `api/` — `search` (multi-source radar), `updates` (quick update), `research` (deep research, clinical, appraisal, compare, briefings, suggestions), `verify`, `books`, `sources`, `docs` (library storage), `state`, `pubmed`, `claude`.

Educational research support — not individualised patient management.
