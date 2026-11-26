/* Guideline Tracker + Change Detector, Landmark Trials Library, Subspecialty knowledge centres. */
(() => {
const { esc, safe, t, md, fmtD, fmtT, empty, lib, toast, api, research, errMsg, paperCard } = PA;
PA.i18n({
  en: { gLede: 'Major respiratory and critical-care guidelines with their previous editions, supersession and a Change Detector that shows exactly what changed.', current: 'Current', superseded: 'Superseded', supersededBy: 'Superseded by', prevEd: 'Previous edition', whatChanged: 'What changed', area: 'Clinical area', prevRec: 'Previous recommendation', latestRec: 'Latest recommendation', diff: 'What changed?', importance: 'Clinical importance', practiceChanging: 'potentially practice-changing', evidenceSys: 'Evidence system', sourceDoc: 'Source', verifiedOn: 'Verified', compareOrgs: 'Compare organisations', compareAny: 'Compare any two guidelines (AI, with live web retrieval)', aLabel: 'Guideline A (e.g. GOLD 2027)', bLabel: 'Guideline B (e.g. NICE NG115)', topicOpt: 'Focus (optional)', compareBtn: 'Compare', scanPm: 'Scan PubMed for new guideline papers (90 days)', myGuides: 'My guideline list', devWatch: 'In development: watch list', noChanges: 'No change table recorded for this edition yet. Use “Compare any two guidelines” to generate one from the official documents.', neverMerge: 'Recommendations are shown side by side; conflicting recommendations are never merged into a consensus.', tLede: 'Landmark respiratory and critical-care trials: verified citations and headline results, design, limitations, impact and guideline influence.', searchTrials: 'Search by trial, drug, intervention or disease', compareSel: 'Compare selected', clear: 'Clear', design: 'Design', n: 'Participants', population: 'Population', intervention: 'Intervention', comparator: 'Comparator', primary: 'Primary outcome', results: 'Main results', limitations: 'Limitations', impact: 'Clinical impact', influence: 'Guideline influence', classif: 'Classification', addCol: 'Add to collection', topicsLede: '30 subspecialty knowledge centres. Each links its guidelines, landmark trials, live literature, registered trials and official resources.', latestPapers: 'Latest high-evidence papers (live)', regTrials: 'Recently registered trials (ClinicalTrials.gov)', resources: 'Official resources', loadLive: 'Load', askTopic: 'Ask a clinical question about this topic', deepTopic: 'Deep research on this topic', ytNew: 'Newest videos (YouTube)' },
  ar: { gLede: 'أهم إرشادات طب الصدر والعناية المركزة مع الإصدارات السابقة والإحلال وكاشف تغييرات يوضح ما تغيّر بالضبط.', current: 'حالي', superseded: 'مستبدَل', supersededBy: 'استُبدل بـ', prevEd: 'الإصدار السابق', whatChanged: 'ما الذي تغيّر', area: 'المجال السريري', prevRec: 'التوصية السابقة', latestRec: 'أحدث توصية', diff: 'ما الذي تغيّر؟', importance: 'الأهمية السريرية', practiceChanging: 'قد يغيّر الممارسة', evidenceSys: 'نظام الأدلة', sourceDoc: 'المصدر', verifiedOn: 'تم التحقق', compareOrgs: 'مقارنة الجهات', compareAny: 'قارن أي إرشادين (ذكاء اصطناعي مع استرجاع مباشر من الويب)', aLabel: 'الإرشاد أ (مثل GOLD 2027)', bLabel: 'الإرشاد ب (مثل NICE NG115)', topicOpt: 'التركيز (اختياري)', compareBtn: 'قارن', scanPm: 'ابحث في PubMed عن أوراق إرشادات جديدة (90 يومًا)', myGuides: 'قائمة إرشاداتي', devWatch: 'قيد الإعداد: قائمة المتابعة', noChanges: 'لا يوجد جدول تغييرات لهذا الإصدار بعد. استخدم «قارن أي إرشادين» لإنشائه من الوثائق الرسمية.', neverMerge: 'تُعرض التوصيات جنبًا إلى جنب، ولا تُدمج التوصيات المتعارضة أبدًا في إجماع.', tLede: 'التجارب المرجعية في طب الصدر والعناية المركزة: مراجع ونتائج موثّقة، التصميم، القيود، الأثر وتأثيرها على الإرشادات.', searchTrials: 'ابحث باسم التجربة أو الدواء أو التدخل أو المرض', compareSel: 'قارن المحدد', clear: 'مسح', design: 'التصميم', n: 'المشاركون', population: 'المجتمع', intervention: 'التدخل', comparator: 'المقارن', primary: 'النتيجة الأولية', results: 'النتائج الرئيسية', limitations: 'القيود', impact: 'الأثر السريري', influence: 'تأثيرها على الإرشادات', classif: 'التصنيف', addCol: 'أضف إلى مجموعة', topicsLede: '30 مركزًا معرفيًا للتخصصات الدقيقة، يربط كل منها الإرشادات والتجارب المرجعية والأبحاث الحية والتجارب المسجلة والموارد الرسمية.', latestPapers: 'أحدث الأبحاث عالية الدليل (مباشر)', regTrials: 'تجارب مسجلة حديثًا (ClinicalTrials.gov)', resources: 'موارد رسمية', loadLive: 'تحميل', askTopic: 'اطرح سؤالًا سريريًا عن هذا الموضوع', deepTopic: 'بحث معمّق في هذا الموضوع', ytNew: 'أحدث الفيديوهات (يوتيوب)' }
});
const G = () => window.PA_GUIDES || [], TR = () => window.PA_TRIALS || [], SUBS = () => window.PA_SUBS || [];
const subName = (id) => { const s = SUBS().find((x) => x.id === id); return s ? (PA.S.lang === 'ar' ? s.ar : s.en) : id; };
const impCls = (i) => (i === 'High' ? 'hot' : i === 'Moderate' ? 'warn' : '');
function changeTable(g) {
  if (!(g.changes || []).length) return empty(t('noChanges'));
  return `<div class="scroll"><table class="tbl change"><thead><tr><th>${esc(t('area'))}</th><th>${esc(t('prevRec'))}</th><th>${esc(t('latestRec'))}</th><th>${esc(t('diff'))}</th><th>${esc(t('importance'))}</th></tr></thead><tbody>${g.changes.map((c) => `<tr class="${c.practice ? 'pc' : ''}"><td><b>${esc(c.area)}</b></td><td>${esc(c.prev)}</td><td>${esc(c.latest)}</td><td>${esc(c.what)}</td><td><span class="badge ${impCls(c.importance)}">${esc(c.importance)}</span>${c.practice ? ` <span title="${esc(t('practiceChanging'))}">⚑</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}
const changeMd = (g) => `| ${t('area')} | ${t('prevRec')} | ${t('latestRec')} | ${t('diff')} | ${t('importance')} |\n|---|---|---|---|---|\n${(g.changes || []).map((c) => `| ${c.area} | ${c.prev} | ${c.latest} | ${c.what} | ${c.importance}${c.practice ? ' ⚑' : ''} |`).join('\n')}`;
function gCard(g) {
  const pc = (g.changes || []).filter((c) => c.practice).length, sv = lib.has('gl:' + g.id);
  return `<article class="item"><div class="meta"><span class="badge hot">${esc(g.org)}</span><span class="badge ${g.status === 'current' ? 'ok' : ''}">${esc(t(g.status === 'current' ? 'current' : 'superseded'))}</span><span>${fmtD(g.date)}</span>${pc ? `<span class="badge warn">⚑ ${pc} ${esc(t('practiceChanging'))}</span>` : ''}</div>
  <a class="ttl" href="#guidelines/${esc(g.id)}">${esc(g.title)}</a><div class="small">${(g.areas || []).map(subName).map(esc).join(' · ')}${g.pmid ? ` · PMID ${esc(g.pmid)}` : ''}</div>
  <div class="acts"><a class="btn pri" href="#guidelines/${esc(g.id)}">${esc(t('whatChanged'))}</a>${safe(g.url) ? `<a class="btn" href="${esc(g.url)}" target="_blank" rel="noopener">${esc(t('open'))}</a>` : ''}<button class="btn star" type="button" data-saveg="${esc(g.id)}" aria-pressed="${sv}">${sv ? '★ ' + esc(t('saved')) : '☆ ' + esc(t('save'))}</button></div></article>`;
}

/* ---------------- Guidelines ---------------- */
PA.view('guidelines', {
  render(el, arg) {
    if (arg) { const g = G().find((x) => x.id === arg); if (g) return detail(el, g); }
    const S = PA.S, cur = G().filter((g) => g.status === 'current').sort((a, b) => String(b.date).localeCompare(String(a.date))), old = G().filter((g) => g.status !== 'current');
    el.innerHTML = `<h2>${esc(t('guidelines'))}</h2><p class="lede">${esc(t('gLede'))}</p>
    <div class="list">${cur.map(gCard).join('')}</div>
    ${old.length ? `<details class="sec"><summary>${esc(t('superseded'))} (${old.length})</summary><div class="list">${old.map(gCard).join('')}</div></details>` : ''}
    <div class="sec"><h3>${esc(t('compareOrgs'))}</h3><p class="small">${esc(t('neverMerge'))}</p>${(window.PA_COMPARE || []).map((c) => `<div class="card"><div class="row"><b>${esc(c.title)}</b><span class="sp"></span><button class="btn" type="button" data-cmppdf="${esc(c.id)}">${esc(t('pdf'))}</button></div><div class="scroll"><table class="tbl"><thead><tr><th>${esc(t('area'))}</th><th>${esc(c.a)}</th><th>${esc(c.b)}</th><th>${esc(t('diff'))}</th><th>${esc(t('importance'))}</th></tr></thead><tbody>${c.rows.map((r) => `<tr><td><b>${esc(r.area)}</b></td><td>${esc(r.a)}</td><td>${esc(r.b)}</td><td>${esc(r.diff)}</td><td><span class="badge ${impCls(r.imp)}">${esc(r.imp)}</span></td></tr>`).join('')}</tbody></table></div><p class="small">${esc(c.note)} · ${esc(t('verifiedOn'))} ${esc(c.verified)}</p></div>`).join('')}</div>
    <form class="card sec" id="cmpForm" data-noop><h3>${esc(t('compareAny'))}</h3><div class="add"><input id="cA" required placeholder="${esc(t('aLabel'))}"><input id="cB" required placeholder="${esc(t('bLabel'))}"><input id="cT" placeholder="${esc(t('topicOpt'))}"><button class="btn pri">${esc(t('compareBtn'))}</button></div><div id="cmpOut" class="brief"></div></form>
    <div class="sec"><div class="row"><h3>PubMed</h3><span class="sp"></span><button class="btn" type="button" id="scanG">${esc(t('scanPm'))}</button></div><div class="list" id="scanOut"></div></div>
    <div class="sec"><h3>${esc(t('devWatch'))}</h3><div class="list">${S.watch.map((w) => `<article class="item"><span class="ttl">${esc(w.title)}</span><p class="note">${esc(w.note)} · <a href="https://www.ersnet.org/research/task-forces" target="_blank" rel="noopener">ERS task forces</a></p></article>`).join('')}</div></div>
    <div class="sec"><h3>${esc(t('myGuides'))}</h3><div class="list">${S.guidelines.map((g) => `<article class="item"><div class="meta"><span class="badge">${esc(g.org || '')}</span><span>${fmtD(g.date)}</span></div>${safe(g.url) ? `<a class="ttl" href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.title)}</a>` : `<span class="ttl">${esc(g.title)}</span>`}${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}<div class="acts"><button class="btn" type="button" data-rmg="${esc(g.id)}">${esc(t('remove'))}</button></div></article>`).join('')}</div>
    <form class="add card" id="gAdd"><input name="title" required placeholder="Title"><input name="org" placeholder="Society"><input name="date" type="date" aria-label="Date"><input name="url" type="url" placeholder="https://"><input name="note" placeholder="Note"><button class="btn pri">${esc(t('add'))}</button></form></div>`;
    el.querySelector('#cmpForm').addEventListener('submit', async (e) => {
      e.preventDefault(); const out = el.querySelector('#cmpOut');
      if (!PA.status.ai) { out.innerHTML = empty(t('noAI')); return; }
      out.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`;
      const a = el.querySelector('#cA').value, b = el.querySelector('#cB').value, topic = el.querySelector('#cT').value;
      try {
        const r = await research('compare', { a, b, topic });
        const doc = { title: `Guideline comparison: ${a} vs ${b}`, kind: 'Guideline comparison', md: r.text, refs: (r.webSources || []).slice(0, 20).map((w) => ({ label: w.title || w.url, url: w.url })) };
        out.innerHTML = md(r.text) + `<div class="acts"><button class="btn pri" type="button" id="cmpS">${esc(t('saveLib'))}</button><button class="btn" type="button" id="cmpP">${esc(t('pdf'))}</button></div>`;
        out.querySelector('#cmpS').onclick = () => PA.saveReport(doc); out.querySelector('#cmpP').onclick = () => PA.pdf(doc);
      } catch (err) { out.innerHTML = empty(errMsg(err)); }
    });
    el.querySelector('#scanG').onclick = async () => {
      const box = el.querySelector('#scanOut'); box.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`;
      try { const r = await api('/api/updates?days=90'); box.innerHTML = r.guidelines.slice(0, 25).map((a) => paperCard(a)).join('') || empty(t('noResults')); } catch (err) { box.innerHTML = empty(errMsg(err)); }
    };
    el.querySelector('#gAdd').addEventListener('submit', (e) => { e.preventDefault(); const o = { id: 'u-' + PA.uid() }; new FormData(e.target).forEach((v, k) => (o[k] = String(v).trim())); S.guidelines.unshift(o); PA.save(); PA.show(); });
    el.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.rmg) { S.guidelines = S.guidelines.filter((x) => x.id !== b.dataset.rmg); S.removed.push(b.dataset.rmg); PA.save(); PA.show(); }
      if (b.dataset.cmppdf) { const c = (window.PA_COMPARE || []).find((x) => x.id === b.dataset.cmppdf); if (c) PA.pdf({ title: c.title, kind: 'Guideline comparison', md: `${c.note}\n\n| ${t('area')} | ${c.a} | ${c.b} | ${t('diff')} | ${t('importance')} |\n|---|---|---|---|---|\n${c.rows.map((r) => `| ${r.area} | ${r.a} | ${r.b} | ${r.diff} | ${r.imp} |`).join('\n')}\n\n${t('neverMerge')}`, cutoff: c.verified }); }
    };
  }
});
function detail(el, g) {
  const prev = g.supersedes && G().find((x) => x.id === g.supersedes), next = g.supersededBy && G().find((x) => x.id === g.supersededBy);
  const trials = TR().filter((x) => (x.areas || []).some((a) => (g.areas || []).includes(a))).slice(0, 8);
  el.innerHTML = `<a class="btn" href="#guidelines">${esc(t('back'))}</a><div class="card sec"><div class="meta"><span class="badge hot">${esc(g.org)}</span><span class="badge ${g.status === 'current' ? 'ok' : ''}">${esc(t(g.status === 'current' ? 'current' : 'superseded'))}</span><span>${fmtD(g.date)}</span><span class="sp"></span><button class="btn" type="button" id="gPdf">${esc(t('pdf'))}</button></div>
  <h2>${esc(g.title)}</h2>
  <table class="tbl mini"><tr><th>${esc(t('prevEd'))}</th><td>${prev ? `<a href="#guidelines/${esc(prev.id)}">${esc(prev.short)}</a>` : esc(g.supersedes || '–')}</td></tr>${next ? `<tr><th>${esc(t('supersededBy'))}</th><td><a href="#guidelines/${esc(next.id)}">${esc(next.short)}</a></td></tr>` : ''}<tr><th>${esc(t('evidenceSys'))}</th><td>${esc(g.evidence || '–')}</td></tr><tr><th>${esc(t('sourceDoc'))}</th><td>${esc(g.source || '')} ${safe(g.url) ? `<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(t('open'))}</a>` : ''}${g.pmid ? ` · <a href="https://pubmed.ncbi.nlm.nih.gov/${esc(g.pmid)}/" target="_blank" rel="noopener">PMID ${esc(g.pmid)}</a>` : ''}${g.doi ? ` · doi:${esc(g.doi)}` : ''}</td></tr><tr><th>${esc(t('verifiedOn'))}</th><td>${esc(g.verified || '')}</td></tr></table>
  <h3>${esc(t('whatChanged'))}</h3>${changeTable(g)}<p class="small">⚑ = ${esc(t('practiceChanging'))}. ${esc(t('neverMerge'))}</p></div>
  ${trials.length ? `<div class="sec"><h3>${esc(t('trials'))}</h3><div class="list">${trials.map(trialRow).join('')}</div></div>` : ''}`;
  el.querySelector('#gPdf').onclick = () => PA.pdf({ title: g.title, kind: 'Guideline change summary', md: `**${t('prevEd')}:** ${prev ? prev.short : g.supersedes || '–'}\n\n**${t('evidenceSys')}:** ${g.evidence || '–'}\n\n**${t('sourceDoc')}:** ${g.source || ''} ${g.url || ''}\n\n## ${t('whatChanged')}\n\n${changeMd(g)}\n\n⚑ = ${t('practiceChanging')}.`, refs: [{ label: g.title, url: g.url, doi: g.doi, pmid: g.pmid }], cutoff: g.verified });
}

