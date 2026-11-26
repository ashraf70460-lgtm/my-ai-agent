/* PULMONOLOGIST-AGENT — core: state, i18n, API, sync, router, shared UI.
   Views register with PA.view(name, {render(el, arg)}) in /js/v-*.js. No build step. */
(() => {
const SEED = window.PULMO_SEED, SEED_V = window.PULMO_SEED_VERSION || 1;
const KEY = 'pulmo-agent-v2', PINKEY = 'pulmo-pin', CACHE = 'pulmo-cache-v3';
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safe = (u) => { u = String(u || '').trim(); return /^https:\/\//i.test(u) ? u : ''; };
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = (o) => JSON.parse(JSON.stringify(o));
const PURGE = /belalfadel|t\.me\//i;

/* ---------- i18n ---------- */
const T = { en: {}, ar: {} };
function i18n(dict) { for (const l of ['en', 'ar']) Object.assign(T[l], dict[l] || {}); }
i18n({
  en: { home: 'Today', research: 'Research', radar: 'Radar', guidelines: 'Guidelines', trials: 'Trials', topics: 'Topics', briefings: 'Briefings', library: 'Library', books: 'Books', more: 'More', settings: 'Settings', save: 'Save', saved: 'Saved', open: 'Open', remove: 'Remove', add: 'Add', close: 'Close', cancel: 'Cancel', back: 'Back', pdf: 'PDF', copy: 'Copy', copied: 'Copied', run: 'Run', search: 'Search', thinking: 'Working…', all: 'All', none: 'None', days: 'days', today: 'Today', new: 'New', loading: 'Loading…', noResults: 'Nothing found.', error: 'Error', verify: 'Verify', appraise: 'Appraise', explain: 'Explain', saveLib: 'Save to library', noAI: 'This needs Claude: add ANTHROPIC_API_KEY in Vercel. Searches and lists work without it.', badPin: 'Wrong or missing PIN. Enter your app PIN in Settings.', offline: "You're offline. Showing saved results.", lastUpdated: 'Last updated', sourcesLbl: 'Sources', abstractOnly: 'Abstract only', openAccess: 'Open access', preprint: 'Preprint — not peer reviewed', retracted: 'RETRACTED', erratum: 'Correction published', conference: 'Conference abstract', dupMerged: 'merged from', online: 'online', published: 'published', citations: 'citations', educational: 'Educational research support — not individualised patient management.', concise: 'Concise', comprehensive: 'Comprehensive', topJournal: 'Top journal', install: 'Install', greet: ['Good morning, Dr. Ashraf.', 'Good afternoon, Dr. Ashraf.', 'Good evening, Dr. Ashraf.'] },
  ar: { home: 'اليوم', research: 'البحث', radar: 'الرادار', guidelines: 'الإرشادات', trials: 'التجارب', topics: 'التخصصات', briefings: 'الملخصات', library: 'المكتبة', books: 'الكتب', more: 'المزيد', settings: 'الإعدادات', save: 'حفظ', saved: 'محفوظ', open: 'فتح', remove: 'حذف', add: 'إضافة', close: 'إغلاق', cancel: 'إلغاء', back: 'رجوع', pdf: 'PDF', copy: 'نسخ', copied: 'تم النسخ', run: 'تشغيل', search: 'بحث', thinking: 'جارٍ العمل…', all: 'الكل', none: 'لا شيء', days: 'يوم', today: 'اليوم', new: 'جديد', loading: 'جارٍ التحميل…', noResults: 'لا توجد نتائج.', error: 'خطأ', verify: 'تحقّق', appraise: 'تقييم نقدي', explain: 'اشرح', saveLib: 'حفظ في المكتبة', noAI: 'هذه الميزة تحتاج Claude: أضف ANTHROPIC_API_KEY في Vercel. البحث والقوائم تعمل بدونه.', badPin: 'الرمز غير صحيح أو مفقود. أدخل رمز التطبيق في الإعدادات.', offline: 'أنت غير متصل. تُعرض النتائج المحفوظة.', lastUpdated: 'آخر تحديث', sourcesLbl: 'المصادر', abstractOnly: 'الملخص فقط', openAccess: 'وصول مفتوح', preprint: 'نسخة أولية — غير محكّمة', retracted: 'مسحوب', erratum: 'نُشر تصحيح', conference: 'ملخص مؤتمر', dupMerged: 'مدمج من', online: 'إلكترونيًا', published: 'نُشر', citations: 'استشهاد', educational: 'دعم بحثي تعليمي — وليس إدارة علاجية فردية.', concise: 'مختصر', comprehensive: 'شامل', topJournal: 'مجلة كبرى', install: 'تثبيت', greet: ['صباح الخير د. أشرف.', 'مساء الخير د. أشرف.', 'مساء الخير د. أشرف.'] }
});

/* ---------- state ---------- */
function fresh() {
  return { v: SEED_V, schema: 3, name: 'PULMONOLOGIST-AGENT', lang: 'en', theme: 'system', days: 14, topOnly: false, guideOn: 1, brief: 1,
    topics: clone(SEED.topics), watches: [], tasks: [], guidelines: clone(SEED.guidelines), watch: clone(SEED.watch), events: clone(SEED.events),
    videos: clone(SEED.videos), people: clone(SEED.people), books: clone(SEED.books), sources: clone(SEED.sources).filter((s) => s.kind !== 'telegram'),
    removed: [], saved: [], folders: ['Reading list', 'Teaching', 'Guidelines'], history: [], seen: {}, run: null, sync: {}, researchLang: 'en', depth: 'comprehensive', edited: 0 };
}
function normSaved(x) {
  if (!x) return null;
  if (x.kind && x.id) return { folder: '', tags: [], note: '', read: false, importance: '', ...x };
  const base = { folder: '', tags: [], note: '', read: false, importance: '', savedAt: x.savedAt || Date.now() };
  if (x.pmid) return { ...base, id: 'pm:' + x.pmid, kind: 'paper', title: x.title, url: x.doi ? 'https://doi.org/' + x.doi : 'https://pubmed.ncbi.nlm.nih.gov/' + x.pmid + '/', journal: x.journal, date: x.date, data: x };
  if (x.key) { const it = x.item || {}; return { ...base, id: 'ri:' + x.key, kind: 'report-item', title: (it.headline && (it.headline.en || it.headline.ar)) || '', url: it.url || '', date: x.date, source: x.source, data: x }; }
  return null;
}
function fixTask(k) {
  k = { ...k };
  k.sources = (k.sources || []).filter((x) => x.type !== 'telegram' && x.type !== 'x' && !PURGE.test(x.url || ''));
  k.sections = { websites: true, guidelines: true, papers: true, ...(k.sections || {}) };
  delete k.sections.telegram;
  return k;
}
function load(o) {
  const s = Object.assign(fresh(), o || {});
  if ((s.v || 0) < SEED_V) {
    for (const k of ['guidelines', 'watch', 'events', 'videos', 'people', 'books', 'sources']) {
      const have = new Set(s[k].map((x) => x.id));
      SEED[k].forEach((x) => { if (!have.has(x.id) && !s.removed.includes(x.id) && x.kind !== 'telegram') s[k].push(clone(x)); });
    }
    s.v = SEED_V;
  }
  s.sources = s.sources.filter((x) => x.kind !== 'telegram' && !PURGE.test(x.url || ''));
  s.people = s.people.filter((x) => !PURGE.test(x.url || ''));
  s.tasks = (s.tasks || []).map(fixTask);
  s.saved = (s.saved || []).map(normSaved).filter(Boolean);
  s.folders = Array.isArray(s.folders) ? s.folders : fresh().folders;
  s.history = (s.history || []).slice(0, 200);
  if (!s.seen || typeof s.seen !== 'object') s.seen = {};
  if (!s.name || s.name === 'Pulmonologist') s.name = 'PULMONOLOGIST-AGENT';
  s.schema = 3;
  return s;
}
let S = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) S = load(JSON.parse(raw)); else { const old = JSON.parse(localStorage.getItem('ma.saved') || '[]'); if (Array.isArray(old)) S.saved = old.map(normSaved).filter(Boolean); } } catch (e) {}
let PIN = ''; try { PIN = localStorage.getItem(PINKEY) || JSON.parse(localStorage.getItem('ma.pin') || '""') || ''; } catch (e) {}
const t = (k) => (T[S.lang] || T.en)[k] ?? T.en[k] ?? k;
const L = (v) => (v && typeof v === 'object' ? v[S.lang] || v.en || v.ar || '' : v || '');

/* local cache (not synced): large search results */
let C = {}; try { C = JSON.parse(localStorage.getItem(CACHE) || '{}'); } catch (e) {}
const cache = { get: (k) => C[k], set: (k, v) => { C[k] = v; try { localStorage.setItem(CACHE, JSON.stringify(C)); } catch (e) { C = { [k]: v }; try { localStorage.setItem(CACHE, JSON.stringify(C)); } catch (x) {} } } };

/* ---------- server ---------- */
const status = { ai: false, sync: false, ready: false };
async function api(path, opts = {}) {
  let r;
  try { r = await fetch(path, { method: opts.method || 'GET', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'x-app-pin': PIN }, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: opts.signal }); }
  catch (e) { const err = new Error(navigator.onLine ? 'Network error' : t('offline')); err.code = 'network'; throw err; }
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { const err = new Error(j.detail || j.error || 'HTTP ' + r.status); err.code = j.error || r.status; throw err; }
  return j;
}
function errMsg(e) { if (!navigator.onLine) return t('offline'); if (e && e.code === 'bad-pin') return t('badPin'); if (e && e.code === 'no-key') return t('noAI'); return (e && e.message) || t('error'); }
const research = (action, body = {}) => api('/api/research', { method: 'POST', body: { action, lang: S.researchLang || S.lang, ...body } });
let saving = false, again = false, timer = null;
function save() { S.edited = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} clearTimeout(timer); timer = setTimeout(flush, 1200); }
async function flush() {
  if (!status.sync || !status.ready || !S.tasks.length) return;
  if (saving) { again = true; return; }
  saving = true;
  try { await api('/api/state', { method: 'PUT', body: S }); } catch (e) { if (e.code === 'bad-pin' && PIN) toast(t('badPin')); }
  saving = false; if (again) { again = false; flush(); }
}
function setPin(p) { PIN = p; try { localStorage.setItem(PINKEY, p); } catch (e) {} }

