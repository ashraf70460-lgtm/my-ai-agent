// Shared PubMed (NCBI E-utilities) helpers for the Pulmonologist app.
// Optional env: NCBI_API_KEY (raises the NCBI rate limit from 3 to 10 requests/second).
const EU = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const KEY = () => (process.env.NCBI_API_KEY ? `&api_key=${encodeURIComponent(process.env.NCBI_API_KEY)}` : '');
const TOOL = '&tool=pulmonologist-agent';
const GAP = () => (process.env.NCBI_API_KEY ? 120 : 360);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
function clean(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+|#39);/gi, (m, e) => {
      if (ENT[e]) return ENT[e];
      if (/^#x/i.test(e)) return String.fromCodePoint(parseInt(e.slice(2), 16));
      if (/^#/.test(e)) return String.fromCodePoint(parseInt(e.slice(1), 10));
      return m;
    })
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getJSON(url) {
  for (let i = 0; i < 2; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'pulmonologist-agent' } });
    if (r.status === 429) { await sleep(1100); continue; }
    if (!r.ok) throw new Error(`NCBI ${r.status}`);
    return r.json();
  }
  throw new Error('NCBI rate limit');
}

export async function search(term, days = 14, max = 10) {
  const d = Math.min(Math.max(parseInt(days, 10) || 14, 1), 3650);
  const m = Math.min(Math.max(parseInt(max, 10) || 10, 1), 40);
  const url = `${EU}esearch.fcgi?db=pubmed&retmode=json&sort=pub_date&retmax=${m}&datetype=edat&reldate=${d}&term=${encodeURIComponent(term)}${TOOL}${KEY()}`;
  const j = await getJSON(url);
  return (j.esearchresult && j.esearchresult.idlist) || [];
}

function isoDate(s) {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})/.exec(s || '');
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

export async function fetchArticles(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    if (i) await sleep(GAP());
    const sum = await getJSON(`${EU}esummary.fcgi?db=pubmed&retmode=json&id=${chunk.join(',')}${TOOL}${KEY()}`);
    await sleep(GAP());
    const abs = {};
    try {
      const r = await fetch(`${EU}efetch.fcgi?db=pubmed&retmode=xml&id=${chunk.join(',')}${TOOL}${KEY()}`);
      if (r.ok) {
        const xml = await r.text();
        for (const part of xml.split('<PubmedArticle>').slice(1)) {
          const pm = /<PMID[^>]*>(\d+)<\/PMID>/.exec(part);
          if (!pm) continue;
          const texts = [...part.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map((x) => {
            const lab = /Label="([^"]+)"/.exec(x[1]);
            return (lab ? lab[1] + ': ' : '') + clean(x[2]);
          });
          abs[pm[1]] = texts.join(' ').slice(0, 1600);
        }
      }
    } catch { /* abstracts are optional */ }
    const res = sum.result || {};
    for (const id of chunk) {
      const x = res[id];
      if (!x || x.error) continue;
      const doi = (x.articleids || []).find((a) => a.idtype === 'doi');
      const au = (x.authors || []).map((a) => a.name).filter(Boolean);
      out.push({
        pmid: String(id),
        doi: doi ? doi.value : '',
        title: clean(x.title),
        journal: clean(x.source || x.fulljournalname),
        jabbr: clean(x.source),
        date: isoDate(x.sortpubdate) || isoDate(x.epubdate) || '',
        authors: au.slice(0, 3).join(', ') + (au.length > 3 ? ' et al.' : ''),
        types: x.pubtype || [],
        abstract: abs[id] || ''
      });
    }
  }
  return out;
}

// Run several searches politely (sequentially), then fetch all records once.
export async function runSearches(list) {
  const tagged = new Map();
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (i) await sleep(GAP());
    try {
      const ids = await search(s.term, s.days, s.max);
      for (const id of ids) if (!tagged.has(id)) tagged.set(id, s.tag || '');
    } catch { /* keep going with other searches */ }
  }
  const ids = [...tagged.keys()];
  if (!ids.length) return [];
  await sleep(GAP());
  const arts = await fetchArticles(ids);
  return arts.map((a) => ({ ...a, topic: tagged.get(a.pmid) || '' }));
}

export function checkPin(req) {
  const need = process.env.APP_PIN;
  return !need || (req.headers['x-app-pin'] || '') === need;
}
