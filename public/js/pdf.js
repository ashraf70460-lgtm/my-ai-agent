/* PULMONOLOGIST-AGENT — professional PDF reports (pdfmake, bundled in /vendor).
   PA.pdf({ title, subtitle, kind, md, refs:[{label,url,doi,pmid}], cutoff, limitations, mode:'concise'|'comprehensive', toc })
   Arabic text is not shaped by pdfmake, so Arabic reports use the browser's print-to-PDF with the same identity. */
(() => {
const NAVY = '#0b2545', TEAL = '#0d9488', CYAN = '#0891b2', GREY = '#5b6b80', LINE = '#d7dee8';
const WM = 'PULMONOLOGIST-AGENT  ·  Prepared for Ashraf Ahmed';
let loading = null;
function loadLib() {
  if (window.pdfMake && window.pdfMake.vfs) return Promise.resolve();
  if (loading) return loading;
  const add = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
  loading = add('/vendor/pdfmake.min.js').then(() => add('/vendor/vfs_fonts.js'));
  return loading;
}
const strip = (s) => String(s || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
function runs(text) {
  // inline: **bold**, *italic*, [label](https://url), bare https urls, PMID n
  const out = [];
  const re = /(\*\*(.+?)\*\*)|(\*(?!\s)(.+?)\*)|(\[([^\]]+)\]\((https:\/\/[^)\s]+)\))|(https:\/\/[^\s)]+)|(PMID:?\s?(\d{6,9}))/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    if (m[1]) out.push({ text: m[2], bold: true });
    else if (m[3]) out.push({ text: m[4], italics: true });
    else if (m[5]) out.push({ text: m[6], link: m[7], color: CYAN, decoration: 'underline' });
    else if (m[8]) out.push({ text: m[8], link: m[8], color: CYAN, decoration: 'underline' });
    else if (m[9]) out.push({ text: 'PMID ' + m[10], link: `https://pubmed.ncbi.nlm.nih.gov/${m[10]}/`, color: CYAN });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out.length ? out : [{ text }];
}
function mdToContent(src, toc) {
  const lines = String(src || '').split(/\r?\n/), out = [];
  let list = null, listType = 'ul';
  const flushList = () => { if (list) { out.push(listType === 'ul' ? { ul: list, margin: [0, 2, 0, 8] } : { ol: list, margin: [0, 2, 0, 8] }); list = null; } };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flushList();
      const row = (x) => x.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = row(l); i += 2; const body = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { body.push(row(lines[i])); i++; }
      i--;
      const n = head.length;
      const fix = (r) => { const a = r.slice(0, n); while (a.length < n) a.push(''); return a; };
      out.push({ table: { headerRows: 1, widths: Array(n).fill('*'), body: [head.map((c) => ({ text: strip(c), style: 'th' })), ...body.map((r) => fix(r).map((c) => ({ text: runs(c), style: 'td' })))] },
        layout: { fillColor: (ri) => (ri === 0 ? NAVY : ri % 2 ? null : '#f3f6fa'), hLineColor: () => LINE, vLineColor: () => LINE, hLineWidth: () => 0.5, vLineWidth: () => 0.5, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 4, 0, 10] });
      continue;
    }
    let m;
    if ((m = /^(#{1,4})\s+(.*)/.exec(l))) {
      flushList();
      const lvl = m[1].length, txt = strip(m[2]);
      out.push({ text: txt, style: lvl <= 1 ? 'h1' : lvl === 2 ? 'h2' : 'h3', tocItem: toc && lvl <= 2, tocMargin: lvl === 2 ? [10, 0, 0, 0] : [0, 0, 0, 0] });
    } else if ((m = /^\s*[-•*]\s+(.*)/.exec(l))) { if (!list || listType !== 'ul') { flushList(); list = []; listType = 'ul'; } list.push({ text: runs(m[1]) }); }
    else if ((m = /^\s*\d+[.)]\s+(.*)/.exec(l))) { if (!list || listType !== 'ol') { flushList(); list = []; listType = 'ol'; } list.push({ text: runs(m[1]) }); }
    else if (/^\s*(-{3,}|_{3,})\s*$/.test(l)) { flushList(); out.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: LINE }], margin: [0, 6, 0, 6] }); }
    else if (l.trim()) { flushList(); out.push({ text: runs(l), style: 'p' }); }
    else flushList();
  }
  flushList();
  return out;
}
const hasArabic = (s) => /[؀-ۿ]/.test(s || '');

