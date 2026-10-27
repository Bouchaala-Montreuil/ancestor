/* ============================================================================
   ANCESTOR — translation leak scan
   Renders every screen in every language with real data and fails if any
   i18n key reaches the screen verbatim. A raw key is not a translation.
   Run: node tools/keyscan.js
   ========================================================================== */
const fs=require('fs'),{JSDOM,VirtualConsole}=require('jsdom');
let html=fs.readFileSync('index.html','utf8');
html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(m,h)=>'<style>'+fs.readFileSync(h,'utf8')+'</style>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(m,src)=>'<script>'+fs.readFileSync(src,'utf8')+'<\/script>');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/',virtualConsole:new VirtualConsole()});
const w=dom.window,d=w.document; w.scrollTo=()=>{}; w.confirm=()=>true; w.boot();
w.setConsent(); w.setP('experience','i'); w.setP('goal','h'); w.onbNext();
w.setP('equipment','gym'); w.onbNext(); w.setP('daysPerWeek',3); w.onbNext();
w.setP('shiftType','night'); w.onbNext(); w.onbNext(); w.setP('style','std');
const b=Array.from(d.querySelectorAll('#screenBody button.btn')); b[b.length-1].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
w.onbNext(); w.finishOnboarding();
const now=Date.now();
const S=o=>Object.assign({w:null,r:null,t:null,d:null,a:null,rir:null},o);
w.addSession({date:now-2*86400000,startedAt:now-2*86400000,planId:'A',name:'Mixed',exercises:[
  {id:'bb-bench',sets:[S({w:60,r:8,rir:2}),S({w:60,r:7,rir:2})]},
  {id:'plank',sets:[S({t:45})]},{id:'pushup',sets:[S({r:18})]},
  {id:'assisted-pullup',sets:[S({a:20,r:8})]},{id:'farmer-carry',sets:[S({d:40})]}]});
w.getState().profile.bodyweight=80; w.getState().profile.limits=['lowerback'];
// every key the app can possibly render, checked for a real translation
const langs=['en','fr','es','de','it','nl','ar'];
const all={};
langs.forEach(l=>{ const T=w.eval('T')[l]||{}; Object.keys(T).forEach(k=>all[k]=1); });
/* Keys that are identical in every language on purpose. A brand name is the
   canonical case: translating it would be a bug, so the scan must not ask for a
   translation it would then complain about. */
const ALLOWED = { 'app.name': 'the wordmark — the same in all seven languages' };
const missing=[];
langs.forEach(l=>{
  const T=w.eval('T')[l]||{}, en=w.eval('T').en||{};
  Object.keys(all).forEach(k=>{
    if(ALLOWED[k]) return;
    if((T[k]===undefined||T[k]==='') && (en[k]===undefined||en[k]==='')) missing.push(l+':'+k);
  });
});
console.log('keys with no translation in ANY language:', missing.length);
if(missing.length) console.log(' ', missing.slice(0,20).join(', '));
// now scan rendered screens for verbatim keys
const RAW_RE = /\b(?:app|nav|btn|home|decision|readiness|state|body|progress|session|profile|you|mg|mst|onb|sleep|shift|feel|chart|tl|about|unc|dlg|err|goal|env|need|a11y|log|hist|pat|equip|lab3d|done|tip|mod|modA|modB|modC|mile|bw|exd|sci|why|ev|sim|lab|les|cat|rule)\.[a-z][A-Za-z0-9_.]*\b/g;
function scanText(lang, txt){
  Object.keys(all).forEach(k=>{ if(txt.indexOf(k)>=0) found[lang+' :: '+k]=1; });
  (txt.match(RAW_RE)||[]).forEach(m=>{ found[lang+' :: '+m]=1; });
}
const found={};
langs.forEach(lang=>{
  w.setLang(lang);
  ['home','session','body','progress','profile','science'].forEach(v=>{
    w.go(v); if(v==='session') w.startSession();
    /* Body is scanned *before* a muscle is chosen as well as after: the
       unselected screen is the one with the empty state in it, and that is
       where a key passed as a data argument rather than to t() can reach the
       screen — which is exactly how 'body.selectBody' rendered raw in all seven
       languages without this scan noticing. */
    if(v==='body'){
      scanText(lang, d.querySelector('#screenBody').textContent);
      w.selectMuscle('chest');
    }
    if(v==='progress') w.openSessionEditor(w.getState().sessions[0].id,0);
    const txt=d.querySelector('#screenBody').textContent + ' ' +
              (d.querySelector('#sheetHost') ? d.querySelector('#sheetHost').textContent : '');
    scanText(lang, txt);
  });
  w.openExerciseLibrary(); scanText(lang, d.querySelector('#screenBody').textContent);
  w.openExerciseDetail('bb-bench');
  {
    const stxt = d.querySelector('#sheetHost') ? d.querySelector('#sheetHost').textContent : '';
    scanText(lang, stxt);
  }
  w.closeSheet && w.closeSheet();
  ['muscle-growth','energy-balance','adaptation-recovery'].forEach(mid=>{
    w.openModule(mid);
    for(let si=0;si<5;si++){
      w.setModStep(si);
      const mtxt = d.querySelector('#screenBody').textContent;
      scanText(lang, mtxt);
    }
  });
});
/* Static pass. The rendered scan only sees the states this script visits; a key
   handed to t() with a literal name but defined nowhere is invisible to it until
   someone opens that one screen. It found 'body.selectBody' rendering raw in all
   seven languages, because the Body screen was only ever scanned with a muscle
   already selected. Keys built by concatenation end in '.', and prog.full has a
   deliberate English fallback. */
const usedKeys = {};
fs.readdirSync('js/ui').map(x => 'js/ui/' + x).concat(['js/app.js']).forEach(f => {
  const src = fs.readFileSync(f, 'utf8');
  const re = /\bt\(\s*'([A-Za-z0-9_.]+)'\s*([+),])/g; let m;
  while((m = re.exec(src))){
    /* a literal followed by '+' is a prefix ('about.p' + i), not a key */
    if(m[2] === '+') continue;
    usedKeys[m[1]] = f;
  }
});
const dictSrc = fs.readdirSync('js/i18n').map(f => fs.readFileSync('js/i18n/' + f, 'utf8')).join('\n');
const OPTIONAL = { 'prog.full': 'falls back to English when a language has no term' };
const undef = Object.keys(usedKeys).filter(k => {
  if(OPTIONAL[k]) return false;
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return !new RegExp('["\']' + esc + '["\']\\s*:').test(dictSrc);
});
undef.forEach(k => { found['undefined :: ' + k] = 1; });

const f=Object.keys(found);
const ok = f.length === 0 && missing.length === 0;
console.log('\n' + '='.repeat(64));
if(ok) console.log('\x1b[32m\x1b[1m  NO TRANSLATION LEAKS — ' + Object.keys(all).length +
                   ' keys, ' + langs.length + ' languages, 6 screens\x1b[0m');
else {
  console.log('\x1b[31m\x1b[1m  TRANSLATION LEAKS FOUND\x1b[0m');
  if(missing.length) console.log('  untranslatable keys: ' + missing.join(', '));
  if(f.length) console.log('  rendered verbatim: ' + f.join(', '));
}
console.log('='.repeat(64) + '\n');
process.exit(ok ? 0 : 1);
