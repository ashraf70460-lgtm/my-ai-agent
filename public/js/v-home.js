/* Today dashboard + Briefings (daily agent reports, weekly and monthly briefings). */
(() => {
const { esc, safe, t, L, md, fmtD, fmtT, ago, empty, lib, toast, api, research, errMsg } = PA;
PA.i18n({
  en: { heroSub: 'Your respiratory medicine and critical care research department.', quick: 'Quick update', deep: 'Deep research', ci: 'Ask a clinical question', reportItems: "in today's report", practiceN: 'practice-changing', newPapers: 'new since last visit', nextEvent: 'days to next event', nowOn: 'happening now', freshness: 'Freshness', lastReport: 'Latest daily report', lastRadar: 'Last literature check', lastQU: 'Last quick update', srcStatus: 'Source status', checkSources: 'Check sources', weekBrief: 'Weekly briefing', noWeekly: 'No weekly briefing yet. It is generated every Friday; you can also generate one now.', genNow: 'Generate now', upcoming: 'Coming up', seeAll: 'See all', guideChanges: 'Recent guideline changes', topPapers: 'Top new papers', noReport: 'No report yet. Your agent publishes one every morning.', topPick: 'Top pick', practice: 'Practice-changing', items: 'items', cat_websites: 'Websites', cat_guidelines: 'Guidelines', cat_papers: 'Papers', catD_websites: 'News from the society and education websites the agent checks', catD_guidelines: 'New or updated guidelines, statements and reports', catD_papers: 'Important new papers on your topics', daily: 'Daily reports', weekly: 'Weekly', monthly: 'Monthly', searchReports: 'Search reports', briefLede: 'Daily reports from your agent, plus weekly consultant briefings and monthly reviews. Each can be exported as a concise or comprehensive PDF.', noBriefings: 'None yet.', extended: 'Extended', genWeekly: 'Generate weekly briefing now', genMonthly: 'Generate monthly review now', genNote: 'Builds from your daily reports plus a fresh PubMed / ClinicalTrials.gov / openFDA scan.' },
  ar: { heroSub: 'قسم أبحاث طب الصدر والعناية المركزة الخاص بك.', quick: 'تحديث سريع', deep: 'بحث معمّق', ci: 'اطرح سؤالًا سريريًا', reportItems: 'في تقرير اليوم', practiceN: 'يغيّر الممارسة', newPapers: 'جديد منذ آخر زيارة', nextEvent: 'يوم حتى المؤتمر القادم', nowOn: 'منعقد الآن', freshness: 'حداثة البيانات', lastReport: 'آخر تقرير يومي', lastRadar: 'آخر فحص للأبحاث', lastQU: 'آخر تحديث سريع', srcStatus: 'حالة المصادر', checkSources: 'افحص المصادر', weekBrief: 'الملخص الأسبوعي', noWeekly: 'لا يوجد ملخص أسبوعي بعد. يُنشأ كل جمعة، ويمكنك إنشاؤه الآن.', genNow: 'أنشئ الآن', upcoming: 'القادم', seeAll: 'عرض الكل', guideChanges: 'أحدث تغييرات الإرشادات', topPapers: 'أهم الأبحاث الجديدة', noReport: 'لا يوجد تقرير بعد. ينشر وكيلك تقريرًا كل صباح.', topPick: 'الأهم اليوم', practice: 'يغيّر الممارسة', items: 'عناصر', cat_websites: 'المواقع', cat_guidelines: 'الإرشادات', cat_papers: 'الأبحاث', catD_websites: 'أخبار مواقع الجمعيات والتعليم', catD_guidelines: 'الإرشادات والبيانات الجديدة أو المحدّثة', catD_papers: 'أهم الأبحاث الجديدة في مواضيعك', daily: 'التقارير اليومية', weekly: 'أسبوعي', monthly: 'شهري', searchReports: 'ابحث في التقارير', briefLede: 'التقارير اليومية من وكيلك، والملخصات الأسبوعية، والمراجعات الشهرية. يمكن تصدير كل منها PDF مختصرًا أو شاملًا.', noBriefings: 'لا شيء بعد.', extended: 'موسّع', genWeekly: 'أنشئ الملخص الأسبوعي الآن', genMonthly: 'أنشئ المراجعة الشهرية الآن', genNote: 'يُبنى من تقاريرك اليومية مع فحص جديد لـ PubMed وClinicalTrials.gov وopenFDA.' }
});
const CATS = ['guidelines', 'papers', 'websites'];
const NOTHING = /^(no new updates|preview unavailable|couldn.t read|no important)/i;
let INDEX = null, BRIEF = null;
const DIG = {};
async function getJSON(u) { const r = await fetch(u, { cache: 'no-store' }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
async function index() { if (INDEX) return INDEX; try { const j = await getJSON('/data/digests/index.json'); INDEX = (j.digests || []).slice().sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)); } catch (e) { INDEX = []; } return INDEX; }
async function briefIndex() { if (BRIEF) return BRIEF; try { const j = await getJSON('/data/briefings/index.json'); BRIEF = (j.briefings || []).slice().sort((a, b) => b.date.localeCompare(a.date)); } catch (e) { BRIEF = []; } return BRIEF; }
async function digest(e) { if (DIG[e.id]) return DIG[e.id]; const d = await getJSON('/data/digests/' + e.file); DIG[e.id] = d; return d; }
PA.reports = { index, digest, briefIndex };
const catOf = (sec) => (CATS.includes(sec.category) ? sec.category : sec.category === 'telegram' || sec.type === 'telegram' ? null : 'websites');
function dStats(d) { let n = 0, s = 0; (d.sections || []).filter(catOf).forEach((x) => (x.items || []).forEach((i) => { if (!NOTHING.test((i.headline && i.headline.en) || L(i.headline))) { n++; if (i.star) s++; } })); return { n, s }; }
const CICON = { websites: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', guidelines: '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8 12h8M8 16h6"/>', papers: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/>' };
const cicon = (c) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CICON[c]}</svg>`;
let repCat = 'all';
function itemHTML(d, si, ii, it, source, cat) {
  const id = `ri:${d.id}#${si}#${ii}`, sv = lib.has(id), u = safe(it.url);
  if (NOTHING.test((it.headline && it.headline.en) || L(it.headline))) return `<div class="ritem none">${esc(L(it.headline))}</div>`;
  const payload = esc(JSON.stringify({ id, kind: 'report-item', title: L(it.headline), url: u, date: d.date, source, type: cat, note: '', data: { item: it, source, date: d.date, cat } }));
  return `<div class="ritem ${it.star ? 'star' : ''}">${it.star ? `<span class="badge hot">${esc(t('practice'))}</span>` : ''}<div class="rh">${u ? `<a data-track href="${esc(u)}" target="_blank" rel="noopener">${esc(L(it.headline))}</a>` : esc(L(it.headline))}</div>${it.summary ? `<p>${esc(L(it.summary))}</p>` : ''}<div class="acts"><button class="btn star" type="button" aria-pressed="${sv}" data-saveitem="${payload}">${sv ? '★ ' + esc(t('saved')) : '☆ ' + esc(t('save'))}</button>${u ? `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">${esc(t('open'))}</a>` : ''}</div></div>`;
}
function reportHTML(d, e, withLink) {
  const task = PA.S.tasks.find((x) => x.id === (d.taskId || e.taskId)), { n, s } = dStats(d);
  const groups = {};
  (d.sections || []).forEach((sec, si) => { const c = catOf(sec); if (c) (groups[c] ||= []).push([sec, si]); });
  const count = (c) => (groups[c] || []).reduce((a, [sec]) => a + (sec.items || []).filter((i) => !NOTHING.test((i.headline && i.headline.en) || L(i.headline))).length, 0);
  const present = CATS.filter((c) => groups[c]);
  const chips = `<div class="chips seg">${['all', ...present].map((c) => `<button class="chip" type="button" data-repcat="${c}" aria-pressed="${repCat === c}">${c === 'all' ? esc(t('all')) : cicon(c) + ' ' + esc(t('cat_' + c))}${c !== 'all' ? ` <span class="cnt">${count(c)}</span>` : ''}</button>`).join('')}</div>`;
  const body = present.filter((c) => repCat === 'all' || repCat === c).map((c) => `<div class="cat cat-${c}"><div class="cathead">${cicon(c)}<div><b>${esc(t('cat_' + c))}</b><span>${esc(t('catD_' + c))}</span></div></div>${groups[c].map(([sec, si]) => `<div class="srcblock"><div class="srcname">${esc(sec.source || '')}</div>${(sec.items || []).map((it, ii) => itemHTML(d, si, ii, it, sec.source, c)).join('')}</div>`).join('')}</div>`).join('');
  return `<div class="meta"><span class="badge">${esc(task ? L(task.name) : d.taskId || '')}</span><span>${fmtD(d.date)}</span><span>${n} ${esc(t('items'))}${s ? ` · ★ ${s}` : ''}</span><span class="sp"></span><button class="btn" type="button" data-reportpdf="${esc(d.id)}">${esc(t('pdf'))}</button></div><h2 class="rtitle">${withLink ? `<a href="#briefings/report/${encodeURIComponent(d.id)}">${esc(L(d.title))}</a>` : esc(L(d.title))}</h2>${d.topPick ? `<div class="toppick"><b>${esc(t('topPick'))}</b><p>${esc(L(d.topPick))}</p></div>` : ''}${chips}${body}`;
}
function reportMd(d) {
  let s = `# ${L(d.title)}\n\n${d.topPick ? '**' + t('topPick') + ':** ' + L(d.topPick) + '\n\n' : ''}`;
  const groups = {};
  (d.sections || []).forEach((sec) => { const c = catOf(sec); if (c) (groups[c] ||= []).push(sec); });
  for (const c of CATS) if (groups[c]) {
    s += `## ${t('cat_' + c)}\n\n`;
    for (const sec of groups[c]) { s += `### ${sec.source}\n\n`; for (const it of sec.items || []) s += `- ${it.star ? '**[' + t('practice') + ']** ' : ''}**${L(it.headline)}** — ${L(it.summary) || ''}${it.url ? ' ' + it.url : ''}\n`; s += '\n'; }
  }
  return s;
}
function evState(e) { const s = PA.pd(e.start), en = PA.pd(e.end) || s, n = new Date(); n.setHours(0, 0, 0, 0); if (!s) return { d: 9e9, txt: '' }; if (n > en) return { d: -1, txt: '' }; if (n >= s) return { d: 0, txt: t('nowOn') }; const d = Math.round((s - n) / 864e5); return { d, txt: d + ' ' + t('days') }; }
PA.evState = evState;

/* ---------- Today ---------- */
PA.view('home', {
  async render(el) {
    const S = PA.S, h = new Date().getHours();
    const ev = S.events.map((e) => ({ e, s: evState(e) })).filter((x) => x.s.d >= 0).sort((a, b) => a.s.d - b.s.d);
    const radar = PA.cache.get('radar') || null, qu = PA.cache.get('qu') || null;
    const guides = (window.PA_GUIDES || []).filter((g) => g.status === 'current' && (g.changes || []).length).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 4);
    const newSince = S.lastVisitSeen || 0;
    el.innerHTML = `<section class="hero"><div class="heroin">
      <div><h1>${esc(t('greet')[h < 12 ? 0 : h < 18 ? 1 : 2])}</h1><p id="heroSub">${esc(t('heroSub'))}</p>
      <div class="row heroacts"><a class="run" href="#research">${esc(t('quick'))}</a><a class="ghost" href="#research/deep">${esc(t('deep'))}</a><a class="ghost" href="#research/clinical">${esc(t('ci'))}</a></div>
      <div class="stats"><div class="stat"><b id="sItems">–</b><span>${esc(t('reportItems'))}</span></div><div class="stat"><b id="sStars">–</b><span>${esc(t('practiceN'))}</span></div><div class="stat"><b>${newSince}</b><span>${esc(t('newPapers'))}</span></div><div class="stat"><b>${ev[0] ? (ev[0].s.d === 0 ? '●' : ev[0].s.d) : '–'}</b><span>${esc(ev[0] ? (ev[0].s.d === 0 ? t('nowOn') : t('nextEvent')) : t('nextEvent'))}</span></div></div></div>
      <div class="loop" aria-hidden="true"><svg id="loopSvg"></svg><div class="loopcap">Flow–volume loop · the agent breathes in the literature</div></div></div></section>
      <div class="fresh card"><b>${esc(t('freshness'))}</b><span id="frReport">${esc(t('lastReport'))}: …</span><span>${esc(t('lastRadar'))}: ${radar ? esc(ago(radar.t)) : '–'}</span><span>${esc(t('lastQU'))}: ${qu ? esc(ago(qu.t)) : '–'}</span><span id="frSrc"></span><a class="btn" href="#more/sources">${esc(t('srcStatus'))}</a></div>
      <div class="grid2"><div class="card report" id="homeReport"><p class="small">${esc(t('loading'))}</p></div>
      <div><div class="card"><div class="row"><h3>${esc(t('weekBrief'))}</h3><span class="sp"></span><a class="btn" href="#briefings/weekly">${esc(t('seeAll'))}</a></div><div id="homeWeekly"><p class="small">${esc(t('loading'))}</p></div></div>
      <div class="card"><div class="row"><h3>${esc(t('guideChanges'))}</h3><span class="sp"></span><a class="btn" href="#guidelines">${esc(t('seeAll'))}</a></div><div class="list">${guides.map((g) => `<a class="item rrow" href="#guidelines/${esc(g.id)}"><div class="meta"><span class="badge hot">${esc(g.org)}</span><span>${fmtD(g.date)}</span><span>⚑ ${(g.changes || []).filter((c) => c.practice).length}</span></div><span class="ttl">${esc(g.short)}</span></a>`).join('')}</div></div>
      <div class="card"><div class="row"><h3>${esc(t('upcoming'))}</h3><span class="sp"></span><a class="btn" href="#more/events">${esc(t('seeAll'))}</a></div><div class="list">${ev.slice(0, 3).map((x) => `<div class="item"><div class="meta"><span class="count">${esc(x.s.txt)}</span><span>${esc(x.e.place || '')}</span></div><span class="ttl">${esc(x.e.title)}</span><div class="small">${fmtD(x.e.start)}</div></div>`).join('') || empty('–')}</div></div>
      <div class="card"><div class="row"><h3>${esc(t('topPapers'))}</h3><span class="sp"></span><a class="btn" href="#radar">${esc(t('seeAll'))}</a></div><div class="list">${radar && radar.records ? radar.records.slice(0, 3).map((a) => PA.paperCard(a, { compact: true })).join('') : (S.run && S.run.papers ? S.run.papers.slice(0, 3).map((a) => PA.paperCard(a, { compact: true })).join('') : empty('–'))}</div></div></div></div>`;
    PA.drawLoop && PA.drawLoop();
    const idx = await index();
    const box = el.querySelector('#homeReport');
    if (!idx.length) { box.innerHTML = empty(t('noReport')); el.querySelector('#frReport').textContent = t('lastReport') + ': –'; }
    else {
      try { const d = await digest(idx[0]); box.innerHTML = reportHTML(d, idx[0], true); const st = dStats(d); el.querySelector('#sItems').textContent = st.n; el.querySelector('#sStars').textContent = st.s; el.querySelector('#heroSub').textContent = L(d.title) || t('heroSub'); el.querySelector('#frReport').textContent = `${t('lastReport')}: ${fmtD(d.date)}`; }
      catch (e) { box.innerHTML = empty(errMsg(e)); }
    }
    const src = PA.cache.get('sources');
    if (src && src.data) { const bad = src.data.sources.filter((s) => !s.ok && !['scholar'].includes(s.id)); el.querySelector('#frSrc').innerHTML = bad.length ? `<span class="flag x">${bad.length} source(s) failing</span>` : '<span class="flag ok">All sources OK</span>'; }
    const bi = await briefIndex(), wk = bi.find((b) => b.period === 'weekly');
    el.querySelector('#homeWeekly').innerHTML = wk ? `<a class="item rrow" href="#briefings/weekly/${esc(wk.id)}"><div class="meta"><span>${fmtD(wk.date)}</span><span>${esc(wk.range || '')}</span></div><span class="ttl">${esc(L(wk.title))}</span></a>` : `<p class="small">${esc(t('noWeekly'))}</p><a class="btn pri" href="#briefings/weekly">${esc(t('genNow'))}</a>`;
  }
});

