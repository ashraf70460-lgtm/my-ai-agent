// Medical books tracker (Google Books API): verified titles, editions, publishers, ISBNs and dates.
// GET ?q=...&newest=1&max=20  -> { books:[...], at }
import { books } from './_sources.js';

const PUBLISHERS = /elsevier|saunders|mosby|churchill|oxford|springer|cambridge|wiley|blackwell|mcgraw|wolters|lippincott|thieme|crc|taylor|jaypee|european respiratory society|american thoracic/i;
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=600');
  try {
    const q = String((req.query && req.query.q) || '').trim().slice(0, 200);
    if (!q) return res.status(400).json({ error: 'q-required' });
    const list = await books(q, { max: +(req.query.max || 20), newest: req.query.newest !== '0' });
    const ranked = list.map((b) => ({ ...b, reputable: PUBLISHERS.test(b.publisher) }))
      .sort((a, b) => (b.reputable - a.reputable) || String(b.date).localeCompare(String(a.date)));
    return res.status(200).json({ books: ranked, at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ error: 'books-failed', detail: String((e && e.message) || e) });
  }
}
