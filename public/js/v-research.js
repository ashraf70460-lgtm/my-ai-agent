/* Research: Quick Update · Deep Research · Clinical Intelligence, and the Research Radar. */
(() => {
const { esc, safe, t, md, fmtD, fmtT, ago, empty, lib, toast, api, research, errMsg, paperCard } = PA;
PA.i18n({
  en: { quickUpdate: 'Quick update', deepResearch: 'Deep research', clinical: 'Clinical intelligence', quLede: 'What is new in respiratory medicine and critical care, straight from PubMed, ClinicalTrials.gov and openFDA.', window: 'Time window', focus: 'Focus', allResp: 'All respiratory & critical care', d1: 'Today', d7: '7 days', d30: '30 days', d90: '3 months', d180: '6 months', d365: '1 year', newGuides: 'New guidelines & consensus', highEv: 'RCTs, meta-analyses & systematic reviews', topJ: 'Top journals', newTrials: 'Newly registered trials', fdaLbl: 'FDA respiratory label changes', recalls: 'Safety alerts (FDA recalls)', aiSummary: 'AI summary', srcLine: 'Sources', deepLede: 'A structured, AI-assisted evidence synthesis: PICO, multi-database search, de-duplication, evidence table, appraisal, guideline comparison and GRADE-style certainty. Not a formal systematic review.', question: 'Research question', depth: 'Depth', start: 'Start deep research', step1: 'Plan the search (PICO, keywords, queries)', step2: 'Search PubMed, Europe PMC and ClinicalTrials.gov', step3: 'Appraise and synthesise the evidence', past: 'Previous deep research', ciLede: 'Direct, referenced answers to clinical questions using current guidelines and trials.', ask: 'Ask', examples: 'Examples', radarLede: 'Live literature discovery across PubMed and Europe PMC, ranked by evidence level, journal, recency and citations. Duplicates are merged; retractions, preprints and conference abstracts are flagged.', query: 'Search terms', studyType: 'Study type', journal: 'Journal', anyJournal: 'Any journal', sort: 'Sort', rank: 'Best evidence first', newest: 'Newest first', preprints: 'Include preprints', byType: 'By evidence level', watches: 'Literature watches', watchesLede: 'Your topic watch, guideline watch and custom PubMed watches (they also feed the Today page).', runWatches: 'Run all watches', addWatch: 'New watch', watchName: 'Name', pubmedQ: 'PubMed search', lastRun: 'Last run', briefT: 'Write a briefing after each run', topicsT: 'Topic watch', guideT: 'Guideline watch', results: 'results', newCount: 'new since last check', subspec: 'Subspecialty', anyTopic: 'Any', report: 'Report' },
  ar: { quickUpdate: 'تحديث سريع', deepResearch: 'بحث معمّق', clinical: 'الذكاء السريري', quLede: 'الجديد في طب الصدر والعناية المركزة مباشرة من PubMed وClinicalTrials.gov وopenFDA.', window: 'المدة', focus: 'التركيز', allResp: 'كل طب الصدر والعناية المركزة', d1: 'اليوم', d7: '7 أيام', d30: '30 يومًا', d90: '3 أشهر', d180: '6 أشهر', d365: 'سنة', newGuides: 'إرشادات وإجماعات جديدة', highEv: 'تجارب عشوائية ومراجعات منهجية', topJ: 'المجلات الكبرى', newTrials: 'تجارب مسجلة حديثًا', fdaLbl: 'تغييرات نشرات FDA التنفسية', recalls: 'تنبيهات السلامة (سحب FDA)', aiSummary: 'ملخص بالذكاء الاصطناعي', srcLine: 'المصادر', deepLede: 'تجميع منظّم للأدلة بمساعدة الذكاء الاصطناعي: PICO، بحث في عدة قواعد، إزالة التكرار، جدول أدلة، تقييم، مقارنة إرشادات ودرجة يقين GRADE. ليس مراجعة منهجية رسمية.', question: 'سؤال البحث', depth: 'العمق', start: 'ابدأ البحث المعمّق', step1: 'تخطيط البحث (PICO، كلمات مفتاحية، استعلامات)', step2: 'البحث في PubMed وEurope PMC وClinicalTrials.gov', step3: 'تقييم الأدلة وتجميعها', past: 'أبحاث معمّقة سابقة', ciLede: 'إجابات مباشرة موثّقة للأسئلة السريرية من الإرشادات والتجارب الحالية.', ask: 'اسأل', examples: 'أمثلة', radarLede: 'اكتشاف مباشر للأبحاث عبر PubMed وEurope PMC مرتبة حسب مستوى الدليل والمجلة والحداثة والاستشهادات، مع دمج المكرر وتمييز المسحوب والنسخ الأولية وملخصات المؤتمرات.', query: 'كلمات البحث', studyType: 'نوع الدراسة', journal: 'المجلة', anyJournal: 'أي مجلة', sort: 'الترتيب', rank: 'الأقوى دليلًا أولًا', newest: 'الأحدث أولًا', preprints: 'تضمين النسخ الأولية', byType: 'حسب مستوى الدليل', watches: 'متابعات الأبحاث', watchesLede: 'متابعة المواضيع والإرشادات ومتابعات PubMed الخاصة (تغذي صفحة اليوم أيضًا).', runWatches: 'شغّل كل المتابعات', addWatch: 'متابعة جديدة', watchName: 'الاسم', pubmedQ: 'بحث PubMed', lastRun: 'آخر تشغيل', briefT: 'اكتب ملخصًا بعد كل تشغيل', topicsT: 'متابعة المواضيع', guideT: 'متابعة الإرشادات', results: 'نتيجة', newCount: 'جديد منذ آخر فحص', subspec: 'التخصص', anyTopic: 'الكل', report: 'تقرير' }
});
const WIN = [1, 7, 30, 90, 180, 365];
const subs = () => window.PA_SUBS || [];
const srcLine = (sources, at) => `<p class="small srcline">${esc(t('srcLine'))}: ${Object.entries(sources || {}).map(([k, s]) => `<span class="flag ${s.ok ? 'ok' : 'x'}">${esc(k)}${s.ok ? ' ' + (s.count ?? '') : ' ✗'}</span>`).join(' ')} · ${esc(t('lastUpdated'))} ${fmtT(Date.parse(at))}</p>`;

/* ---------------- Research view ---------------- */
PA.view('research', {
  render(el, arg) {
    const mode = arg === 'deep' ? 'deep' : arg === 'clinical' ? 'clinical' : 'quick';
    el.innerHTML = `<h2>${esc(t('research'))}</h2><div class="chips seg modes">${[['quick', 'quickUpdate'], ['deep', 'deepResearch'], ['clinical', 'clinical']].map(([k, l]) => `<a class="chip" href="#research${k === 'quick' ? '' : '/' + k}" aria-pressed="${mode === k}">${esc(t(l))}</a>`).join('')}</div><div id="rBody" class="sec"></div>`;
    const box = el.querySelector('#rBody');
    if (mode === 'quick') quick(box); else if (mode === 'deep') deep(box); else clinical(box);
  }
});

function quick(box) {
  const c = PA.cache.get('qu');
  const d = (c && c.days) || 7, f = (c && c.focusId) || '';
  box.innerHTML = `<p class="lede">${esc(t('quLede'))}</p><div class="card tools2">
    <div><div class="lbl">${esc(t('window'))}</div><div class="chips">${WIN.map((n) => `<button class="chip" type="button" data-qd="${n}" aria-pressed="${n === d}">${esc(t('d' + n))}</button>`).join('')}</div></div>
    <label><span class="lbl">${esc(t('focus'))}</span><select id="quFocus"><option value="">${esc(t('allResp'))}</option>${subs().map((s) => `<option value="${esc(s.id)}" ${s.id === f ? 'selected' : ''}>${esc(PA.S.lang === 'ar' ? s.ar : s.en)}</option>`).join('')}</select></label>
    <div class="row"><button class="btn pri" type="button" id="quRun">${esc(t('run'))}</button><button class="btn" type="button" id="quAI">${esc(t('aiSummary'))}</button><button class="btn" type="button" id="quPdf">${esc(t('pdf'))}</button></div></div><div id="quOut"></div>`;
  let days = d;
  box.querySelectorAll('[data-qd]').forEach((b) => (b.onclick = () => { days = +b.dataset.qd; box.querySelectorAll('[data-qd]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
  const out = box.querySelector('#quOut');
  const draw = (r) => {
    if (!r) { out.innerHTML = ''; return; }
    const sec = (title, list, fn) => `<div class="sec"><h3>${esc(title)} <span class="cnt">${list.length}</span></h3><div class="list">${list.length ? list.map(fn).join('') : empty(t('noResults'))}</div></div>`;
    out.innerHTML = srcLine(r.sources, r.at) + (r.ai ? `<div class="card brief">${md(r.ai)}</div>` : '') +
      sec(t('newGuides'), r.guidelines.slice(0, 15), (a) => paperCard(a)) +
      sec(t('highEv'), r.highEvidence.slice(0, 20), (a) => paperCard(a)) +
      sec(t('topJ'), r.topJournals.slice(0, 20), (a) => paperCard(a)) +
      sec(t('newTrials'), r.trials, (x) => `<article class="item"><div class="meta"><span class="ev ev-r">${esc((x.phases || []).join('/') || x.type || 'Study')}</span><span>${esc(x.status)}</span><span>${esc(x.firstPosted)}</span>${x.enrollment ? `<span>N=${esc(x.enrollment)}</span>` : ''}</div><a class="ttl" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a><div class="small">${esc(x.nct)} · ${esc(x.sponsor)} · ${esc((x.conditions || []).slice(0, 3).join(', '))}${x.interventions.length ? ' · ' + esc(x.interventions.join(', ')) : ''}</div></article>`) +
      sec(t('fdaLbl'), r.fda, (x) => `<article class="item"><div class="meta"><span class="ev ev-g">FDA label</span><span>${esc(x.date)}</span><span>${esc(x.manufacturer)}</span></div>${safe(x.url) ? `<a class="ttl" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.brand || x.generic)}</a>` : `<span class="ttl">${esc(x.brand || x.generic)}</span>`}<div class="small">${esc(x.generic)}</div><p class="note">${esc(x.indication)}</p></article>`) +
      sec(t('recalls'), r.recalls, (x) => `<article class="item"><div class="meta"><span class="flag x">${esc(x.classification || 'Recall')}</span><span>${esc(x.date)}</span><span>${esc(x.firm)}</span><span>${esc(x.status)}</span></div><span class="ttl">${esc(x.product)}</span><p class="note">${esc(x.reason)}</p></article>`);
  };
  draw(c && c.r);
  box.querySelector('#quRun').onclick = async () => {
    const fid = box.querySelector('#quFocus').value, sub = subs().find((s) => s.id === fid);
    out.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`;
    try {
      const r = await api('/api/updates?days=' + days + (sub ? '&focus=' + encodeURIComponent(sub.q) : ''));
      PA.markSeen([...r.guidelines, ...r.highEvidence, ...r.topJournals]); PA.save();
      PA.cache.set('qu', { t: Date.now(), days, focusId: fid, r }); draw(r);
    } catch (e) { out.innerHTML = empty(errMsg(e)); }
  };
  box.querySelector('#quAI').onclick = async () => {
    const cc = PA.cache.get('qu'); if (!cc) { toast(t('run') + '…'); return; }
    if (!PA.status.ai) { toast(t('noAI')); return; }
    const fmt = (a) => `- ${a.evidence} | ${a.title} | ${a.journal} | ${a.date} | PMID ${a.pmid} | DOI ${a.doi || '–'}${a.retracted ? ' | RETRACTED' : ''}\n  ${String(a.abstract || '').slice(0, 400)}`;
    const r = cc.r;
    const material = `Window: last ${cc.days} days.\nGUIDELINES:\n${r.guidelines.slice(0, 12).map(fmt).join('\n')}\nHIGH EVIDENCE:\n${r.highEvidence.slice(0, 20).map(fmt).join('\n')}\nTOP JOURNALS:\n${r.topJournals.slice(0, 15).map(fmt).join('\n')}\nTRIALS:\n${r.trials.slice(0, 10).map((x) => `- ${x.nct} ${x.title} ${x.status}`).join('\n')}\nFDA:\n${r.fda.slice(0, 8).map((x) => `- ${x.brand} ${x.date} ${x.indication.slice(0, 120)}`).join('\n')}\nRECALLS:\n${r.recalls.slice(0, 8).map((x) => `- ${x.date} ${x.product.slice(0, 100)}: ${x.reason.slice(0, 120)}`).join('\n')}`;
    out.insertAdjacentHTML('afterbegin', `<p class="small" id="quWait">${esc(t('thinking'))}</p>`);
    try { const a = await research('briefing', { period: 'weekly', material }); cc.r.ai = a.text; PA.cache.set('qu', cc); draw(cc.r); } catch (e) { toast(errMsg(e)); }
    const w = document.getElementById('quWait'); if (w) w.remove();
  };
  box.querySelector('#quPdf').onclick = () => {
    const cc = PA.cache.get('qu'); if (!cc) return toast(t('run') + '…');
    const r = cc.r, li = (a) => `- **${a.title}** — ${a.journal}, ${a.date} · ${a.evidence}${a.pmid ? ' · PMID ' + a.pmid : ''}${a.doi ? ' · https://doi.org/' + a.doi : ''}`;
    const mdText = `${r.ai ? r.ai + '\n\n' : ''}## ${t('newGuides')}\n${r.guidelines.slice(0, 15).map(li).join('\n') || '-'}\n\n## ${t('highEv')}\n${r.highEvidence.slice(0, 20).map(li).join('\n') || '-'}\n\n## ${t('topJ')}\n${r.topJournals.slice(0, 20).map(li).join('\n') || '-'}\n\n## ${t('newTrials')}\n${r.trials.map((x) => `- **${x.title}** — ${x.nct}, ${x.status}, first posted ${x.firstPosted} ${x.url}`).join('\n') || '-'}\n\n## ${t('fdaLbl')}\n${r.fda.map((x) => `- **${x.brand || x.generic}** (${x.date}) ${x.url}`).join('\n') || '-'}\n\n## ${t('recalls')}\n${r.recalls.map((x) => `- ${x.date} — ${x.product}: ${x.reason}`).join('\n') || '-'}`;
    PA.pdf({ title: `Quick update — last ${cc.days} days`, kind: 'Quick update report', md: mdText, cutoff: new Date(cc.t).toISOString().slice(0, 10), mode: 'concise', sourcesLine: 'PubMed, ClinicalTrials.gov, openFDA' });
  };
}

function deep(box) {
  const past = PA.S.saved.filter((x) => x.kind === 'report' && x.type === 'Deep research');
  const last = PA.cache.get('deep');
  box.innerHTML = `<p class="lede">${esc(t('deepLede'))}</p><form class="card dform" id="dForm" data-noop>
    <label><span class="lbl">${esc(t('question'))}</span><textarea id="dQ" rows="3" required placeholder="e.g. In adults with bronchiectasis and frequent exacerbations, does long-term macrolide therapy reduce exacerbations compared with placebo, and what are the risks?">${esc((last && last.q) || '')}</textarea></label>
    <div class="row"><label><span class="lbl">${esc(t('depth'))}</span><select id="dDepth"><option value="comprehensive">${esc(t('comprehensive'))}</option><option value="concise" ${PA.S.depth === 'concise' ? 'selected' : ''}>${esc(t('concise'))}</option></select></label><span class="sp"></span><button class="btn pri" id="dRun">${esc(t('start'))}</button></div></form>
    <ol class="steps" id="dSteps"><li data-s="1">${esc(t('step1'))}</li><li data-s="2">${esc(t('step2'))}</li><li data-s="3">${esc(t('step3'))}</li></ol>
    <div id="dOut"></div>${past.length ? `<div class="sec"><h3>${esc(t('past'))}</h3><div class="list">${past.map((x) => `<a class="item rrow" href="${esc(x.url || '#library')}"><div class="meta"><span>${fmtD(x.date)}</span></div><span class="ttl">${esc(x.title)}</span></a>`).join('')}</div></div>` : ''}`;
  const out = box.querySelector('#dOut'), steps = box.querySelector('#dSteps');
  const step = (n, st, detail) => { const li = steps.querySelector(`[data-s="${n}"]`); li.className = st; if (detail != null) { let d = li.querySelector('.d'); if (!d) { d = document.createElement('div'); d.className = 'd small'; li.appendChild(d); } d.innerHTML = detail; } };
  if (last && last.report) showReport(last);
  function showReport(st) {
    const doc = docOf(st);
    out.innerHTML = `<div class="card"><div class="row"><span class="badge">${esc(st.depth)}</span><span class="small">${fmtT(st.t)}</span><span class="sp"></span><button class="btn pri" type="button" id="dSave">${esc(t('saveLib'))}</button><button class="btn" type="button" id="dPdf">${esc(t('pdf'))}</button><button class="btn" type="button" id="dCopy">${esc(t('copy'))}</button></div><div class="brief report-md">${md(st.report)}</div>${st.web && st.web.length ? `<details><summary>Web sources used (${st.web.length})</summary><ul class="small">${st.web.map((w) => `<li><a href="${esc(safe(w.url))}" target="_blank" rel="noopener">${esc(w.title || w.url)}</a></li>`).join('')}</ul></details>` : ''}</div>`;
    out.querySelector('#dSave').onclick = () => PA.saveReport(doc);
    out.querySelector('#dPdf').onclick = () => PA.pdf(doc);
    out.querySelector('#dCopy').onclick = async () => { try { await navigator.clipboard.writeText(st.report); toast(t('copied')); } catch (e) { toast(t('error')); } };
  }
  function docOf(st) {
    const m = /^#\s+(.+)$/m.exec(st.report || '');
    return { title: m ? m[1] : 'Deep research: ' + st.q.slice(0, 90), kind: 'Deep research', md: st.report.replace(/^#\s+.+\n/, ''), mode: st.depth, cutoff: new Date(st.t).toISOString().slice(0, 10),
      refs: (st.records || []).slice(0, 35).map((a) => ({ label: `${a.authors ? a.authors + '. ' : ''}${a.title}. ${a.journal} ${String(a.date || '').slice(0, 4)}.`, pmid: a.pmid, doi: a.doi })),
      limitations: `Structured AI-assisted synthesis of ${st.strategy ? st.strategy.afterDedupe : '?'} de-duplicated records (abstracts) from PubMed and Europe PMC plus ClinicalTrials.gov and official guideline sources; not a formal systematic review (no dual screening or full-text risk-of-bias assessment). Search date ${new Date(st.t).toISOString().slice(0, 10)}. Educational research support — not individualised patient management.`,
      sourcesLine: 'PubMed, Europe PMC, ClinicalTrials.gov' + (st.web && st.web.length ? ', official society websites (web search)' : '') };
  }
  box.querySelector('#dForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!PA.status.ai) { out.innerHTML = empty(t('noAI')); return; }
    const q = box.querySelector('#dQ').value.trim(), depth = box.querySelector('#dDepth').value;
    PA.S.depth = depth; PA.save();
    const btn = box.querySelector('#dRun'); btn.disabled = true; out.innerHTML = '';
    const st = { q, depth, t: Date.now() };
    try {
      step(1, 'busy'); const p = await research('plan', { question: q }); st.plan = p.plan;
      step(1, 'done', `${p.plan.pico && p.plan.pico.P ? `<b>P</b> ${esc(p.plan.pico.P)} · <b>I</b> ${esc(p.plan.pico.I)} · <b>C</b> ${esc(p.plan.pico.C)} · <b>O</b> ${esc(p.plan.pico.O)}<br>` : ''}${(p.plan.pubmed || []).map((x) => `<code>${esc(x)}</code>`).join('<br>')}`);
      step(2, 'busy'); const s = await research('search', { plan: p.plan }); st.records = s.records; st.trials = s.trials; st.strategy = s.strategy;
      step(2, 'done', `${s.strategy.totalRetrieved} retrieved → ${s.strategy.afterDedupe} after de-duplication · ${s.trials.length} registered trials`);
      step(3, 'busy'); const r = await research('synthesize', { plan: p.plan, search: s, depth }); st.report = r.text; st.web = r.webSources || [];
      step(3, 'done', `${r.toolCalls || 0} verification/search calls${r.webUsed ? ' · web search used for guidelines' : ''}`);
      PA.cache.set('deep', st); showReport(st);
    } catch (err) { const cur = steps.querySelector('.busy'); if (cur) cur.className = 'fail'; out.innerHTML = empty(errMsg(err)); }
    btn.disabled = false;
  });
}

const EX = { en: ['What is the latest evidence for triple therapy in COPD?', 'Compare current recommendations for severe asthma biologics.', 'What are the latest ARDS ventilation recommendations?', 'What is the evidence for antifibrotic treatment in progressive pulmonary fibrosis?', 'What are the recent updates in pulmonary hypertension?'], ar: ['ما أحدث الأدلة على العلاج الثلاثي في COPD؟', 'قارن التوصيات الحالية للعلاجات البيولوجية في الربو الشديد.', 'ما أحدث توصيات التهوية في ARDS؟', 'ما الدليل على مضادات التليف في التليف الرئوي المترقي؟'] };
let thread = [];
function clinical(box) {
  box.innerHTML = `<p class="lede">${esc(t('ciLede'))}</p><div class="lbl">${esc(t('examples'))}</div><div class="chips" style="margin-bottom:12px">${(EX[PA.S.lang] || EX.en).map((q) => `<button class="chip" type="button" data-ciq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <form class="card ask" id="ciForm" data-noop><textarea id="ciQ" rows="2" placeholder="${esc(t('question'))}"></textarea><button class="btn pri">${esc(t('ask'))}</button></form><div id="ciThread" class="sec"></div>`;
  const th = box.querySelector('#ciThread');
  const draw = () => {
    th.innerHTML = thread.map((m, i) => m.role === 'q' ? `<div class="msg u">${esc(m.text)}</div>` : `<div class="card ans">${m.pending ? `<p class="small">${esc(t('thinking'))}</p>` : md(m.text)}${m.refs && m.refs.length ? `<details><summary>${esc(t('sourcesLbl'))} (${m.refs.length})</summary><ul class="small">${m.refs.slice(0, 40).map((r) => `<li>${r.url ? `<a href="${esc(safe(r.url))}" target="_blank" rel="noopener">${esc(r.title || r.url)}</a>` : esc(r.title || '')}${r.pmid ? ` · <a href="https://pubmed.ncbi.nlm.nih.gov/${esc(r.pmid)}/" target="_blank" rel="noopener">PMID ${esc(r.pmid)}</a>` : ''}${r.nct ? ' · ' + esc(r.nct) : ''}</li>`).join('')}</ul></details>` : ''}${m.pending ? '' : `<div class="acts"><button class="btn" type="button" data-cisave="${i}">${esc(t('saveLib'))}</button><button class="btn" type="button" data-cipdf="${i}">${esc(t('pdf'))}</button></div>`}</div>`).join('');
  };
  draw();
  const docOf = (i) => { const a = thread[i], q = thread[i - 1]; return { title: 'Clinical question: ' + (q ? q.text : '').slice(0, 120), kind: 'Clinical intelligence', md: `**Question:** ${q ? q.text : ''}\n\n${a.text}`, refs: (a.refs || []).filter((r) => r.pmid || r.doi).map((r) => ({ label: r.title, pmid: r.pmid, doi: r.doi })) }; };
  th.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.cisave) PA.saveReport(docOf(+b.dataset.cisave)); if (b.dataset.cipdf) PA.pdf(docOf(+b.dataset.cipdf)); });
  const ask = async (q) => {
    if (!q.trim()) return;
    thread.push({ role: 'q', text: q }); const ans = { role: 'a', pending: true }; thread.push(ans); draw();
    if (!PA.status.ai) { ans.pending = false; ans.text = t('noAI'); draw(); return; }
    try { const r = await research('clinical', { question: q }); Object.assign(ans, { pending: false, text: r.text, refs: [...(r.references || []).map((x) => ({ title: x.title, pmid: x.pmid, doi: x.doi, nct: x.nct, url: x.url || (x.doi ? 'https://doi.org/' + x.doi : '') })), ...(r.webSources || [])] }); }
    catch (e) { ans.pending = false; ans.text = errMsg(e); }
    draw();
  };
  box.querySelectorAll('[data-ciq]').forEach((b) => (b.onclick = () => ask(b.dataset.ciq)));
  box.querySelector('#ciForm').addEventListener('submit', (e) => { e.preventDefault(); const v = box.querySelector('#ciQ').value; box.querySelector('#ciQ').value = ''; ask(v); });
}
PA.askClinical = (q) => { location.hash = '#research/clinical'; setTimeout(() => { const b = document.getElementById('ciQ'); if (b) { b.value = q; b.focus(); } }, 50); };

/* ---------------- Radar ---------------- */
const TYPES = [['rct', 'RCT'], ['meta', 'Meta-analysis'], ['sr', 'Systematic review'], ['guideline', 'Guideline'], ['observational', 'Observational'], ['diagnostic', 'Diagnostic accuracy'], ['review', 'Review']];
const JOURNALS = ['Am J Respir Crit Care Med', 'Eur Respir J', 'Thorax', 'Chest', 'Lancet Respir Med', 'Respir Med', 'Crit Care', 'Intensive Care Med', 'N Engl J Med', 'Lancet', 'JAMA', 'BMJ', 'Nat Med', 'Ann Am Thorac Soc', 'ERJ Open Res', 'J Thorac Oncol', 'Sleep', 'J Clin Sleep Med', 'Cochrane Database Syst Rev'];
PA.view('radar', {
  render(el, arg) {
    const st = PA.cache.get('radarForm') || { q: '', sub: '', days: 30, types: ['rct', 'meta', 'sr', 'guideline'], journal: '', sort: 'rank', pubmed: true, epmc: true, preprints: true };
    if (arg && subs().find((s) => s.id === arg)) st.sub = arg;
    el.innerHTML = `<h2>${esc(t('radar'))}</h2><p class="lede">${esc(t('radarLede'))}</p>
    <form class="card rform" id="rForm" data-noop>
      <label class="wide"><span class="lbl">${esc(t('query'))}</span><input id="rQ" value="${esc(st.q)}" placeholder="e.g. tezepelumab OR biologic AND asthma"></label>
      <label><span class="lbl">${esc(t('subspec'))}</span><select id="rSub"><option value="">${esc(t('anyTopic'))}</option>${subs().map((s) => `<option value="${esc(s.id)}" ${s.id === st.sub ? 'selected' : ''}>${esc(PA.S.lang === 'ar' ? s.ar : s.en)}</option>`).join('')}</select></label>
      <label><span class="lbl">${esc(t('window'))}</span><select id="rDays">${WIN.map((n) => `<option value="${n}" ${n === st.days ? 'selected' : ''}>${esc(t('d' + n))}</option>`).join('')}<option value="1825" ${st.days === 1825 ? 'selected' : ''}>5 years</option></select></label>
      <label><span class="lbl">${esc(t('journal'))}</span><select id="rJ"><option value="">${esc(t('anyJournal'))}</option>${JOURNALS.map((j) => `<option ${j === st.journal ? 'selected' : ''}>${esc(j)}</option>`).join('')}</select></label>
      <label><span class="lbl">${esc(t('sort'))}</span><select id="rSort"><option value="rank">${esc(t('rank'))}</option><option value="date" ${st.sort === 'date' ? 'selected' : ''}>${esc(t('newest'))}</option></select></label>
      <div class="wide"><span class="lbl">${esc(t('studyType'))}</span><div class="chips">${TYPES.map(([k, l]) => `<button class="chip" type="button" data-rt="${k}" aria-pressed="${st.types.includes(k)}">${esc(l)}</button>`).join('')}</div></div>
      <div class="wide row"><label class="chk"><input type="checkbox" id="rPm" ${st.pubmed ? 'checked' : ''}> PubMed</label><label class="chk"><input type="checkbox" id="rEp" ${st.epmc ? 'checked' : ''}> Europe PMC</label><label class="chk"><input type="checkbox" id="rPre" ${st.preprints ? 'checked' : ''}> ${esc(t('preprints'))}</label><span class="sp"></span><button class="btn pri">${esc(t('search'))}</button></div>
    </form><div id="rOut"></div>
    <div class="sec"><div class="row"><h3>${esc(t('watches'))}</h3><span class="sp"></span><button class="btn pri" type="button" id="wRun">${esc(t('runWatches'))}</button></div><p class="small">${esc(t('watchesLede'))}</p><div id="wStatus" class="small"></div><div class="list" id="wList"></div><div class="list sec" id="wResults"></div></div>`;
    const form = el.querySelector('#rForm'), out = el.querySelector('#rOut');
    form.querySelectorAll('[data-rt]').forEach((b) => (b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
    const cached = PA.cache.get('radar'); if (cached) drawRadar(out, cached);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const s = { q: form.querySelector('#rQ').value.trim(), sub: form.querySelector('#rSub').value, days: +form.querySelector('#rDays').value, journal: form.querySelector('#rJ').value, sort: form.querySelector('#rSort').value, types: [...form.querySelectorAll('[data-rt][aria-pressed=true]')].map((b) => b.dataset.rt), pubmed: form.querySelector('#rPm').checked, epmc: form.querySelector('#rEp').checked, preprints: form.querySelector('#rPre').checked };
      PA.cache.set('radarForm', s);
      const sub = subs().find((x) => x.id === s.sub);
      const q = [s.q, sub && sub.q].filter(Boolean).map((x) => `(${x})`).join(' AND ') || '(' + subs().slice(0, 1).map((x) => x.q).join('') + ')';
      out.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`;
      try {
        const r = await api('/api/search', { method: 'POST', body: { q, sources: [s.pubmed && 'pubmed', s.epmc && 'europepmc'].filter(Boolean), days: s.days, types: s.types, journal: s.journal, sort: s.sort, max: 30, preprints: s.preprints } });
        const n = PA.markSeen(r.records); PA.S.lastVisitSeen = n; PA.save();
        const rec = { t: Date.now(), newCount: n, ...r };
        PA.cache.set('radar', rec); drawRadar(out, rec);
      } catch (err) { out.innerHTML = empty(errMsg(err)); }
    });
    drawWatches(el);
  }
});
function drawRadar(out, r) {
  const by = {}; r.records.forEach((a) => { by[a.evidence] = (by[a.evidence] || 0) + 1; });
  const max = Math.max(1, ...Object.values(by));
  const bars = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="bar"><span>${esc(k)}</span><i style="width:${(v / max) * 100}%"></i><b>${v}</b></div>`).join('');
  out.innerHTML = `${srcLine(r.sources, r.at)}<div class="grid2 radartop"><div class="card"><h3>${esc(t('byType'))}</h3><div class="bars">${bars || empty('–')}</div></div><div class="card kpis"><div><b>${r.records.length}</b><span>${esc(t('results'))}</span></div><div><b>${r.newCount || 0}</b><span>${esc(t('newCount'))}</span></div><div><b>${r.records.filter((a) => a.sources && a.sources.length > 1).length}</b><span>${esc(t('dupMerged'))} 2 sources</span></div><div><b>${r.records.filter((a) => a.retracted || a.preprint).length}</b><span>flagged</span></div></div></div><div class="list sec">${r.records.map((a) => paperCard(a)).join('') || empty(t('noResults'))}</div>`;
}

/* Literature watches (preserved from earlier versions: topics, guideline watch, custom PubMed watches) */
const GUIDE_Q = '(guideline[Title] OR consensus[Title] OR "official statement"[Title] OR "Practice Guideline"[Publication Type]) AND (lung OR respiratory OR pulmonary OR asthma OR COPD OR bronchiectasis OR pleural OR tuberculosis OR sleep apnea)';
function drawWatches(el) {
  const S = PA.S, sw = PA.sw;
  const on = S.topics.some((x) => x.on);
  el.querySelector('#wStatus').textContent = `${t('lastRun')}: ${S.run && S.run.at ? fmtT(S.run.at) : '–'}`;
  el.querySelector('#wList').innerHTML = `<article class="item"><div class="task"><div><span class="ttl">${esc(t('topicsT'))}</span><div class="chips" style="margin-top:8px">${S.topics.map((x, i) => `<button class="chip" type="button" data-topic="${i}" aria-pressed="${!!x.on}">${esc(x.k)}</button>`).join('')}</div><form class="row" data-addtopic style="margin-top:8px"><input name="k" placeholder="NTM" aria-label="Topic"><button class="btn">${esc(t('add'))}</button></form></div>${sw(on, 'data-alltopics')}</div></article>
  <article class="item"><div class="task"><div><span class="ttl">${esc(t('guideT'))}</span></div>${sw(S.guideOn, 'data-guideon')}</div></article>
  <article class="item"><div class="task"><div><span class="ttl">${esc(t('briefT'))}</span></div>${sw(S.brief, 'data-briefon')}</div></article>
  ${S.watches.map((k) => `<article class="item"><div class="task"><div><span class="ttl">${esc(k.name)}</span><p class="q">${esc(k.term)}</p><div class="small">${esc(k.days)} ${esc(t('days'))}${k.last ? ` · ${esc(t('lastRun'))}: ${fmtT(k.last)} · ${esc(k.count || 0)}` : ''}</div></div>${sw(k.on, `data-taskon="${esc(k.id)}"`)}</div><div class="acts"><button class="btn" type="button" data-delwatch="${esc(k.id)}">${esc(t('remove'))}</button></div></article>`).join('')}
  <form class="add card" id="wForm"><input name="name" required placeholder="${esc(t('watchName'))}"><input name="term" required placeholder='${esc(t('pubmedQ'))}: bronchiectasis AND "Randomized Controlled Trial"[pt]'><select name="days"><option value="7">7</option><option value="14" selected>14</option><option value="30">30</option><option value="90">90</option></select><button class="btn pri">${esc(t('addWatch'))}</button></form>`;
  const res = el.querySelector('#wResults');
  const ps = (S.run && S.run.papers) || [];
  res.innerHTML = (S.run && S.run.brief ? `<div class="card brief">${md(S.run.brief)}</div>` : '') + ps.slice(0, 30).map((a) => paperCard(a)).join('');
  el.querySelector('#wForm').addEventListener('submit', (e) => { e.preventDefault(); const fd = new FormData(e.target); S.watches.push({ id: 'w-' + PA.uid(), name: String(fd.get('name')).trim(), term: String(fd.get('term')).trim(), days: +fd.get('days') || 14, on: 1 }); PA.save(); drawWatches(el); });
  el.querySelector('[data-addtopic]').addEventListener('submit', (e) => { e.preventDefault(); const v = String(new FormData(e.target).get('k')).trim(); if (v && !S.topics.some((x) => x.k.toLowerCase() === v.toLowerCase())) { S.topics.push({ k: v, on: 1 }); PA.save(); drawWatches(el); } });
  el.querySelector('#wRun').onclick = () => runWatches(el);
  el.querySelector('#wList').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.topic !== undefined) { const tp = S.topics[+d.topic]; tp.on = tp.on ? 0 : 1; }
    else if (d.alltopics !== undefined) { const o = !S.topics.some((x) => x.on); S.topics.forEach((x) => (x.on = o ? 1 : 0)); }
    else if (d.guideon !== undefined) S.guideOn = S.guideOn ? 0 : 1;
    else if (d.briefon !== undefined) S.brief = S.brief ? 0 : 1;
    else if (d.taskon) { const k = S.watches.find((x) => x.id === d.taskon); if (k) k.on = k.on ? 0 : 1; }
    else if (d.delwatch) S.watches = S.watches.filter((x) => x.id !== d.delwatch);
    else return;
    PA.save(); drawWatches(el);
  };
}
async function runWatches(el) {
  const S = PA.S, list = [];
  S.topics.filter((x) => x.on).forEach((x) => list.push({ term: `(${x.k}[Title/Abstract]) AND english[Language]`, days: S.days, max: 10, tag: x.k }));
  if (S.guideOn) list.push({ term: GUIDE_Q, days: 90, max: 15, tag: '__guide' });
  S.watches.filter((k) => k.on).forEach((k) => list.push({ term: k.term, days: k.days, max: 15, tag: '__task:' + k.id }));
  const st = el.querySelector('#wStatus'); st.textContent = t('thinking');
  try {
    const r = await api('/api/pubmed', { method: 'POST', body: { searches: list } });
    const papers = [], guides = [];
    for (const a of r.papers || []) { if (a.topic === '__guide') guides.push({ ...a, topic: 'Guideline' }); else if (a.topic.startsWith('__task:')) { const k = S.watches.find((x) => '__task:' + x.id === a.topic); papers.push({ ...a, topic: k ? k.name : '' }); } else papers.push(a); }
    S.watches.forEach((k) => { if (list.some((s) => s.tag === '__task:' + k.id)) { k.last = Date.now(); k.count = papers.filter((a) => a.topic === k.name).length; } });
    const n = PA.markSeen([...papers, ...guides]); S.lastVisitSeen = n;
    S.run = { at: Date.now(), papers: papers.slice(0, 150), guides, brief: (S.run && S.run.brief) || '' };
    PA.save();
    if (PA.status.ai && S.brief) {
      st.textContent = t('thinking');
      const ps = papers.slice(0, 20);
      try { const b = await PA.api('/api/claude', { method: 'POST', body: { maxTokens: 1100, messages: [{ role: 'user', content: `You are PULMONOLOGIST-AGENT. Write a briefing (${PA.S.lang === 'ar' ? 'Arabic, keep drug/trial names in English' : 'English'}) from ONLY these new PubMed records; do not invent studies or numbers. Headline, then "## Practice-changing or notable" (3–6 bullets with journal and PMID), "## Guidelines and consensus", "## One to read in full". Under 330 words.\n${ps.map((a) => `PMID ${a.pmid} | ${a.journal} | ${(a.types || []).join(',')} | ${a.topic} | ${a.title} | ${String(a.abstract || '').slice(0, 450)}`).join('\n')}\nGUIDELINE PAPERS:\n${guides.slice(0, 8).map((a) => `PMID ${a.pmid} | ${a.journal} | ${a.title}`).join('\n') || 'none'}` }] } }); S.run.brief = b.text; PA.save(); } catch (e) {}
    }
    drawWatches(el);
  } catch (e) { st.textContent = errMsg(e); }
}
})();
