// Unified literature search: PubMed + Europe PMC (+ ClinicalTrials.gov), deduplicated and ranked.
// POST { q, sources:["pubmed","europepmc","ctgov"], days | from,to, types:[rct,meta,sr,guideline,review,observational,diagnostic],
//        journal, max, sort:"rank"|"date", preprints:true|false }
// -> { records:[...], trials:[...], sources:{name:{ok,count,ms,error}}, query, at }
import { search as pmSearch, fetchArticles } from './_pubmed.js';
import { epmcSearch, ctgovSearch } from './_sources.js';

const PM_TYPES = {
  rct: '"Randomized Controlled Trial"[pt]',
  meta: '"Meta-Analysis"[pt]',
  sr: '"Systematic Review"[pt]',
  guideline: '("Practice Guideline"[pt] OR "Guideline"[pt] OR guideline[ti] OR consensus[ti] OR "official statement"[ti])',
  review: 'Review[pt]',
  observational: '("Observational Study"[pt] OR cohort[ti] OR registry[ti])',
  diagnostic: '("Sensitivity and Specificity"[mh] OR "diagnostic accuracy"[tiab])'
};
const EP_TYPES = {
  rct: 'PUB_TYPE:"Randomized Controlled Trial"', meta: 'PUB_TYPE:"Meta-Analysis"', sr: 'PUB_TYPE:"Systematic Review"',
  guideline: '(PUB_TYPE:"Practice Guideline" OR TITLE:guideline OR TITLE:consensus)', review: 'PUB_TYPE:"Review"',
  observational: '(PUB_TYPE:"Observational Study" OR TITLE:cohort)', diagnostic: 'ABSTRACT:"diagnostic accuracy"'
};
export const TOPJ = ['n engl j med', 'lancet', 'lancet respir med', 'am j respir crit care med', 'eur respir j', 'thorax', 'chest', 'jama', 'bmj', 'nat med', 'eur respir rev', 'ann am thorac soc', 'erj open res', 'respir med', 'crit care', 'intensive care med', 'crit care med', 'j thorac oncol', 'sleep', 'j clin sleep med', 'cochrane database syst rev', 'jama intern med', 'lancet infect dis', 'respirology', 'j allergy clin immunol', 'int j tuberc lung dis'];
const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);
export function typeOf(a) {
  const ty = (a.types || []).join(' ').toLowerCase(), ti = String(a.title || '').toLowerCase();
  if (a.retracted) return 'Retracted';
  if (/guideline/.test(ty) || /\bguideline|consensus|official .*statement|recommendations\b/.test(ti)) return 'Guideline';
  if (/meta-analysis/.test(ty) || /meta-analys/.test(ti)) return 'Meta-analysis';
  if (/systematic review/.test(ty) || /systematic review/.test(ti)) return 'Systematic review';
  if (/randomized controlled|randomised controlled/.test(ty) || /\brandomi[sz]ed\b.*\btrial\b/.test(ti)) return 'RCT';
  if (/clinical trial/.test(ty)) return 'Clinical trial';
  if (/observational/.test(ty) || /\bcohort|registry\b/.test(ti)) return 'Observational';
  if (/review/.test(ty)) return 'Review';
  if (a.preprint) return 'Preprint';
  if (/case reports/.test(ty)) return 'Case report';
  return 'Article';
}
const W = { Guideline: 6, 'Meta-analysis': 5, 'Systematic review': 5, RCT: 5, 'Clinical trial': 3, Observational: 2, Review: 1.5, Article: 1, Preprint: 0.5, 'Case report': 0.2, Retracted: -20 };
export const isTop = (a) => TOPJ.includes(String(a.jabbr || a.journal || '').toLowerCase().replace(/\./g, '').trim());
export function rank(list) {
  const now = Date.now();
  list.forEach((a, i) => {
    const ageDays = a.date ? Math.max(0, (now - Date.parse(a.date)) / 864e5) : 365;
    a.evidence = typeOf(a);
    a.score = +(W[a.evidence] + (isTop(a) ? 3 : 0) + Math.max(0, 3 - ageDays / 60) + Math.min(2, Math.log10(1 + (a.citedBy || 0))) + Math.max(0, 2 - (a._pos || i) / 10)).toFixed(2);
  });
  return list.sort((a, b) => b.score - a.score);
}
export function dedupe(list) {
  const map = new Map();
  for (const a of list) {
    const keys = [a.doi && 'doi:' + a.doi.toLowerCase(), a.pmid && 'pmid:' + a.pmid, 't:' + norm(a.title)].filter(Boolean);
    const hit = keys.map((k) => map.get(k)).find(Boolean);
    if (hit) {
      hit.sources = [...new Set([...(hit.sources || [hit.src]), a.src])];
      hit.duplicates = (hit.duplicates || 0) + 1;
      for (const f of ['doi', 'pmid', 'pmcid', 'abstract', 'fullText', 'epubDate', 'pubDate']) if (!hit[f] && a[f]) hit[f] = a[f];
      hit.citedBy = Math.max(hit.citedBy || 0, a.citedBy || 0);
      hit.preprint = hit.preprint && a.preprint;
      hit.retracted = hit.retracted || a.retracted;
      hit.openAccess = hit.openAccess || a.openAccess;
      keys.forEach((k) => map.set(k, hit));
    } else {
      const rec = { ...a, sources: [a.src] };
      keys.forEach((k) => map.set(k, rec));
    }
  }
  return [...new Set(map.values())];
}

