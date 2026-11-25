// Pulmonologist ↔ Telegram.
// Env: TELEGRAM_BOT_TOKEN (from @BotFather), TELEGRAM_CHAT_ID (your chat id; the bot tells you on /start),
//      CRON_SECRET (optional, set by Vercel for cron calls), APP_PIN, ANTHROPIC_API_KEY (for Q&A).
//
// GET  ?action=status                  -> { configured, chatSet }
// GET  ?action=setup&pin=PIN           -> registers this endpoint as the bot's webhook
// GET  ?action=digest                  -> sends the latest agent report to your chat (Vercel cron, daily)
// POST { action:"send", text }  + PIN  -> sends text from the app to your chat
// POST <Telegram update>               -> bot replies: /today, /papers <topic>, /guidelines, /events, or any question
import crypto from 'node:crypto';
import { search, fetchArticles, checkPin } from './_pubmed.js';
import { runClaude, claudeConfigured } from './_claude.js';

const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT = () => String(process.env.TELEGRAM_CHAT_ID || '');
const SECRET = () => crypto.createHash('sha256').update('pulmo:' + TOKEN()).digest('hex').slice(0, 48);
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const L = (v, lang = 'en') => (v && typeof v === 'object' ? v[lang] || v.en || '' : v || '');
const CAT = { websites: 'Websites', guidelines: 'Guidelines', papers: 'Papers', telegram: 'Telegram' };

async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN()}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  });
  return r.json().catch(() => ({}));
}
async function send(chatId, html) {
  const parts = [];
  let cur = '';
  for (const line of String(html).split('\n')) {
    if ((cur + line).length > 3800) { parts.push(cur); cur = ''; }
    cur += line + '\n';
  }
  if (cur.trim()) parts.push(cur);
  for (const p of parts) {
    const r = await tg('sendMessage', { chat_id: chatId, text: p, parse_mode: 'HTML', disable_web_page_preview: true });
    if (!r.ok) await tg('sendMessage', { chat_id: chatId, text: p.replace(/<[^>]+>/g, ''), disable_web_page_preview: true });
  }
}
function mdToHtml(md) {
  return esc(md).split('\n').map((l) => {
    if (/^#{1,4}\s/.test(l)) return '<b>' + l.replace(/^#+\s/, '') + '</b>';
    return l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[-*]\s+/, '• ');
  }).join('\n');
}
const origin = (req) => `https://${req.headers['x-forwarded-host'] || req.headers.host}`;

