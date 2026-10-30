/* Real Chromium movement-guide journeys. Set ANCESTOR_TEST_TARGET to test
   the standalone release or HTTP preview as well as the modular file. */
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const puppeteer=require('puppeteer');
const target=process.env.ANCESTOR_TEST_TARGET||path.resolve(__dirname,'../index.html');
const url=/^https?:\/\//.test(target)?target:pathToFileURL(path.resolve(target)).href;
let pass=0,fail=0;const errors=[];
function check(name,ok,detail){if(ok){pass++;console.log('  PASS  '+name);}else{fail++;console.error('  FAIL  '+name+(detail?' — '+detail:''));}}
async function click(page,selector){
  const el=await page.waitForSelector(selector,{visible:true});
  await el.evaluate(node=>Promise.all((node.closest('.sheet')?.getAnimations()||[]).map(a=>a.finished.catch(()=>{}))));
  await el.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest'}));
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await el.click();
}
async function frame(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
(async()=>{
  const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox',
    '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await browser.createBrowserContext(),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.setViewport({width:390,height:844,deviceScaleFactor:1});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
    await page.goto(url,{waitUntil:'load'});
    await page.evaluate(()=>{chooseLang('en');finishOnboarding();});
    await page.waitForFunction(()=>!document.getElementById('appBoot'));

    // Visit through the user's library, not just a helper function.
    await click(page,'#nav [data-nav="library"]');
    await click(page,'.ex-card[data-a1="bb-bench"]');
    check('a library card opens the matching exercise-specific guide',
      await page.evaluate(()=>!!document.querySelector('#sheetHost .movement-guide[data-exercise="bb-bench"]')));
    let state=await page.evaluate(()=>({text:document.querySelector('.move-copy').textContent,
      title:document.querySelector('.move-heading').textContent,
      stages:document.querySelectorAll('.movement-figure > g').length,
      hidden:document.querySelector('.movement-figure').getAttribute('aria-hidden'),
      expanded:document.querySelector('.movement-anatomy').open}));
    check('the guide presents setup, form and controlled return as text, with two decorative positions',
      /bench/i.test(state.text)&&/lower/i.test(state.text)&&/control/i.test(state.text)&&
      state.stages===2&&state.hidden==='true'&&!state.expanded,JSON.stringify(state));
    await click(page,'.movement-anatomy summary');
    state=await page.evaluate(()=>({open:document.querySelector('.movement-anatomy').open,
      views:document.querySelectorAll('.movement-anatomy .ex-vis-figs svg').length,
      text:document.querySelector('.movement-legend').textContent}));
    check('the muscle disclosure retains both views and a text legend',state.open&&state.views===2&&state.text.trim().length>5,JSON.stringify(state));
    await click(page,'.movement-anatomy summary');

    // No spontaneous movement: playing is an explicit choice and the same
    // control pauses, resumes and remains focused throughout.
    const initial=await page.$eval('[data-moving]',el=>el.innerHTML);
    await new Promise(r=>setTimeout(r,300));
    check('positions do not animate before the user requests playback',initial===await page.$eval('[data-moving]',el=>el.innerHTML));
    await click(page,'.movement-play');
    await page.waitForFunction(original=>document.querySelector('[data-moving]').innerHTML!==original,{},initial);
    check('Play actually animates the displayed movement',await page.$eval('.movement-play',b=>b.textContent==='Pause'));
    await click(page,'.movement-play');
    const paused=await page.$eval('[data-moving]',el=>el.innerHTML);
    await new Promise(r=>setTimeout(r,250));
    state=await page.evaluate(()=>({text:document.querySelector('.movement-play').textContent,
      focus:document.activeElement===document.querySelector('.movement-play'),markup:document.querySelector('[data-moving]').innerHTML}));
    check('Pause freezes the pose and keeps keyboard focus on the control',state.text==='Resume'&&state.focus&&state.markup===paused,JSON.stringify({text:state.text,focus:state.focus}));
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.movement-play').textContent==='Replay movement',{timeout:6000});
    state=await page.evaluate(()=>({focus:document.activeElement===document.querySelector('.movement-play'),
      markup:document.querySelector('[data-moving]').innerHTML}));
    check('keyboard Resume finishes one controlled cycle and returns to the starting pose',state.focus&&state.markup===initial);
    await click(page,'.movement-play');
    await click(page,'#sheetHost [data-act="closeSheet"]');
    await new Promise(r=>setTimeout(r,80));
    check('closing a guide during playback safely dismisses the sheet',await page.evaluate(()=>!document.querySelector('#sheetHost .movement-guide')));

    // All real exercise detail sheets, including equipment variants and holds.
    const all=await page.evaluate(()=>{
      const errors=[];
      for(const id of Object.keys(EX_BY_ID)){
        openExerciseDetail(id);
        const g=document.querySelector('#sheetHost .movement-guide'), svg=g&&g.querySelector('.movement-figure');
        const mode=MOVEMENT_GUIDES[id]&&MOVEMENT_GUIDES[id][3],hold=mode==='hold';
        if(!g||g.dataset.exercise!==id||!svg||svg.querySelectorAll(':scope > g').length!==(hold?1:2)||
           g.querySelectorAll('.move-copy p').length!==3||!!g.querySelector('.movement-play')===hold)
          errors.push(id);
      }
      closeSheet();return errors;
    });
    check('all 88 exercise details render the correct positions, text and hold controls',all.length===0,all.join(', '));

    // Every language and both themes at the narrowest supported viewport,
    // covering a free weight, machine, hold, adaptation and endurance movement.
    await page.setViewport({width:320,height:844,deviceScaleFactor:1});
    for(const theme of ['dark','paper']){
      for(const lang of ['en','fr','es','de','it','nl','ar']){
        const report=await page.evaluate(async ({theme,lang})=>{
          setDisplay('theme',theme);switchLang(lang);
          const bad=[];
          for(const id of ['bb-bench','leg-press','wall-sit','bird-dog','bike-erg']){
            openExerciseDetail(id);
            await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
            const box=document.querySelector('.movement-guide'),panel=document.querySelector('.sheet-panel');
            const br=box.getBoundingClientRect(),pr=panel.getBoundingClientRect();
            if(br.left < -1 || br.right > innerWidth+1 || pr.left < -1 || pr.right > innerWidth+1 ||
               panel.scrollWidth>panel.clientWidth+1 || box.scrollWidth>box.clientWidth+1 ||
               !box.textContent.includes(T[lang]['movement.guide.'+MOVEMENT_GUIDES[id][2]]) ||
               !panel.textContent.includes(groupAnatomicalAction(EX_BY_ID[id].m[0][0])) ||
               (lang!=='en' && groupAnatomicalAction(EX_BY_ID[id].m[0][0])!==T[lang]['anatomy.action.'+EX_BY_ID[id].m[0][0]]) ||
               box.textContent.includes('movement.guide.')) bad.push(id);
          }
          const rtl=document.documentElement.dir==='rtl';
          closeSheet();return {bad,rtl,actual:document.documentElement.dataset.theme||'dark',width:document.documentElement.scrollWidth};
        },{theme,lang});
        check(theme+' / '+lang+' guides fit at 320px, retain translations and correct direction',
          report.bad.length===0 && report.rtl===(lang==='ar') && report.actual===theme && report.width<=320,JSON.stringify(report));
      }
    }
    // The load must stay distinguishable from the figure, and have sufficient
    // non-text contrast against the card in BOTH themes.
    for(const theme of ['dark','paper']){
      const paint=await page.evaluate(theme=>{
        switchLang('en');setDisplay('theme',theme);openExerciseDetail('bb-bench');
        const rgb=value=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
        const lum=c=>{const v=rgb(c).map(x=>{x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);});
          return .2126*v[0]+.7152*v[1]+.0722*v[2];};
        const fill=getComputedStyle(document.querySelector('.mov-head')).fill,
          load=getComputedStyle(document.querySelector('.mov-load')).stroke,
          bg=getComputedStyle(document.querySelector('.movement-guide')).backgroundColor;
        const a=lum(load),b=lum(bg);return {fill,load,bg,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
      },theme);
      check(theme+' illustration distinguishes weight from body with visible contrast',
        paint.load!==paint.fill && paint.contrast>=3,JSON.stringify(paint));
    }
    // Arabic stage A must be at the right, matching the RTL labels, and both
    // themes must actually paint visible contrasting figure and background.
    await page.evaluate(()=>{switchLang('ar');setDisplay('theme','paper');openExerciseDetail('db-fly');});
    state=await page.evaluate(()=>({dir:document.documentElement.dir,
      transform:document.querySelector('[data-moving]').getAttribute('transform'),
      a:document.querySelector('.move-labels span').getBoundingClientRect().toJSON(),
      b:document.querySelectorAll('.move-labels span')[1].getBoundingClientRect().toJSON(),
      fill:getComputedStyle(document.querySelector('.mov-head')).fill,
      bg:getComputedStyle(document.querySelector('.movement-guide')).backgroundColor,
      note:document.querySelector('.movement-view').textContent}));
    check('Arabic RTL keeps the first label aligned with the first figure and preserves the overhead-view note',
      state.dir==='rtl' && /translate\(160 0\)/.test(state.transform) && state.a.left>state.b.left &&
      state.fill!==state.bg && state.note.trim().length>0,JSON.stringify(state));
    if(process.env.MOVEMENT_SHOTS){
      fs.mkdirSync(process.env.MOVEMENT_SHOTS,{recursive:true});
      await page.evaluate(()=>Promise.all(document.querySelector('.sheet').getAnimations().map(a=>a.finished.catch(()=>{}))));
      await page.screenshot({path:path.join(process.env.MOVEMENT_SHOTS,'movement-paper-ar-320.png')});
    }

    for(const width of [360,390,768,1024,1440]){
      await page.setViewport({width,height:844,deviceScaleFactor:1});
      await page.evaluate(()=>{switchLang('en');setDisplay('theme','dark');openExerciseDetail('leg-press');});
      await frame(page);
      state=await page.evaluate(()=>{const box=document.querySelector('.movement-guide'),p=document.querySelector('.sheet-panel');
        const b=box.getBoundingClientRect(),r=p.getBoundingClientRect(),button=document.querySelector('.movement-play').getBoundingClientRect();
        return {width:innerWidth,doc:document.documentElement.scrollWidth,left:b.left,right:b.right,
          panelLeft:r.left,panelRight:r.right,scroll:p.scrollWidth,client:p.clientWidth,buttonH:button.height};});
      check('movement detail fits the '+width+'px viewport with a 44px action',state.doc<=width && state.left>=-1 && state.right<=width+1 &&
        state.panelLeft>=-1 && state.panelRight<=width+1 && state.scroll<=state.client+1 && state.buttonH>=44,JSON.stringify(state));
    }
    await page.setViewport({width:320,height:844,deviceScaleFactor:1});
    await page.evaluate(()=>{setDisplay('textScale',1.3);openExerciseDetail('leg-press');});
    state=await page.evaluate(()=>{const p=document.querySelector('.sheet-panel'),g=document.querySelector('.movement-guide');
      return {text:document.documentElement.dataset.text,doc:document.documentElement.scrollWidth,
        panel:p.scrollWidth-p.clientWidth,guide:g.scrollWidth-g.clientWidth};});
    check('enlarged text keeps instructions and controls within the 320px sheet',state.text==='1.3'&&state.doc<=320&&state.panel<=1&&state.guide<=1,JSON.stringify(state));
    await page.evaluate(()=>setDisplay('textScale',1));

    // Reduced motion works for both the OS preference and the in-app setting;
    // all instructions and endpoint drawings stay available.
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.evaluate(()=>{setDisplay('reducedMotion','auto');openExerciseDetail('pushup');});
    state=await page.evaluate(()=>({motion:document.documentElement.dataset.motion,
      display:getComputedStyle(document.querySelector('.movement-play')).display,
      stages:document.querySelectorAll('.movement-figure > g').length,copy:document.querySelectorAll('.move-copy p').length}));
    check('OS reduced motion removes the playback control, not the positions or instructions',
      state.motion==='on'&&state.display==='none'&&state.stages===2&&state.copy===3,JSON.stringify(state));
    const still=await page.$eval('[data-moving]',el=>el.innerHTML);
    await page.evaluate(()=>playMovement(document.querySelector('.movement-play')));
    await new Promise(r=>setTimeout(r,200));
    check('a programmatic playback request cannot bypass reduced motion',still===await page.$eval('[data-moving]',el=>el.innerHTML));
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
    await page.evaluate(()=>{setDisplay('reducedMotion','on');openExerciseDetail('plank');});
    state=await page.evaluate(()=>({motion:document.documentElement.dataset.motion,
      stages:document.querySelectorAll('.movement-figure > g').length,play:!!document.querySelector('.movement-play'),
      text:document.querySelector('.move-copy').textContent}));
    check('a static hold stays a single position without a misleading play action',
      state.motion==='on'&&state.stages===1&&!state.play&&/breathe/i.test(state.text),JSON.stringify(state));

    // A real Science journey uses the same exercise-specific component.
    await page.evaluate(()=>{closeSheet();go('science');setSciView('explorers');openExplorer('mechanics');setMechEx('leg-press');});
    await page.waitForSelector('.movement-guide[data-exercise="leg-press"]');
    check('Science mechanics renders the same exercise-specific instructions',
      await page.evaluate(()=>document.querySelector('.movement-guide').textContent.includes(T.en['movement.guide.legPress'])));

    // Both the standalone file and an installed HTTP app remain usable when
    // disconnected. For HTTP, first wait until the new service-worker cache
    // contains the two movement modules; this avoids a first-install race.
    if(/^https?:/.test(url)){
      await page.waitForFunction(async()=>{
        if(!('serviceWorker' in navigator)) return false;
        await navigator.serviceWorker.ready;
        const names=await caches.keys();
        for(const name of names){const c=await caches.open(name);
          if(name==='ancestor-v39' && await c.match('./js/ui/movement.js') && await c.match('./js/i18n/movement.js')) return true;}
        return false;
      },{timeout:30000});
    }
    await page.setOfflineMode(true);
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>!document.getElementById('appBoot'));
    await page.evaluate(()=>{openExerciseDetail('band-row-seated');});
    state=await page.evaluate(()=>({id:document.querySelector('.movement-guide')?.dataset.exercise,
      text:document.querySelector('.move-copy')?.textContent,svg:!!document.querySelector('.movement-figure')}));
    check('exercise-specific diagrams and instructions work after an offline reload',
      state.id==='band-row-seated'&&state.svg&&/band/i.test(state.text),JSON.stringify(state));
    await page.setOfflineMode(false);
    check('no uncaught browser errors in movement journeys',errors.length===0,errors.join('; '));
  }finally{await ctx.close();await browser.close();}
  console.log('\n'+pass+' passed, '+fail+' failed');if(fail)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