/* ---------- formatting ---------- */
const loc = () => (S.lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB');
const pd = (s) => { const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(s || ''); return m ? new Date(+m[1], m[2] - 1, +(m[3] || 1)) : null; };
const fmtD = (s) => { const d = pd(s); if (!d) return esc(s || ''); return d.toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }); };
const fmtT = (ms) => (ms ? new Date(ms).toLocaleString(loc(), { dateStyle: 'medium', timeStyle: 'short' }) : '–');
const ago = (ms) => { if (!ms) return '–'; const m = Math.round((Date.now() - ms) / 60000); if (m < 1) return S.lang === 'ar' ? 'الآن' : 'just now'; if (m < 60) return m + (S.lang === 'ar' ? ' د' : ' min ago'); const h = Math.round(m / 60); if (h < 48) return h + (S.lang === 'ar' ? ' س' : ' h ago'); return Math.round(h / 24) + (S.lang === 'ar' ? ' يوم' : ' days ago'); };
function inline(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/\bPMID:?\s?(\d{6,9})\b/g, '<a href="https://pubmed.ncbi.nlm.nih.gov/$1/" target="_blank" rel="noopener">PMID $1</a>');
}
function md(src) {
  const lines = esc(src || '').split(/\r?\n/);
  let h = '', list = null, i = 0;
  const close = () => { if (list) { h += `</${list}>`; list = null; } };
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      close();
      const row = (x) => x.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = row(l); i += 2;
      let body = '';
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { body += '<tr>' + row(lines[i]).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>'; i++; }
      h += `<div class="scroll"><table class="tbl"><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
      continue;
    }
    let m;
    if ((m = /^(#{1,4})\s+(.*)/.exec(l))) { close(); const n = Math.min(m[1].length + 1, 5); h += `<h${n}>${inline(m[2])}</h${n}>`; }
    else if ((m = /^\s*[-•*]\s+(.*)/.exec(l))) { if (list !== 'ul') { close(); h += '<ul>'; list = 'ul'; } h += `<li>${inline(m[1])}</li>`; }
    else if ((m = /^\s*\d+[.)]\s+(.*)/.exec(l))) { if (list !== 'ol') { close(); h += '<ol>'; list = 'ol'; } h += `<li>${inline(m[1])}</li>`; }
    else if (/^\s*(-{3,}|_{3,})\s*$/.test(l)) { close(); h += '<hr>'; }
    else if (l.trim()) { close(); h += `<p>${inline(l)}</p>`; }
    else close();
    i++;
  }
  close();
  return h;
}

/* ---------- UI helpers ---------- */
let tt; function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), 3200); }
function modal(title, html, { wide = false } = {}) {
  const d = $('#modal'); d.classList.toggle('wide', wide);
  $('#modalTitle').textContent = title; $('#modalBody').innerHTML = html;
  try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
  return $('#modalBody');
}
const closeModal = () => { const d = $('#modal'); try { d.close(); } catch (e) { d.removeAttribute('open'); } };
const pUrl = (a) => (a.doi ? 'https://doi.org/' + encodeURI(a.doi) : a.pmid ? 'https://pubmed.ncbi.nlm.nih.gov/' + encodeURIComponent(a.pmid) + '/' : safe(a.url));
const EV_CLASS = { Guideline: 'g', 'Meta-analysis': 'm', 'Systematic review': 'm', RCT: 'r', 'Clinical trial': 'r', Retracted: 'x', Preprint: 'p' };
function evidenceOf(a) {
  if (a.evidence) return a.evidence;
  const ty = (a.types || []).join(' ').toLowerCase(), ti = String(a.title || '').toLowerCase();
  if (a.retracted) return 'Retracted';
  if (/guideline/.test(ty) || /\bguideline|consensus|official .*statement/.test(ti)) return 'Guideline';
  if (/meta-analysis/.test(ty)) return 'Meta-analysis';
  if (/systematic review/.test(ty)) return 'Systematic review';
  if (/randomized controlled/.test(ty)) return 'RCT';
  if (/review/.test(ty)) return 'Review';
  if (a.preprint) return 'Preprint';
  return 'Article';
}
const TOPJ = ['n engl j med', 'lancet', 'lancet respir med', 'am j respir crit care med', 'eur respir j', 'thorax', 'chest', 'jama', 'bmj', 'nat med', 'eur respir rev', 'ann am thorac soc', 'erj open res', 'respir med', 'crit care', 'intensive care med', 'crit care med', 'j thorac oncol', 'sleep', 'j clin sleep med', 'cochrane database syst rev'];
const isTop = (a) => TOPJ.includes(String(a.jabbr || a.journal || '').toLowerCase().replace(/\./g, '').trim());
function flags(a) {
  const f = [];
  if (a.retracted) f.push(`<span class="flag x">${esc(t('retracted'))}</span>`);
  if (a.preprint) f.push(`<span class="flag p">${esc(t('preprint'))}</span>`);
  if (a.erratum) f.push(`<span class="flag w">${esc(t('erratum'))}</span>`);
  if (a.conference) f.push(`<span class="flag w">${esc(t('conference'))}</span>`);
  return f.join('');
}
function isNew(a) { return a.pmid && S.seen[a.pmid] && Date.now() - S.seen[a.pmid] < 36e5 * 6; }
function markSeen(list) {
  let n = 0; const now = Date.now();
  for (const a of list || []) if (a.pmid && !S.seen[a.pmid]) { S.seen[a.pmid] = now; n++; }
  const keys = Object.keys(S.seen);
  if (keys.length > 3000) keys.sort((a, b) => S.seen[a] - S.seen[b]).slice(0, keys.length - 3000).forEach((k) => delete S.seen[k]);
  return n;
}
function paperCard(a, o = {}) {
  const ev = evidenceOf(a), url = pUrl(a), id = 'pm:' + (a.pmid || a.doi || a.title);
  const sv = lib.has(id);
  const payload = esc(JSON.stringify({ pmid: a.pmid, doi: a.doi, title: a.title, journal: a.journal, jabbr: a.jabbr, date: a.date, epubDate: a.epubDate, pubDate: a.pubDate, authors: a.authors, types: a.types, abstract: String(a.abstract || '').slice(0, 1500), retracted: a.retracted, preprint: a.preprint, topic: a.topic }));
  return `<article class="item paper" data-paper="${payload}">
  <div class="meta"><span class="ev ev-${EV_CLASS[ev] || 'a'}">${esc(ev)}</span>${isTop(a) ? `<span class="badge ok">${esc(t('topJournal'))}</span>` : ''}${isNew(a) ? `<span class="badge new">${esc(t('new'))}</span>` : ''}${flags(a)}<span>${esc(a.journal || '')}</span><span>${fmtD(a.date)}</span>${a.epubDate && a.epubDate !== a.pubDate ? `<span class="small">${esc(t('online'))} ${esc(a.epubDate)}</span>` : ''}${a.topic && !o.noTopic ? `<span>· ${esc(a.topic)}</span>` : ''}</div>
  <a class="ttl" data-track href="${esc(url)}" target="_blank" rel="noopener">${esc(a.title)}</a>
  <div class="small">${esc(a.authors || '')}${a.doi ? ` · DOI ${esc(a.doi)}` : ''}${a.pmid ? ` · PMID ${esc(a.pmid)}` : ''}${a.citedBy ? ` · ${a.citedBy} ${esc(t('citations'))}` : ''}${a.sources && a.sources.length > 1 ? ` · ${esc(t('dupMerged'))} ${esc(a.sources.join(' + '))}` : ''}${a.openAccess ? ` · <span class="okt">${esc(t('openAccess'))}</span>` : a.src === 'pubmed' && a.abstractOnly ? ` · ${esc(t('abstractOnly'))}` : ''}</div>
  ${!o.compact && a.abstract ? `<details><summary>Abstract</summary><p>${esc(a.abstract)}</p></details>` : ''}
  <div class="acts"><button class="btn star" type="button" data-savepaper aria-pressed="${sv}">${sv ? '★ ' + esc(t('saved')) : '☆ ' + esc(t('save'))}</button>${o.compact ? '' : `<button class="btn" type="button" data-appraise>${esc(t('appraise'))}</button><button class="btn" type="button" data-verify>${esc(t('verify'))}</button>`}${a.fullText ? `<a class="btn" href="${esc(safe(a.fullText))}" target="_blank" rel="noopener">Full text</a>` : ''}</div>
  <div class="out" data-out></div></article>`;
}
const empty = (msg) => `<p class="empty">${esc(msg)}</p>`;
const sw = (on, attr) => `<button class="switch" type="button" role="switch" aria-checked="${!!on}" ${attr} aria-label="On/off"></button>`;

/* ---------- library ---------- */
const lib = {
  has: (id) => S.saved.some((x) => x.id === id),
  get: (id) => S.saved.find((x) => x.id === id),
  add(item) { if (!item || lib.has(item.id)) return; S.saved.unshift({ folder: '', tags: [], note: '', read: false, importance: '', savedAt: Date.now(), ...item }); save(); },
  remove(id) { S.saved = S.saved.filter((x) => x.id !== id); save(); },
  toggle(item) { if (lib.has(item.id)) { lib.remove(item.id); return false; } lib.add(item); return true; },
  paperItem(a) { return { id: 'pm:' + (a.pmid || a.doi || a.title), kind: 'paper', title: a.title, url: pUrl(a), journal: a.journal, date: a.date, year: String(a.date || '').slice(0, 4), type: evidenceOf(a), subspecialty: a.topic || '', data: a }; }
};
function track(title, url, kind = 'link') { if (!url) return; S.history.unshift({ t: Date.now(), title: String(title || url).slice(0, 200), url, kind }); S.history = S.history.slice(0, 200); save(); }

/* ---------- router ---------- */
const views = {}, order = ['home', 'research', 'radar', 'guidelines', 'trials', 'topics', 'briefings', 'library', 'books', 'more'];
const LEGACY = { today: 'home', papers: 'radar', ask: 'research/clinical', saved: 'library', reports: 'briefings', archive: 'briefings', agent: 'more/agent', tasks: 'more/agent', events: 'more/events', videos: 'more/videos', people: 'more/people', sources: 'more/links' };
function route() {
  let h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (LEGACY[h]) h = LEGACY[h];
  if (/^(report|digest)\//.test(h)) h = 'briefings/report/' + h.split('/').slice(1).join('/');
  const [v, ...rest] = h.split('/');
  return views[v] ? { v, arg: rest.join('/') } : { v: 'home', arg: '' };
}
function renderTabs() { const cur = route().v; $('#tabs').innerHTML = order.map((k) => `<a href="#${k}" ${k === cur ? 'aria-current="page"' : ''}>${esc(t(k))}</a>`).join(''); const a = $('#tabs [aria-current]'); if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
function show() {
  const { v, arg } = route();
  document.body.dataset.view = v;
  renderTabs();
  const el = $('#view');
  try { views[v].render(el, arg); } catch (e) { console.error(e); el.innerHTML = `<p class="empty">${esc(t('error'))}: ${esc(e.message)}</p>`; }
}
function applyTheme() { const r = document.documentElement; if (S.theme === 'light' || S.theme === 'dark') r.dataset.theme = S.theme; else delete r.dataset.theme; }
function applyLang() {
  document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  $('#langBtn').textContent = S.lang === 'ar' ? 'English' : 'العربية';
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  $('#brand').textContent = S.name || 'PULMONOLOGIST-AGENT'; document.title = S.name || 'PULMONOLOGIST-AGENT';
}
function rerender() { applyTheme(); applyLang(); show(); }

/* ---------- global events ---------- */
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button,a'); if (!b) return;
  if (b.matches('a[data-track]')) { track(b.textContent, b.href, 'paper'); return; }
  const card = b.closest('[data-paper]');
  if (card && (b.matches('[data-savepaper]') || b.matches('[data-appraise]') || b.matches('[data-verify]'))) {
    const a = JSON.parse(card.dataset.paper), out = card.querySelector('[data-out]');
    if (b.matches('[data-savepaper]')) { const on = lib.toggle(lib.paperItem(a)); b.setAttribute('aria-pressed', on); b.textContent = on ? '★ ' + t('saved') : '☆ ' + t('save'); toast(on ? '✓ ' + t('saved') : t('remove')); }
    else if (b.matches('[data-verify]')) { out.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`; try { out.innerHTML = PA.verifyHTML(await api('/api/verify', { method: 'POST', body: { doi: a.doi, pmid: a.pmid, title: a.title } })); } catch (err) { out.innerHTML = empty(errMsg(err)); } }
    else if (b.matches('[data-appraise]')) PA.appraise(a);
  }
});
document.addEventListener('submit', (e) => { if (e.target.matches('form[data-noop]')) e.preventDefault(); });

