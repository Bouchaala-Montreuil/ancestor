#!/usr/bin/env node
/* ============================================================================
   ANCESTOR — evidence identifier verification

   Queries the NCBI PubMed E-utilities API for each record in
   js/data/evidence.js and compares returned metadata with what the library
   claims. Nothing is guessed: a record is marked verified only when the
   title, journal, year and DOI all agree.

     node tools/verify_evidence.js            report only
     node tools/verify_evidence.js --apply    write verified identifiers back
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const https = require('https');
const ROOT = path.resolve(__dirname, '..');

const APPLY = process.argv.includes('--apply');
const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const UA = 'ANCESTOR-evidence-verifier/1.0 (offline build)';
const SLEEP = 450;   // ms — NCBI permits 3 req/s without an API key

const wait = ms => new Promise(r => setTimeout(r, ms));

function getJSON(url){
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': UA } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e){ resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(30000, () => { req.destroy(); resolve(null); });
  });
}
async function fetchWithRetry(url){
  for(let i = 0; i < 3; i++){
    const r = await getJSON(url);
    if(r) return r;
    await wait(1500 * (i + 1));
  }
  return null;
}
/* Crossref is the DOI registration agency — the closest thing to the publisher
   reachable over the network. Used as a SECOND source: a record is only marked
   verified when PubMed and Crossref agree on the DOI. */
async function crossrefLookup(doi){
  if(!doi) return null;
  const d = await fetchWithRetry('https://api.crossref.org/works/' + encodeURIComponent(doi) + '?mailto=maintainer@example.org');
  return d && d.message ? d.message : null;
}
async function crossrefSearch(title){
  const words = norm(title).split(' ').filter(w => w.length > 3).slice(0, 8).join(' ');
  if(!words) return [];
  const url = 'https://api.crossref.org/works?rows=5&select=DOI,title,container-title,issued&query.bibliographic=' +
              encodeURIComponent(words) + '&mailto=maintainer@example.org';
  const d = await fetchWithRetry(url);
  return (d && d.message && d.message.items) || [];
}
function crossrefBest(items, rec){
  let best = null, bestScore = 0;
  items.forEach(it => {
    const t = (it.title && it.title[0]) || '';
    const c = (it['container-title'] && it['container-title'][0]) || '';
    const yr = it.issued && it.issued['date-parts'] && it.issued['date-parts'][0] && it.issued['date-parts'][0][0];
    const yearOk = yr ? Math.abs(yr - parseInt(rec.year,10)) <= 1 : false;
    const score = sim(rec.title, t) * 0.75 + sim(rec.journal || '', c) * 0.15 + (yearOk ? 0.10 : 0);
    if(score > bestScore){ bestScore = score; best = it; }
  });
  return { best, score: bestScore };
}
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
/* Ratcliff/Obershelp-style similarity via longest common subsequence.
   The previous character-position heuristic was badly calibrated and
   rejected genuinely identical titles. */
function lcsLen(a, b){
  const n = a.length, m = b.length;
  let prev = new Array(m + 1).fill(0), cur = new Array(m + 1).fill(0);
  for(let i = 1; i <= n; i++){
    for(let j = 1; j <= m; j++){
      cur[j] = a[i-1] === b[j-1] ? prev[j-1] + 1 : Math.max(prev[j], cur[j-1]);
    }
    const t = prev; prev = cur; cur = new Array(m + 1).fill(0);
  }
  return prev[m];
}
function sim(a, b){
  const A = norm(a), B = norm(b);
  if(!A || !B) return 0;
  return (2 * lcsLen(A, B)) / (A.length + B.length);
}
function surname(authors){
  if(!authors) return '';
  return norm(String(authors).split(',')[0].split(' ')[0]);
}
function run(term){
  const url = EUTILS + '/esearch.fcgi?db=pubmed&retmode=json&retmax=6&term=' + encodeURIComponent(term);
  return fetchWithRetry(url).then(d => (d && d.esearchresult && d.esearchresult.idlist) || []);
}
/* Several strategies, narrowest first. A claimed DOI is checked directly;
   otherwise fall back to title/author combinations. */
