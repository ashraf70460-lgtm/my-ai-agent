// Personal library documents (AI reports, uploaded PDFs, long notes) stored privately-by-URL in Vercel Blob.
// GET            -> { docs:[{id,title,kind,size,uploadedAt}] }
// GET ?id=ID     -> the stored JSON document (reports/notes) or { url } for PDFs
// PUT { id?, title, kind:"report"|"note", content }          (PIN)  -> { id }
// PUT { id?, title, kind:"pdf", base64 }  (≤ 4 MB)            (PIN)  -> { id, url }
// DELETE ?id=ID                                               (PIN)
import { put, list, del } from '@vercel/blob';
import crypto from 'node:crypto';
import { checkPin } from './_pubmed.js';

const PREFIX = 'library/';
const safeId = (s) => String(s || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(501).json({ error: 'storage-not-configured' });
  try {
    const id = safeId(req.query && req.query.id);
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
      if (id) {
        const b = blobs.find((x) => x.pathname.startsWith(PREFIX + id + '.'));
        if (!b) return res.status(404).json({ error: 'not-found' });
        if (b.pathname.endsWith('.pdf')) return res.status(200).json({ id, url: b.url });
        const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
        return res.status(200).json(await r.json());
      }
      return res.status(200).json({ docs: blobs.map((b) => ({ id: b.pathname.slice(PREFIX.length).replace(/\.(json|pdf)$/, ''), file: b.pathname, size: b.size, uploadedAt: b.uploadedAt })) });
    }
    if (!checkPin(req)) return res.status(401).json({ error: 'bad-pin' });
    if (req.method === 'PUT' || req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const nid = safeId(body.id) || crypto.randomBytes(9).toString('base64url');
      if (body.kind === 'pdf') {
        const buf = Buffer.from(String(body.base64 || ''), 'base64');
        if (!buf.length || buf.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'pdf-too-large', detail: 'Maximum 4 MB' });
        if (buf.slice(0, 4).toString() !== '%PDF') return res.status(400).json({ error: 'not-a-pdf' });
        const b = await put(PREFIX + nid + '.pdf', buf, { access: 'public', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/pdf' });
        return res.status(200).json({ id: nid, url: b.url });
      }
      const doc = { id: nid, title: String(body.title || 'Untitled').slice(0, 300), kind: body.kind === 'note' ? 'note' : 'report', meta: body.meta || {}, content: String(body.content || '').slice(0, 400000), savedAt: new Date().toISOString() };
      await put(PREFIX + nid + '.json', JSON.stringify(doc), { access: 'public', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 });
      return res.status(200).json({ id: nid });
    }
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id-required' });
      const { blobs } = await list({ prefix: PREFIX + id + '.', limit: 5 });
      if (blobs.length) await del(blobs.map((b) => b.url));
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method-not-allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'docs-failed', detail: String((e && e.message) || e) });
  }
}