function verifyHTML(v) {
  const st = { verified: ['ok', '✓ Verified'], retracted: ['x', '⚠ Retracted'], preprint: ['p', 'Preprint'], unverified: ['w', 'Could not verify'] }[v.status] || ['w', v.status];
  const rows = [
    v.pmidVerified != null && ['PubMed record', v.pmidVerified ? 'found' : 'not found'],
    v.doiVerified != null && ['DOI (Crossref)', v.doiVerified ? 'resolves' + (v.titleMatch === false ? ' — title differs!' : '') : 'not verified'],
    v.dates && ['Dates', [v.dates.published && 'published ' + v.dates.published, v.dates.online && 'online ' + v.dates.online, v.dates.print && 'print ' + v.dates.print].filter(Boolean).join(' · ')],
    v.pubDate && ['PubMed dates', `${v.pubDate}${v.epubDate ? ' · e-pub ' + v.epubDate : ''}`],
    ['Retraction', v.retracted ? 'YES — retracted' : 'none recorded'],
    ['Corrections', v.corrected || v.erratum ? 'correction/erratum published' : 'none recorded'],
    ['Preprint', v.preprint ? 'yes (not peer reviewed)' : 'no'],
    v.conference && ['Type', 'conference abstract'],
    ['Full text', v.openAccess ? 'open access' + (v.fullText ? ' available' : '') : v.pmcid ? 'in PMC (' + v.pmcid + ')' : 'abstract only / subscription'],
    v.citedBy != null && ['Citations (Europe PMC)', String(v.citedBy)]
  ].filter(Boolean);
  const notes = (v.notices || []).map((n) => `<li>${esc(n.type)} ${n.doi ? `<a href="https://doi.org/${esc(n.doi)}" target="_blank" rel="noopener">${esc(n.doi)}</a>` : ''} ${esc(n.date || '')}</li>`).join('');
  const failed = Object.entries(v.sources || {}).filter(([, s]) => !s.ok).map(([k]) => k);
  return `<div class="verify"><span class="flag ${st[0]}">${esc(st[1])}</span><table class="tbl mini">${rows.map(([k, x]) => `<tr><th>${esc(k)}</th><td>${esc(x)}</td></tr>`).join('')}</table>${notes ? `<ul class="small">${notes}</ul>` : ''}<p class="small">Checked ${fmtT(Date.parse(v.checkedAt))}${failed.length ? ' · unavailable: ' + esc(failed.join(', ')) : ''}</p></div>`;
}

