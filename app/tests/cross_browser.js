/* Playwright browser-engine smoke journeys against the HTTP PWA and actual
   standalone file. Run with ANCESTOR_BROWSER=chromium|firefox|webkit. This is
   headless engine coverage, NOT Safari, device or assistive-technology testing.
   Fixture data lives only in a disposable browser context. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const {pathToFileURL} = require('url');
const playwright = require('playwright-core');
const ROOT = path.resolve(__dirname,'..');
const engine = process.env.ANCESTOR_BROWSER || 'chromium';
if(!['chromium','firefox','webkit'].includes(engine)) throw new Error('Unknown ANCESTOR_BROWSER: ' + engine);
let passed=0, failed=0;
function check(name,ok,detail){
  if(ok){passed++;console.log('  PASS  '+name);}
  else {failed++;console.error('  FAIL  '+name+(detail?' — '+detail:''));}
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.json':'application/json',
  '.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg',
  '.svg':'image/svg+xml','.glb':'model/gltf-binary'};
function server(){
  const srv=http.createServer((req,res)=>{
    let name;
    try { name=decodeURIComponent((req.url||'/').split('?')[0]); } catch(_e){res.writeHead(400);res.end();return;}
    const file=path.resolve(ROOT,name==='/'?'index.html':'.'+name);
    if((file!==ROOT&&!file.startsWith(ROOT+path.sep))||!fs.existsSync(file)||fs.statSync(file).isDirectory()){
      res.writeHead(404);res.end('not found');return;
    }
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve=>srv.listen(0,'127.0.0.1',()=>resolve(srv)));
}
async function click(page,selector){
  const el=page.locator(selector).first();
  await el.waitFor({state:'visible'});
  await el.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest'}));
  await el.click();
}
async function ready(page){await page.waitForFunction(()=>!document.getElementById('appBoot'),null,{timeout:30000});}
async function opened(page,selector){
  const details=page.locator(selector);
  if(!(await details.evaluate(el=>el.open))) await click(page,selector+' > summary');
}
async function firstRun(page){
  await click(page,'[data-act="pickLang"][data-a1="en"]');
  await click(page,'[data-act="chooseCurrentLang"]');
  const visited=[await page.evaluate(()=>ONB_STEPS[onbIdx])];
  await click(page,'[data-act="setConsent"]');
  for(let n=0;n<20;n++){
    const step=await page.evaluate(()=>ONB_STEPS[onbIdx]);
    visited.push(step);
    if(step==='exp'){
      await click(page,'[data-act="setP"][data-a1="experience"][data-a2="i"]');
      await click(page,'[data-act="setP"][data-a1="goal"][data-a2="h"]');
    }
    if(step==='equip') await click(page,'[data-act="setP"][data-a1="equipment"][data-a2="gym"]');
    if(step==='ready') {await click(page,'[data-act="finishOnboarding"]');break;}
    await click(page,'[data-act="onbNext"]');
  }
  check('first launch completes through the real onboarding controls',
    visited.length===await page.evaluate(()=>ONB_STEPS.length) && visited[visited.length-1]==='ready' &&
    await page.evaluate(()=>getState().onboarded && getState().plan.sessions.length>0),visited.join(' → '));
}
async function runTarget(browser,target,label,tmp){
  const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});
  const page=await ctx.newPage(), errors=[], dialogs=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',async d=>{dialogs.push(d.type()+': '+d.message());await d.dismiss();});
  try{
    console.log('\n'+engine+' / '+label+' / '+target);
    await page.goto(target,{waitUntil:'load',timeout:45000}); await ready(page);
    await firstRun(page);
    check('the five primary navigation buttons are present',await page.locator('#nav [data-nav]').count()===5);

    // The sleep sheet is entered, traversed and closed with a real keyboard.
    await opened(page,'details[data-remember="home-week"]');
    await click(page,'[data-remember="home-week"] [data-act="openSheet"][data-a1="sleep"]');
    await page.waitForSelector('#sheetHost [role="dialog"]');
    let state=await page.evaluate(()=>({dialog:!!document.querySelector('#sheetHost [role="dialog"]'),
      focus:!!document.activeElement?.closest('#sheetHost [role="dialog"]')}));
    check('sleep dialog opens with focus inside',state.dialog&&state.focus,JSON.stringify(state));
    await page.keyboard.press('Shift+Tab');
    state=await page.evaluate(()=>({focus:!!document.activeElement?.closest('#sheetHost [role="dialog"]')}));
    check('reverse Tab remains inside the dialog',state.focus,JSON.stringify(state));
    await page.keyboard.press('Escape');
    state=await page.evaluate(()=>({closed:!document.querySelector('#sheetHost [role="dialog"]'),
      focus:document.activeElement?.getAttribute('data-act'),arg:document.activeElement?.getAttribute('data-a1')}));
    check('Escape closes the dialog and restores its opener',state.closed&&state.focus==='openSheet'&&state.arg==='sleep',JSON.stringify(state));

    await click(page,'#nav [data-nav="profile"]');
    await opened(page,'details[data-remember="profile-access"]');
    await click(page,'[data-act="setDisplay"][data-a1="theme"]');
    check('paper theme is selected through its actual switch',await page.evaluate(()=>document.documentElement.dataset.theme==='paper'));
    await opened(page,'details[data-remember="profile-access"]');
    await click(page,'[data-act="switchLang"][data-a1="ar"]');
    check('Arabic changes the language and direction to RTL',await page.evaluate(()=>document.documentElement.lang==='ar'&&document.documentElement.dir==='rtl'));

    // Assert the real route, not merely that a fallback Home rendered.
    const markers={home:'.masthead-today',session:'.masthead-train',library:'.masthead-library',
      progress:'.masthead-progress',profile:'.masthead-profile'};
    for(const width of [320,390,768,1280]){
      await page.setViewportSize({width,height:844});
      for(const [name,marker] of Object.entries(markers)){
        await page.evaluate(()=>document.activeElement?.blur());
        await click(page,'#nav [data-nav="'+name+'"]');
        await page.waitForSelector(marker,{timeout:10000});
        const geom=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,
          dir:document.documentElement.dir,theme:document.documentElement.dataset.theme}));
        check('RTL paper '+name+' fits at '+width+' CSS px',geom.scroll<=geom.inner+1&&geom.dir==='rtl'&&geom.theme==='paper',JSON.stringify(geom));
      }
    }
    await page.setViewportSize({width:390,height:844});
    await click(page,'#nav [data-nav="profile"]');
    await opened(page,'details[data-remember="profile-access"]');
    await click(page,'[data-act="switchLang"][data-a1="en"]');
    check('returning to English restores LTR',await page.evaluate(()=>document.documentElement.lang==='en'&&document.documentElement.dir==='ltr'));

    // A deterministic, clearly labelled fixture makes the same exercise
    // available across engines; logging still uses the actual UI controls.
    await page.evaluate(()=>{getState().plan={mode:'std',split:1,restSec:120,builtAt:Date.now(),sessions:[
      {id:'A',name:'Browser fixture',focus:['chest'],exercises:[{id:'bb-bench',sets:1,reps:[6,10],rir:2}]}]};saveState();});
    await click(page,'#nav [data-nav="session"]');
    await click(page,'[data-act="startSession"][data-a1="A"]');
    await page.locator('#sf_0_0_load').fill('60');
    await page.locator('#sf_0_0_reps').fill('8');
    await click(page,'#logbtn_0_0');
    state=await page.evaluate(()=>({active:!!ACTIVE,committed:ACTIVE?.exercises[0]?.sets[0]?.committed,
      draft:!!localStorage.getItem(DRAFT_KEY),rest:!!REST}));
    check('the workout records a set, starts rest and saves a draft',state.active&&state.committed&&state.draft&&state.rest,JSON.stringify(state));
    await page.reload({waitUntil:'load'});await ready(page);
    state=await page.evaluate(()=>({active:!!ACTIVE,set:ACTIVE?.exercises[0]?.sets[0]}));
    check('reloading recovers the active workout and its entered values',state.active&&state.set?.committed&&
      +state.set.w===60&&+state.set.r===8,JSON.stringify(state));
    await click(page,'#nav [data-nav="session"]');
    await click(page,'[data-act="finishSession"]');
    await page.waitForSelector('#doneOverlay[role="dialog"]');
    state=await page.evaluate(()=>({count:getState().sessions.length,set:getState().sessions[0]?.exercises[0]?.sets[0],active:!!ACTIVE}));
    check('finishing persists exactly one completed set',state.count===1&&!state.active&&+state.set?.w===60&&+state.set?.r===8,JSON.stringify(state));
    await page.keyboard.press('Escape');

    await click(page,'#nav [data-nav="profile"]');
    await opened(page,'details[data-remember="profile-data"]');
    const downloadPromise=page.waitForEvent('download',{timeout:15000});
    await click(page,'[data-act="doExport"]');
    const download=await downloadPromise;
    const file=path.join(tmp,label+'-'+engine+'.json');
    await download.saveAs(file);
    const exported=JSON.parse(fs.readFileSync(file,'utf8'));
    check('export initiates a real JSON download containing the completed session',
      exported.sessions?.length===1&&+exported.sessions[0]?.exercises[0]?.sets[0]?.w===60);
    await opened(page,'details[data-remember="profile-data"]');
    const before=await page.evaluate(()=>localStorage.getItem(STORE_KEY));
    const chooserPromise=page.waitForEvent('filechooser',{timeout:15000});
    await click(page,'[data-act="doImport"]');
    const chooser=await chooserPromise;
    await chooser.setFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('[]')});
    await page.waitForFunction(()=>document.getElementById('toast')?.textContent.includes(t('data.importInvalid')),null,{timeout:15000});
    check('invalid import is rejected without replacing the saved record',
      await page.evaluate(before=>localStorage.getItem(STORE_KEY)===before,before));

    if(label==='pwa'){
      await page.waitForFunction(async()=>{
        if(!('serviceWorker' in navigator)) return false;
        await navigator.serviceWorker.ready;
        const cache=await caches.open('ancestor-'+APP_BUILD);
        return !!(await cache.match('./index.html'))&&!!(await cache.match('./js/ui/workout.js'));
      },null,{timeout:45000});
      await page.reload({waitUntil:'load'});await ready(page);
      await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:30000});
    }
    await ctx.setOffline(true);
    await page.reload({waitUntil:'load',timeout:45000});await ready(page);
    state=await page.evaluate(()=>({sessions:getState().sessions.length,stored:!!localStorage.getItem(STORE_KEY),
      onboarded:getState().onboarded,build:APP_BUILD}));
    check(label==='pwa'?'service-worker PWA reloads offline with the saved log':'standalone file reloads offline with the saved log',
      state.sessions===1&&state.stored&&state.onboarded,JSON.stringify(state));
    await ctx.setOffline(false);
    check('no unexpected native confirmation dialogs',dialogs.length===0,dialogs.join('; '));
    check('no uncaught browser errors',errors.length===0,errors.join('; '));
  } finally {await ctx.close();}
}
(async()=>{
  const srv=await server(), tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ancestor-cross-'));
  const opts={headless:true};
  if(engine==='chromium' && process.env.PUPPETEER_EXECUTABLE_PATH){
    opts.executablePath=process.env.PUPPETEER_EXECUTABLE_PATH;
    opts.args=['--no-sandbox','--disable-setuid-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
  }
  let browser;
  try{
    browser=await playwright[engine].launch(opts);
    console.log('Playwright '+require('playwright-core/package.json').version+'; '+engine+' '+browser.version());
    await runTarget(browser,'http://127.0.0.1:'+srv.address().port+'/index.html','pwa',tmp);
    await runTarget(browser,pathToFileURL(path.join(ROOT,'release/ancestor.html')).href,'standalone',tmp);
  } finally {if(browser) await browser.close();await new Promise(r=>srv.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
  console.log('\n'+passed+' passed, '+failed+' failed ('+engine+').');
  if(failed) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