async function pdf(doc) {
  const now = new Date();
  const gen = now.toISOString().slice(0, 10);
  const all = [doc.title, doc.subtitle, doc.md].join(' ');
  if (hasArabic(all)) return printReport(doc);
  try { await loadLib(); } catch (e) { return printReport(doc); }
  const toc = doc.toc !== false && String(doc.md || '').split('\n').filter((l) => /^##\s/.test(l)).length >= 4;
  const refs = (doc.refs || []).filter((r) => r && (r.label || r.title));
  const content = [
    // cover
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 596, h: 270, color: NAVY }, { type: 'rect', x: 0, y: 270, w: 596, h: 6, color: TEAL }], absolutePosition: { x: 0, y: 0 } },
    { text: 'PULMONOLOGIST-AGENT', color: '#7dd3fc', bold: true, fontSize: 11, characterSpacing: 1.5, absolutePosition: { x: 56, y: 70 } },
    { text: doc.kind || 'Report', color: '#cbd5e1', fontSize: 12, absolutePosition: { x: 56, y: 92 } },
    { text: strip(doc.title || 'Report'), color: '#ffffff', bold: true, fontSize: 24, lineHeight: 1.15, absolutePosition: { x: 56, y: 130 }, width: 480 },
    { text: '', margin: [0, 240, 0, 0] },
    doc.subtitle ? { text: doc.subtitle, style: 'lede', margin: [0, 0, 0, 14] } : '',
    { table: { widths: [130, '*'], body: [
      ['Prepared for', 'Ashraf Ahmed'],
      ['Generated', gen],
      ['Search cut-off', doc.cutoff || gen],
      ['Report type', (doc.mode === 'concise' ? 'Concise · ' : doc.mode === 'comprehensive' ? 'Comprehensive · ' : '') + (doc.kind || 'Report')],
      ['Sources', doc.sourcesLine || 'PubMed, Europe PMC, ClinicalTrials.gov, Crossref, official society documents (as retrieved)']
    ].map(([a, b]) => [{ text: a, color: GREY, fontSize: 9 }, { text: b, fontSize: 10 }]) }, layout: 'noBorders', margin: [0, 0, 0, 14] },
    { text: 'Evidence limitations', style: 'h3' },
    { text: doc.limitations || 'AI-assisted evidence summary based on retrieved abstracts and official documents; not a formal systematic review. Numerical results are reported only where they appear in the retrieved source. Verify key recommendations in the original documents before applying them. Educational research support — not individualised patient management.', style: 'small' },
    toc ? { toc: { title: { text: 'Contents', style: 'h2' }, numberStyle: { color: GREY } }, margin: [0, 14, 0, 0] } : '',
    { text: '', pageBreak: 'before' },
    ...mdToContent(doc.md, toc),
    refs.length ? { text: 'References', style: 'h2', tocItem: toc } : '',
    refs.length ? { ol: refs.map((r) => ({ text: [{ text: strip(r.label || r.title) + ' ' }, r.pmid ? { text: 'PMID ' + r.pmid + ' ', link: `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`, color: CYAN } : '', r.doi ? { text: 'doi:' + r.doi, link: 'https://doi.org/' + r.doi, color: CYAN } : '', !r.doi && !r.pmid && r.url ? { text: r.url, link: r.url, color: CYAN } : ''], style: 'small', margin: [0, 0, 0, 3] })) } : ''
  ].filter(Boolean);
  const dd = {
    pageSize: 'A4', pageMargins: [48, 56, 48, 56], info: { title: strip(doc.title), author: 'PULMONOLOGIST-AGENT', subject: 'Prepared for Ashraf Ahmed' },
    watermark: { text: WM, color: NAVY, opacity: 0.05, bold: true, fontSize: 26, angle: -40 },
    header: (page) => (page === 1 ? null : { columns: [{ text: 'PULMONOLOGIST-AGENT', bold: true, color: TEAL, fontSize: 8 }, { text: strip(doc.title).slice(0, 90), alignment: 'right', color: GREY, fontSize: 8 }], margin: [48, 24, 48, 0] }),
    footer: (page, pages) => ({ columns: [{ text: 'Prepared for Ashraf Ahmed · generated ' + gen, color: GREY, fontSize: 8 }, { text: `Page ${page} of ${pages}`, alignment: 'right', color: GREY, fontSize: 8 }], margin: [48, 20, 48, 0] }),
    content,
    styles: {
      h1: { fontSize: 18, bold: true, color: NAVY, margin: [0, 10, 0, 6] }, h2: { fontSize: 14, bold: true, color: NAVY, margin: [0, 12, 0, 5] }, h3: { fontSize: 11.5, bold: true, color: TEAL, margin: [0, 8, 0, 3] },
      p: { fontSize: 10, lineHeight: 1.3, margin: [0, 0, 0, 6] }, lede: { fontSize: 12, color: '#1f2937' }, small: { fontSize: 9, color: '#334155', lineHeight: 1.25 },
      th: { bold: true, color: '#ffffff', fontSize: 8.5 }, td: { fontSize: 8.5, lineHeight: 1.2 }
    },
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0f172a' }
  };
  const name = strip(doc.title || 'report').replace(/[^a-z0-9]+/gi, '-').slice(0, 60).toLowerCase() + '-' + gen + '.pdf';
  window.pdfMake.createPdf(dd).download(name);
}

