// Pulmonologist app: settings, tasks, lists and saved papers, synced across devices
// through the same Vercel Blob store as My Agent (separate file). Writes need APP_PIN if set.
import { put, list } from '@vercel/blob';
import { checkPin } from './_pubmed.js';

const PATH = 'state/pulmonologist.json';

async function readState() {
  const { blobs } = await list({ prefix: PATH, limit: 1 });
  if (!blobs.length) return null;
  const r = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' });
  return r.ok ? r.json() : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(501).json({ error: 'storage-not-configured' });
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ state: await readState(), pinRequired: Boolean(process.env.APP_PIN) });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      if (!checkPin(req)) return res.status(401).json({ error: 'bad-pin' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object' || !Array.isArray(body.topics)) return res.status(400).json({ error: 'invalid-state' });
      const json = JSON.stringify({ ...body, updatedAt: new Date().toISOString() });
      if (json.length > 900000) return res.status(413).json({ error: 'too-large' });
      await put(PATH, json, { access: 'public', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 });
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'method-not-allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'server-error', detail: String((e && e.message) || e) });
  }
}