/* ---------- Briefings ---------- */
let rq = '', rqTimer;
async function renderDailyList(box) {
  const idx = await index(), q = rq.trim().toLowerCase();
  let list = idx;
  if (q) { const hits = []; for (const e of idx) { if ([e.title?.en, e.title?.ar, e.date].join(' ').toLowerCase().includes(q)) { hits.push(e); continue; } try { const d = await digest(e); if (JSON.stringify(d).toLowerCase().includes(q)) hits.push(e); } catch (x) {} } list = hits; }
  box.innerHTML = list.length ? list.map((e) => { const d = PA.pd(e.date); return `<a class="item evt rrow" href="#briefings/report/${encodeURIComponent(e.id)}"><div class="cal"><b>${d ? d.getDate() : '?'}</b><span>${d ? esc(d.toLocaleDateString(S_loc(), { month: 'short' })) : ''}</span></div><div><div class="meta">${e.itemCount ? `<span>${e.itemCount} ${esc(t('items'))}</span>` : ''}${e.starCount ? `<span class="badge hot">★ ${e.starCount}</span>` : ''}</div><span class="ttl">${esc(L(e.title))}</span></div></a>`; }).join('') : empty(t(q ? 'noResults' : 'noReport'));
}
const S_loc = () => (PA.S.lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB');
async function gatherMaterial(days) {
  const idx = await index(), since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  let mat = '';
  for (const e of idx.filter((x) => x.date >= since).slice(0, 31)) { try { const d = await digest(e); mat += `\n### Daily report ${d.date}: ${L(d.title)}\n` + (d.sections || []).filter(catOf).flatMap((s) => (s.items || []).map((i) => `- [${catOf(s)}|${s.source}] ${(i.headline && i.headline.en) || ''}: ${(i.summary && i.summary.en) || ''} ${i.url || ''}`)).join('\n'); } catch (x) {} }
  try {
    const u = await api('/api/updates?days=' + days);
    const fmt = (a) => `- ${a.evidence || ''} | ${a.title} | ${a.journal} | ${a.date} | PMID ${a.pmid} | DOI ${a.doi || '–'}`;
    mat += `\n### New guideline papers (PubMed)\n${u.guidelines.slice(0, 15).map(fmt).join('\n')}\n### High-evidence papers\n${u.highEvidence.slice(0, 25).map(fmt).join('\n')}\n### Top-journal papers\n${u.topJournals.slice(0, 20).map(fmt).join('\n')}\n### Newly registered trials\n${u.trials.slice(0, 12).map((x) => `- ${x.nct} ${x.title} (${x.status}, ${(x.phases || []).join('/')}, N=${x.enrollment || '?'})`).join('\n')}\n### FDA respiratory label changes\n${u.fda.slice(0, 10).map((x) => `- ${x.brand} (${x.generic}) ${x.date}: ${x.indication.slice(0, 160)} ${x.url}`).join('\n')}\n### Recalls / safety alerts\n${u.recalls.slice(0, 10).map((x) => `- ${x.date} ${x.classification}: ${x.product} — ${x.reason}`).join('\n')}`;
  } catch (e) { mat += '\n(Live scan unavailable: ' + errMsg(e) + ')'; }
  return mat;
}
PA.view('briefings', {
  async render(el, arg) {
    const [sub, id] = String(arg || '').split('/');
    if (sub === 'report' && id) return renderReport(el, decodeURIComponent(id));
    if ((sub === 'weekly' || sub === 'monthly') && id) return renderBrief(el, decodeURIComponent(id));
    const tab = sub === 'weekly' || sub === 'monthly' ? sub : 'daily';
    el.innerHTML = `<h2>${esc(t('briefings'))}</h2><p class="lede">${esc(t('briefLede'))}</p>
      <div class="chips seg">${['daily', 'weekly', 'monthly'].map((k) => `<a class="chip" href="#briefings${k === 'daily' ? '' : '/' + k}" aria-pressed="${tab === k}">${esc(t(k === 'daily' ? 'daily' : k))}</a>`).join('')}</div><div id="bBody" class="sec"></div>`;
    const box = el.querySelector('#bBody');
    if (tab === 'daily') {
      box.innerHTML = `<div class="tools"><input type="search" id="rq" value="${esc(rq)}" placeholder="${esc(t('searchReports'))}" aria-label="${esc(t('searchReports'))}"></div><div class="list" id="reportList"></div>`;
      const list = box.querySelector('#reportList');
      box.querySelector('#rq').addEventListener('input', (e) => { rq = e.target.value; clearTimeout(rqTimer); rqTimer = setTimeout(() => renderDailyList(list), 250); });
      return renderDailyList(list);
    }
    const bi = (await briefIndex()).filter((b) => b.period === tab);
    const local = PA.S.saved.filter((x) => x.kind === 'report' && x.type === (tab === 'weekly' ? 'Weekly briefing' : 'Monthly review'));
    box.innerHTML = `<div class="card"><button class="btn pri" type="button" id="genBrief">${esc(t(tab === 'weekly' ? 'genWeekly' : 'genMonthly'))}</button> <span class="small">${esc(t('genNote'))}</span><div id="genOut" class="brief" style="margin-top:12px"></div></div>
      <div class="list sec">${bi.map((b) => `<a class="item rrow" href="#briefings/${tab}/${esc(b.id)}"><div class="meta"><span>${fmtD(b.date)}</span><span>${esc(b.range || '')}</span>${b.items ? `<span>${b.items} ${esc(t('items'))}</span>` : ''}</div><span class="ttl">${esc(L(b.title))}</span></a>`).join('')}${local.map((x) => `<a class="item rrow" href="${esc(x.url || '#library')}"><div class="meta"><span class="badge">${esc(t('library'))}</span><span>${fmtD(x.date)}</span></div><span class="ttl">${esc(x.title)}</span></a>`).join('') || (bi.length ? '' : empty(t('noBriefings')))}</div>`;
    box.querySelector('#genBrief').onclick = async () => {
      const out = box.querySelector('#genOut');
      if (!PA.status.ai) { out.innerHTML = empty(t('noAI')); return; }
      out.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`;
      try {
        const days = tab === 'weekly' ? 7 : 30;
        const material = await gatherMaterial(days);
        const r = await research('briefing', { period: tab, material });
        const title = (tab === 'weekly' ? 'Weekly consultant briefing' : 'Monthly respiratory medicine review') + ' — ' + new Date().toISOString().slice(0, 10);
        const doc = { title, kind: tab === 'weekly' ? 'Weekly briefing' : 'Monthly review', md: r.text, cutoff: new Date().toISOString().slice(0, 10), refs: (r.references || []).filter((x) => x.pmid || x.doi).slice(0, 40).map((x) => ({ label: x.title, pmid: x.pmid, doi: x.doi })) };
        out.innerHTML = md(r.text) + `<div class="acts"><button class="btn pri" type="button" id="bSave">${esc(t('saveLib'))}</button><button class="btn" type="button" id="bPdf">${esc(t('pdf'))}</button></div>`;
        out.querySelector('#bSave').onclick = () => PA.saveReport(doc);
        out.querySelector('#bPdf').onclick = () => PA.pdf(doc);
      } catch (e) { out.innerHTML = empty(errMsg(e)); }
    };
  }
});
async function renderReport(el, id) {
  const idx = await index(), e = idx.find((x) => x.id === id);
  el.innerHTML = `<a class="btn" href="#briefings">${esc(t('back'))}</a><div class="card report sec" id="rOne">${e ? '' : empty(t('noResults'))}</div>`;
  if (!e) return;
  try { el.querySelector('#rOne').innerHTML = reportHTML(await digest(e), e, false); } catch (x) { el.querySelector('#rOne').innerHTML = empty(errMsg(x)); }
}
async function renderBrief(el, id) {
  const b = (await briefIndex()).find((x) => x.id === id);
  if (!b) { el.innerHTML = `<a class="btn" href="#briefings">${esc(t('back'))}</a>${empty(t('noResults'))}`; return; }
  let d; try { d = await getJSON('/data/briefings/' + b.file); } catch (e) { el.innerHTML = empty(errMsg(e)); return; }
  const lang = PA.S.lang === 'ar' && d.ar ? 'ar' : 'en';
  const body = (mode) => (d[lang] || d.en || {})[mode] || '';
  let mode = 'concise';
  const draw = () => {
    el.innerHTML = `<a class="btn" href="#briefings/${esc(b.period)}">${esc(t('back'))}</a><div class="card sec"><div class="meta"><span class="badge">${esc(b.period)}</span><span>${fmtD(b.date)}</span><span>${esc(b.range || '')}</span><span class="sp"></span><button class="btn" type="button" id="bp">${esc(t('pdf'))}</button></div>
      <div class="chips seg">${['concise', 'extended'].map((m) => `<button class="chip" type="button" data-bm="${m}" aria-pressed="${mode === m}">${esc(t(m === 'concise' ? 'concise' : 'extended'))}</button>`).join('')}</div><div class="brief">${md(body(mode))}</div></div>`;
    el.querySelectorAll('[data-bm]').forEach((x) => (x.onclick = () => { mode = x.dataset.bm; draw(); }));
    el.querySelector('#bp').onclick = () => PA.pdf({ title: L(b.title), kind: b.period === 'weekly' ? 'Weekly briefing' : 'Monthly review', md: body(mode), mode: mode === 'concise' ? 'concise' : 'comprehensive', cutoff: b.date, refs: d.refs || [] });
  };
  draw();
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.repcat) { repCat = b.dataset.repcat; PA.show(); }
  else if (b.dataset.saveitem) { const it = JSON.parse(b.dataset.saveitem); const on = lib.toggle(it); b.setAttribute('aria-pressed', on); b.textContent = on ? '★ ' + t('saved') : '☆ ' + t('save'); }
  else if (b.dataset.reportpdf) { const idx = await index(); const ent = idx.find((x) => x.id === b.dataset.reportpdf); if (ent) { const d = await digest(ent); PA.pdf({ title: L(d.title), kind: 'Daily report', md: reportMd(d), cutoff: d.date, mode: 'concise' }); } }
});
})();
