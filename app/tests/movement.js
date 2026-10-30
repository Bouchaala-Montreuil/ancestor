/* Exercise instruction integrity: real library IDs, all locales, apparatus,
   asymmetric and static movements, and both places the shared guide is used. */
const fs=require('fs'), path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_,src)=>'<style>'+fs.readFileSync(path.join(ROOT,src),'utf8')+'</style>');
html=html.replace(/<script src="([^"]+)"><\/script>/g, (_,src)=>'<script>'+fs.readFileSync(path.join(ROOT,src),'utf8')+'<\/script>');
const vc=new VirtualConsole(); vc.on('jsdomError',()=>{});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://localhost/',virtualConsole:vc});
const w=dom.window, d=w.document; w.scrollTo=()=>{}; w.confirm=()=>true;
let pass=0, fail=0; const failures=[];
function check(name,ok,detail){
  if(ok){pass++;console.log('  PASS  '+name);}
  else {fail++;failures.push(name);console.error('  FAIL  '+name+(detail?' — '+detail:''));}
}
const ids=w.eval('Object.keys(EX_BY_ID)'), exercises=w.eval('EX_BY_ID');
const guides=w.eval('MOVEMENT_GUIDES'), scenes=w.eval('MOVEMENT_SCENES'), poses=w.eval('MOVEMENT_POSES');
const translations=w.eval('T');
const langs=['en','fr','es','de','it','nl','ar'];
const holds=['dead-hang','plank','side-plank','hollow-hold','wall-sit','balance-stand'];
check('the guide map covers every library ID exactly once',
  ids.length===88 && Object.keys(guides).length===ids.length && ids.every(id=>guides[id]) &&
  Object.keys(guides).every(id=>exercises[id]));
check('each scene and both endpoints exist; holds intentionally have one endpoint',ids.every(id=>{
  const g=guides[id], s=scenes[g[0]], hold=g[3]==='hold';
  return !!s && !!poses[s[0]] && (hold ? s[1]===null : !!poses[s[1]]) && holds.includes(id)===hold;
}));
check('the complete instructions for every family exist in every language',langs.every(lang=>
  ids.every(id=>typeof translations[lang]['movement.guide.'+guides[id][2]]==='string' &&
    translations[lang]['movement.guide.'+guides[id][2]].trim().length>20 &&
    typeof translations[lang]['cue.'+id]==='string' && translations[lang]['cue.'+id].trim().length>10)));
check('all UI labels, view notes, playback and control variants are localized',langs.every(lang=>
  ['title','start','end','hold','strideA','strideB','play','pause','resume','replay','tip','controlLabel',
   'control','controlHold','controlStride','viewAbove'].every(k=>translations[lang]['movement.'+k])));
check('the muscle action adjacent to each guide is localized too',langs.every(lang=>
  ids.every(id=>!!translations[lang]['anatomy.action.'+exercises[id].m[0][0]])));

// Validate every pose and every translated rendering; don't permit English
// fallback, empty graphics, raw keys, false animation for holds or missing text.
for(const id of ids){
  const ex=exercises[id], g=guides[id], hold=g[3]==='hold'; let issue='';
  for(const phase of hold?[0]:[0,1]){
    const p=w.movementPose(id,g,phase);
    if(p.length!==11 || !p.every(q=>q.length===2 && q.every(Number.isFinite) && q[0]>=0 && q[0]<=150 && q[1]>=-10 && q[1]<=145))
      issue='invalid or off-canvas coordinates';
  }
  if(!hold && w.movementStage(g,w.movementPose(id,g,0))===w.movementStage(g,w.movementPose(id,g,1)))
    issue='the two positions are identical';
  for(const lang of langs){
    w.setLang(lang);
    const el=d.createElement('div'); el.innerHTML=w.exerciseMovement(ex);
    const guide=el.querySelector('.movement-guide'), svg=el.querySelector('.movement-figure');
    const text=guide && guide.textContent || '';
    if(!guide || !svg || svg.getAttribute('aria-hidden')!=='true' ||
       svg.querySelectorAll(':scope > g').length!==(hold?1:2) ||
       el.querySelectorAll('.move-copy p').length!==3 ||
       !text.includes(translations[lang]['movement.guide.'+g[2]]) ||
       !text.includes(translations[lang]['cue.'+id]) ||
       !text.includes(translations[lang][hold?'movement.controlHold':g[3]==='stride'?'movement.controlStride':'movement.control']) ||
       !!el.querySelector('.movement-play')===hold || /movement\.guide\.|movement\.control/.test(text)) issue='rendering in '+lang;
  }
  check(id+' has distinct, bounded positions and usable guidance in all seven languages',!issue,issue);
}
for(const lang of langs){
  w.setLang(lang);
  check(lang+' exercise detail names the primary action in the chosen language',
    lang==='en' ? w.groupAnatomicalAction('chest')===w.eval("MESH_GROUP_ACTION['chest|Chest']") :
      w.groupAnatomicalAction('chest')===translations[lang]['anatomy.action.chest']);
}
w.setLang('en');

