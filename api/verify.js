// Evidence verification for one article: DOI (Crossref), PubMed publication types, Europe PMC preprint status.
// POST { doi?, pmid?, title? } -> { checkedAt, doiVerified, titleMatch, retracted, corrected, preprint, conference,
//                                  abstractOnly, dates:{published,online,print}, notices:[...], sources:{...} }
import { fetchArticles } from './_pubmed.js';
import { crossrefWork, epmcSearch } from './_sources.js';

const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export async function verify({ doi = '', pmid = '', title = '' }) {
  const out = { checkedAt: new Date().toISOString(), notices: [], sources: {} };
  if (pmid) {
    try {
      const [a] = await fetchArticles([String(pmid)]);
      if (a) {
        out.sources.pubmed = { ok: true };
        Object.assign(out, { pmidVerified: true, retracted: a.retracted, retractionNotice: a.retractionNotice, erratum: a.erratum, preprint: a.preprint, conference: a.conference, abstractOnly: a.abstractOnly, pmcid: a.pmcid, types: a.types, pubmedTitle: a.title, pubDate: a.pubDate, epubDate: a.epubDate });
        if (!doi && a.doi) doi = a.doi;
        if (!title) title = a.title;
      } else out.sources.pubmed = { ok: true, found: false };
    } catch (e) { out.sources.pubmed = { ok: false, error: String(e.message || e) }; }
  }
  if (doi) {
    try {
      const w = await crossrefWork(doi);
      out.sources.crossref = { ok: true };
      out.doiVerified = Boolean(w.doi);
      out.crossrefTitle = w.title;
      out.titleMatch = title ? norm(w.title).slice(0, 60) === norm(title).slice(0, 60) || norm(title).includes(norm(w.title).slice(0, 40)) : null;
      out.dates = { published: w.published, online: w.online, print: w.print };
      out.retracted = out.retracted || w.retracted;
      out.corrected = w.corrected || out.erratum || false;
      for (const u of w.updatedBy) out.notices.push({ type: u.type, doi: u.doi, date: u.date });
      if (w.isPreprintOf.length) out.notices.push({ type: 'preprint-of', doi: w.isPreprintOf[0] });
      if (w.type === 'posted-content') out.preprint = true;
    } catch (e) { out.sources.crossref = { ok: false, error: String(e.message || e) }; out.doiVerified = false; }
    try {
      const r = await epmcSearch(`DOI:"${doi}"`, { days: 36500, max: 3 });
      out.sources.europepmc = { ok: true };
      const hit = r[0];
      if (hit) { out.openAccess = hit.openAccess; out.fullText = hit.fullText; out.citedBy = hit.citedBy; if (hit.preprint) out.preprint = true; }
    } catch (e) { out.sources.europepmc = { ok: false, error: String(e.message || e) }; }
  }
  out.status = out.retracted ? 'retracted' : out.preprint ? 'preprint' : (out.doiVerified || out.pmidVerified) ? 'verified' : 'unverified';
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (Array.isArray(body.items)) {
      const items = body.items.slice(0, 15);
      const results = [];
      for (const it of items) results.push(await verify(it));
      return res.status(200).json({ results });
    }
    if (!body.doi && !body.pmid) return res.status(400).json({ error: 'doi-or-pmid-required' });
    return res.status(200).json(await verify(body));
  } catch (e) {
    return res.status(502).json({ error: 'verify-failed', detail: String((e && e.message) || e) });
  }
}
