/* Boot the app with a realistic profile + history and dump each screen's
   rendered markup. Design reference only — not part of the test suite.
   Usage: node tools/dump_screens.js /tmp/screens                            */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const OUT = process.argv[2] || '/tmp/screens';
fs.mkdirSync(OUT, { recursive: true });

const vc = new VirtualConsole();
vc.on('jsdomError', e => console.error('[jsdomError]', e.message.slice(0, 200)));

const SEED = `
(() => {
  const s = getState();
  s.onboarded = true; s.consented = true;
  Object.assign(s.profile, {
    name:'Yanis', experience:'i', goal:'h', goals:['h'], equipment:'gym',
    shiftType:'night', sleepHours:5.5, sleepVariability:2, usualWake:7,
    style:'hit', daysPerWeek:3, sessionMinutes:50, unit:'kg', bodyweight:112,
    limits:[]
  });
  s.plan = buildPlan(s.profile);
  const DAY = 864e5;
  const now = Date.now();
  function mk(daysAgo, si, mult){
    const sn = s.plan.sessions[si];
    return {
      id:'seed'+daysAgo+si, date: now - daysAgo*DAY + 20*3600e3,
      startedAt: now - daysAgo*DAY, planSessionId: sn.id, name: sn.name,
      focus: sn.focus,
      exercises: sn.exercises.map((e,ei) => ({
        id: e.id,
        sets: Array.from({length: e.sets}, (_,k) => ({
          w: Math.round((40 + ei*7 + k*3) * mult), r: Math.max(5, (e.reps[1]||10) - k), rir: k===0?1:0,
          warmup:false, skipped:false, committed:true, t:null, d:null, a:null
        }))
      }))
    };
  }
  [[9,0,1],[7,1,1.02],[5,2,1.04],[2,0,1.06]].forEach(a => s.sessions.push(mk(a[0], a[1], a[2])));
  s.sleep = [6.5,4,5,7,5.5,4.5,6].map((h,i) => ({ id:'sl'+i, date: now - i*DAY, hours:h }));
  s.shifts = [0,1,2,4].map(i => ({ id:'sh'+i, date: now - i*DAY, type:'night', start:19, end:7 }));
  s.bodyweights = [[14,113.4],[7,112.8],[0,112.1]].map(([d,w]) => ({ id:'bw'+d, date: now-d*DAY, w }));
  s.feelings = [{ id:'f1', date: now-2*DAY, soreness:2, motivation:4, joint:1 }];
  saveState();
})();
`;

const NAV = ['home', 'session', 'body', 'progress', 'profile', 'science'];

JSDOM.fromURL(process.env.APP_URL || 'http://127.0.0.1:8100/index.html', {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc
}).then(async dom => {
  const { window } = dom;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(1200);
  const doc = window.document;
  const sc = doc.createElement('script');
  sc.textContent = SEED;
  doc.body.appendChild(sc);
  fs.writeFileSync(path.join(OUT, '_shell.html'), doc.documentElement.outerHTML);

  for (const id of NAV) {
    const g = doc.createElement('script');
    g.textContent = `try{ go('${id}') }catch(e){ console.log('ERR '+e.stack) }`;
    doc.body.appendChild(g);
    await wait(600);
    const body = doc.getElementById('screenBody');
    fs.writeFileSync(path.join(OUT, id + '.html'), body.innerHTML);
    console.log(id, body.innerHTML.length);
  }
  fs.writeFileSync(path.join(OUT, 'nav.txt'), doc.getElementById('nav').outerHTML);
  window.close();
}).catch(e => { console.error(e); process.exit(1); });
