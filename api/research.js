// Research engine: Clinical Intelligence, Deep Research (plan → search → synthesise), article appraisal,
// guideline comparison, briefings and suggestions. All actions share one set of evidence rules.
// POST { action, ...} (PIN)  ->  { text | plan | items, references, webSources, model, at }
import { checkPin } from './_pubmed.js';
import { runClaude, claudeConfigured, DEEP_MODEL } from './_claude.js';
import { multiSearch, dedupe, rank } from './search.js';

const today = () => new Date().toISOString().slice(0, 10);
const RULES = `EVIDENCE RULES (mandatory):
- Prioritise original research and official guidelines. Prefer systematic reviews, RCTs and landmark trials.
- Never fabricate results, numbers, quotations or references. Every reference must come from a tool result or a source you actually retrieved; give PMID and/or DOI when available.
- Only report numerical results (HR, RR, OR, CI, absolute differences) that appear in the retrieved abstract or source. If a number is not available, say "not reported in the abstract".
- You usually see abstracts only. Never claim to have read subscription full text; say "based on the abstract" where relevant.
- Flag retracted papers, corrections, preprints (not peer reviewed) and conference abstracts explicitly.
- Distinguish statistical from clinical significance. Report limitations, bias and funding/conflicts when available.
- Distinguish publication date, online-first date and guideline update date when known. Note when a guideline has been superseded.
- When sources disagree, present the disagreement transparently. Never merge conflicting recommendations into a fictional consensus.
- If something cannot be verified, say so plainly.
- This is educational research support for a consultant, not individualised patient management.`;
const lang = (l) => (l === 'ar' ? 'Write in Modern Standard Arabic; keep drug names, trial names, guideline names, statistics and references in English/Latin script.' : 'Write in English.');
const recs = (list, n = 30) => (list || []).slice(0, n).map((a, i) => `[${i + 1}] ${a.title} | ${a.journal || ''} | ${a.date || ''}${a.epubDate ? ' (online ' + a.epubDate + ')' : ''} | ${a.evidence || ''} | PMID ${a.pmid || '–'} | DOI ${a.doi || '–'}${a.retracted ? ' | RETRACTED' : ''}${a.preprint ? ' | PREPRINT' : ''}${a.conference ? ' | CONFERENCE ABSTRACT' : ''} | sources: ${(a.sources || [a.src]).join('+')}\n    Abstract: ${String(a.abstract || '(none)').slice(0, 1100)}`).join('\n');

