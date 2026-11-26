/* Personal Pulmonology Knowledge Library + Medical Books Tracker. */
(() => {
const { esc, safe, t, md, fmtD, fmtT, empty, lib, toast, api, research, errMsg } = PA;
PA.i18n({
  en: { libLede: 'Everything you saved — papers, guidelines, trials, report items, AI reports, PDFs and notes — organised by folder, tag, subspecialty and importance. Synced across your devices.', folders: 'Folders', allItems: 'All items', unread: 'Unread', read: 'Read', kind: 'Type', tags: 'Tags', note: 'Note', importance: 'Importance', folder: 'Folder', newFolder: 'New folder', newNote: 'New note', uploadPdf: 'Upload PDF', history: 'Reading history', exportJson: 'Export (JSON)', exportPdf: 'Export list as PDF', searchLib: 'Search your library', edit: 'Edit', markRead: 'Mark read', markUnread: 'Mark unread', noSaved: 'Nothing here yet. Tap Save on any paper, guideline, trial or report.', title: 'Title', body: 'Text', k_paper: 'Paper', 'k_report-item': 'Report item', k_trial: 'Trial', k_guideline: 'Guideline', k_book: 'Book', k_report: 'AI report', k_pdf: 'PDF', k_note: 'Note', imp_high: 'High', imp_medium: 'Medium', imp_low: 'Low', bLede: 'New editions and key textbooks in respiratory medicine, critical care, sleep, physiology, PFT, imaging, interventional pulmonology, thoracic oncology and immunology — verified live against Google Books (title, edition, publisher, ISBN, date).', areasB: 'Areas', myBooks: 'My core textbooks', findEd: 'Find latest edition', reputable: 'Reputable publisher', aiBooks: 'Ask the agent for new editions (web-verified)', preview: 'Preview / sample', onlyRep: 'Reputable publishers only', last3: 'Last 3 years' },
  ar: { libLede: 'كل ما حفظته — أبحاث وإرشادات وتجارب وعناصر تقارير وتقارير ذكاء اصطناعي وملفات PDF وملاحظات — منظّم حسب المجلد والوسم والتخصص والأهمية، ومتزامن بين أجهزتك.', folders: 'المجلدات', allItems: 'كل العناصر', unread: 'غير مقروء', read: 'مقروء', kind: 'النوع', tags: 'الوسوم', note: 'ملاحظة', importance: 'الأهمية', folder: 'المجلد', newFolder: 'مجلد جديد', newNote: 'ملاحظة جديدة', uploadPdf: 'رفع PDF', history: 'سجل القراءة', exportJson: 'تصدير (JSON)', exportPdf: 'تصدير القائمة PDF', searchLib: 'ابحث في مكتبتك', edit: 'تعديل', markRead: 'تحديد كمقروء', markUnread: 'تحديد كغير مقروء', noSaved: 'لا شيء هنا بعد. اضغط حفظ على أي بحث أو إرشاد أو تجربة أو تقرير.', title: 'العنوان', body: 'النص', k_paper: 'بحث', 'k_report-item': 'عنصر تقرير', k_trial: 'تجربة', k_guideline: 'إرشاد', k_book: 'كتاب', k_report: 'تقرير ذكاء اصطناعي', k_pdf: 'PDF', k_note: 'ملاحظة', imp_high: 'عالية', imp_medium: 'متوسطة', imp_low: 'منخفضة', bLede: 'الطبعات الجديدة والكتب الأساسية في طب الصدر والعناية المركزة والنوم والفسيولوجيا ووظائف الرئة والتصوير والتداخلي والأورام والمناعة — موثّقة مباشرة من Google Books.', areasB: 'المجالات', myBooks: 'كتبي الأساسية', findEd: 'ابحث عن أحدث طبعة', reputable: 'ناشر موثوق', aiBooks: 'اطلب من الوكيل الطبعات الجديدة (موثّقة من الويب)', preview: 'معاينة / عينة', onlyRep: 'الناشرون الموثوقون فقط', last3: 'آخر 3 سنوات' }
});
const KINDS = ['paper', 'guideline', 'trial', 'report-item', 'report', 'pdf', 'note', 'book'];
let f = { folder: '', kind: '', tag: '', read: '', q: '', imp: '' };

PA.view('library', {
  async render(el, arg) {
    const [sub, id] = String(arg || '').split('/');
    if (sub === 'doc' && id) return docView(el, id);
    if (sub === 'history') return historyView(el);
    const S = PA.S, items = S.saved;
    const tags = [...new Set(items.flatMap((x) => x.tags || []))].sort();
    const q = f.q.toLowerCase();
    const list = items.filter((x) => (!f.folder || x.folder === f.folder) && (!f.kind || x.kind === f.kind) && (!f.tag || (x.tags || []).includes(f.tag)) && (!f.imp || x.importance === f.imp) && (f.read === '' || String(!!x.read) === f.read) && (!q || [x.title, x.note, x.journal, (x.tags || []).join(' '), x.subspecialty, x.body].join(' ').toLowerCase().includes(q)));
    const cnt = (fn) => items.filter(fn).length;
    el.innerHTML = `<h2>${esc(t('library'))}</h2><p class="lede">${esc(t('libLede'))}</p>
    <div class="libgrid"><aside class="card side">
      <b>${esc(t('folders'))}</b><button class="lnk ${!f.folder ? 'on' : ''}" type="button" data-ff="">${esc(t('allItems'))} <span class="cnt">${items.length}</span></button>${S.folders.map((x) => `<button class="lnk ${f.folder === x ? 'on' : ''}" type="button" data-ff="${esc(x)}">${esc(x)} <span class="cnt">${cnt((i) => i.folder === x)}</span></button>`).join('')}
      <form class="row" id="fAdd"><input name="f" placeholder="${esc(t('newFolder'))}" aria-label="${esc(t('newFolder'))}"><button class="btn">+</button></form>
      <b class="sec">${esc(t('kind'))}</b><div class="chips">${KINDS.filter((k) => cnt((i) => i.kind === k)).map((k) => `<button class="chip" type="button" data-fk="${k}" aria-pressed="${f.kind === k}">${esc(t('k_' + k))} ${cnt((i) => i.kind === k)}</button>`).join('')}</div>
      <b class="sec">${esc(t('read'))}</b><div class="chips"><button class="chip" type="button" data-fr="false" aria-pressed="${f.read === 'false'}">${esc(t('unread'))} ${cnt((i) => !i.read)}</button><button class="chip" type="button" data-fr="true" aria-pressed="${f.read === 'true'}">${esc(t('read'))} ${cnt((i) => i.read)}</button></div>
      <b class="sec">${esc(t('importance'))}</b><div class="chips">${['high', 'medium', 'low'].map((k) => `<button class="chip" type="button" data-fi="${k}" aria-pressed="${f.imp === k}">${esc(t('imp_' + k))}</button>`).join('')}</div>
      ${tags.length ? `<b class="sec">${esc(t('tags'))}</b><div class="chips">${tags.map((x) => `<button class="chip" type="button" data-ft="${esc(x)}" aria-pressed="${f.tag === x}">#${esc(x)}</button>`).join('')}</div>` : ''}
      <div class="sec col"><a class="btn" href="#library/history">${esc(t('history'))} (${S.history.length})</a><button class="btn" type="button" id="lExp">${esc(t('exportJson'))}</button><button class="btn" type="button" id="lPdf">${esc(t('exportPdf'))}</button></div>
    </aside><div>
      <div class="tools"><input type="search" id="lQ" value="${esc(f.q)}" placeholder="${esc(t('searchLib'))}"><button class="btn pri" type="button" id="lNote">${esc(t('newNote'))}</button><label class="btn" for="lFile">${esc(t('uploadPdf'))}</label><input type="file" id="lFile" accept="application/pdf" hidden></div>
      <div class="list" id="lList">${list.map(itemHTML).join('') || empty(t('noSaved'))}</div></div></div>`;
    el.querySelector('#lQ').addEventListener('input', (e) => { f.q = e.target.value; clearTimeout(PA._lq); PA._lq = setTimeout(() => { PA.show(); const i = document.getElementById('lQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 300); });
    el.querySelector('#fAdd').addEventListener('submit', (e) => { e.preventDefault(); const v = String(new FormData(e.target).get('f')).trim(); if (v && !S.folders.includes(v)) { S.folders.push(v); PA.save(); PA.show(); } });
    el.querySelector('#lNote').onclick = () => editItem({ id: 'note:' + PA.uid(), kind: 'note', title: '', body: '', date: new Date().toISOString().slice(0, 10), tags: [], folder: f.folder, isNew: true });
    el.querySelector('#lFile').onchange = (e) => upload(e.target.files[0]);
    el.querySelector('#lExp').onclick = async () => { const txt = JSON.stringify(S.saved, null, 1); try { await navigator.clipboard.writeText(txt); toast(t('copied')); } catch (x) { PA.modal(t('exportJson'), `<textarea rows="14" style="width:100%">${esc(txt)}</textarea>`); } };
    el.querySelector('#lPdf').onclick = () => PA.pdf({ title: 'Library export' + (f.folder ? ': ' + f.folder : ''), kind: 'Knowledge library', md: list.map((x) => `### ${x.title}\n${[t('k_' + x.kind), x.journal, x.year || String(x.date || '').slice(0, 4), x.subspecialty, x.importance && t('imp_' + x.importance), (x.tags || []).map((g) => '#' + g).join(' ')].filter(Boolean).join(' · ')}${x.url && /^https/.test(x.url) ? '\n' + x.url : ''}${x.note ? '\n\n**' + t('note') + ':** ' + x.note : ''}`).join('\n\n'), mode: 'concise' });
    el.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
      if (d.ff !== undefined) f.folder = d.ff; else if (d.fk) f.kind = f.kind === d.fk ? '' : d.fk; else if (d.fr) f.read = f.read === d.fr ? '' : d.fr; else if (d.fi) f.imp = f.imp === d.fi ? '' : d.fi; else if (d.ft) f.tag = f.tag === d.ft ? '' : d.ft;
      else if (d.lread) { const x = lib.get(d.lread); x.read = !x.read; PA.save(); }
      else if (d.ledit) return editItem(lib.get(d.ledit));
      else if (d.lrm) { const x = lib.get(d.lrm); if (x && x.docId) api('/api/docs?id=' + encodeURIComponent(x.docId), { method: 'DELETE' }).catch(() => {}); lib.remove(d.lrm); }
      else return;
      PA.show();
    };
    el.onchange = (e) => { const s = e.target.closest('[data-lfold],[data-limp]'); if (!s) return; const x = lib.get(s.dataset.lfold || s.dataset.limp); if (s.dataset.lfold) x.folder = s.value; else x.importance = s.value; PA.save(); };
  }
});
function itemHTML(x) {
  const S = PA.S, href = x.url ? (x.url.startsWith('#') ? x.url : safe(x.url)) : x.kind === 'note' ? '' : '';
  return `<article class="item ${x.read ? 'isread' : ''}"><div class="meta"><span class="badge">${esc(t('k_' + x.kind))}</span>${x.type && x.type !== t('k_' + x.kind) ? `<span>${esc(x.type)}</span>` : ''}${x.journal ? `<span>${esc(x.journal)}</span>` : ''}${x.date ? `<span>${fmtD(x.date)}</span>` : ''}${x.subspecialty ? `<span>· ${esc(x.subspecialty)}</span>` : ''}${(x.tags || []).map((g) => `<span class="tag">#${esc(g)}</span>`).join('')}</div>
  ${href ? `<a class="ttl" ${href.startsWith('#') ? '' : 'target="_blank" rel="noopener" data-track'} href="${esc(href)}">${esc(x.title)}</a>` : `<span class="ttl">${esc(x.title)}</span>`}
  ${x.kind === 'note' && x.body ? `<div class="brief">${md(String(x.body).slice(0, 600))}</div>` : ''}${x.kind === 'report' && x.body && !x.docId ? `<details><summary>${esc(t('open'))}</summary><div class="brief">${md(x.body)}</div></details>` : ''}
  ${x.note ? `<p class="note">📝 ${esc(x.note)}</p>` : ''}
  <div class="acts"><button class="btn" type="button" data-lread="${esc(x.id)}">${esc(x.read ? t('markUnread') : t('markRead'))}</button><button class="btn" type="button" data-ledit="${esc(x.id)}">${esc(t('edit'))}</button><select data-lfold="${esc(x.id)}" aria-label="${esc(t('folder'))}"><option value="">${esc(t('folder'))}: –</option>${S.folders.map((fo) => `<option ${fo === x.folder ? 'selected' : ''}>${esc(fo)}</option>`).join('')}</select><select data-limp="${esc(x.id)}" aria-label="${esc(t('importance'))}"><option value="">${esc(t('importance'))}: –</option>${['high', 'medium', 'low'].map((k) => `<option value="${k}" ${x.importance === k ? 'selected' : ''}>${esc(t('imp_' + k))}</option>`).join('')}</select><button class="btn" type="button" data-lrm="${esc(x.id)}">${esc(t('remove'))}</button></div></article>`;
}
function editItem(x) {
  const body = PA.modal(t('edit'), `<form class="dlg" id="eForm"><label><span>${esc(t('title'))}</span><input name="title" value="${esc(x.title || '')}" required></label>${x.kind === 'note' ? `<label><span>${esc(t('body'))}</span><textarea name="body" rows="8">${esc(x.body || '')}</textarea></label>` : ''}<label><span>${esc(t('note'))}</span><textarea name="note" rows="3">${esc(x.note || '')}</textarea></label><label><span>${esc(t('tags'))} (comma separated)</span><input name="tags" value="${esc((x.tags || []).join(', '))}"></label><label><span>Subspecialty</span><select name="sub"><option value="">–</option>${(window.PA_SUBS || []).map((s) => `<option value="${esc(s.en)}" ${x.subspecialty === s.en ? 'selected' : ''}>${esc(s.en)}</option>`).join('')}</select></label><div class="row"><span class="sp"></span><button class="btn pri">${esc(t('save'))}</button></div></form>`);
  body.querySelector('#eForm').addEventListener('submit', (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const upd = { title: String(fd.get('title')).trim(), note: String(fd.get('note') || '').trim(), tags: String(fd.get('tags') || '').split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean), subspecialty: String(fd.get('sub') || '') };
    if (x.kind === 'note') upd.body = String(fd.get('body') || '');
    if (x.isNew) { delete x.isNew; lib.add({ ...x, ...upd }); } else Object.assign(lib.get(x.id), upd);
    PA.save(); PA.closeModal(); PA.show();
  });
}
async function upload(file) {
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) return toast('PDF must be under 4 MB');
  const buf = await file.arrayBuffer(); let bin = ''; const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  toast(t('thinking'));
  try { const r = await api('/api/docs', { method: 'PUT', body: { kind: 'pdf', title: file.name, base64: btoa(bin) } }); lib.add({ id: 'pdf:' + r.id, kind: 'pdf', title: file.name.replace(/\.pdf$/i, ''), url: r.url, docId: r.id, date: new Date().toISOString().slice(0, 10), folder: f.folder }); toast('✓ ' + t('saved')); PA.show(); }
  catch (e) { toast(errMsg(e)); }
}
async function docView(el, id) {
  el.innerHTML = `<a class="btn" href="#library">${esc(t('back'))}</a><div class="card sec" id="dv"><p class="small">${esc(t('loading'))}</p></div>`;
  try {
    const d = await api('/api/docs?id=' + encodeURIComponent(id));
    const item = PA.S.saved.find((x) => x.docId === id); if (item && !item.read) { item.read = true; PA.save(); }
    const box = el.querySelector('#dv');
    box.innerHTML = `<div class="meta"><span class="badge">${esc((d.meta && d.meta.kind) || d.kind)}</span><span>${fmtT(Date.parse(d.savedAt))}</span><span class="sp"></span><button class="btn" type="button" id="dvC">${esc(t('concise'))} ${esc(t('pdf'))}</button><button class="btn pri" type="button" id="dvP">${esc(t('pdf'))}</button></div><h2>${esc(d.title)}</h2><div class="brief report-md">${md(d.content)}</div>`;
    const doc = (mode) => ({ title: d.title, kind: (d.meta && d.meta.kind) || 'Report', md: mode === 'concise' ? conciseOf(d.content) : d.content, refs: (d.meta && d.meta.refs) || [], cutoff: (d.meta && d.meta.cutoff) || String(d.savedAt).slice(0, 10), limitations: d.meta && d.meta.limitations, mode });
    box.querySelector('#dvP').onclick = () => PA.pdf(doc('comprehensive'));
    box.querySelector('#dvC').onclick = () => PA.pdf(doc('concise'));
  } catch (e) { el.querySelector('#dv').innerHTML = empty(errMsg(e)); }
}
function conciseOf(mdText) {
  // keep executive summary / concise sections, clinical implications and references
  const parts = String(mdText).split(/\n(?=##\s)/);
  const keep = parts.filter((p, i) => i === 0 || /executive summary|direct answer|concise|clinical implication|take-home|references|what changed|comparison/i.test(p.split('\n')[0]));
  return keep.join('\n');
}
function historyView(el) {
  const h = PA.S.history;
  el.innerHTML = `<a class="btn" href="#library">${esc(t('back'))}</a><h2 class="sec">${esc(t('history'))}</h2><div class="list">${h.map((x) => `<div class="item"><div class="meta"><span>${fmtT(x.t)}</span><span class="badge">${esc(x.kind)}</span></div><a class="ttl" href="${esc(safe(x.url) || '#')}" target="_blank" rel="noopener">${esc(x.title)}</a></div>`).join('') || empty('–')}</div>`;
}

/* ---------------- Books ---------------- */
const AREAS = [['Respiratory medicine', 'respiratory medicine textbook'], ['Pulmonology', 'pulmonology'], ['Critical care', 'critical care medicine'], ['Intensive care', 'intensive care manual'], ['Sleep medicine', 'sleep medicine'], ['Pulmonary physiology', 'respiratory physiology'], ['Pulmonary function testing', 'pulmonary function testing'], ['Thoracic imaging', 'thoracic imaging radiology'], ['Interventional pulmonology', 'interventional pulmonology bronchoscopy'], ['Thoracic oncology', 'thoracic oncology lung cancer'], ['Respiratory immunology', 'lung immunology']];
let bArea = 0, onlyRep = true, last3 = true;
PA.view('books', {
  render(el) {
    const S = PA.S;
    el.innerHTML = `<h2>${esc(t('books'))}</h2><p class="lede">${esc(t('bLede'))}</p>
    <div class="chips">${AREAS.map(([n], i) => `<button class="chip" type="button" data-ba="${i}" aria-pressed="${bArea === i}">${esc(n)}</button>`).join('')}</div>
    <div class="row sec"><label class="chk"><input type="checkbox" id="bRep" ${onlyRep ? 'checked' : ''}> ${esc(t('onlyRep'))}</label><label class="chk"><input type="checkbox" id="b3" ${last3 ? 'checked' : ''}> ${esc(t('last3'))}</label><span class="small" id="bSt"></span></div>
    <div class="list sec" id="bList"></div>
    <div class="sec"><h3>${esc(t('myBooks'))}</h3><div class="list">${S.books.map((b) => `<article class="item"><div class="meta"><span class="badge">${esc(b.ed || '')}</span>${b.publisher ? `<span>${esc(b.publisher)}</span>` : ''}${b.isbn ? `<span>ISBN ${esc(b.isbn)}</span>` : ''}</div>${safe(b.url) ? `<a class="ttl" href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.title)}</a>` : `<span class="ttl">${esc(b.title)}</span>`}${b.note ? `<p class="note">${esc(b.note)}</p>` : ''}<div class="acts"><button class="btn" type="button" data-bfind="${esc(b.title)}">${esc(t('findEd'))}</button><button class="btn" type="button" data-brm="${esc(b.id)}">${esc(t('remove'))}</button></div><div class="list" data-bout="${esc(b.title)}"></div></article>`).join('')}</div>
    <form class="add card" id="bAdd"><input name="title" required placeholder="Title"><input name="ed" placeholder="Edition / year"><input name="url" type="url" placeholder="https://"><input name="note" placeholder="Note"><button class="btn pri">${esc(t('add'))}</button></form></div>
    <div class="sec"><button class="btn pri" type="button" id="bAI">${esc(t('aiBooks'))}</button><div class="list" id="bAIout" style="margin-top:12px"></div></div>`;
    const load = async () => {
      const box = el.querySelector('#bList'); box.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`;
      try {
        const r = await api('/api/books?q=' + encodeURIComponent(AREAS[bArea][1]) + '&max=30');
        const yr = new Date().getFullYear() - 3;
        const list = r.books.filter((b) => (!onlyRep || b.reputable) && (!last3 || parseInt(b.date, 10) >= yr));
        el.querySelector('#bSt').textContent = `Google Books · ${list.length} · ${fmtT(Date.parse(r.at))}`;
        box.innerHTML = list.map(bookCard).join('') || empty(t('noResults'));
      } catch (e) { box.innerHTML = empty(errMsg(e)); }
    };
    el.querySelectorAll('[data-ba]').forEach((b) => (b.onclick = () => { bArea = +b.dataset.ba; PA.show(); }));
    el.querySelector('#bRep').onchange = (e) => { onlyRep = e.target.checked; load(); };
    el.querySelector('#b3').onchange = (e) => { last3 = e.target.checked; load(); };
    el.querySelector('#bAdd').addEventListener('submit', (e) => { e.preventDefault(); const o = { id: 'u-' + PA.uid() }; new FormData(e.target).forEach((v, k) => (o[k] = String(v).trim())); S.books.unshift(o); PA.save(); PA.show(); });
    el.querySelector('#bAI').onclick = () => PA.suggest('books', el.querySelector('#bAIout'));
    el.onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.brm) { S.books = S.books.filter((x) => x.id !== b.dataset.brm); S.removed.push(b.dataset.brm); PA.save(); PA.show(); }
      if (b.dataset.bfind) { const out = el.querySelector(`[data-bout="${CSS.escape(b.dataset.bfind)}"]`); out.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`; try { const r = await api('/api/books?q=' + encodeURIComponent('intitle:' + b.dataset.bfind.split(/[:(]/)[0]) + '&max=6'); out.innerHTML = r.books.slice(0, 4).map(bookCard).join('') || empty(t('noResults')); } catch (err) { out.innerHTML = empty(errMsg(err)); } }
      if (b.dataset.bsave) { const x = JSON.parse(b.dataset.bsave); const on = lib.toggle({ id: 'bk:' + x.id, kind: 'book', title: x.title, url: x.info, date: x.date, year: String(x.date).slice(0, 4), journal: x.publisher, type: 'Book' }); b.setAttribute('aria-pressed', on); b.textContent = on ? '★ ' + t('saved') : '☆ ' + t('save'); }
    };
    load();
  }
});
function bookCard(b) {
  const sv = lib.has('bk:' + b.id), ed = /(\d+)(st|nd|rd|th)\s+ed/i.exec(b.title);
  return `<article class="item book">${b.thumbnail ? `<img src="${esc(b.thumbnail.replace('http://', 'https://'))}" alt="" loading="lazy">` : ''}<div><div class="meta">${ed ? `<span class="badge">${esc(ed[0])}</span>` : ''}<span>${esc(b.date)}</span><span>${esc(b.publisher || '')}</span>${b.reputable ? `<span class="badge ok">${esc(t('reputable'))}</span>` : ''}</div><span class="ttl">${esc(b.title)}</span><div class="small">${esc((b.authors || []).join(', '))}${b.isbn13 ? ' · ISBN ' + esc(b.isbn13) : ''}${b.pages ? ' · ' + b.pages + ' pp' : ''}${(b.categories || []).length ? ' · ' + esc(b.categories.join(', ')) : ''}</div>${b.description ? `<details><summary>${esc(t('open'))}</summary><p>${esc(b.description)}</p></details>` : ''}<div class="acts"><button class="btn star" type="button" data-bsave="${esc(JSON.stringify(b))}" aria-pressed="${sv}">${sv ? '★ ' + esc(t('saved')) : '☆ ' + esc(t('save'))}</button>${safe(b.info.replace('http://', 'https://')) ? `<a class="btn" href="${esc(b.info.replace('http://', 'https://'))}" target="_blank" rel="noopener">${esc(t('open'))}</a>` : ''}${safe(b.preview.replace('http://', 'https://')) ? `<a class="btn" href="${esc(b.preview.replace('http://', 'https://'))}" target="_blank" rel="noopener">${esc(t('preview'))}</a>` : ''}</div></div></article>`;
}
})();