/* ---------------- Trials ---------------- */
let tq = '', tArea = '', tClass = '', tSel = [];
const trialRow = (x) => `<article class="item"><div class="meta"><span class="ev ev-${x.class === 'Landmark' ? 'g' : x.class === 'Practice-changing' ? 'r' : 'm'}">${esc(x.class)}</span><span>${esc(x.journal)} ${esc(x.year)}</span>${x.n ? `<span>N=${esc(x.n.toLocaleString())}</span>` : ''}<span class="sp"></span><label class="chk"><input type="checkbox" data-tsel="${esc(x.id)}" ${tSel.includes(x.id) ? 'checked' : ''}> ${esc(t('compareBtn'))}</label></div><a class="ttl" href="#trials/${esc(x.id)}"><b>${esc(x.name)}</b> — ${esc(x.title)}</a><p class="note">${esc(x.results)}</p></article>`;
PA.view('trials', {
  render(el, arg) {
    if (arg) { const x = TR().find((y) => y.id === arg); if (x) return trialDetail(el, x); }
    const areas = [...new Set(TR().flatMap((x) => x.areas))];
    const draw = () => {
      const q = tq.toLowerCase();
      const list = TR().filter((x) => (!tArea || x.areas.includes(tArea)) && (!tClass || x.class === tClass) && (!q || [x.name, x.title, x.population, x.intervention, x.comparator, x.keywords.join(' '), x.areas.map(subName).join(' ')].join(' ').toLowerCase().includes(q))).sort((a, b) => b.year - a.year);
      el.querySelector('#tList').innerHTML = list.map(trialRow).join('') || empty(t('noResults'));
      el.querySelector('#tCnt').textContent = `${list.length} / ${TR().length}`;
    };
    el.innerHTML = `<h2>${esc(t('trials'))}</h2><p class="lede">${esc(t('tLede'))}</p>
    <div class="tools"><input type="search" id="tQ" value="${esc(tq)}" placeholder="${esc(t('searchTrials'))}"><select id="tClass"><option value="">${esc(t('classif'))}</option>${['Landmark', 'Practice-changing', 'Important new evidence'].map((c) => `<option ${c === tClass ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><span class="small" id="tCnt"></span></div>
    <div class="chips" style="margin-bottom:12px"><button class="chip" type="button" data-ta="" aria-pressed="${!tArea}">${esc(t('all'))}</button>${areas.map((a) => `<button class="chip" type="button" data-ta="${esc(a)}" aria-pressed="${tArea === a}">${esc(subName(a))}</button>`).join('')}</div>
    <div class="card row" id="tCmpBar"><span id="tSelTxt"></span><span class="sp"></span><button class="btn pri" type="button" id="tCmp">${esc(t('compareSel'))}</button><button class="btn" type="button" id="tClr">${esc(t('clear'))}</button></div><div id="tCmpOut"></div>
    <div class="list" id="tList"></div><p class="small">Citations and results verified against PubMed on ${esc(window.PA_TRIALS_VERIFIED || '')}.</p>`;
    const upd = () => { el.querySelector('#tSelTxt').textContent = tSel.length ? tSel.map((id) => (TR().find((x) => x.id === id) || {}).name).join(' · ') : '—'; };
    el.querySelector('#tQ').addEventListener('input', (e) => { tq = e.target.value; draw(); });
    el.querySelector('#tClass').addEventListener('change', (e) => { tClass = e.target.value; draw(); });
    el.querySelectorAll('[data-ta]').forEach((b) => (b.onclick = () => { tArea = b.dataset.ta; el.querySelectorAll('[data-ta]').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); }));
    el.addEventListener('change', (e) => { const c = e.target.closest('[data-tsel]'); if (!c) return; const id = c.dataset.tsel; tSel = c.checked ? [...new Set([...tSel, id])].slice(-4) : tSel.filter((x) => x !== id); upd(); });
    el.querySelector('#tClr').onclick = () => { tSel = []; upd(); draw(); el.querySelector('#tCmpOut').innerHTML = ''; };
    el.querySelector('#tCmp').onclick = () => { const xs = tSel.map((id) => TR().find((x) => x.id === id)).filter(Boolean); if (xs.length < 2) return toast('2–4'); el.querySelector('#tCmpOut').innerHTML = compareHTML(xs); el.querySelector('#tCmpPdf').onclick = () => PA.pdf({ title: 'Trial comparison: ' + xs.map((x) => x.name).join(' vs '), kind: 'Landmark trial comparison', md: compareMd(xs), refs: xs.map((x) => ({ label: `${x.name}: ${x.title}. ${x.journal} ${x.year}.`, pmid: x.pmid, doi: x.doi })), cutoff: window.PA_TRIALS_VERIFIED }); };
    upd(); draw();
  }
});
const FIELDS = [['design', 'design'], ['n', 'n'], ['population', 'population'], ['intervention', 'intervention'], ['comparator', 'comparator'], ['primary', 'primary'], ['results', 'results'], ['limitations', 'limitations'], ['impact', 'impact'], ['guidelines', 'influence']];
const val = (x, k) => (k === 'n' ? (x.n ? x.n.toLocaleString() : 'see paper') : x[k] || '');
const compareHTML = (xs) => `<div class="card"><div class="row"><b>${esc(t('compareSel'))}</b><span class="sp"></span><button class="btn" type="button" id="tCmpPdf">${esc(t('pdf'))}</button></div><div class="scroll"><table class="tbl"><thead><tr><th></th>${xs.map((x) => `<th>${esc(x.name)} (${esc(x.year)})</th>`).join('')}</tr></thead><tbody>${FIELDS.map(([k, l]) => `<tr><th>${esc(t(l))}</th>${xs.map((x) => `<td>${esc(val(x, k))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
const compareMd = (xs) => `| | ${xs.map((x) => `${x.name} (${x.year})`).join(' | ')} |\n|---|${xs.map(() => '---').join('|')}|\n${FIELDS.map(([k, l]) => `| **${t(l)}** | ${xs.map((x) => String(val(x, k)).replace(/\|/g, '/')).join(' | ')} |`).join('\n')}`;
function trialDetail(el, x) {
  const id = 'tr:' + x.id, sv = lib.has(id);
  el.innerHTML = `<a class="btn" href="#trials">${esc(t('back'))}</a><div class="card sec"><div class="meta"><span class="ev ev-g">${esc(x.class)}</span><span>${esc(x.journal)} ${esc(x.year)}</span>${x.areas.map((a) => `<a class="badge" href="#topics/${esc(a)}">${esc(subName(a))}</a>`).join('')}</div><h2>${esc(x.name)}</h2><p class="lede">${esc(x.title)}</p>
  <table class="tbl mini">${FIELDS.map(([k, l]) => `<tr><th>${esc(t(l))}</th><td>${esc(val(x, k))}</td></tr>`).join('')}<tr><th>PMID / DOI</th><td><a href="https://pubmed.ncbi.nlm.nih.gov/${esc(x.pmid)}/" target="_blank" rel="noopener">PMID ${esc(x.pmid)}</a> · <a href="https://doi.org/${esc(x.doi)}" target="_blank" rel="noopener">doi:${esc(x.doi)}</a></td></tr></table>
  <div class="acts"><button class="btn star" type="button" id="trSave" aria-pressed="${sv}">${sv ? '★ ' + esc(t('saved')) : '☆ ' + esc(t('save'))}</button><select id="trCol"><option value="">${esc(t('addCol'))}…</option>${PA.S.folders.map((f) => `<option>${esc(f)}</option>`).join('')}</select><button class="btn" type="button" id="trVer">${esc(t('verify'))}</button><button class="btn" type="button" id="trPdf">${esc(t('pdf'))}</button><button class="btn" type="button" id="trAsk">${esc(t('askTopic'))}</button></div><div id="trOut"></div></div>`;
  const item = () => ({ id, kind: 'trial', title: `${x.name}: ${x.title}`, url: '#trials/' + x.id, journal: x.journal, year: String(x.year), date: String(x.year), type: 'Landmark trial', subspecialty: x.areas[0], importance: x.class });
  el.querySelector('#trSave').onclick = (e) => { const on = lib.toggle(item()); e.target.setAttribute('aria-pressed', on); e.target.textContent = on ? '★ ' + t('saved') : '☆ ' + t('save'); };
  el.querySelector('#trCol').onchange = (e) => { if (!e.target.value) return; if (!lib.has(id)) lib.add(item()); lib.get(id).folder = e.target.value; PA.save(); toast('✓ ' + e.target.value); };
  el.querySelector('#trVer').onclick = async () => { const o = el.querySelector('#trOut'); o.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`; try { o.innerHTML = PA.verifyHTML(await api('/api/verify', { method: 'POST', body: { pmid: x.pmid, doi: x.doi, title: x.title } })); } catch (err) { o.innerHTML = empty(errMsg(err)); } };
  el.querySelector('#trPdf').onclick = () => PA.pdf({ title: `${x.name}: ${x.title}`, kind: 'Landmark trial summary', md: FIELDS.map(([k, l]) => `**${t(l)}:** ${val(x, k)}`).join('\n\n'), refs: [{ label: `${x.title}. ${x.journal} ${x.year}.`, pmid: x.pmid, doi: x.doi }], cutoff: window.PA_TRIALS_VERIFIED });
  el.querySelector('#trAsk').onclick = () => PA.askClinical(`What is the current evidence after the ${x.name} trial (${x.title}, ${x.year}), and how have guidelines incorporated it?`);
}

/* ---------------- Topics ---------------- */
PA.view('topics', {
  render(el, arg) {
    const s = SUBS().find((x) => x.id === arg);
    if (!s) {
      el.innerHTML = `<h2>${esc(t('topics'))}</h2><p class="lede">${esc(t('topicsLede'))}</p><div class="tiles">${SUBS().map((x) => { const nt = TR().filter((y) => y.areas.includes(x.id)).length, ng = G().filter((g) => (g.areas || []).includes(x.id)).length; return `<a class="tile" href="#topics/${esc(x.id)}"><b>${esc(PA.S.lang === 'ar' ? x.ar : x.en)}</b><span>${ng} ${esc(t('guidelines'))} · ${nt} ${esc(t('trials'))}</span></a>`; }).join('')}</div>`;
      return;
    }
    const gl = G().filter((g) => (g.areas || []).includes(s.id)), tr = TR().filter((x) => x.areas.includes(s.id));
    el.innerHTML = `<a class="btn" href="#topics">${esc(t('back'))}</a><h2 class="sec">${esc(PA.S.lang === 'ar' ? s.ar : s.en)}</h2>
    <div class="row acts"><button class="btn pri" type="button" id="tpAsk">${esc(t('askTopic'))}</button><a class="btn" href="#research/deep">${esc(t('deepTopic'))}</a><a class="btn" href="#radar/${esc(s.id)}">${esc(t('radar'))}</a><a class="btn" href="https://www.youtube.com/results?search_query=${encodeURIComponent(s.en + ' pulmonology')}&sp=CAI%253D" target="_blank" rel="noopener">▶ ${esc(t('ytNew'))}</a></div>
    <div class="grid2 sec"><div><h3>${esc(t('guidelines'))}</h3><div class="list">${gl.map(gCard).join('') || empty('–')}</div><h3 class="sec">${esc(t('trials'))}</h3><div class="list">${tr.map(trialRow).join('') || empty('–')}</div></div>
    <div><div class="card"><h3>${esc(t('resources'))}</h3><ul>${s.links.map(([n, u]) => `<li><a href="${esc(safe(u))}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join('')}</ul></div>
    <div class="card"><div class="row"><h3>${esc(t('latestPapers'))}</h3><span class="sp"></span><button class="btn" type="button" id="tpLoad">${esc(t('loadLive'))}</button></div><div class="list" id="tpPapers"></div></div>
    <div class="card"><h3>${esc(t('regTrials'))}</h3><div class="list" id="tpTrials"></div></div></div></div>`;
    el.querySelector('#tpAsk').onclick = () => PA.askClinical(`What are the most important recent developments (guidelines, trials, new drugs) in ${s.en}?`);
    const load = async () => {
      const box = el.querySelector('#tpPapers'), tb = el.querySelector('#tpTrials');
      box.innerHTML = tb.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`;
      try {
        const r = await api('/api/search', { method: 'POST', body: { q: s.q, sources: ['pubmed', 'europepmc', 'ctgov'], days: 180, types: ['rct', 'meta', 'sr', 'guideline'], max: 12, sort: 'rank' } });
        PA.markSeen(r.records); PA.cache.set('topic:' + s.id, { t: Date.now(), r });
        box.innerHTML = r.records.slice(0, 10).map((a) => paperCard(a, { compact: true, noTopic: true })).join('') || empty(t('noResults'));
        tb.innerHTML = r.trials.slice(0, 8).map((x) => `<div class="item"><div class="meta"><span>${esc(x.status)}</span><span>${esc((x.phases || []).join('/'))}</span><span>${esc(x.firstPosted)}</span></div><a class="ttl" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a><div class="small">${esc(x.nct)} · ${esc(x.sponsor)}</div></div>`).join('') || empty(t('noResults'));
      } catch (err) { box.innerHTML = empty(errMsg(err)); tb.innerHTML = ''; }
    };
    el.querySelector('#tpLoad').onclick = load;
    const c = PA.cache.get('topic:' + s.id);
    if (c && Date.now() - c.t < 6 * 36e5) { el.querySelector('#tpPapers').innerHTML = c.r.records.slice(0, 10).map((a) => paperCard(a, { compact: true, noTopic: true })).join(''); el.querySelector('#tpTrials').innerHTML = c.r.trials.slice(0, 8).map((x) => `<div class="item"><a class="ttl" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a><div class="small">${esc(x.nct)} · ${esc(x.status)}</div></div>`).join(''); }
    else load();
  }
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-saveg]'); if (!b) return;
  const g = G().find((x) => x.id === b.dataset.saveg);
  const on = lib.toggle({ id: 'gl:' + g.id, kind: 'guideline', title: g.title, url: '#guidelines/' + g.id, date: g.date, year: String(g.year), type: 'Guideline', subspecialty: (g.areas || [])[0] || '', journal: g.org });
  b.setAttribute('aria-pressed', on); b.textContent = on ? '★ ' + t('saved') : '☆ ' + t('save');
});
})();