const ACTIONS = {
  async clinical(b) {
    const system = `You are PULMONOLOGIST-AGENT in Clinical Intelligence mode, answering a consultant pulmonologist/intensivist. Today is ${today()}. ${lang(b.lang)}
Use the tools: search PubMed/Europe PMC for the newest high-quality evidence, use web_search for current society guidelines (GOLD, GINA, ATS, ERS, BTS, NICE, ESC, ESICM, SCCM, WHO, IDSA, AASM, etc.), and verify key references.
${RULES}
Answer in this structure (markdown):
## Direct answer
2–5 sentences.
## Guideline recommendations
Table: | Organisation | Document (year) | Recommendation | Strength / evidence |  — only from retrieved sources; note disagreements.
## Supporting evidence
Bullets: trial/review name, design, N, key result (numbers only if in the abstract), PMID/DOI.
## Evidence quality
GRADE-style certainty (high/moderate/low/very low) with one-line justification.
## Limitations and uncertainty
## References
Numbered list with authors (first author et al.), title, journal, year, PMID, DOI, link.
End with: "Educational research support — not individualised patient management."`;
    return runClaude({ system, messages: [{ role: 'user', content: String(b.question || '').slice(0, 4000) }], tools: true, web: true, maxTokens: 3500, maxTurns: 8 });
  },

  async plan(b) {
    const system = `You plan literature searches for a respiratory/critical-care evidence synthesis. Today is ${today()}. Return ONLY JSON, no prose.`;
    const prompt = `Research question: ${String(b.question || '').slice(0, 2000)}
Return JSON: {"question": refined question, "pico": {"P": "...", "I": "...", "C": "...", "O": "..."} (use null if PICO does not fit),
"keywords": [...], "synonyms": [...], "mesh": [...],
"pubmed": [3-5 PubMed queries using [tiab]/[mh]/[pt] syntax, from broad to specific, one restricted to systematic reviews/meta-analyses, one to RCTs],
"europepmc": [1-2 Europe PMC queries], "ctgov": {"condition": "...", "term": "..."},
"guidelines": [societies whose guidelines are relevant], "years": suggested look-back in years (number)}`;
    const r = await runClaude({ system, messages: [{ role: 'user', content: prompt }], maxTokens: 1200 });
    const m = /\{[\s\S]*\}/.exec(r.text || '');
    let plan = null;
    try { plan = m ? JSON.parse(m[0]) : null; } catch { plan = null; }
    if (!plan) throw new Error('Could not build a search plan');
    return { plan };
  },

  async search(b) {
    const p = b.plan || {};
    const days = Math.min(Math.max((+p.years || 10) * 365, 365), 36500);
    const queries = [...(p.pubmed || []).slice(0, 5)];
    const all = [], status = {};
    let trials = [];
    for (const q of queries) {
      const r = await multiSearch({ q, sources: ['pubmed'], days, max: 15, sort: 'rank' });
      all.push(...r.records); Object.assign(status, { ['pubmed: ' + q.slice(0, 60)]: r.sources.pubmed });
    }
    for (const q of (p.europepmc || []).slice(0, 2)) {
      const r = await multiSearch({ q, sources: ['europepmc'], days, max: 15 });
      all.push(...r.records); Object.assign(status, { ['europepmc: ' + q.slice(0, 60)]: r.sources.europepmc });
    }
    if (p.ctgov && p.ctgov.condition) {
      const r = await multiSearch({ q: p.ctgov.condition + (p.ctgov.term ? ' ' + p.ctgov.term : ''), sources: ['ctgov'], days: 3650, max: 15 });
      trials = r.trials; status.ctgov = r.sources.ctgov;
    }
    const records = rank(dedupe(all)).slice(0, 40);
    return { records, trials, status, strategy: { queries, europepmc: p.europepmc || [], ctgov: p.ctgov || null, days, totalRetrieved: all.length, afterDedupe: records.length } };
  },

  async synthesize(b) {
    const p = b.plan || {}, s = b.search || {};
    const mode = b.depth === 'concise' ? 'concise (about 900–1300 words)' : 'comprehensive (about 2500–4000 words)';
    const system = `You are PULMONOLOGIST-AGENT in Deep Research mode, writing a structured evidence synthesis for a consultant. Today is ${today()}. ${lang(b.lang)}
You are given the search plan and the records actually retrieved (abstracts). You may use web_search ONLY to retrieve current guideline recommendations from official society sources, and verify_reference to check key papers. Use pubmed_search sparingly to fill an obvious gap (e.g. a landmark trial missing from the records).
${RULES}
- This is a structured, AI-assisted evidence synthesis, NOT a formal systematic review: say so in the Methods.
- Cite records as [n] matching the numbered list, plus any extra sources you retrieved.
Write a ${mode} markdown report with exactly these sections:
# <Title>
## Executive summary
## Clinical question
(PICO table if applicable)
## Search strategy
(databases, queries, date window, records retrieved/after de-duplication, search date ${today()}; limitations of the search)
## Evidence table
| Study | Design | Population (N) | Intervention vs comparator | Main outcome / result | Quality / risk of bias |
## Critical appraisal
(consistency, conflicting findings, risk of bias, generalisability, statistical vs clinical significance)
## Guideline comparison
| Organisation | Year | Recommendation | Strength |  (never merge conflicting recommendations)
## Certainty of evidence (GRADE principles)
(per key outcome, with reasons; say when insufficient)
## Clinical implications
## Areas of uncertainty and evidence gaps
## References
(numbered; authors, title, journal, year, PMID, DOI, link)`;
    const content = `SEARCH PLAN: ${JSON.stringify(p).slice(0, 4000)}
SEARCH STRATEGY USED: ${JSON.stringify(s.strategy || {}).slice(0, 2000)}
RECORDS (ranked, de-duplicated):
${recs(s.records, 35)}
REGISTERED TRIALS (ClinicalTrials.gov):
${(s.trials || []).slice(0, 12).map((t) => `${t.nct} | ${t.title} | ${t.status} | phase ${(t.phases || []).join('/') || 'n/a'} | N=${t.enrollment || '?'} | first posted ${t.firstPosted}`).join('\n') || 'none'}`;
    return runClaude({ system, messages: [{ role: 'user', content }], tools: true, web: true, maxTokens: b.depth === 'concise' ? 4000 : 9000, model: DEEP_MODEL(), maxTurns: 6 });
  },

  async appraise(b) {
    const a = b.article || {};
    const system = `You critically appraise a single article for a consultant pulmonologist. Today is ${today()}. ${lang(b.lang)}
${RULES}
You may call verify_reference and pubmed_search (e.g. to find the original trial or a correction).`;
    const content = `ARTICLE:
Title: ${a.title}
Authors: ${a.authors || ''}
Journal: ${a.journal || ''} | Published: ${a.pubDate || a.date || ''} | Online first: ${a.epubDate || 'n/a'}
PMID: ${a.pmid || '–'} | DOI: ${a.doi || '–'} | Types: ${(a.types || []).join(', ')} ${a.retracted ? '| RETRACTED' : ''} ${a.preprint ? '| PREPRINT' : ''}
Abstract: ${a.abstract || '(no abstract available)'}

Write markdown with exactly these sections:
## 1. Citation
(full title, authors, journal, publication date, online date, DOI, PMID, link)
## 2. Clinical question
## 3. Study design
(population, sample size, inclusion/exclusion if reported, intervention, comparator, primary and secondary outcomes)
## 4. Results
(only numbers reported in the abstract: absolute differences, RR/HR/OR with 95% CI, p values; say "not reported" otherwise)
## 5. Critical appraisal
(strengths, limitations, bias, generalisability, funding/conflicts if reported)
## 6. Clinical implications
(does it change practice, who may benefit, does it challenge current guidelines, what a consultant should know)
## 7. Final classification
One of: Landmark · Practice-changing · Important new evidence · Interesting but not practice-changing · Preliminary evidence · Limited clinical relevance — with a one-line reason.
State at the top in italics whether the appraisal is based on the abstract only.`;
    return runClaude({ system, messages: [{ role: 'user', content }], tools: true, maxTokens: 2200, maxTurns: 4 });
  },

  async compare(b) {
    const system = `You compare respiratory/critical-care guidelines for a consultant. Today is ${today()}. ${lang(b.lang)}
Use web_search to retrieve the CURRENT official documents (and the previous edition when comparing editions) from the societies' own websites or the journals that published them. Use pubmed_search for the published versions.
${RULES}
Never invent recommendations; quote recommendation wording only briefly and paraphrase the rest. If you cannot access a document, say which one and what you could and could not verify.`;
    const content = `Compare: ${String(b.a || '')} VERSUS ${String(b.b || '')}${b.topic ? ' — focus: ' + b.topic : ''}.
Output markdown:
## Documents compared
(organisation, full title, year/date, publication venue, link; note supersession)
## Comparison
| Clinical area | ${String(b.a || 'A').slice(0, 40)} | ${String(b.b || 'B').slice(0, 40)} | What differs? | Clinical importance |
(8–15 rows; Clinical importance = High/Moderate/Low; mark potentially practice-changing differences with ⚑)
## Where they agree
## Where they disagree (and why, if stated)
## Practical take-home for a consultant
## Sources`;
    return runClaude({ system, messages: [{ role: 'user', content }], tools: true, web: true, maxTokens: 4000, maxTurns: 8 });
  },

  async briefing(b) {
    const period = b.period === 'monthly' ? 'monthly comprehensive review' : 'weekly consultant briefing';
    const system = `You write the ${period} for a consultant pulmonologist/intensivist. Today is ${today()}. ${lang(b.lang)}
${RULES}
Use only the items provided plus anything you verify with the tools.`;
    const content = `Material from the period (daily agent reports, live PubMed/ClinicalTrials.gov/openFDA results):
${String(b.material || '').slice(0, 60000)}

Select the ${b.period === 'monthly' ? '10–15' : '5–10'} most important developments across: new guidelines; practice-changing trials; important publications; new drugs/therapeutic developments (incl. FDA label changes); critical care updates; new books (if any); safety alerts (incl. recalls).
Output markdown:
# <Headline for the period>
## Concise briefing
(one bullet per item: what is new — why it matters — practice-changing? yes/no/possibly)
## Extended briefing
### <n>. <Item title>
- **What is new?**
- **Why does it matter?**
- **What should a consultant know?**
- **Does it change clinical practice?**
- **Original evidence:** (link, PMID/DOI)
## Safety alerts
## Sources`;
    return runClaude({ system, messages: [{ role: 'user', content }], tools: true, maxTokens: b.period === 'monthly' ? 8000 : 5000, model: DEEP_MODEL(), maxTurns: 5 });
  },

  async suggest(b) {
    const kinds = {
      events: 'upcoming (after today) international or regional respiratory, critical care, sleep or interventional pulmonology conferences, including Middle East/Gulf/Saudi meetings. Fields: title, start (YYYY-MM-DD), end, place, url (official https), detail',
      videos: 'high-quality respiratory medicine video channels, lecture series or recorded guideline webinars. Fields: title, src, url (https), detail',
      people: 'respiratory/critical-care physicians and scientists worth following (guideline authors, trialists, educators, including Arab and Gulf pulmonologists). Fields: name, focus, q (PubMed author format like "Smith JD"), detail',
      books: 'new editions (last 3 years) of important respiratory, critical care, sleep, thoracic imaging, interventional pulmonology, pulmonary function or thoracic oncology books from reputable publishers. Fields: title, ed, authors, publisher, year, isbn, url, detail'
    };
    const kind = kinds[b.kind] ? b.kind : 'events';
    const system = `You find verified information for a consultant pulmonologist. Today is ${today()}. Use web_search to verify every item on an official source. Never invent dates, editions, ISBNs or URLs: leave a field empty if not verified. Return ONLY a JSON array.`;
    const r = await runClaude({ system, messages: [{ role: 'user', content: `Find 6 ${kinds[kind]}. Exclude: ${String(b.exclude || '').slice(0, 2000)}. Add "verified": true only when you confirmed the item on an official page, and "source" (the URL you used).` }], web: true, maxTokens: 2500, maxTurns: 6 });
    const m = /\[[\s\S]*\]/.exec(r.text || '');
    let items = [];
    try { items = m ? JSON.parse(m[0]) : []; } catch { items = []; }
    return { items, webSources: r.webSources, webUsed: r.webUsed };
  }
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method-not-allowed' }); }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const fn = ACTIONS[body.action];
    if (!fn) return res.status(400).json({ error: 'unknown-action' });
    if (body.action === 'search') return res.status(200).json({ ...(await fn(body)), at: new Date().toISOString() });
    if (!claudeConfigured()) return res.status(501).json({ error: 'no-key' });
    if (!checkPin(req)) return res.status(401).json({ error: 'bad-pin' });
    const out = await fn(body);
    return res.status(200).json({ ...out, at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ error: 'research-failed', detail: String((e && e.message) || e) });
  }
}
