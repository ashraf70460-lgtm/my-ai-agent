// External research sources used by Pulmonologist-Agent (all official, free APIs; no scraping).
// PubMed lives in _pubmed.js. Each helper returns normalised records and throws on failure,
// so callers can report per-source status honestly.
const UA = { 'User-Agent': 'pulmonologist-agent/3 (mailto:noreply@example.com)', Accept: 'application/json' };
const TIMEOUT = 15000;

async function getJSON(url, opts = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeout || TIMEOUT);
  try {
    const r = await fetch(url, { headers: UA, signal: ctl.signal });
    if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}
const iso = (d) => d.toISOString().slice(0, 10);
export const dayRange = (days, from, to) => {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - (Math.max(1, +days || 30)) * 864e5);
  return { from: iso(start), to: iso(end) };
};
const clean = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// ---------- Europe PMC (MEDLINE + PMC full text + preprints) ----------
export async function epmcSearch(q, { days = 30, from, to, max = 25, preprintsOnly = false } = {}) {
  const r = dayRange(days, from, to);
  let query = `(${q}) AND FIRST_PDATE:[${r.from} TO ${r.to}]`;
  if (preprintsOnly) query += ' AND SRC:PPR';
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize=${Math.min(max, 100)}&sort=${encodeURIComponent('FIRST_PDATE desc')}&query=${encodeURIComponent(query)}`;
  let j;
  try { j = await getJSON(url, { timeout: 20000 }); }
  catch (e) { j = await getJSON(url.replace(/&sort=[^&]+/, ''), { timeout: 20000 }); } // retry once, unsorted (lighter for the server)
  return ((j.resultList && j.resultList.result) || []).map((x) => {
    const types = (x.pubTypeList && x.pubTypeList.pubType) || [];
    const ft = ((x.fullTextUrlList && x.fullTextUrlList.fullTextUrl) || []).find((u) => u.availabilityCode === 'OA' || u.availability === 'Open access');
    return {
      pmid: x.pmid || '', pmcid: x.pmcid || '', doi: x.doi || '', title: clean(x.title),
      journal: clean((x.journalInfo && x.journalInfo.journal && (x.journalInfo.journal.isoabbreviation || x.journalInfo.journal.title)) || x.bookOrReportDetails?.publisher || (x.source === 'PPR' ? (x.publisher || 'Preprint') : '')),
      date: x.firstPublicationDate || x.electronicPublicationDate || '', pubDate: x.journalInfo?.printPublicationDate || '', epubDate: x.electronicPublicationDate || '',
      authors: clean(x.authorString).split(', ').slice(0, 3).join(', ') + ((x.authorString || '').split(', ').length > 3 ? ' et al.' : ''),
      types, abstract: clean(x.abstractText).slice(0, 1600), citedBy: x.citedByCount || 0,
      preprint: x.source === 'PPR' || types.some((t) => /preprint/i.test(t)),
      openAccess: x.isOpenAccess === 'Y', fullText: ft ? ft.url : '', src: 'europepmc'
    };
  });
}

// ---------- ClinicalTrials.gov API v2 ----------
export async function ctgovSearch(cond, { days = 30, from, to, max = 20, term = '', status = '' } = {}) {
  const r = dayRange(days, from, to);
  const p = new URLSearchParams({ format: 'json', pageSize: String(Math.min(max, 50)), sort: 'StudyFirstPostDate:desc', 'query.cond': cond });
  if (term) p.set('query.term', term);
  p.set('filter.advanced', `AREA[StudyFirstPostDate]RANGE[${r.from},${r.to}]`);
  if (status) p.set('filter.overallStatus', status);
  const j = await getJSON(`https://clinicaltrials.gov/api/v2/studies?${p}`);
  return (j.studies || []).map((s) => {
    const ps = s.protocolSection || {};
    const id = ps.identificationModule || {}, st = ps.statusModule || {}, de = ps.designModule || {};
    return {
      nct: id.nctId, title: clean(id.briefTitle), officialTitle: clean(id.officialTitle), status: st.overallStatus || '',
      firstPosted: st.studyFirstPostDateStruct?.date || '', start: st.startDateStruct?.date || '', completion: st.primaryCompletionDateStruct?.date || '',
      type: de.studyType || '', phases: de.phases || [], enrollment: de.enrollmentInfo?.count || null,
      sponsor: ps.sponsorCollaboratorsModule?.leadSponsor?.name || '', conditions: ps.conditionsModule?.conditions || [],
      interventions: (ps.armsInterventionsModule?.interventions || []).map((i) => i.name).slice(0, 5),
      hasResults: Boolean(s.hasResults), url: `https://clinicaltrials.gov/study/${id.nctId}`, src: 'ctgov'
    };
  });
}

