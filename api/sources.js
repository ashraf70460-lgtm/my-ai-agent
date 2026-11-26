// Source health: which integrations are configured and answering right now.
// GET -> { checkedAt, sources:[{ id, name, kind, ok, ms, detail }] }
import { search } from './_pubmed.js';
import { epmcSearch, ctgovSearch, crossrefWork, fdaRecalls, books } from './_sources.js';

async function probe(id, name, kind, fn) {
  const t0 = Date.now();
  try { const d = await fn(); return { id, name, kind, ok: true, ms: Date.now() - t0, detail: d || 'answering' }; }
  catch (e) { return { id, name, kind, ok: false, ms: Date.now() - t0, detail: String((e && e.message) || e).slice(0, 140) }; }
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const list = await Promise.all([
    probe('pubmed', 'PubMed (NCBI E-utilities)', 'database', async () => { const r = await search('asthma', 7, 1, { withCount: true }); return `${r.count} asthma records in 7 days`; }),
    probe('europepmc', 'Europe PMC (incl. PMC full text, preprints)', 'database', async () => `${(await epmcSearch('asthma', { days: 7, max: 1 })).length ? 'results' : 'no results'} for test query`),
    probe('ctgov', 'ClinicalTrials.gov API v2', 'database', async () => `${(await ctgovSearch('asthma', { days: 30, max: 1 })).length ? 'results' : 'no results'} for test query`),
    probe('crossref', 'Crossref (DOI verification, retractions)', 'database', async () => { const w = await crossrefWork('10.1056/NEJMoa1214103'); return w.title ? 'DOI lookup works' : 'no title'; }),
    probe('openfda', 'openFDA (label changes, recalls)', 'regulatory', async () => `${(await fdaRecalls({ days: 365, max: 1 })).length} test result`),
    probe('googlebooks', 'Google Books → Open Library fallback (editions, ISBN)', 'books', async () => { const r = await books('pulmonary function testing', { max: 1 }); return `${r.length} test result via ${(r[0] && r[0].src) || 'googlebooks'}`; })
  ]);
  list.push({ id: 'claude', name: 'Claude (analysis, synthesis)', kind: 'ai', ok: Boolean(process.env.ANTHROPIC_API_KEY), detail: process.env.ANTHROPIC_API_KEY ? 'API key set' : 'ANTHROPIC_API_KEY not set' });
  list.push({ id: 'websearch', name: 'Web search (via Claude, for society websites)', kind: 'ai', ok: Boolean(process.env.ANTHROPIC_API_KEY) && process.env.WEB_SEARCH !== 'off', detail: process.env.ANTHROPIC_API_KEY ? (process.env.WEB_SEARCH === 'off' ? 'turned off' : 'available when your Anthropic organisation allows web search') : 'needs ANTHROPIC_API_KEY' });
  list.push({ id: 'storage', name: 'Vercel Blob (sync, library documents)', kind: 'storage', ok: Boolean(process.env.BLOB_READ_WRITE_TOKEN), detail: process.env.BLOB_READ_WRITE_TOKEN ? 'configured' : 'not configured' });
  list.push({ id: 'scholar', name: 'Google Scholar', kind: 'database', ok: false, detail: 'No official API; not integrated (Europe PMC and PubMed cover indexed literature)' });
  list.push({ id: 'cochrane', name: 'Cochrane Library', kind: 'database', ok: list[0].ok, detail: 'Covered through PubMed and Europe PMC (Cochrane Database Syst Rev); no direct Cochrane API' });
  return res.status(200).json({ checkedAt: new Date().toISOString(), sources: list });
}