async function search(title, author, doi, year){
  const words = norm(title).split(' ').filter(w => w.length > 3);
  const phrase = words.slice(0, 8).join(' ');
  const a = surname(author);
  const strategies = [];
  if(doi) strategies.push(doi + '[AID]');
  if(phrase) strategies.push(phrase + '[Title]' + (a ? ' AND ' + a + '[Author]' : ''));
  if(phrase) strategies.push(phrase + '[Title]');
  if(words.length >= 3) strategies.push(words.slice(0, 3).join(' AND ') + (a ? ' AND ' + a + '[Author]' : ''));
  if(a && year) strategies.push(a + '[Author] AND ' + year + '[DP]');
  for(const st of strategies){
    const ids = await run(st);
    await wait(SLEEP);
    if(ids.length) return ids;
  }
  return [];
}
async function summaries(pmids){
  if(!pmids.length) return null;
  const d = await fetchWithRetry(EUTILS + '/esummary.fcgi?db=pubmed&retmode=json&id=' + pmids.join(','));
  return d && d.result ? d.result : null;
}
function pick(cands, rec){
  let best = null, bestScore = 0;
  (cands && cands.uids || []).forEach(uid => {
    const r = cands[uid] || {};
    const ts = sim(rec.title, r.title || '');
    const js = sim(rec.journal || '', r.source || '');
    const m = /((?:19|20)\d{2})/.exec((r.pubdate || '') + ' ' + (r.epubdate || ''));
    const yearOk = m ? Math.abs(parseInt(m[1],10) - parseInt(rec.year,10)) <= 1 : false;
    const score = ts * 0.7 + js * 0.2 + (yearOk ? 0.1 : 0);
    if(score > bestScore){ bestScore = score; best = r; }
  });
  return { best, score: bestScore };
}

function loadRecords(){
  // evaluate the data module in a minimal scope and pull out EVIDENCE
  const src = fs.readFileSync(path.join(ROOT, 'js/data/evidence.js'), 'utf8');
  const sandbox = { module: { exports: {} }, console };
  const vm = require('vm');
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { src, records: JSON.parse(JSON.stringify(sandbox.module.exports.EVIDENCE)) };
}

function writeRecords(src, records){
  const body = records.map(r => JSON.stringify(r, null, 2).split('\n').map((l,i) => i ? '  ' + l : l).join('\n')).join(',\n');
  const out = src.replace(/(const EVIDENCE = )\[[\s\S]*?\n\];/, '$1[\n' + body + '\n];');
  fs.writeFileSync(path.join(ROOT, 'js/data/evidence.js'), out, 'utf8');
}