async function latestDigest(req) {
  const idx = await (await fetch(`${origin(req)}/data/digests/index.json`, { cache: 'no-store' })).json();
  const list = (idx.digests || []).slice().sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  if (!list.length) return null;
  return (await fetch(`${origin(req)}/data/digests/${list[0].file}`, { cache: 'no-store' })).json();
}
function digestHtml(d, req, lang = 'en') {
  const out = [`🫁 <b>${esc(L(d.title, lang))}</b>`, `<i>${esc(d.date)}</i>`];
  if (d.topPick) out.push('', `⭐ ${esc(L(d.topPick, lang))}`);
  const groups = {};
  for (const s of d.sections || []) (groups[s.category || 'websites'] ||= []).push(s);
  for (const cat of ['guidelines', 'papers', 'websites', 'telegram']) {
    const secs = groups[cat];
    if (!secs) continue;
    const lines = [];
    for (const s of secs) for (const it of s.items || []) {
      const h = L(it.headline, lang);
      if (!h || /^no new updates|preview unavailable|couldn't read/i.test(L(it.headline, 'en'))) continue;
      const head = it.url ? `<a href="${esc(it.url)}">${esc(h)}</a>` : esc(h);
      lines.push(`${it.star ? '⭐' : '•'} ${head} <i>(${esc(s.source)})</i>`);
    }
    if (lines.length) out.push('', `<b>${CAT[cat]}</b>`, ...lines.slice(0, 8));
  }
  out.push('', `Full report: ${origin(req)}/#report/${encodeURIComponent(d.id)}`);
  return out.join('\n');
}

async function papersHtml(topic) {
  const ids = await search(`(${topic}[Title/Abstract]) AND english[Language]`, 30, 6);
  if (!ids.length) return `No new PubMed papers on <b>${esc(topic)}</b> in the last 30 days.`;
  const arts = await fetchArticles(ids);
  return [`📄 <b>New on PubMed: ${esc(topic)}</b> (30 days)`, ...arts.map((a) =>
    `• <a href="${a.doi ? 'https://doi.org/' + esc(a.doi) : 'https://pubmed.ncbi.nlm.nih.gov/' + a.pmid + '/'}">${esc(a.title)}</a> <i>${esc(a.journal)}, ${esc(a.date)}</i>`)].join('\n');
}

async function readState(req) {
  try { const j = await (await fetch(`${origin(req)}/api/state`, { cache: 'no-store' })).json(); return j.state || {}; } catch { return {}; }
}

const HELP = [
  '🫁 <b>Pulmonologist</b>, your respiratory medicine agent.',
  '',
  '/today: latest agent report (websites, guidelines, papers, Telegram)',
  '/papers <i>topic</i>: newest PubMed papers, e.g. /papers bronchiectasis',
  '/guidelines: newest guideline and consensus papers',
  '/events: upcoming conferences',
  'Or just ask a question in English or Arabic.'
].join('\n');

async function onUpdate(req, update) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.chat) return;
  const chatId = String(msg.chat.id);
  const text = String(msg.text || '').trim();
  if (CHAT() && chatId !== CHAT()) {
    await send(chatId, `This is a private agent. Your chat ID is <code>${esc(chatId)}</code>.`);
    return;
  }
  if (!CHAT()) {
    await send(chatId, `Your chat ID is <code>${esc(chatId)}</code>. Add it in Vercel as <b>TELEGRAM_CHAT_ID</b> and redeploy to make this bot private and receive daily reports.`);
  }
  const lang = /[؀-ۿ]/.test(text) ? 'ar' : 'en';
  const [cmd, ...rest] = text.split(/\s+/);
  const arg = rest.join(' ').trim();
  try {
    if (/^\/(start|help)/.test(cmd)) return send(chatId, HELP);
    if (/^\/today/.test(cmd)) { const d = await latestDigest(req); return send(chatId, d ? digestHtml(d, req, lang) : 'No report yet.'); }
    if (/^\/papers/.test(cmd)) return send(chatId, await papersHtml(arg || 'COPD'));
    if (/^\/guidelines/.test(cmd)) {
      const ids = await search('(guideline[Title] OR consensus[Title] OR "Practice Guideline"[Publication Type]) AND (lung OR respiratory OR pulmonary OR asthma OR COPD)', 60, 8);
      const arts = ids.length ? await fetchArticles(ids) : [];
      return send(chatId, ['📘 <b>New guideline and consensus papers</b> (60 days)', ...arts.map((a) => `• <a href="https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/">${esc(a.title)}</a> <i>${esc(a.journal)}</i>`)].join('\n') || 'None found.');
    }
    if (/^\/events/.test(cmd)) {
      const st = await readState(req);
      const today = new Date().toISOString().slice(0, 10);
      const ev = (st.events || []).filter((e) => (e.end || e.start) >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 8);
      return send(chatId, ev.length ? ['📅 <b>Coming up</b>', ...ev.map((e) => `• <b>${esc(e.title)}</b>: ${esc(e.start)}${e.end && e.end !== e.start ? ' → ' + esc(e.end) : ''}, ${esc(e.place || '')}`)].join('\n') : 'Open the app once so your conference list syncs, then try again.');
    }
    if (!claudeConfigured()) return send(chatId, 'Questions need ANTHROPIC_API_KEY on Vercel. Commands still work: /help');
    await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
    const answer = await runClaude({
      system: `You are "Pulmonologist", an AI agent that keeps a consultant pulmonologist up to date. Today is ${new Date().toDateString()}. Answer in the language of the question (Arabic answers keep drug and trial names in English). Be concise (under 250 words) and clinical. Use pubmed_search for recent evidence and cite PMIDs; never invent references.`,
      messages: [{ role: 'user', content: text.slice(0, 4000) }], tools: true, maxTokens: 1200
    });
    return send(chatId, mdToHtml(answer));
  } catch (e) {
    return send(chatId, 'Sorry, something went wrong: ' + esc((e && e.message) || e));
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const action = (req.query && req.query.action) || '';
  if (req.method === 'GET' && action === 'status') return res.status(200).json({ configured: Boolean(TOKEN()), chatSet: Boolean(CHAT()) });
  if (!TOKEN()) return res.status(501).json({ error: 'telegram-not-configured' });
  try {
    if (req.method === 'GET' && action === 'setup') {
      if (process.env.APP_PIN && req.query.pin !== process.env.APP_PIN) return res.status(401).json({ error: 'bad-pin' });
      const r = await tg('setWebhook', { url: `${origin(req)}/api/telegram`, secret_token: SECRET(), allowed_updates: ['message', 'edited_message'] });
      await tg('setMyCommands', { commands: [
        { command: 'today', description: 'Latest agent report' }, { command: 'papers', description: 'New PubMed papers on a topic' },
        { command: 'guidelines', description: 'New guideline papers' }, { command: 'events', description: 'Upcoming conferences' }, { command: 'help', description: 'How to use' }] });
      return res.status(200).json({ ok: Boolean(r.ok), telegram: r.description || '' });
    }
    if (req.method === 'GET' && action === 'digest') {
      if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
      if (!CHAT()) return res.status(400).json({ error: 'no-chat-id' });
      const d = await latestDigest(req);
      if (!d) return res.status(200).json({ ok: true, sent: false });
      const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
      if (d.date !== today) return res.status(200).json({ ok: true, sent: false, reason: 'no report today yet' });
      await send(CHAT(), digestHtml(d, req));
      return res.status(200).json({ ok: true, sent: true });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      if (body.action === 'send') {
        if (!checkPin(req)) return res.status(401).json({ error: 'bad-pin' });
        if (!CHAT()) return res.status(400).json({ error: 'no-chat-id' });
        await send(CHAT(), mdToHtml(String(body.text || '').slice(0, 8000)));
        return res.status(200).json({ ok: true });
      }
      if (req.headers['x-telegram-bot-api-secret-token'] !== SECRET()) return res.status(401).json({ error: 'unauthorized' });
      await onUpdate(req, body);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method-not-allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'telegram-failed', detail: String((e && e.message) || e) });
  }
}