export async function multiSearch(body) {
  const q = String(body.q || '').trim().slice(0, 500);
  const sources = Array.isArray(body.sources) && body.sources.length ? body.sources : ['pubmed', 'europepmc'];
  const types = (Array.isArray(body.types) ? body.types : []).filter((t) => PM_TYPES[t]);
  const max = Math.min(Math.max(+body.max || 20, 5), 50);
  const days = +body.days || 365, from = body.from, to = body.to;
  const status = {}, out = [];
  let trials = [];
  const timed = async (name, fn) => {
    const t0 = Date.now();
    try { const r = await fn(); status[name] = { ok: true, count: r.length, ms: Date.now() - t0 }; return r; }
    catch (e) { status[name] = { ok: false, count: 0, ms: Date.now() - t0, error: String((e && e.message) || e).slice(0, 160) }; return []; }
  };
  const jobs = [];
  if (sources.includes('pubmed')) jobs.push(timed('pubmed', async () => {
    let term = `(${q})`;
    if (types.length) term += ` AND (${types.map((t) => PM_TYPES[t]).join(' OR ')})`;
    if (body.journal) term += ` AND "${String(body.journal).replace(/"/g, '')}"[ta]`;
    if (body.english !== false) term += ' AND english[la]';
    const ids = await pmSearch(term, days, max, { sort: body.sort === 'date' ? 'pub_date' : 'relevance', from, to, datetype: 'pdat' });
    const arts = ids.length ? await fetchArticles(ids) : [];
    const pos = new Map(ids.map((id, i) => [id, i]));
    return arts.map((a) => ({ ...a, _pos: pos.get(a.pmid) || 0 }));
  }).then((r) => out.push(...r)));
  if (sources.includes('europepmc')) jobs.push(timed('europepmc', async () => {
    let qq = q;
    if (types.length) qq = `(${qq}) AND (${types.map((t) => EP_TYPES[t]).join(' OR ')})`;
    if (body.journal) qq += ` AND JOURNAL:"${String(body.journal).replace(/"/g, '')}"`;
    if (body.preprints === false) qq += ' NOT SRC:PPR';
    const r = await epmcSearch(qq, { days, from, to, max });
    return r.map((a, i) => ({ ...a, _pos: i }));
  }).then((r) => out.push(...r)));
  if (sources.includes('ctgov')) jobs.push(timed('ctgov', () => ctgovSearch(q, { days, from, to, max: Math.min(max, 20) })).then((r) => { trials = r; }));
  await Promise.all(jobs);
  const records = rank(dedupe(out)).slice(0, max * 2).map(({ _pos, ...a }) => a);
  return { records, trials, sources: status, query: { q, types, journal: body.journal || '', days, from, to }, at: new Date().toISOString() };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method-not-allowed' }); }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (!String(body.q || '').trim()) return res.status(400).json({ error: 'q-required' });
    return res.status(200).json(await multiSearch(body));
  } catch (e) {
    return res.status(502).json({ error: 'search-failed', detail: String((e && e.message) || e) });
  }
}
