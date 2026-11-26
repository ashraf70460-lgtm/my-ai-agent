// Quick Update: what is new in respiratory medicine and critical care in a time window.
// GET ?days=1|7|30|90|180|365[&focus=COPD] -> { guidelines, highEvidence, topJournals, trials, fda, recalls, sources, at }
import { runSearches } from './_pubmed.js';
import { ctgovSearch, fdaLabels, fdaRecalls } from './_sources.js';
import { rank, dedupe } from './search.js';

export const RESP = '(lung[tiab] OR pulmonary[tiab] OR respiratory[tiab] OR asthma[tiab] OR COPD[tiab] OR bronchiectasis[tiab] OR pneumonia[tiab] OR tuberculosis[tiab] OR "sleep apnea"[tiab] OR ARDS[tiab] OR "mechanical ventilation"[tiab] OR "critical care"[tiab] OR "intensive care"[tiab] OR sepsis[tiab] OR "interstitial lung"[tiab] OR pleural[tiab] OR "pulmonary embolism"[tiab] OR "cystic fibrosis"[tiab] OR "pulmonary hypertension"[tiab])';
const RESP_J = ['Am J Respir Crit Care Med', 'Eur Respir J', 'Thorax', 'Chest', 'Lancet Respir Med', 'Intensive Care Med', 'Crit Care', 'Crit Care Med', 'Ann Am Thorac Soc', 'ERJ Open Res', 'Respir Med', 'J Thorac Oncol', 'Sleep', 'J Clin Sleep Med', 'Cochrane Database Syst Rev'].map((j) => `"${j}"[ta]`).join(' OR ');
const GEN_J = ['N Engl J Med', 'Lancet', 'JAMA', 'BMJ', 'Nat Med'].map((j) => `"${j}"[ta]`).join(' OR ');
const HIGH = '("Randomized Controlled Trial"[pt] OR "Meta-Analysis"[pt] OR "Systematic Review"[pt])';
const GUIDE = '("Practice Guideline"[pt] OR "Guideline"[pt] OR guideline[ti] OR consensus[ti] OR "official statement"[ti] OR "technical standard"[ti])';
const CT_COND = 'asthma OR COPD OR bronchiectasis OR "interstitial lung disease" OR "pulmonary fibrosis" OR "pulmonary hypertension" OR "pulmonary embolism" OR ARDS OR "respiratory failure" OR tuberculosis OR "cystic fibrosis" OR "sleep apnea" OR "lung cancer" OR pneumonia';

async function timed(status, name, fn) {
  const t0 = Date.now();
  try { const r = await fn(); status[name] = { ok: true, count: Array.isArray(r) ? r.length : 0, ms: Date.now() - t0 }; return r; }
  catch (e) { status[name] = { ok: false, count: 0, ms: Date.now() - t0, error: String((e && e.message) || e).slice(0, 160) }; return []; }
}

export async function quickUpdate({ days = 7, focus = '' } = {}) {
  const d = Math.min(Math.max(+days || 7, 1), 365);
  const f = String(focus || '').trim().slice(0, 200);
  const scope = f ? `(${f})` : RESP;
  const status = {};
  const big = d > 30 ? 25 : 15;
  const [pm, trials, fda, recalls] = await Promise.all([
    timed(status, 'pubmed', () => runSearches([
      { term: `${f ? scope : RESP.replace(/\[tiab\]/g, '[ti]')} AND ${GUIDE} AND english[la]`, days: Math.max(d, 7), max: big, tag: 'guidelines' },
      { term: `${scope} AND ${HIGH} AND english[la]`, days: d, max: big, tag: 'high' },
      { term: `${f ? scope + ' AND ' : ''}(${RESP_J})`, days: d, max: big, tag: 'top' },
      { term: `${scope} AND (${GEN_J})`, days: d, max: 12, tag: 'top' }
    ])),
    timed(status, 'ctgov', () => ctgovSearch(f || CT_COND, { days: Math.max(d, 3), max: 20 })),
    timed(status, 'openfda_labels', () => fdaLabels({ days: Math.max(d, 30), max: 15 })),
    timed(status, 'openfda_recalls', () => fdaRecalls({ days: Math.max(d, 60), max: 15 }))
  ]);
  const by = (tag) => rank(dedupe(pm.filter((a) => a.topic === tag)));
  const guidelines = by('guidelines');
  const gset = new Set(guidelines.map((a) => a.pmid));
  const highEvidence = by('high').filter((a) => !gset.has(a.pmid));
  const hset = new Set(highEvidence.map((a) => a.pmid));
  const topJournals = by('top').filter((a) => !gset.has(a.pmid) && !hset.has(a.pmid));
  return { days: d, focus: f, guidelines, highEvidence, topJournals, trials, fda, recalls, sources: status, at: new Date().toISOString() };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const q = req.query || {};
    return res.status(200).json(await quickUpdate({ days: q.days, focus: q.focus }));
  } catch (e) {
    return res.status(502).json({ error: 'updates-failed', detail: String((e && e.message) || e) });
  }
}