// ---------- Crossref (DOI verification, corrections, retractions) ----------
export async function crossrefWork(doi) {
  const j = await getJSON(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  const m = j.message || {};
  const rel = m.relation || {};
  const updatedBy = (m['updated-by'] || []).map((u) => ({ type: u.type, doi: u.DOI, date: u.updated?.['date-parts']?.[0]?.join('-') || '' }));
  const dp = (k) => (m[k]?.['date-parts']?.[0] || []).map((n) => String(n).padStart(2, '0')).join('-');
  return {
    doi: m.DOI, title: clean((m.title || [])[0]), journal: clean((m['container-title'] || [])[0]), type: m.type,
    published: dp('published') || dp('issued'), online: dp('published-online'), print: dp('published-print'),
    updatedBy, retracted: updatedBy.some((u) => /retraction|withdrawal/i.test(u.type)) || m.type === 'retraction',
    corrected: updatedBy.some((u) => /correction|erratum|corrigendum/i.test(u.type)),
    isPreprintOf: rel['is-preprint-of'] ? rel['is-preprint-of'].map((x) => x.id) : [], url: m.URL
  };
}

// ---------- openFDA (label changes and recalls for respiratory products) ----------
const RESP_LABEL = '(asthma OR "chronic obstructive" OR COPD OR bronchiectasis OR "cystic fibrosis" OR "pulmonary fibrosis" OR "pulmonary arterial hypertension" OR tuberculosis OR "interstitial lung")';
const yyyymmdd = (s) => s.replace(/-/g, '');
export async function fdaLabels({ days = 30, from, to, max = 20 } = {}) {
  const r = dayRange(days, from, to);
  const q = `indications_and_usage:${RESP_LABEL}+AND+effective_time:[${yyyymmdd(r.from)}+TO+${yyyymmdd(r.to)}]`;
  let j;
  try { j = await getJSON(`https://api.fda.gov/drug/label.json?search=${encodeURI(q)}&limit=${Math.min(max, 50)}&sort=effective_time:desc`); }
  catch (e) { if (/ 404$/.test(e.message)) return []; throw e; }
  return (j.results || []).map((x) => ({
    brand: (x.openfda?.brand_name || [])[0] || '', generic: (x.openfda?.generic_name || [])[0] || '', manufacturer: (x.openfda?.manufacturer_name || [])[0] || '',
    date: x.effective_time ? `${x.effective_time.slice(0, 4)}-${x.effective_time.slice(4, 6)}-${x.effective_time.slice(6, 8)}` : '',
    indication: clean((x.indications_and_usage || [])[0]).slice(0, 400), setid: x.set_id,
    url: x.set_id ? `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${x.set_id}` : '', src: 'openfda'
  }));
}
export async function fdaRecalls({ days = 60, from, to, max = 20 } = {}) {
  const r = dayRange(days, from, to);
  const q = `product_description:(inhaler+OR+inhalation+OR+nebulizer+OR+nebulization+OR+respiratory)+AND+report_date:[${yyyymmdd(r.from)}+TO+${yyyymmdd(r.to)}]`;
  let j;
  try { j = await getJSON(`https://api.fda.gov/drug/enforcement.json?search=${q}&limit=${Math.min(max, 50)}&sort=report_date:desc`); }
  catch (e) { if (/ 404$/.test(e.message)) return []; throw e; }
  return (j.results || []).map((x) => ({
    product: clean(x.product_description).slice(0, 220), reason: clean(x.reason_for_recall).slice(0, 300), classification: x.classification,
    firm: x.recalling_firm, date: x.report_date ? `${x.report_date.slice(0, 4)}-${x.report_date.slice(4, 6)}-${x.report_date.slice(6, 8)}` : '',
    status: x.status, id: x.recall_number, url: 'https://www.accessdata.fda.gov/scripts/ires/index.cfm', src: 'openfda'
  }));
}

// ---------- Google Books (edition and ISBN verification) ----------
export async function books(q, { max = 20, newest = true } = {}) {
  const p = new URLSearchParams({ q, maxResults: String(Math.min(max, 40)), printType: 'books', langRestrict: 'en' });
  if (newest) p.set('orderBy', 'newest');
  if (process.env.GOOGLE_BOOKS_KEY) p.set('key', process.env.GOOGLE_BOOKS_KEY);
  let j;
  try { j = await getJSON(`https://www.googleapis.com/books/v1/volumes?${p}`); }
  catch (e) { return openLibrary(q, { max, newest, why: e.message }); }
  return (j.items || []).map((b) => {
    const v = b.volumeInfo || {};
    const isbn = (v.industryIdentifiers || []).reduce((o, i) => ({ ...o, [i.type]: i.identifier }), {});
    return {
      id: b.id, title: clean(v.title + (v.subtitle ? ': ' + v.subtitle : '')), authors: v.authors || [], publisher: v.publisher || '',
      date: v.publishedDate || '', isbn13: isbn.ISBN_13 || '', isbn10: isbn.ISBN_10 || '', pages: v.pageCount || null,
      categories: v.categories || [], description: clean(v.description).slice(0, 700), preview: v.previewLink || '', info: v.infoLink || '',
      thumbnail: (v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail)) || '', src: 'googlebooks'
    };
  });
}
// Fallback when Google Books is rate-limited: Open Library (Internet Archive) search API.
export async function openLibrary(q, { max = 20, newest = true } = {}) {
  const term = q.replace(/intitle:/g, '');
  const p = new URLSearchParams({ q: term, limit: String(Math.min(max, 40)), fields: 'key,title,subtitle,author_name,publisher,first_publish_year,publish_date,isbn,number_of_pages_median,subject,cover_i,edition_count', lang: 'eng' });
  if (newest) p.set('sort', 'new');
  const j = await getJSON(`https://openlibrary.org/search.json?${p}`, { timeout: 20000 });
  return (j.docs || []).map((d) => {
    const dates = (d.publish_date || []).map((x) => (/(\d{4})/.exec(x) || [])[1]).filter(Boolean).sort();
    const isbn13 = (d.isbn || []).find((x) => x.length === 13) || '';
    return {
      id: 'ol' + String(d.key).replace(/\W/g, ''), title: clean(d.title + (d.subtitle ? ': ' + d.subtitle : '')), authors: (d.author_name || []).slice(0, 4),
      publisher: (d.publisher || [])[0] || '', publishers: (d.publisher || []).slice(0, 6), date: dates[dates.length - 1] || String(d.first_publish_year || ''),
      isbn13, isbn10: (d.isbn || []).find((x) => x.length === 10) || '', pages: d.number_of_pages_median || null, categories: (d.subject || []).slice(0, 3),
      description: d.edition_count ? `${d.edition_count} edition(s) recorded in Open Library` : '', preview: '', info: 'https://openlibrary.org' + d.key,
      thumbnail: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '', src: 'openlibrary'
    };
  });
}
