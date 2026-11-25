// Pulmonologist app state, kept in Vercel Blob so it syncs across phone and computer.
// state.tasks = the scheduled agent's tasks and website sources (read by each agent run);
// the rest = topics, watches, lists and saved items. Reads are open; writes need APP_PIN.
import { put, list } from '@vercel/blob';

const PATH = 'state/state.json';

function configured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readState() {
  const { blobs } = await list({ prefix: PATH, limit: 1 });
  if (!blobs.length) return null;
  const r = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) return null;
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!configured()) {
    return res.status(501).json({ error: 'storage-not-configured' });
  }
  try {
    if (req.method === 'GET') {
      const state = await readState();
      return res.status(200).json({ state, pinRequired: Boolean(process.env.APP_PIN) });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const pin = req.headers['x-app-pin'] || '';
      if (process.env.APP_PIN && pin !== process.env.APP_PIN) {
        return res.status(401).json({ error: 'bad-pin' });
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object' || !Array.isArray(body.tasks)) {
        return res.status(400).json({ error: 'invalid-state' });
      }
      const state = {
        ...body,
        version: 2,
        updatedAt: new Date().toISOString(),
        tasks: body.tasks,
        saved: Array.isArray(body.saved) ? body.saved.slice(0, 500) : []
      };
      if (JSON.stringify(state).length > 900000) return res.status(413).json({ error: 'too-large' });
      await put(PATH, JSON.stringify(state, null, 2), {
        access: 'public',
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: 'application/json',
        cacheControlMaxAge: 60
      });
      return res.status(200).json({ ok: true, updatedAt: state.updatedAt });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'method-not-allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'server-error', detail: String(e && e.message || e) });
  }
}
