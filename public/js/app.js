/* Shell: flow–volume loop, settings, header status, install prompt, service worker, start-up. */
(() => {
const { $, esc, t, toast } = PA;
PA.i18n({
  en: { appName: 'App name', theme: 'Theme', lookback: 'Look back (days)', resLang: 'Research output language', depth: 'Default depth', pin: 'App PIN', backup: 'Backup and restore', copyBackup: 'Copy backup', restore: 'Restore', close: 'Close', aiOn: 'Claude connected — analysis, deep research and briefings work.', aiOff: 'Claude not connected — add ANTHROPIC_API_KEY in Vercel. Searches, trials, guidelines and lists still work.', syncOn: 'Synced across your devices.', syncOff: 'Saved on this device only.', restored: 'Backup restored', badBackup: 'That backup could not be read' },
  ar: { appName: 'اسم التطبيق', theme: 'المظهر', lookback: 'الفترة (أيام)', resLang: 'لغة مخرجات البحث', depth: 'العمق الافتراضي', pin: 'رمز التطبيق', backup: 'النسخ الاحتياطي والاستعادة', copyBackup: 'نسخ احتياطي', restore: 'استعادة', close: 'إغلاق', aiOn: 'Claude متصل — التحليل والبحث المعمق والملخصات تعمل.', aiOff: 'Claude غير متصل — أضف ANTHROPIC_API_KEY في Vercel. البحث والتجارب والإرشادات والقوائم تعمل.', syncOn: 'متزامن بين أجهزتك.', syncOff: 'محفوظ على هذا الجهاز فقط.', restored: 'تمت الاستعادة', badBackup: 'تعذرت قراءة النسخة الاحتياطية' }
});

/* flow–volume loop: expiratory peak then linear fall, inspiratory semicircle */
PA.drawLoop = () => {
  const svg = $('#loopSvg'); if (!svg) return;
  const W = svg.clientWidth || 420, H = svg.clientHeight || 220;
  const m = 24, x0 = m + 8, x1 = W - m, y0 = H * 0.55, top = m, bot = H - m;
  const X = (v) => x0 + (x1 - x0) * v, Yp = (f) => y0 - (y0 - top) * f, Yn = (f) => y0 + (bot - y0) * f;
  let p = `M${X(0)},${y0}`;
  for (let i = 0; i <= 60; i++) { const v = i / 60, f = v < 0.12 ? Math.sin((v / 0.12) * Math.PI / 2) : 1 - ((v - 0.12) / 0.88) ** 0.9; p += ` L${X(v).toFixed(1)},${Yp(Math.max(f, 0)).toFixed(1)}`; }
  for (let i = 60; i >= 0; i--) { const v = i / 60; p += ` L${X(v).toFixed(1)},${Yn(Math.sin(Math.PI * v) * 0.62).toFixed(1)}`; }
  let g = '';
  for (let i = 1; i < 6; i++) g += `<line x1="${X(i / 6)}" y1="${top}" x2="${X(i / 6)}" y2="${bot}" stroke="rgba(255,255,255,.10)"/>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `${g}<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="rgba(255,255,255,.35)"/><path d="${p} Z" fill="rgba(34,211,238,.14)" stroke="#22d3ee" stroke-width="3" stroke-linejoin="round" class="draw"/><text x="${x0}" y="${top - 6}" fill="rgba(255,255,255,.6)" font-size="11">Flow</text><text x="${x1 - 40}" y="${y0 - 6}" fill="rgba(255,255,255,.6)" font-size="11">Volume</text>`;
};
if (window.ResizeObserver) new ResizeObserver(() => PA.drawLoop()).observe(document.body);

/* header + settings status */
function dots() {
  const s = PA.status;
  $('#hAi').className = 'dot' + (s.ai ? ' ok' : ''); $('#hAi').title = s.ai ? t('aiOn') : t('aiOff');
  $('#hSync').className = 'dot' + (s.sync ? ' ok' : ''); $('#hSync').title = s.sync ? t('syncOn') : t('syncOff');
  $('#aiDot').className = 'dot' + (s.ai ? ' ok' : ''); $('#aiMsg').textContent = s.ai ? t('aiOn') : t('aiOff');
  $('#syncDot').className = 'dot' + (s.sync ? ' ok' : ''); $('#syncMsg').textContent = s.sync ? t('syncOn') : t('syncOff');
}
const rerender = PA.rerender;
PA.rerender = () => { rerender(); dots(); };

$('#langBtn').addEventListener('click', () => { PA.S.lang = PA.S.lang === 'ar' ? 'en' : 'ar'; PA.save(); PA.rerender(); });
$('#modalX').addEventListener('click', PA.closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') PA.closeModal(); });
$('#setBtn').addEventListener('click', () => {
  const S = PA.S;
  $('#fName').value = S.name; $('#fTheme').value = S.theme; $('#fDays').value = String(S.days); $('#fRLang').value = S.researchLang || 'en'; $('#fDepth').value = S.depth || 'comprehensive'; $('#fPin').value = PA.PIN; $('#impTxt').value = ''; $('#copyMsg').textContent = '';
  dots(); $('#dlg').showModal();
});
$('#fName').addEventListener('change', (e) => { PA.S.name = e.target.value.trim() || 'PULMONOLOGIST-AGENT'; PA.save(); PA.applyLang(); });
$('#fTheme').addEventListener('change', (e) => { PA.S.theme = e.target.value; PA.save(); PA.applyTheme(); });
$('#fDays').addEventListener('change', (e) => { PA.S.days = +e.target.value; PA.save(); });
$('#fRLang').addEventListener('change', (e) => { PA.S.researchLang = e.target.value; PA.save(); });
$('#fDepth').addEventListener('change', (e) => { PA.S.depth = e.target.value; PA.save(); });
$('#fPin').addEventListener('change', (e) => { PA.setPin(e.target.value.trim()); PA.boot(); });
$('#copyBtn').addEventListener('click', async () => { const txt = JSON.stringify(PA.S); try { await navigator.clipboard.writeText(txt); $('#copyMsg').textContent = '✓'; } catch (e) { $('#impTxt').value = txt; $('#impTxt').select(); } });
$('#impBtn').addEventListener('click', () => {
  try { const o = JSON.parse($('#impTxt').value); if (!o || typeof o !== 'object' || !Array.isArray(o.topics)) throw 0; PA.S = PA.load(o); PA.save(); PA.rerender(); toast(t('restored')); }
  catch (e) { toast(t('badBackup')); }
});

/* install */
let deferred = null;
const bar = $('#installBar');
const dismissed = () => { try { return localStorage.getItem('pulmo-install-x') === '1'; } catch (e) { return false; } };
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; if (!dismissed()) bar.hidden = false; });
$('#installBtn').addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; bar.hidden = true; });
$('#installX').addEventListener('click', () => { bar.hidden = true; try { localStorage.setItem('pulmo-install-x', '1'); } catch (e) {} });
window.addEventListener('appinstalled', () => { bar.hidden = true; });

/* routing + start */
window.addEventListener('hashchange', () => { PA.show(); window.scrollTo(0, 0); });
window.addEventListener('online', () => PA.flush());
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
PA.rerender();
PA.boot().then(dots);
})();