function printReport(doc) {
  const w = window.open('', '_blank');
  if (!w) { PA.toast('Allow pop-ups to create the PDF'); return; }
  const rtl = hasArabic([doc.title, doc.md].join(' '));
  const refs = (doc.refs || []).map((r) => `<li>${PA.esc(r.label || r.title || '')} ${r.pmid ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${PA.esc(r.pmid)}/">PMID ${PA.esc(r.pmid)}</a>` : ''} ${r.doi ? `<a href="https://doi.org/${PA.esc(r.doi)}">doi:${PA.esc(r.doi)}</a>` : ''}</li>`).join('');
  const gen = new Date().toISOString().slice(0, 10);
  w.document.write(`<!DOCTYPE html><html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${PA.esc(doc.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:18mm 16mm;@bottom-right{content:"Page " counter(page) " of " counter(pages);font:9px Inter,sans-serif;color:#5b6b80}@bottom-left{content:"Prepared for Ashraf Ahmed · ${gen}";font:9px Inter,sans-serif;color:#5b6b80}}
body{font:11.5px/1.55 "IBM Plex Sans Arabic",Inter,sans-serif;color:#0f172a}.cover{background:#0b2545;color:#fff;padding:28px;border-bottom:6px solid #0d9488;margin-bottom:18px}.cover small{color:#7dd3fc;font-weight:700;letter-spacing:.08em}
h1{font-size:22px;margin:6px 0}h2{color:#0b2545;font-size:16px;border-bottom:1px solid #d7dee8;padding-bottom:3px;margin-top:18px}h3{color:#0d9488}table{border-collapse:collapse;width:100%;margin:6px 0 12px}th{background:#0b2545;color:#fff;text-align:start}th,td{border:1px solid #d7dee8;padding:4px 6px;font-size:10.5px;vertical-align:top}a{color:#0891b2}
.wm{position:fixed;top:45%;left:-5%;right:-5%;text-align:center;transform:rotate(-35deg);font:700 34px Inter,sans-serif;color:rgba(11,37,69,.05);pointer-events:none}.lim{font-size:10px;color:#334155;background:#f3f6fa;padding:8px;border-radius:6px}</style></head><body>
<div class="wm">PULMONOLOGIST-AGENT · Prepared for Ashraf Ahmed</div>
<div class="cover"><small>PULMONOLOGIST-AGENT</small><div>${PA.esc(doc.kind || 'Report')}</div><h1>${PA.esc(doc.title)}</h1><div>Prepared for Ashraf Ahmed · ${gen} · search cut-off ${PA.esc(doc.cutoff || gen)}</div></div>
<p class="lim">${PA.esc(doc.limitations || 'AI-assisted evidence summary based on retrieved abstracts and official documents; not a formal systematic review. Educational research support — not individualised patient management.')}</p>
${PA.md(doc.md)}${refs ? `<h2>References</h2><ol>${refs}</ol>` : ''}<script>setTimeout(()=>print(),600)<\/script></body></html>`);
  w.document.close();
}
window.PA.pdf = pdf;
window.PA.printReport = printReport;
})();