async function appraise(a) {
  const body = modal(t('appraise') + ': ' + (a.title || '').slice(0, 80), `<p class="small">${esc(t('thinking'))}</p>`, { wide: true });
  if (!status.ai) { body.innerHTML = empty(t('noAI')); return; }
  try {
    const r = await research('appraise', { article: a });
    body.innerHTML = `<div class="brief">${md(r.text)}</div><div class="acts"><button class="btn pri" type="button" id="apSave">${esc(t('saveLib'))}</button><button class="btn" type="button" id="apPdf">${esc(t('pdf'))}</button></div>`;
    const doc = { title: 'Appraisal: ' + a.title, kind: 'Article summary', md: r.text, refs: [{ label: a.title, url: pUrl(a), doi: a.doi, pmid: a.pmid }] };
    $('#apSave').onclick = () => PA.saveReport(doc);
    $('#apPdf').onclick = () => PA.pdf(doc);
  } catch (e) { body.innerHTML = empty(errMsg(e)); }
}
async function saveReport(doc) {
  try {
    const r = await api('/api/docs', { method: 'PUT', body: { title: doc.title, kind: 'report', content: doc.md, meta: { kind: doc.kind, refs: doc.refs || [], cutoff: doc.cutoff || '', limitations: doc.limitations || '' } } });
    lib.add({ id: 'doc:' + r.id, kind: 'report', title: doc.title, url: '#library/doc/' + r.id, date: new Date().toISOString().slice(0, 10), type: doc.kind, docId: r.id });
    toast('✓ ' + t('saved'));
  } catch (e) {
    lib.add({ id: 'note:' + uid(), kind: 'report', title: doc.title, date: new Date().toISOString().slice(0, 10), type: doc.kind, body: String(doc.md).slice(0, 60000) });
    toast(e.code === 'bad-pin' ? t('badPin') : '✓ ' + t('saved') + ' (this device)');
  }
}

