/* More: conferences, videos, people, links, the scheduled agent, and source status. */
(() => {
const { esc, safe, t, L, fmtD, fmtT, empty, toast, api, research, errMsg, sw, uid } = PA;
PA.i18n({
  en: { events: 'Conferences', videos: 'Videos', people: 'People to follow', links: 'Links', agent: 'Agent', sourcesT: 'Connected sources', moreLede: 'Conferences, videos, people, links, your scheduled agent and the live status of every connected data source.', suggest: 'Ask the agent for more (web-verified)', ended: 'ended', latest: 'Latest papers', pubmed: 'PubMed', xsearch: 'Find on X', ytLede: 'Newest YouTube videos for each active topic, plus curated channels.', society: 'Societies', journal: 'Journals', news: 'News', agentLede: 'Your scheduled agent runs automatically and publishes reports into Briefings. Choose which sections it builds and which websites it checks.', enabled: 'On', paused: 'Paused', sectionsT: 'Report sections', cat_websites: 'Websites', cat_guidelines: 'Guidelines', cat_papers: 'Papers', catD_websites: 'News from the society sites below', catD_guidelines: 'New or updated guidelines and statements', catD_papers: 'Important new papers on your topics', websites: 'Websites checked', siteName: 'Site name', addSite: 'Add site', newTask: 'New scheduled task', taskName: 'Name, e.g. Weekly ILD round-up', taskDesc: 'What should the agent do?', taskWhen: 'When, e.g. Every Friday 7 AM', taskNote: 'New tasks are saved here; the scheduled agent picks up enabled tasks on its next run.', topicsAg: 'Paper topics', srcLede: 'Each source is checked live from the server. “Not integrated” sources are never pretended to be searched.', status: 'Status', latency: 'Response', checked: 'Checked', recheck: 'Check again', ok: 'Connected', down: 'Unavailable', notInt: 'Not integrated', needsKey: 'Needs credentials', verified: 'verified', unverified: 'not verified', addTo: 'Add', detail: 'Detail', alsoMon: 'Also monitored (via PubMed, Europe PMC and web search)' },
  ar: { events: 'المؤتمرات', videos: 'الفيديوهات', people: 'أطباء للمتابعة', links: 'روابط', agent: 'الوكيل', sourcesT: 'المصادر المتصلة', moreLede: 'المؤتمرات والفيديوهات والأطباء والروابط والوكيل المجدول وحالة كل مصدر بيانات متصل.', suggest: 'اطلب المزيد من الوكيل (موثّق من الويب)', ended: 'انتهى', latest: 'أحدث الأبحاث', pubmed: 'PubMed', xsearch: 'ابحث في X', ytLede: 'أحدث فيديوهات YouTube لكل موضوع مفعّل، مع قنوات مختارة.', society: 'الجمعيات', journal: 'المجلات', news: 'الأخبار', agentLede: 'يعمل وكيلك المجدول تلقائيًا وينشر التقارير في الملخصات. اختر الأقسام والمواقع التي يتحقق منها.', enabled: 'مفعّل', paused: 'متوقف', sectionsT: 'أقسام التقرير', cat_websites: 'المواقع', cat_guidelines: 'الإرشادات', cat_papers: 'الأبحاث', catD_websites: 'أخبار مواقع الجمعيات أدناه', catD_guidelines: 'الإرشادات والبيانات الجديدة أو المحدّثة', catD_papers: 'أهم الأبحاث الجديدة في مواضيعك', websites: 'المواقع المتابعة', siteName: 'اسم الموقع', addSite: 'إضافة موقع', newTask: 'مهمة مجدولة جديدة', taskName: 'الاسم', taskDesc: 'ماذا يفعل الوكيل؟', taskWhen: 'متى؟', taskNote: 'تُحفظ المهام الجديدة هنا، ويلتقط الوكيل المجدول المهام المفعّلة في تشغيله التالي.', topicsAg: 'مواضيع الأبحاث', srcLede: 'يُفحص كل مصدر مباشرة من الخادم. المصادر «غير المدمجة» لا يُدّعى البحث فيها أبدًا.', status: 'الحالة', latency: 'الاستجابة', checked: 'وقت الفحص', recheck: 'افحص مجددًا', ok: 'متصل', down: 'غير متاح', notInt: 'غير مدمج', needsKey: 'يحتاج بيانات اعتماد', verified: 'موثّق', unverified: 'غير موثّق', addTo: 'إضافة', detail: 'تفاصيل', alsoMon: 'تتم متابعتها أيضًا (عبر PubMed وEurope PMC والبحث في الويب)' }
});
const CATS = ['websites', 'guidelines', 'papers'];
const SUBS = [['events', '📅'], ['videos', '▶'], ['people', '👤'], ['links', '🔗'], ['agent', '🤖'], ['sources', '🛰']];
const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q + ' pulmonology') + '&sp=CAI%253D';
const rm = (kind, id) => `<button class="btn" type="button" data-rm="${kind}:${esc(id)}">${esc(t('remove'))}</button>`;
const link = (u, txt) => (safe(u) ? `<a class="ttl" href="${esc(u)}" target="_blank" rel="noopener" data-track>${esc(txt)}</a>` : `<span class="ttl">${esc(txt)}</span>`);

/* AI suggestions (shared with Books) */
PA.suggest = async (kind, out) => {
  if (!PA.status.ai) { out.innerHTML = empty(t('noAI')); return; }
  out.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`;
  const have = (PA.S[kind] || []).map((x) => x.title || x.name).join('; ');
  try {
    const r = await research('suggest', { kind, exclude: have });
    if (!r.items.length) { out.innerHTML = empty(t('noResults')); return; }
    out.innerHTML = r.items.map((x, i) => `<article class="item"><div class="meta">${x.verified ? `<span class="badge ok">${esc(t('verified'))}</span>` : `<span class="badge warn">${esc(t('unverified'))}</span>`}${x.start ? `<span>${fmtD(x.start)}</span>` : ''}${x.place ? `<span>${esc(x.place)}</span>` : ''}${x.publisher ? `<span>${esc(x.publisher)}</span>` : ''}${x.year ? `<span>${esc(x.year)}</span>` : ''}${x.isbn ? `<span>ISBN ${esc(x.isbn)}</span>` : ''}</div>${link(x.url, x.title || x.name)}${x.detail || x.focus ? `<p class="note">${esc(x.detail || x.focus)}</p>` : ''}${safe(x.source) && x.source !== x.url ? `<div class="small">${esc(t('sourcesLbl'))}: <a href="${esc(x.source)}" target="_blank" rel="noopener">${esc(x.source.replace(/^https:\/\//, '').slice(0, 60))}</a></div>` : ''}<div class="acts"><button class="btn pri" type="button" data-sadd="${i}">${esc(t('addTo'))}</button></div></article>`).join('');
    out.onclick = (e) => {
      const b = e.target.closest('[data-sadd]'); if (!b) return;
      const x = r.items[+b.dataset.sadd], o = { id: 'ai-' + uid(), ...x };
      if (kind === 'books') o.ed = [x.ed, x.year].filter(Boolean).join(' · ');
      if (kind === 'videos') o.src = x.src || 'Web';
      PA.S[kind].unshift(o); PA.save(); b.disabled = true; b.textContent = '✓'; toast('✓ ' + t('saved'));
    };
  } catch (e) { out.innerHTML = empty(errMsg(e)); }
};

PA.view('more', {
  render(el, arg) {
    const sub = String(arg || '').split('/')[0];
    if (!sub) {
      el.innerHTML = `<h2>${esc(t('more'))}</h2><p class="lede">${esc(t('moreLede'))}</p><div class="tiles">${SUBS.map(([k, i]) => `<a class="tile" href="#more/${k}"><span class="ic" aria-hidden="true">${i}</span><b>${esc(t(k === 'sources' ? 'sourcesT' : k))}</b><small>${esc(count(k))}</small></a>`).join('')}</div>`;
      return;
    }
    const fn = { events, videos, people, links, agent, sources }[sub];
    el.innerHTML = `<a class="btn" href="#more">${esc(t('back'))}</a><div id="mv" class="sec"></div>`;
    fn ? fn(el.querySelector('#mv')) : (el.querySelector('#mv').innerHTML = empty(t('noResults')));
    el.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return; const d = b.dataset, S = PA.S;
      if (d.rm) { const [kind, id] = d.rm.split(':'); if (kind === 'tasks') S.tasks = S.tasks.filter((x) => x.id !== id); else { S[kind] = S[kind].filter((x) => x.id !== id); S.removed.push(id); } PA.save(); PA.show(); }
      else if (d.suggest) PA.suggest(d.suggest, el.querySelector('#sugg'));
    };
  }
});
function count(k) {
  const S = PA.S;
  if (k === 'events') return S.events.filter((e) => PA.evState(e).d >= 0).length + ' ' + t('upcoming').toLowerCase();
  if (k === 'agent') return S.tasks.filter((x) => x.enabled).length + ' ' + t('enabled').toLowerCase();
  if (k === 'sources') { const c = PA.cache.get('sources'); return c ? c.data.sources.filter((s) => s.ok).length + ' ' + t('ok').toLowerCase() : ''; }
  if (k === 'links') return String(S.sources.length);
  return String((S[k] || []).length);
}
const addForm = (kind, fields) => `<form class="add card" data-add="${kind}">${fields.map(([n, p, ty]) => `<input name="${n}" ${n === fields[0][0] ? 'required' : ''} ${ty ? `type="${ty}"` : ''} placeholder="${esc(p)}" aria-label="${esc(p)}">`).join('')}<button class="btn pri">${esc(t('add'))}</button></form>`;
function bindAdd(box) {
  box.querySelectorAll('form[data-add]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault(); const o = { id: 'u-' + uid() }; new FormData(f).forEach((v, k) => { v = String(v).trim(); if (v) o[k] = v; });
    if (o.url && !safe(o.url)) return toast('URL must start with https://');
    PA.S[f.dataset.add].unshift(o); PA.save(); PA.show();
  }));
}
const suggestBox = (kind) => `<div class="sec"><button class="btn pri" type="button" data-suggest="${kind}">${esc(t('suggest'))}</button><div class="list" id="sugg" style="margin-top:12px"></div></div>`;

function evHTML(e) {
  const s = PA.evState(e), d = PA.pd(e.start), loc = PA.S.lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB';
  return `<article class="item evt ${s.d < 0 ? 'past' : ''}"><div class="cal"><b>${d ? d.getDate() : '?'}</b><span>${d ? esc(d.toLocaleDateString(loc, { month: 'short' })) + ' ' + d.getFullYear() : ''}</span></div><div><div class="meta">${e.kind ? `<span class="badge">${esc(e.kind)}</span>` : ''}<span class="count">${esc(s.txt)}</span><span>${esc(e.place || '')}</span></div>${link(e.url, e.title)}<div class="small">${fmtD(e.start)}${e.end && e.end !== e.start ? ' – ' + fmtD(e.end) : ''}</div>${e.detail ? `<p class="note">${esc(e.detail)}</p>` : ''}<div class="acts">${rm('events', e.id)}</div></div></article>`;
}
function events(box) {
  const ev = PA.S.events.map((e) => ({ e, s: PA.evState(e) })).sort((a, b) => (a.s.d < 0) - (b.s.d < 0) || (a.s.d < 0 ? b.s.d - a.s.d : a.s.d - b.s.d));
  box.innerHTML = `<h2>${esc(t('events'))}</h2><div class="list">${ev.map((x) => evHTML(x.e)).join('') || empty('–')}</div>${addForm('events', [['title', 'Title'], ['start', 'Start', 'date'], ['end', 'End', 'date'], ['place', 'Place'], ['url', 'https://', 'url']])}${suggestBox('events')}`;
  bindAdd(box);
}
function videos(box) {
  const S = PA.S;
  box.innerHTML = `<h2>${esc(t('videos'))}</h2><p class="lede">${esc(t('ytLede'))}</p><div class="chips">${S.topics.filter((x) => x.on).map((x) => `<a class="chip" href="${esc(yt(x.k))}" target="_blank" rel="noopener">▶ ${esc(x.k)}</a>`).join('')}</div><div class="list sec">${S.videos.map((v) => `<article class="item"><div class="meta"><span class="badge">${esc(v.src || '')}</span><span>${esc(v.tag || '')}</span></div>${link(v.url, v.title)}${v.detail ? `<p class="note">${esc(v.detail)}</p>` : ''}<div class="acts">${rm('videos', v.id)}</div></article>`).join('')}</div>${addForm('videos', [['title', 'Title'], ['url', 'https://', 'url'], ['src', 'Channel / source']])}${suggestBox('videos')}`;
  bindAdd(box);
}
function people(box) {
  const S = PA.S;
  box.innerHTML = `<h2>${esc(t('people'))}</h2><div class="list">${S.people.map((p) => `<article class="item"><span class="ttl">${esc(p.name)}</span><p class="note">${esc(p.focus || '')}</p><div class="acts">${p.q ? `<button class="btn pri" type="button" data-author="${esc(p.id)}">${esc(t('latest'))}</button><a class="btn" href="https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(p.q + '[Author]')}&sort=date" target="_blank" rel="noopener">${esc(t('pubmed'))}</a>` : ''}<a class="btn" href="https://x.com/search?q=${encodeURIComponent(p.name)}&f=user" target="_blank" rel="noopener">${esc(t('xsearch'))}</a>${rm('people', p.id)}</div><div class="list" data-aout="${esc(p.id)}"></div></article>`).join('')}</div>${addForm('people', [['name', 'Name'], ['focus', 'Focus'], ['q', 'PubMed author, e.g. Agusti A']])}${suggestBox('people')}`;
  bindAdd(box);
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-author]'); if (!b) return;
    const p = S.people.find((x) => x.id === b.dataset.author), out = box.querySelector(`[data-aout="${CSS.escape(p.id)}"]`);
    out.innerHTML = `<p class="small">${esc(t('thinking'))}</p>`;
    try { const r = await api('/api/pubmed', { method: 'POST', body: { searches: [{ term: `${p.q}[Author]`, days: 730, max: 5, tag: p.name }] } }); out.innerHTML = (r.papers || []).map((a) => PA.paperCard(a, { compact: true, noTopic: true })).join('') || empty(t('noResults')); }
    catch (err) { out.innerHTML = empty(errMsg(err)); }
  });
}
function links(box) {
  const S = PA.S;
  box.innerHTML = `<h2>${esc(t('links'))}</h2>${['society', 'journal', 'news'].map((k) => `<div class="sec"><h3>${esc(t(k))}</h3><div class="list">${S.sources.filter((s) => s.kind === k).map((s) => `<article class="item row"><span class="ttl" style="flex:1">${esc(s.name)}</span>${safe(s.url) ? `<a class="btn pri" href="${esc(s.url)}" target="_blank" rel="noopener" data-track>${esc(t('open'))}</a>` : ''}${rm('sources', s.id)}</article>`).join('') || empty('–')}</div></div>`).join('')}${addForm('sources', [['name', 'Name'], ['url', 'https://', 'url'], ['kind', 'society / journal / news']])}`;
  bindAdd(box);
}
const CICON = { websites: '🌐', guidelines: '📘', papers: '📄' };
function agent(box) {
  const S = PA.S;
  const tasks = S.tasks.map((k) => `<article class="item agentcard"><div class="task"><div><div class="meta"><span class="badge ${k.enabled ? 'ok' : ''}">${esc(t(k.enabled ? 'enabled' : 'paused'))}</span>${k.schedule ? `<span>${esc(L(k.schedule))}</span>` : ''}</div><span class="ttl">${esc(L(k.name))}</span><p class="note">${esc(L(k.description))}</p></div>${sw(k.enabled, `data-agenton="${esc(k.id)}"`)}</div>
    <h4>${esc(t('sectionsT'))}</h4><div class="secgrid">${CATS.map((c) => `<button class="secbtn" type="button" data-agentsec="${esc(k.id)}|${c}" aria-pressed="${!!k.sections[c]}"><span aria-hidden="true">${CICON[c]}</span><span><b>${esc(t('cat_' + c))}</b><small>${esc(t('catD_' + c))}</small></span></button>`).join('')}</div>
    ${k.sections.websites ? `<h4>${esc(t('websites'))} · ${k.sources.length}</h4><div class="list">${k.sources.map((s) => `<div class="srow"><a href="${esc(safe(s.url) || '#')}" target="_blank" rel="noopener">${esc(s.name)}</a><span class="small">${esc((s.url || '').replace(/^https?:\/\//, ''))}</span><button class="btn" type="button" data-delsite="${esc(k.id)}|${esc(s.id)}">${esc(t('remove'))}</button></div>`).join('')}</div><form class="add" data-addsite="${esc(k.id)}"><input name="name" required placeholder="${esc(t('siteName'))}"><input name="url" required type="url" placeholder="https://"><button class="btn pri">${esc(t('addSite'))}</button></form>` : ''}
    ${k.id !== 'daily-digest' ? `<div class="acts">${rm('tasks', k.id)}</div>` : ''}</article>`).join('');
  box.innerHTML = `<h2>${esc(t('agent'))}</h2><p class="lede">${esc(t('agentLede'))}</p><div class="list">${tasks || empty('–')}</div>
  <div class="card sec"><h3>${esc(t('topicsAg'))}</h3><div class="chips">${S.topics.map((x, i) => `<button class="chip" type="button" data-topic="${i}" aria-pressed="${!!x.on}">${esc(x.k)}</button>`).join('')}</div><form class="row" id="tAdd" style="margin-top:10px"><input name="k" placeholder="Topic" required style="flex:1"><button class="btn">${esc(t('add'))}</button></form></div>
  <div class="card sec"><h3>${esc(t('newTask'))}</h3><form class="add" id="agentForm"><input name="name" required placeholder="${esc(t('taskName'))}"><input name="desc" required placeholder="${esc(t('taskDesc'))}"><input name="schedule" placeholder="${esc(t('taskWhen'))}"><button class="btn pri">${esc(t('add'))}</button></form><p class="small">${esc(t('taskNote'))}</p></div>
  <div class="card sec"><h3>${esc(t('alsoMon'))}</h3><p class="small">GOLD · GINA · ATS · ERS · BTS · ACCP/CHEST · NICE · WHO · ESC · AASM · IDSA · ESICM · SCCM · Saudi Thoracic Society · Cochrane · NEJM · Lancet · Lancet Respir Med · AJRCCM · ERJ · Thorax · CHEST · JAMA · BMJ · Intensive Care Med · Crit Care Med · J Thorac Oncol · Sleep · ClinicalTrials.gov · openFDA</p></div>`;
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.agenton) { const k = S.tasks.find((x) => x.id === d.agenton); k.enabled = !k.enabled; }
    else if (d.agentsec) { const [id, c] = d.agentsec.split('|'); const k = S.tasks.find((x) => x.id === id); k.sections[c] = !k.sections[c]; }
    else if (d.delsite) { const [id, sid] = d.delsite.split('|'); const k = S.tasks.find((x) => x.id === id); k.sources = k.sources.filter((s) => s.id !== sid); }
    else if (d.topic) { const x = S.topics[+d.topic]; x.on = x.on ? 0 : 1; }
    else return;
    PA.save(); PA.show();
  });
  box.querySelectorAll('form[data-addsite]').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); const fd = new FormData(f), url = String(fd.get('url')).trim(); if (!safe(url)) return toast('URL must start with https://'); S.tasks.find((x) => x.id === f.dataset.addsite).sources.push({ id: 's-' + uid(), type: 'website', name: String(fd.get('name')).trim(), url }); PA.save(); PA.show(); }));
  box.querySelector('#tAdd').addEventListener('submit', (e) => { e.preventDefault(); const k = String(new FormData(e.target).get('k')).trim(); if (k) { S.topics.push({ k, on: 1 }); PA.save(); PA.show(); } });
  box.querySelector('#agentForm').addEventListener('submit', (e) => { e.preventDefault(); const fd = new FormData(e.target); S.tasks.push(PA.fixTask({ id: 't-' + uid(), enabled: true, name: { en: String(fd.get('name')), ar: String(fd.get('name')) }, description: { en: String(fd.get('desc')), ar: String(fd.get('desc')) }, schedule: { en: String(fd.get('schedule') || ''), ar: String(fd.get('schedule') || '') }, sources: [], sections: { websites: false, guidelines: true, papers: true } })); PA.save(); PA.show(); });
}
async function sources(box, force) {
  const c = PA.cache.get('sources');
  const draw = (d, at) => {
    const rows = d.sources.map((s) => { const st = s.ok ? ['ok', t('ok')] : s.id === 'scholar' ? ['w', t('notInt')] : /not set|not configured/.test(s.detail || '') ? ['w', t('needsKey')] : ['x', t('down')]; return `<tr><th>${esc(s.name)}</th><td><span class="flag ${st[0]}">${esc(st[1])}</span></td><td>${s.ms != null ? s.ms + ' ms' : '–'}</td><td class="small">${esc(s.detail || '')}</td></tr>`; }).join('');
    box.innerHTML = `<h2>${esc(t('sourcesT'))}</h2><p class="lede">${esc(t('srcLede'))}</p><div class="row"><span class="small">${esc(t('checked'))}: ${fmtT(at)}</span><span class="sp"></span><button class="btn" type="button" id="srcRe">${esc(t('recheck'))}</button></div><div class="scroll sec"><table class="tbl"><thead><tr><th>Source</th><th>${esc(t('status'))}</th><th>${esc(t('latency'))}</th><th>${esc(t('detail'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    box.querySelector('#srcRe').onclick = () => sources(box, true);
  };
  if (c && !force && Date.now() - c.at < 10 * 60e3) return draw(c.data, c.at);
  box.innerHTML = `<h2>${esc(t('sourcesT'))}</h2><p class="small">${esc(t('thinking'))}</p>`;
  try { const d = await api('/api/sources'); PA.cache.set('sources', { at: Date.now(), data: d }); draw(d, Date.now()); }
  catch (e) { if (c) draw(c.data, c.at); else box.innerHTML += empty(errMsg(e)); }
}
})();
