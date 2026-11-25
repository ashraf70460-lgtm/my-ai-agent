// Pulmonologist app: Claude (briefings, explanations, suggestions, chat).
// Env: ANTHROPIC_API_KEY (required for AI features), CLAUDE_MODEL (optional), APP_PIN (optional guard).
// GET  -> { configured, pinRequired }
// POST { system, messages:[{role,content}], tools:true|false, maxTokens } -> { text }
import { search, fetchArticles, checkPin } from './_pubmed.js';

const MODEL = () => process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';

const TOOLS = [{
  name: 'pubmed_search',
  description: 'Search PubMed for recent articles. Returns title, journal, date, publication type, PMID, DOI and a short abstract.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'PubMed query: a few key terms; may use [Title/Abstract], [Author] or [Publication Type].' },
      days: { type: 'number', description: 'Look-back window in days (default 365).' }
    },
    required: ['query']
  }
}];

async function runTool(input) {
  const ids = await search(String(input.query || ''), input.days || 365, 8);
  if (!ids.length) return [];
  const arts = await fetchArticles(ids);
  return arts.map((a) => ({ pmid: a.pmid, doi: a.doi, title: a.title, journal: a.journal, date: a.date, types: a.types, abstract: a.abstract.slice(0, 700) }));
}

async function callClaude(payload) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(payload)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || `Anthropic ${r.status}`);
  return j;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  if (req.method === 'GET') return res.status(200).json({ configured, pinRequired: Boolean(process.env.APP_PIN) });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'method-not-allowed' }); }
  if (!configured) return res.status(501).json({ error: 'no-key' });
  if (!checkPin(req)) return res.status(401).json({ error: 'bad-pin' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 24000) }));
    if (!messages.length || messages[messages.length - 1].role !== 'user') return res.status(400).json({ error: 'bad-messages' });
    const payload = {
      model: MODEL(),
      max_tokens: Math.min(Math.max(parseInt(body.maxTokens, 10) || 1200, 200), 4000),
      system: String(body.system || '').slice(0, 12000) || undefined,
      messages
    };
    if (body.tools) payload.tools = TOOLS;
    let convo = messages;
    for (let turn = 0; turn < 5; turn++) {
      const out = await callClaude({ ...payload, messages: convo });
      if (out.stop_reason !== 'tool_use') {
        const text = (out.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        return res.status(200).json({ text });
      }
      const results = [];
      for (const b of out.content || []) {
        if (b.type !== 'tool_use') continue;
        let content;
        try { content = JSON.stringify(await runTool(b.input || {})); }
        catch (e) { content = JSON.stringify({ error: String((e && e.message) || e) }); }
        results.push({ type: 'tool_result', tool_use_id: b.id, content });
      }
      convo = [...convo, { role: 'assistant', content: out.content }, { role: 'user', content: results }];
    }
    return res.status(200).json({ text: 'I searched several times but could not finish. Please ask a narrower question.' });
  } catch (e) {
    return res.status(502).json({ error: 'claude-failed', detail: String((e && e.message) || e) });
  }
}