/* ---------- boot ---------- */
async function boot() {
  const cfg = await fetch('/data/config.json', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ tasks: [] }));
  if (!S.tasks.length) S.tasks = (cfg.tasks || []).map(fixTask);
  await api('/api/claude').then((j) => { status.ai = !!j.configured; }).catch(() => { status.ai = false; });
  try {
    const j = await api('/api/state'); status.sync = true;
    const R = j.state;
    if (R) {
      if (R.topics && (R.edited || 0) > (S.edited || 0)) { const run = S.run && (!R.run || (S.run.at || 0) > (R.run.at || 0)) ? S.run : R.run; S = load({ ...R, run }); PA.S = S; }
      else {
        if (Array.isArray(R.tasks) && R.tasks.length && !R.topics) S.tasks = R.tasks.map(fixTask);
        if (Array.isArray(R.saved)) { const m = new Map(); [...R.saved.map(normSaved), ...S.saved].filter(Boolean).forEach((x) => { if (!m.has(x.id)) m.set(x.id, x); }); S.saved = [...m.values()]; }
      }
    }
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    status.ready = true;
    if (!R || !R.topics || (S.edited || 0) > (R.edited || 0) || (R.schema || 0) < 3) flush();
  } catch (e) { status.sync = false; status.ready = true; }
  rerender();
}

window.PA = { get S() { return S; }, set S(v) { S = v; }, $, esc, safe, uid, clone, t, L, i18n, api, research, errMsg, save, flush, setPin, get PIN() { return PIN; }, status, cache, load, fresh, fixTask,
  fmtD, fmtT, ago, pd, md, inline, toast, modal, closeModal, paperCard, flags, evidenceOf, isTop, pUrl, markSeen, empty, sw, lib, track, verifyHTML, appraise, saveReport,
  view: (name, def) => { views[name] = def; }, views, route, show, rerender, applyTheme, applyLang, boot, order };
})();