// These exercise-specific mappings guard the exact bugs the old category art
// concealed, plus equipment, unilateral work, holds and conditioning.
const expected={
  'bb-bench':['bench','bar'], 'db-bench':['bench','dumbbell'], 'machine-press':['chestMachine','machine'],
  'incline-db':['incline','dumbbell'], 'db-fly':['benchFly','dumbbell'], 'cable-fly':['cableFly','cable'],
  'pushup':['pushup',''], 'dip':['dip',''], 'assisted-dip':['dip','assisted'], 'weighted-dip':['dip','added'],
  'lat-pulldown':['pulldown','cable'], 'cg-pulldown':['pulldown','cable'], 'dead-hang':['hang',''],
  'db-row':['supportedRow','dumbbell'], 'chest-supported-row':['supportedMachine','machine'],
  'bb-squat':['squat','shoulderBar'], 'goblet-squat':['squat','goblet'], 'bw-squat':['squat',''],
  'leg-press':['legPress','machine'], 'leg-ext':['legExt','machine'], 'seated-leg-ext':['legExt',''],
  'bulgarian-split':['split','dumbbell'], 'step-up':['stepUp','dumbbell'],
  'deadlift':['deadlift','bar'], 'rdl':['rdl','bar'], 'db-rdl':['rdl','dumbbell'],
  'hip-thrust':['hipThrust','hipBar'], 'glute-bridge':['bridge',''], 'leg-curl':['legCurl','machine'],
  'standing-calf':['calf','machine'], 'bw-calf':['calf','single'], 'seated-calf':['seatedCalf','machine'],
  'cable-curl':['curl','cableLow'], 'band-curl':['curl','bandLow'],
  'tri-pushdown':['pushdown','cableHigh'], 'band-pressdown':['pushdown','bandHigh'],
  'hanging-raise':['hangingRaise',''], 'ab-wheel':['abWheel','wheel'],
  'pike-pushup':['pike',''], 'bench-dip':['benchDip',''],
  'band-row-seated':['chairRow','band'], 'band-press-seated':['chairPress','band'],
  'wall-pushup':['wallPush',''], 'chair-stand':['chairStand',''],
  'dead-bug':['deadBug',''], 'bird-dog':['birdDog',''], 'cat-cow':['catCow',''],
  'sled-push':['sled',''], 'row-erg':['rower',''], 'bike-erg':['bike',''], 'run-interval':['run','']
};
for(const [id,[scene,equipment]] of Object.entries(expected))
  check(id+' selects its actual position and equipment',guides[id][0]===scene && guides[id][1]===equipment);
check('walking lunges use alternating positions and stride guidance',guides.lunge[3]==='stride' && /next step/.test(translations.en['movement.guide.lunge']));
check('single-leg calf raise leaves the non-working foot off the floor',
  [0,1].every(i=>{const p=w.movementPose('bw-calf',guides['bw-calf'],i); return p[10][1]<p[6][1]-5;}));
check('seated marching and extension keep the supporting foot planted',
  ['seated-march','seated-leg-ext'].every(id=>[0,1].every(i=>w.movementPose(id,guides[id],i)[10][1]===139)));
check('bird dog keeps one hand and knee grounded during the reach',(()=>{
  const p=w.movementPose('bird-dog',guides['bird-dog'],1);return p[8][1]>=135 && p[10][1]>=135;
})());
check('heel slides keep the opposite leg still',(()=>{
  const a=w.movementPose('heel-slide',guides['heel-slide'],0),b=w.movementPose('heel-slide',guides['heel-slide'],1);
  return JSON.stringify(a[9])===JSON.stringify(b[9]) && JSON.stringify(a[10])===JSON.stringify(b[10]);
})());
check('wall push-up difficulty cue correctly makes closer feet easier',
  /closer.*easier/i.test(translations.en['cue.wall-pushup']) && !/further back.*easier/i.test(translations.en['cue.wall-pushup']));
check('the future-exercise fallback is text only, never a bench or other invented diagram',
  !/<svg/i.test(w.exerciseMovement({id:'future-exercise'})));

w.chooseLang('en'); w.finishOnboarding();
for(const id of ['bb-bench','leg-press','dead-hang','bird-dog','row-erg','bike-erg']){
  w.openExerciseDetail(id);
  const box=d.querySelector('#sheetHost .movement-guide');
  check('detail opens the correct guide for '+id,box && box.getAttribute('data-exercise')===id &&
    d.querySelectorAll('#sheetHost .movement-anatomy .ex-vis-figs svg').length===2);
  w.closeSheet();
}
w.eval("MECH_EX='leg-press'");
const mech=d.createElement('div'); mech.innerHTML=w.explorerMechanics();
check('the Science mechanics explorer uses the same leg-press guide and does not duplicate its cue',
  !!mech.querySelector('.movement-guide[data-exercise="leg-press"]') &&
  mech.textContent.split(translations.en['cue.leg-press']).length===2);
check('playback is a delegated app action',typeof w.ACTS['movementPlay']==='function');
dom.window.close();
console.log('\n'+pass+' passed, '+fail+' failed');
if(fail){console.error(failures.join('\n'));process.exitCode=1;}
