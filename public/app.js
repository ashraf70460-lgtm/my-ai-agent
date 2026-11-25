/* My Agent — bilingual personal agent app (no build step). */
(() => {
  'use strict';

  // ---------- preferences ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ma.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('ma.' + k, JSON.stringify(v)); } catch { /* private mode */ } }
  };
  const prefs = {
    lang: store.get('lang', (navigator.language || 'en').startsWith('ar') ? 'ar' : 'en'),
    theme: store.get('theme', 'system'),
    pin: store.get('pin', '')
  };

  // ---------- state ----------
  const S = {
    config: null,        // defaults from /data/config.json
    tasks: [],           // effective tasks (cloud > local > config)
    saved: store.get('saved', []),
    index: [],           // digest index entries
    digests: {},         // id -> digest
    cloud: false,        // cloud storage available
    filter: 'all',
    installEvt: null
  };

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = (k) => (I18N[prefs.lang] && I18N[prefs.lang][k]) || I18N.en[k] || k;
  const L = (v) => (v && typeof v === 'object') ? (v[prefs.lang] || v.en || v.ar || '') : (v || '');
  const uid = () => Math.random().toString(36).slice(2, 9);

  // ---------- icons ----------
  const ICON = {
    today: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>',
    saved: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>',
    tasks: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="m15 6-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    refresh: '<path d="M20 11A8 8 0 0 0 6.3 5.7L4 8M4 4v4h4M4 13a8 8 0 0 0 13.7 5.3L20 16M20 20v-4h-4"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };
  const icon = (n, fill) => `<svg viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

  // ---------- theme & language ----------
  function applyTheme() {
    const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('meta[name="theme-color"]').setAttribute('content', dark ? '#0b1416' : '#0f766e');
    $('#themeBtn').innerHTML = icon(prefs.theme === 'dark' ? 'moon' : prefs.theme === 'light' ? 'sun' : 'auto');
  }
  function applyLang() {
    document.documentElement.lang = prefs.lang;
    document.documentElement.dir = prefs.lang === 'ar' ? 'rtl' : 'ltr';
    $('#langBtn').textContent = prefs.lang === 'ar' ? 'EN' : 'ع';
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.title = t('appName') + ' — ' + (prefs.lang === 'ar' ? 'My Agent' : 'وكيلي');
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

  // ---------- navigation ----------
  const TABS = ['today', 'archive', 'saved', 'tasks', 'settings'];
  function renderNav(active) {
    const html = TABS.map((k) => `<a href="#/${k}" class="tab" ${k === active ? 'aria-current="page"' : ''}><span class="tab-ico">${icon(k)}</span>${t(k)}</a>`).join('');
    $('#tabbar').innerHTML = html;
    $('#nav').innerHTML = TABS.map((k) => `<a href="#/${k}" ${k === active ? 'aria-current="page"' : ''}>${icon(k)}${t(k)}</a>`).join('');
    $('#syncBadge').textContent = `${t('cloud')}: ${S.cloud ? t('cloudOn') : t('cloudOff')}`;
  }

  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 1900);
  }

  // ---------- data ----------
  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(url + ' ' + r.status);
    return r.json();
  }
  async function loadAll() {
    const [config, index] = await Promise.all([
      getJSON('/data/config.json').catch(() => ({ tasks: [] })),
      getJSON('/data/digests/index.json').catch(() => ({ digests: [] }))
    ]);
    S.config = config;
    S.index = (index.digests || []).slice().sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    S.tasks = store.get('tasks', null) || config.tasks || [];
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      if (r.ok) {
        S.cloud = true;
        const { state } = await r.json();
        if (state && Array.isArray(state.tasks)) {
          S.tasks = state.tasks;
          if (Array.isArray(state.saved)) S.saved = mergeSaved(state.saved, S.saved);
        }
      }
    } catch { S.cloud = false; }
    store.set('tasks', S.tasks); store.set('saved', S.saved);
  }
  function mergeSaved(a, b) {
    const m = new Map(); [...a, ...b].forEach((x) => x && x.key && m.set(x.key, x)); return [...m.values()];
  }
  async function digest(entry) {
    if (S.digests[entry.id]) return S.digests[entry.id];
    const d = await getJSON('/data/digests/' + entry.file);
    S.digests[entry.id] = d; return d;
  }
  async function persist() {
    store.set('tasks', S.tasks); store.set('saved', S.saved);
    if (!S.cloud) { toast(t('localOnly')); return; }
    try {
      const r = await fetch('/api/state', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-app-pin': prefs.pin || '' },
        body: JSON.stringify({ tasks: S.tasks, saved: S.saved })
      });
      if (r.status === 401) { toast(t('wrongPin')); return; }
      toast(r.ok ? t('syncedCloud') : t('localOnly'));
    } catch { toast(t('localOnly')); }
  }
  const taskById = (id) => S.tasks.find((x) => x.id === id);

  // ---------- formatting ----------
  const locale = () => (prefs.lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB');
  const fmtDate = (iso, opts) => new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString(locale(), opts || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function greeting() {
    const h = new Date().getHours();
    return `${t(h < 12 ? 'goodMorning' : h < 18 ? 'goodAfternoon' : 'goodEvening')}, ${t('doctor')}`;
  }
  function srcType(sec) {
    if (sec.type) return sec.type;
    const s = S.tasks.flatMap((x) => x.sources || []).find((x) => x.id === sec.sourceId);
    return s ? s.type : 'website';
  }
  const initials = (name) => {
    const first = String(name || '').trim().split(/[\s|—-]+/)[0] || '';
    if (/^[A-Z]{2,4}$/.test(first)) return first; // ATS, GOLD, ERS…
    return initials2(name);
  };
  const initials2 = (name) => (name || '?').replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '•';

  // ---------- item rendering ----------
  function itemKey(d, si, ii) { return `${d.id}#${si}#${ii}`; }
  const isSaved = (key) => S.saved.some((x) => x.key === key);

  function renderItem(item, key, sourceName, date) {
    const saved = isSaved(key);
    return `<div class="item ${item.star ? 'star' : ''}">
      <div class="item-body">
        ${item.star ? `<div class="star-tag">⭐ ${t('practiceChanging')}</div>` : ''}
        <h3>${esc(L(item.headline))}</h3>
        <p>${esc(L(item.summary))}</p>
      </div>
      <div class="item-actions">
        <button class="mini-btn" data-save="${esc(key)}" aria-pressed="${saved}" aria-label="${t(saved ? 'unsave' : 'save')}"
          data-payload="${esc(JSON.stringify({ key, item, source: sourceName, date }))}">${icon('saved', saved)}</button>
        ${item.url ? `<a class="mini-btn" href="${esc(item.url)}" target="_blank" rel="noopener" aria-label="${t('open')}">${icon('ext')}</a>` : ''}
      </div>
    </div>`;
  }

  function renderDigest(d) {
    const task = taskById(d.taskId);
    const secs = (d.sections || []).map((sec, si) => {
      const type = srcType(sec);
      return `<section class="card source-card">
        <div class="source-head">
          <div class="source-logo ${type === 'telegram' ? 'tg' : type === 'x' ? 'x' : ''}">${esc(initials(sec.source))}</div>
          <div class="source-name">${esc(sec.source)}</div>
        </div>
        ${(sec.items || []).map((it, ii) => renderItem(it, itemKey(d, si, ii), sec.source, d.date)).join('')}
      </section>`;
    }).join('');
    const pick = d.topPick ? `<div class="top-pick"><div class="badge">★</div><div><strong>${t('topPick')}</strong><p>${esc(L(d.topPick))}</p></div></div>` : '';
    return `${pick}${secs}${task ? '' : ''}`;
  }

  function digestStats(d) {
    let n = 0, s = 0; (d.sections || []).forEach((x) => (x.items || []).forEach((i) => { n++; if (i.star) s++; }));
    return { n, s };
  }

  // ---------- views ----------
  const V = {};

  V.today = async () => {
    const chips = S.tasks.length > 1 ? `<div class="chips">${[{ id: 'all', name: { en: t('allTasks'), ar: t('allTasks') }, icon: '' }, ...S.tasks].map((x) =>
      `<button class="chip" data-filter="${esc(x.id)}" aria-pressed="${S.filter === x.id}">${esc((x.icon ? x.icon + ' ' : '') + L(x.name))}</button>`).join('')}</div>` : '';
    const list = S.index.filter((e) => S.filter === 'all' || e.taskId === S.filter);
    if (!list.length) {
      return `<p class="eyebrow">${esc(fmtDate(new Date().toISOString().slice(0, 10)))}</p><h1 class="page-title">${esc(greeting())}</h1>${chips}
        <div class="card empty"><div class="big">🌤️</div>${t('noDigests')}</div>`;
    }
    // latest digest per task (or latest overall when filtered)
    const latest = [];
    const seen = new Set();
    for (const e of list) { if (!seen.has(e.taskId)) { seen.add(e.taskId); latest.push(e); } }
    const blocks = [];
    for (const e of latest) {
      const d = await digest(e);
      const task = taskById(e.taskId);
      const { n, s } = digestStats(d);
      blocks.push(`<div class="hero fade-in">
          <div class="eyebrow">${esc(task ? (task.icon || '') + ' ' + L(task.name) : t('latestDigest'))} · ${esc(fmtDate(d.date, { day: 'numeric', month: 'short' }))}</div>
          <h1>${esc(L(d.title))}</h1>
          <div class="hero-stats"><span class="pill">${n} ${t('items')}</span>${s ? `<span class="pill">⭐ ${s} ${t('starred')}</span>` : ''}</div>
        </div>${renderDigest(d)}`);
    }
    return `<p class="eyebrow">${esc(fmtDate(new Date().toISOString().slice(0, 10)))}</p>
      <h1 class="page-title">${esc(greeting())}</h1>${chips}${blocks.join('<div style="height:18px"></div>')}`;
  };

  V.archive = async (q = '') => {
    const ql = q.trim().toLowerCase();
    let entries = S.index;
    if (ql) {
      // search titles first, then load and search full digest text
      const hits = [];
      for (const e of entries) {
        const hay = [e.title?.en, e.title?.ar, e.date].join(' ').toLowerCase();
        if (hay.includes(ql)) { hits.push(e); continue; }
        try { const d = await digest(e); if (JSON.stringify(d).toLowerCase().includes(ql)) hits.push(e); } catch { /* skip */ }
      }
      entries = hits;
    }
    const rows = entries.map((e) => {
      const task = taskById(e.taskId);
      const dt = new Date(e.date + 'T12:00:00');
      return `<a class="row" href="#/digest/${encodeURIComponent(e.id)}">
        <div class="row-date"><b>${dt.getDate()}</b><span>${esc(dt.toLocaleDateString(locale(), { month: 'short' }))}</span></div>
        <div class="row-body"><strong>${esc(L(e.title))}</strong>
          <small>${esc(task ? (task.icon || '') + ' ' + L(task.name) : '')}${e.itemCount ? ` · ${e.itemCount} ${t('items')}` : ''}${e.starCount ? ` · ⭐ ${e.starCount}` : ''}</small></div>
        <span class="row-chev">${icon('chev')}</span></a>`;
    }).join('');
    return `<h1 class="page-title">${t('archive')}</h1>
      <input class="search" id="search" type="search" placeholder="${t('searchArchive')}" value="${esc(q)}" autocomplete="off" />
      ${entries.length ? `<div class="card" style="overflow:hidden">${rows}</div>` : `<div class="card empty">${t(ql ? 'noResults' : 'noDigests')}</div>`}`;
  };

  V.digest = async (id) => {
    const e = S.index.find((x) => x.id === id);
    if (!e) return `<div class="card empty">${t('noResults')}</div>`;
    const d = await digest(e);
    const task = taskById(e.taskId);
    return `<a class="back-link flip" href="#/archive">${icon('back')}${t('back')}</a>
      <p class="eyebrow">${esc(task ? (task.icon || '') + ' ' + L(task.name) : '')} · ${esc(fmtDate(d.date))}</p>
      <h1 class="page-title">${esc(L(d.title))}</h1>${renderDigest(d)}`;
  };

  V.saved = async () => {
    if (!S.saved.length) return `<h1 class="page-title">${t('saved')}</h1><div class="card empty"><div class="big">🔖</div>${t('noSaved')}</div>`;
    const list = S.saved.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return `<h1 class="page-title">${t('saved')}</h1><section class="card source-card">${list.map((s) =>
      `<div class="item ${s.item.star ? 'star' : ''}"><div class="item-body">
        <div class="eyebrow">${esc(s.source)} · ${esc(fmtDate(s.date, { day: 'numeric', month: 'short', year: 'numeric' }))}</div>
        <h3>${esc(L(s.item.headline))}</h3><p>${esc(L(s.item.summary))}</p></div>
        <div class="item-actions">
          <button class="mini-btn" data-save="${esc(s.key)}" aria-pressed="true" aria-label="${t('unsave')}">${icon('saved', true)}</button>
          ${s.item.url ? `<a class="mini-btn" href="${esc(s.item.url)}" target="_blank" rel="noopener">${icon('ext')}</a>` : ''}
        </div></div>`).join('')}</section>`;
  };

  const TYPES = ['website', 'telegram', 'x', 'other'];
  V.tasks = async () => {
    const cards = S.tasks.map((task) => {
      const groups = TYPES.map((ty) => {
        const srcs = (task.sources || []).filter((s) => (s.type || 'other') === ty);
        if (!srcs.length) return '';
        return `<div class="src-group"><h4>${t(ty)} · ${srcs.length}</h4>${srcs.map((s) =>
          `<div class="src-row"><div class="source-logo ${ty === 'telegram' ? 'tg' : ty === 'x' ? 'x' : ''}">${esc(initials(s.name))}</div>
           <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>
           <button class="x-btn" data-del-src="${esc(task.id)}|${esc(s.id)}" aria-label="${t('delete')}">${icon('x')}</button></div>`).join('')}</div>`;
      }).join('');
      return `<article class="card task-card">
        <div class="task-top"><div class="task-icon">${esc(task.icon || '🤖')}</div>
          <div style="flex:1;min-width:0"><h3>${esc(L(task.name))}</h3><p>${esc(L(task.description))}</p></div>
          <label class="switch" title="${t(task.enabled ? 'enabled' : 'paused')}"><input type="checkbox" data-toggle="${esc(task.id)}" ${task.enabled ? 'checked' : ''}/><span></span></label>
        </div>
        <div class="task-meta"><span class="pill ${task.enabled ? 'ok' : 'off'}">${t(task.enabled ? 'enabled' : 'paused')}</span>
          ${task.schedule ? `<span class="pill neutral">🕒 ${esc(L(task.schedule))}</span>` : ''}
          <span class="pill neutral">${(task.sources || []).length} ${t('sources')}</span></div>
        ${groups}
        <div class="task-actions">
          <button class="btn btn-primary btn-sm" data-add-src="${esc(task.id)}">${icon('plus')}${t('addSource')}</button>
          <button class="btn btn-ghost btn-sm" data-edit-task="${esc(task.id)}">${icon('edit')}${t('editTask')}</button>
        </div></article>`;
    }).join('');
    return `<h1 class="page-title">${t('tasks')}</h1>${cards}
      <button class="btn btn-ghost" style="width:100%" id="newTask">${icon('plus')}${t('newTask')}</button>`;
  };

  V.settings = async () => {
    const seg = (name, opts, cur) => `<div class="seg">${opts.map(([v, label]) => `<button data-${name}="${v}" aria-pressed="${cur === v}">${label}</button>`).join('')}</div>`;
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return `<h1 class="page-title">${t('settings')}</h1>
      <div class="card">
        <div class="setting"><div class="setting-label"><strong>${t('language')}</strong></div>${seg('lang', [['en', 'English'], ['ar', 'العربية']], prefs.lang)}</div>
        <div class="setting"><div class="setting-label"><strong>${t('theme')}</strong></div>${seg('theme', [['light', t('light')], ['dark', t('dark')], ['system', t('system')]], prefs.theme)}</div>
        <div class="setting"><div class="setting-label"><strong>${t('install')}</strong><small>${standalone ? t('installDone') : ios ? t('installIos') : t('installHelp')}</small></div>
          ${standalone || ios ? '' : `<button class="btn btn-primary btn-sm" id="installBtn">${icon('download')}${t('install')}</button>`}</div>
        <div class="setting"><div class="setting-label"><strong>${t('pin')}</strong><small>${t('pinHelp')}</small></div>
          <input id="pinInput" type="password" inputmode="numeric" autocomplete="off" value="${esc(prefs.pin)}" style="width:110px;height:38px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);padding:0 10px;font:inherit" /></div>
        <div class="setting"><div class="setting-label"><strong>${t('cloud')}</strong><small>${S.cloud ? t('cloudOn') : t('cloudOff')}</small></div>
          <button class="btn btn-ghost btn-sm" id="refreshBtn">${icon('refresh')}${t('refresh')}</button></div>
      </div>
      <h2 class="section-title">${t('about')}</h2>
      <div class="card" style="padding:16px"><p style="margin:0;color:var(--ink-2)">${t('aboutText')}</p>
        <p class="muted" style="margin:10px 0 0;font-size:13px">v1.0 · ${S.index.length} digests · ${S.tasks.length} ${t('tasks').toLowerCase()}</p></div>`;
  };

  // ---------- dialogs ----------
  function openDialog(html, onSubmit) {
    const dlg = $('#dialog');
    dlg.innerHTML = `<form class="dlg" method="dialog">${html}</form>`;
    const form = dlg.querySelector('form');
    form.addEventListener('submit', (ev) => {
      const btn = ev.submitter;
      if (btn && btn.value === 'cancel') return;
      ev.preventDefault();
      if (btn && btn.value === 'delete') { if (confirm(t('confirmDelete'))) { onSubmit(null, 'delete'); dlg.close(); } return; }
      onSubmit(Object.fromEntries(new FormData(form)), 'save'); dlg.close();
    });
    dlg.showModal();
    setTimeout(() => form.querySelector('input,textarea')?.focus(), 50);
  }

  function normaliseUrl(type, raw) {
    let v = String(raw || '').trim();
    if (!v) return '';
    if (type === 'telegram' && /^@?[\w]{4,}$/.test(v)) return 'https://t.me/' + v.replace(/^@/, '');
    if (type === 'x' && /^@?[\w]{1,15}$/.test(v)) return 'https://x.com/' + v.replace(/^@/, '');
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    return v;
  }

  function addSourceDialog(taskId) {
    openDialog(`<h2>${t('addSource')}</h2>
      <label class="field"><span>${t('sourceType')}</span><select name="type">${TYPES.map((ty) => `<option value="${ty}">${t(ty)}</option>`).join('')}</select></label>
      <label class="field"><span>${t('sourceName')}</span><input name="name" required maxlength="80" /></label>
      <label class="field"><span>${t('sourceUrl')}</span><input name="url" required maxlength="300" dir="ltr" /></label>
      <div class="dlg-actions"><button class="btn btn-ghost" value="cancel" formnovalidate>${t('cancel')}</button><button class="btn btn-primary" value="save">${t('add')}</button></div>`,
    (data) => {
      const task = taskById(taskId); if (!task) return;
      task.sources = task.sources || [];
      task.sources.push({ id: uid(), type: data.type, name: data.name.trim(), url: normaliseUrl(data.type, data.url) });
      persist(); route();
    });
  }

  function taskDialog(taskId) {
    const task = taskId ? taskById(taskId) : null;
    openDialog(`<h2>${t(task ? 'editTask' : 'newTask')}</h2>
      <label class="field"><span>${t('icon')}</span><input name="icon" maxlength="4" value="${esc(task?.icon || '🤖')}" style="width:80px" /></label>
      <label class="field"><span>${t('taskNameEn')}</span><input name="nameEn" required maxlength="80" dir="ltr" value="${esc(task?.name?.en || '')}" /></label>
      <label class="field"><span>${t('taskNameAr')}</span><input name="nameAr" maxlength="80" dir="rtl" value="${esc(task?.name?.ar || '')}" /></label>
      <label class="field"><span>${t('taskDesc')}</span><textarea name="desc" maxlength="600">${esc(L(task?.description) || '')}</textarea></label>
      <label class="field"><span>${t('taskSchedule')}</span><input name="schedule" maxlength="80" value="${esc(L(task?.schedule) || '')}" /></label>
      ${task ? '' : `<p class="note">${t('newTaskNote')}</p>`}
      <div class="dlg-actions">${task ? `<button class="btn btn-danger" value="delete" formnovalidate style="margin-inline-end:auto">${t('delete')}</button>` : ''}
        <button class="btn btn-ghost" value="cancel" formnovalidate>${t('cancel')}</button><button class="btn btn-primary" value="save">${t('saveChanges')}</button></div>`,
    (data, action) => {
      if (action === 'delete') { S.tasks = S.tasks.filter((x) => x.id !== taskId); persist(); route(); return; }
      const both = (v) => ({ en: v, ar: v });
      if (task) {
        task.icon = data.icon || task.icon;
        task.name = { en: data.nameEn.trim(), ar: data.nameAr.trim() || data.nameEn.trim() };
        task.description = { ...(task.description || {}), [prefs.lang]: data.desc.trim() };
        task.schedule = { ...(task.schedule || {}), [prefs.lang]: data.schedule.trim() };
      } else {
        S.tasks.push({ id: 'task-' + uid(), icon: data.icon || '🤖', name: { en: data.nameEn.trim(), ar: data.nameAr.trim() || data.nameEn.trim() },
          description: both(data.desc.trim()), schedule: both(data.schedule.trim()), enabled: true, sources: [] });
      }
      persist(); route();
    });
  }

  // ---------- events ----------
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('button, [data-filter]');
    if (!el) return;
    if (el.id === 'langBtn') { prefs.lang = prefs.lang === 'ar' ? 'en' : 'ar'; store.set('lang', prefs.lang); applyLang(); route(); return; }
    if (el.id === 'themeBtn') { prefs.theme = { system: 'light', light: 'dark', dark: 'system' }[prefs.theme]; store.set('theme', prefs.theme); applyTheme(); if (curView === 'settings') route(); return; }
    if (el.dataset.filter) { S.filter = el.dataset.filter; route(); return; }
    if (el.dataset.lang) { prefs.lang = el.dataset.lang; store.set('lang', prefs.lang); applyLang(); route(); return; }
    if (el.dataset.theme) { prefs.theme = el.dataset.theme; store.set('theme', prefs.theme); applyTheme(); route(); return; }
    if (el.dataset.save) {
      const key = el.dataset.save;
      if (isSaved(key)) { S.saved = S.saved.filter((x) => x.key !== key); toast(t('removedToast')); }
      else if (el.dataset.payload) { S.saved.push(JSON.parse(el.dataset.payload)); toast(t('savedToast')); }
      store.set('saved', S.saved);
      if (S.cloud) persistQuiet();
      if (curView === 'saved') route(); else { const on = isSaved(key); el.setAttribute('aria-pressed', on); el.innerHTML = icon('saved', on); }
      return;
    }
    if (el.dataset.addSrc) { addSourceDialog(el.dataset.addSrc); return; }
    if (el.dataset.editTask) { taskDialog(el.dataset.editTask); return; }
    if (el.dataset.delSrc) {
      const [tid, sid] = el.dataset.delSrc.split('|'); const task = taskById(tid);
      if (task && confirm(t('confirmDelete'))) { task.sources = task.sources.filter((s) => s.id !== sid); persist(); route(); }
      return;
    }
    if (el.id === 'newTask') { taskDialog(null); return; }
    if (el.id === 'refreshBtn') { S.digests = {}; boot(); return; }
    if (el.id === 'installBtn') {
      if (S.installEvt) { S.installEvt.prompt(); S.installEvt.userChoice.finally(() => { S.installEvt = null; route(); }); }
      else alert(t('installManual'));
    }
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.dataset.toggle) { const task = taskById(el.dataset.toggle); if (task) { task.enabled = el.checked; persist(); route(); } }
    if (el.id === 'pinInput') { prefs.pin = el.value.trim(); store.set('pin', prefs.pin); toast(t('pinSet')); }
  });
  let searchT;
  document.addEventListener('input', (ev) => {
    if (ev.target.id !== 'search') return;
    clearTimeout(searchT);
    const q = ev.target.value;
    searchT = setTimeout(async () => {
      const pos = ev.target.selectionStart;
      $('#view').innerHTML = await V.archive(q);
      const s = $('#search'); s.focus(); s.setSelectionRange(pos, pos);
    }, 220);
  });
  let quietT;
  function persistQuiet() {
    clearTimeout(quietT);
    quietT = setTimeout(() => fetch('/api/state', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-app-pin': prefs.pin || '' },
      body: JSON.stringify({ tasks: S.tasks, saved: S.saved })
    }).catch(() => {}), 600);
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });
  window.addEventListener('appinstalled', () => toast(t('installDone')));

  // ---------- router ----------
  let curView = 'today';
  async function route() {
    const [, name = 'today', arg] = (location.hash || '#/today').split('/');
    curView = V[name] ? name : 'today';
    renderNav(curView === 'digest' ? 'archive' : curView);
    const view = $('#view');
    try {
      const html = await V[curView](arg ? decodeURIComponent(arg) : undefined);
      view.innerHTML = `<div class="fade-in">${html}</div>`;
    } catch (err) {
      view.innerHTML = `<div class="card empty">⚠️ ${esc(err.message)}</div>`;
    }
  }
  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

  async function boot() {
    applyTheme(); applyLang();
    $('#view').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    await loadAll();
    route();
  }
  boot();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
})();
