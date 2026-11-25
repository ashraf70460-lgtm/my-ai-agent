// Shared Claude helper: one call with an optional PubMed tool loop.
// Env: ANTHROPIC_API_KEY, CLAUDE_MODEL (optional).
import { search, fetchArticles } from './_pubmed.js';

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


export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export async function runClaude({ system = '', messages, tools = false, maxTokens = 1200 }) {
  const payload = { model: MODEL(), max_tokens: Math.min(Math.max(parseInt(maxTokens, 10) || 1200, 200), 4000), messages };
  if (system) payload.system = String(system).slice(0, 12000);
  if (tools) payload.tools = TOOLS;
  let convo = messages;
  for (let turn = 0; turn < 5; turn++) {
    const out = await callClaude({ ...payload, messages: convo });
    if (out.stop_reason !== 'tool_use') {
      return (out.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
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
  return 'I searched several times but could not finish. Please ask a narrower question.';
}