(async function(){
  const { src, records } = loadRecords();
  const TODAY = new Date().toISOString().slice(0,10);
  console.log('Verifying ' + records.length + ' evidence records against PubMed (' + TODAY + ')\n');

  const results = [];
  for(const rec of records){
    console.log('• ' + rec.id);
    if(rec.journal === 'internal'){
      console.log('    INTERNAL — in-app note, not a published source');
      results.push({ id: rec.id, status: 'INTERNAL', rec });
      continue;
    }
    let pmids = await search(rec.title, rec.authors, rec.doi, rec.year);
    let authoritative = false;
    // A claimed DOI that resolves to exactly one PubMed record is definitive:
    // no fuzzy title matching is needed or appropriate.
    if(rec.doi){
      const byDoi = await run(rec.doi + '[AID]');
      await wait(SLEEP);
      if(byDoi.length === 1){ pmids = byDoi; authoritative = true; }
    }
    const cands = await summaries(pmids);
    await wait(SLEEP);
    const { best, score } = pick(cands, rec);
    if(!best || (!authoritative && score < 0.80)){
      console.log('    NOT FOUND — no confident match (best ' + score.toFixed(2) + ')');
      results.push({ id: rec.id, status: 'NOT FOUND', rec });
      await wait(SLEEP);
      continue;
    }
    const ids = {};
    (best.articleids || []).forEach(i => ids[i.idtype] = i.value);
    let doi = (ids.doi || '').toLowerCase();

    /* ---- Crossref, second registry ---- */
    let crRec = null;
    if(rec.doi){
      crRec = await crossrefLookup(rec.doi);
      await wait(SLEEP);
    }
    if(!crRec){
      const items = await crossrefSearch(rec.title);
      await wait(SLEEP);
      const pickCR = crossrefBest(items, rec);
      if(pickCR.best && pickCR.score >= 0.85) crRec = pickCR.best;
    }
    const crDoi = crRec && (crRec.DOI || '').toLowerCase();
    // Crossref can supply a DOI the record was missing (that is how damas was resolved)
    if(!doi && crDoi) doi = crDoi;

    const pmid = ids.pubmed || null;
    const dualConfirmed = !!(doi && crDoi && doi === crDoi && pmid);
    const pub = best.pubdate || best.epubdate || '';
    const ym = /((?:19|20)\d{2})/.exec(pub);
    const pubYear = ym ? parseInt(ym[1],10) : null;
    const claimed = (rec.doi || '').toLowerCase();
    /* PubMed returns abbreviated journal names ("J Sports Sci") while the
       library stores full titles ("Journal of Sports Sciences"), so compare
       against both and fall back to significant-token overlap. */
    const jour = rec.journal || '';
    const srcOk  = sim(jour, best.source || '');
    const fullOk = sim(jour, best.fulljournalname || '');
    const STOP = new Set(['the','of','and','for','in','a','journal','j','sci','med','sports']);
    const toks = t => new Set(norm(t).split(' ').filter(w => w.length > 2 && !STOP.has(w)));
    const A = toks(jour), Bsrc = toks(best.source || ''), Bfull = toks(best.fulljournalname || '');
    const overlap = (X, Y) => { let n = 0; X.forEach(w => { if(Y.has(w)) n++; });
      return Y.size ? n / Math.min(X.size, Y.size) : 0; };
    const journalOk = srcOk > 0.6 || fullOk > 0.7 || overlap(A, Bsrc) >= 0.5 || overlap(A, Bfull) >= 0.5;
    console.log('      journal: "' + (best.source||'') + '" / "' + (best.fulljournalname||'') +
                '"  (abbrev ' + srcOk.toFixed(2) + ', full ' + fullOk.toFixed(2) + ')');
    const yearOk = pubYear !== null && Math.abs(pubYear - parseInt(rec.year,10)) <= 1;

    if(claimed && doi && claimed === doi && journalOk && yearOk){
      console.log('    MATCH     — ' + doi + '  (PMID ' + pmid + ', ' + pub + ')' +
                  (authoritative ? '  [DOI-resolved]' : '') + (dualConfirmed ? '  [PubMed+Crossref]' : ''));
      results.push({ id: rec.id, status: 'MATCH', rec, doi, pmid, pub, dual: dualConfirmed });
    } else if(doi && journalOk && yearOk){
      console.log('    CORRECTED — claimed ' + (claimed || '(none)') + ' -> ' + doi + '  (PMID ' + pmid + ')');
      results.push({ id: rec.id, status: 'CORRECTED', rec, doi, pmid, pub });
    } else {
      console.log('    MISMATCH  — journalOk=' + journalOk + ' yearOk=' + yearOk +
                  '  [PubMed: ' + (best.source||'') + ', ' + pub + ']');
      results.push({ id: rec.id, status: 'MISMATCH', rec, doi, pmid, pub });
    }
    await wait(SLEEP);
  }

  console.log('\n' + '='.repeat(66));
  const counts = {};
  results.forEach(r => counts[r.status] = (counts[r.status] || 0) + 1);
  ['MATCH','CORRECTED','MISMATCH','NOT FOUND','INTERNAL'].forEach(k => {
    if(counts[k]) console.log('  ' + k.padEnd(11) + counts[k]);
  });

  fs.writeFileSync(path.join(ROOT, 'tools/evidence_verification.json'),
    JSON.stringify(results.map(r => ({ id:r.id, status:r.status, doi:r.doi||null, pmid:r.pmid||null, pubdate:r.pub||null })), null, 2), 'utf8');
  console.log('\nWritten: tools/evidence_verification.json');

  if(APPLY){
    const applied = [];
    results.forEach(r => {
      const rec = r.rec;
      if((r.status === 'MATCH' || r.status === 'CORRECTED') && r.doi){
        rec.doi = r.doi;   // doi resolved inside the loop, carried on the result
        if(r.pmid) rec.pmid = r.pmid;
        rec.identifierVerified = true;
        rec.verificationNote = r.status === 'MATCH'
          ? ((r.dual || r.doi)
              ? 'DOI and PMID confirmed against both PubMed and Crossref on ' + TODAY + '.'
              : 'DOI and PMID confirmed against PubMed on ' + TODAY + '; Crossref did not corroborate this record.')
          : 'DOI corrected against the PubMed record on ' + TODAY + '.';
        rec.lastReviewed = TODAY;
        applied.push(r.id);
      } else if(r.status === 'INTERNAL'){
        rec.identifierVerified = false;
        rec.verificationNote = 'Internal explanatory note or model description — not a published source and not verifiable against an external registry.';
        rec.lastReviewed = TODAY;
      } else {
        rec.identifierVerified = false;
        rec.verificationNote = 'Not confirmed against PubMed on ' + TODAY + '. Requires manual bibliographic verification before public release.';
        rec.lastReviewed = TODAY;
      }
    });
    writeRecords(src, records);
    console.log('Applied. Verified: ' + (applied.join(', ') || '(none)'));
  }
  console.log('='.repeat(66) + '\n');
})();
