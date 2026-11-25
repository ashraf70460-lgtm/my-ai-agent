// Pulmonologist app: Claude (briefings, explanations, suggestions, chat).
// GET  -> { configured, pinRequired }
// POST { system, messages:[{role,content}], tools:true|false, maxTokens } -> { text }
import { checkPin } from './_pubmed.js';
import { runClaude, claudeConfigured } from './_claude.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const configured = claudeConfigured();
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
    const text = await runClaude({ system: body.system, messages, tools: Boolean(body.tools), maxTokens: body.maxTokens });
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: 'claude-failed', detail: String((e && e.message) || e) });
  }
}
