// Shared Claude helper with research tools.
// Env: ANTHROPIC_API_KEY, CLAUDE_MODEL (default claude-sonnet-5-5), CLAUDE_MODEL_DEEP (Deep Research; default = CLAUDE_MODEL),
//      WEB_SEARCH=off to disable Anthropic's server-side web search tool.
import { search, fetchArticles } from './_pubmed.js';
import { epmcSearch, ctgovSearch } from './_sources.js';
import { verify } from './verify.js';

const MODEL = () => process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
export const DEEP_MODEL = () => process.env.CLAUDE_MODEL_DEEP || MODEL();
export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

const TOOLS = [
  {
    name: 'pubmed_search',
    description: 'Search PubMed. Returns title, journal, dates, publication types, PMID, DOI, retraction/preprint flags and a short abstract. Use PubMed syntax with a few key terms.',
    input_schema: { type: 'object', properties: { query: { type: 'string' }, days: { type: 'number', description: 'Look-back window in days (default 1825).' }, max: { type: 'number', description: 'Up to 15.' }, sort: { type: 'string', enum: ['relevance', 'date'] } }, required: ['query'] }
  },
  {
    name: 'europepmc_search',
    description: 'Search Europe PMC (MEDLINE, PMC full text and preprints). Returns citation counts, open-access status and preprint flags.',
    input_schema: { type: 'object', properties: { query: { type: 'string' }, days: { type: 'number' }, max: { type: 'number' } }, required: ['query'] }
  },
  {
    name: 'trials_search',
    description: 'Search ClinicalTrials.gov for registered studies first posted in a window: status, phase, enrolment, sponsor, NCT id.',
    input_schema: { type: 'object', properties: { condition: { type: 'string' }, term: { type: 'string' }, days: { type: 'number' } }, required: ['condition'] }
  },
  {
    name: 'verify_reference',
    description: 'Verify a reference by DOI and/or PMID (Crossref + PubMed): confirms it exists, title match, retraction, corrections, preprint status, publication and online dates.',
    input_schema: { type: 'object', properties: { doi: { type: 'string' }, pmid: { type: 'string' }, title: { type: 'string' } } }
  }
];
const short = (a) => ({ pmid: a.pmid, doi: a.doi, title: a.title, journal: a.journal, date: a.date, epub: a.epubDate, types: a.types, retracted: a.retracted || undefined, preprint: a.preprint || undefined, citedBy: a.citedBy, abstract: String(a.abstract || '').slice(0, 900) });
async function runTool(name, input, log) {
  if (name === 'pubmed_search') {
    const ids = await search(String(input.query || ''), input.days || 1825, Math.min(+input.max || 10, 15), { sort: input.sort === 'date' ? 'pub_date' : 'relevance' });
    const arts = ids.length ? await fetchArticles(ids) : [];
    log.push(...arts.map((a) => ({ kind: 'paper', ...short(a) })));
    return arts.map(short);
  }
  if (name === 'europepmc_search') {
    const r = await epmcSearch(String(input.query || ''), { days: input.days || 1825, max: Math.min(+input.max || 10, 15) });
    log.push(...r.map((a) => ({ kind: 'paper', ...short(a) })));
    return r.map(short);
  }
  if (name === 'trials_search') {
    const r = await ctgovSearch(String(input.condition || ''), { term: input.term || '', days: input.days || 365, max: 10 });
    log.push(...r.map((x) => ({ kind: 'trial', nct: x.nct, title: x.title, url: x.url })));
    return r;
  }
  if (name === 'verify_reference') return verify(input || {});
  throw new Error('unknown tool ' + name);
}

async function callClaude(payload) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(payload)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || `Anthropic ${r.status}`); e.status = r.status; throw e; }
  return j;
}

/**
 * runClaude({ system, messages, tools, web, maxTokens, model, maxTurns }) -> { text, references, webSources, toolCalls }
 * tools: true for the research tools; web: true to add Anthropic's web search (falls back silently if not allowed).
 */
export async function runClaude({ system = '', messages, tools = false, web = false, maxTokens = 1200, model, maxTurns = 6 }) {
  const payload = { model: model || MODEL(), max_tokens: Math.min(Math.max(parseInt(maxTokens, 10) || 1200, 200), 16000), messages };
  if (system) payload.system = String(system).slice(0, 30000);
  const tl = [];
  if (tools) tl.push(...TOOLS);
  let useWeb = web && process.env.WEB_SEARCH !== 'off';
  if (useWeb) tl.push({ type: 'web_search_20250305', name: 'web_search', max_uses: 6 });
  if (tl.length) payload.tools = tl;
  const log = [], webSources = [];
  let toolCalls = 0, convo = messages, textParts = [];
  for (let turn = 0; turn < maxTurns; turn++) {
    let out;
    try { out = await callClaude({ ...payload, messages: convo }); }
    catch (e) {
      if (useWeb && /web_search|tool/i.test(e.message) && e.status === 400) {
        useWeb = false; payload.tools = tl.filter((t) => t.name !== 'web_search');
        if (!payload.tools.length) delete payload.tools;
        out = await callClaude({ ...payload, messages: convo });
      } else throw e;
    }
    for (const b of out.content || []) {
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) for (const s of b.content) if (s.url) webSources.push({ title: s.title, url: s.url, age: s.page_age || '' });
      if (b.type === 'text' && Array.isArray(b.citations)) for (const c of b.citations) if (c.url) webSources.push({ title: c.title, url: c.url });
    }
    const texts = (out.content || []).filter((b) => b.type === 'text').map((b) => b.text);
    if (out.stop_reason === 'pause_turn') { convo = [...convo, { role: 'assistant', content: out.content }]; textParts.push(...texts); continue; }
    if (out.stop_reason !== 'tool_use') {
      textParts.push(...texts);
      const seen = new Set();
      return {
        text: textParts.join('\n').trim(), toolCalls, webUsed: useWeb,
        references: log.filter((r) => { const k = r.pmid || r.doi || r.nct || r.title; if (seen.has(k)) return false; seen.add(k); return true; }),
        webSources: webSources.filter((s, i, a) => a.findIndex((x) => x.url === s.url) === i).slice(0, 40)
      };
    }
    const results = [];
    for (const b of out.content || []) {
      if (b.type !== 'tool_use') continue;
      toolCalls++;
      let content;
      try { content = JSON.stringify(await runTool(b.name, b.input || {}, log)).slice(0, 60000); }
      catch (e) { content = JSON.stringify({ error: String((e && e.message) || e) }); }
      results.push({ type: 'tool_result', tool_use_id: b.id, content });
    }
    convo = [...convo, { role: 'assistant', content: out.content }, { role: 'user', content: results }];
  }
  return { text: (textParts.join('\n') + '\n\n(The search budget ran out before a final answer; please narrow the question.)').trim(), references: log, webSources, toolCalls, webUsed: useWeb };
}
