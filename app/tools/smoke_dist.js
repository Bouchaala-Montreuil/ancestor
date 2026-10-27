/* Smoke-test the shipped single-file bundle. */
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../dist/ancestor.html','utf8');
const vc=new VirtualConsole(); vc.on('jsdomError',e=>console.log('ERR',e.message.slice(0,140)));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x/',virtualConsole:vc});
const w=dom.window; w.scrollTo=()=>{}; w.confirm=()=>true;
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
setTimeout(()=>{
  const d=w.document, sb=()=>d.querySelector('#screenBody');
  console.log('  boot               :', sb().innerHTML.length,'chars');
  w.setConsent(); w.setP('experience','i'); w.setP('goal','h'); w.onbNext();
  w.setP('equipment','gym'); w.onbNext(); w.onbNext(); w.setP('shiftType','night'); w.onbNext();
  w.onbNext(); w.setP('style','std');
  {const b=d.querySelectorAll('#screenBody button.btn'); click(b[b.length-1]);}
  w.onbNext(); w.finishOnboarding();
  console.log('  plan sessions      :', w.getState().plan.sessions.length);
  w.go('body');
  click(d.querySelector('.seg-hit[data-m="chest"]'));
  console.log('  anatomy select     :', w.ANC.bodySel, '/ panel:', (d.querySelector('.panel .sub')||{}).textContent);
  w.go('session'); w.startSession();
  const c=d.querySelectorAll('.setcard');
  const inp=c[0].querySelectorAll('input');
  inp[0].value='50'; inp[0].dispatchEvent(new w.Event('input'));
  inp[1].value='9';  inp[1].dispatchEvent(new w.Event('input'));
  w.logSet(0);
  console.log('  rest timer         :', !!d.querySelector('#restHost .restbar'));
  w.stopRest(); w.finishSession();
  console.log('  session saved      :', w.getState().sessions.length===1);
  w.go('progress');
  console.log('  charts / tables    :', d.querySelectorAll('.chart').length,'/',d.querySelectorAll('table.data').length);
  w.go('profile');
  console.log('  language rows      :', Array.from(d.querySelectorAll('#screenBody .tile')).filter(b=>(b.getAttribute('onclick')||'').includes('switchLang')).length);
  console.log('\n  BUNDLE OK');
},400);
