// Pulmonologist app: PubMed searches.
// POST { searches: [{ term, days, max, tag }] }  -> { papers: [...] }
// GET  ?term=...&days=365&max=5                    -> { papers: [...] }
import { runSearches } from './_pubmed.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    let list = [];
    if (req.method === 'GET') {
      const { term, days, max } = req.query || {};
      if (!term) return res.status(400).json({ error: 'term-required' });
      list = [{ term: String(term), days, max }];
    } else if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      list = Array.isArray(body.searches) ? body.searches.slice(0, 25) : [];
      list = list.filter((s) => s && typeof s.term === 'string' && s.term.trim()).map((s) => ({
        term: s.term.slice(0, 600), days: s.days, max: s.max, tag: String(s.tag || '').slice(0, 80)
      }));
      if (!list.length) return res.status(400).json({ error: 'no-searches' });
    } else {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'method-not-allowed' });
    }
    const papers = await runSearches(list);
    return res.status(200).json({ papers, at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ error: 'pubmed-failed', detail: String((e && e.message) || e) });
  }
}
