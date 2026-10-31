/* Real Chromium keyboard/accessibility regressions. The default is the modular
   file; ANCESTOR_TEST_TARGET also accepts the HTTP PWA or standalone release.
   Test fixtures never ship as user data. This is not a screen-reader review. */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..');
const target = process.env.ANCESTOR_TEST_TARGET || path.join(ROOT, 'index.html');
const url = /^https?:\/\//.test(target) ? target : pathToFileURL(path.resolve(target)).href;
let passed = 0, failed = 0; const errors = [];
function check(name, ok, detail){
  if(ok){ passed++; console.log('  PASS  ' + name); }
  else { failed++; console.error('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function key(page, selector, keyName='Enter'){
  await page.waitForSelector(selector, {visible:true});
  await page.$eval(selector, el => el.scrollIntoView({block:'center',inline:'nearest'}));
  await page.focus(selector);
  await page.keyboard.press(keyName);
  await pause(70);
}
async function reverseTab(page){
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  await pause(50);
}
async function active(page){
  return page.evaluate(() => {
    const e = document.activeElement;
    return {tag:e?.tagName,id:e?.id,act:e?.getAttribute('data-act'),arg:e?.getAttribute('data-a1'),
      inDialog:!!e?.closest('[role="dialog"]'), text:(e?.textContent || '').trim().slice(0,100)};
  });
}
async function axNode(page, selector){
  const client = await page.createCDPSession();
  try {
    const doc = await client.send('DOM.getDocument');
    const found = await client.send('DOM.querySelector', {nodeId:doc.root.nodeId, selector});
    if(!found.nodeId) return null;
    const tree = await client.send('Accessibility.getPartialAXTree', {nodeId:found.nodeId,fetchRelatives:false});
    return tree.nodes[0] || null;
  } finally { await client.detach(); }
}
(async function(){
  const browser = await puppeteer.launch({headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx = await browser.createBrowserContext(), page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluateOnNewDocument(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', e => window.__cspViolations.push(e.violatedDirective + ': ' + e.blockedURI));
  });
  try {
    await page.setViewport({width:390,height:844,deviceScaleFactor:1});
    const motion = process.env.ANCESTOR_TEST_MOTION === 'normal' ? 'no-preference' : 'reduce';
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:motion}]);
    await page.goto(url,{waitUntil:'load'});
    await page.waitForFunction(() => !document.getElementById('appBoot'));
    const initialCspListener=await page.evaluate(()=>{
      const n=window.__cspViolations.length;
      document.dispatchEvent(new SecurityPolicyViolationEvent('securitypolicyviolation',
        {violatedDirective:'test-only',blockedURI:'listener-sentinel'}));
      return window.__cspViolations.splice(n).join() === 'test-only: listener-sentinel';
    });

    // The packaging transform is tested against Chromium's parser, not just a
    // text comparison. No network or styles are injected into the app itself.
    const css = fs.readFileSync(path.join(ROOT,'css/app.css'),'utf8');
    const compact = spawnSync('python3',['-c',
      'import sys; from tools.css_packaging import strip_isolated_comments; sys.stdout.write(strip_isolated_comments(sys.stdin.read()))'],
      {cwd:ROOT,input:css,encoding:'utf8',maxBuffer:1024*1024});
    check('standalone CSS compaction succeeds',compact.status===0,compact.stderr);
    const cssom = await page.evaluate((a,b) => {
      const one = new CSSStyleSheet(), two = new CSSStyleSheet();
      one.replaceSync(a); two.replaceSync(b);
      const first = Array.from(one.cssRules, r => r.cssText), second = Array.from(two.cssRules, r => r.cssText);
      const at = first.findIndex((text,i) => text !== second[i]);
      return {equal:first.length===second.length && at<0, count:first.length, other:second.length, at};
    },css,compact.stdout);
    check('the original and compacted stylesheets have identical Chromium CSSOM rules',cssom.equal && cssom.count>500,JSON.stringify(cssom));

    // First launch: the actual keyboard triggers rerenders and step changes.
    await key(page,'[data-act="pickLang"][data-a1="fr"]');
    let state = await page.evaluate(() => ({lang:document.documentElement.lang, skip:document.querySelector('.skip-link').textContent,
      pressed:document.querySelector('[data-act="pickLang"][data-a1="fr"]').getAttribute('aria-pressed'),
      focused:document.activeElement?.getAttribute('data-a1')}));
    check('language selection keeps keyboard focus and reports the selected language',state.lang==='fr' && state.focused==='fr' && state.pressed==='true',JSON.stringify(state));
    check('the skip link follows the selected language and has a focusable target',/contenu principal/i.test(state.skip) &&
      await page.$eval('#screenBody',el=>el.tabIndex===-1));
    await key(page,'.skip-link');
    check('the skip link moves focus to the main content target',(await active(page)).id==='screenBody');
    await page.keyboard.press('Tab'); await pause(50);
    check('Tab after skipping enters the first main-content control',(await active(page)).act==='pickLang');
    await key(page,'[data-act="pickLang"][data-a1="en"]');
    await key(page,'[data-act="chooseCurrentLang"]');
    state = await active(page);
    check('continuing to onboarding moves keyboard focus to the new heading',state.tag==='H1',JSON.stringify(state));
    await key(page,'[data-act="setConsent"]');
    check('the next onboarding step is announced at its heading',(await active(page)).tag==='H1');
    await key(page,'[data-act="setP"][data-a1="experience"][data-a2="a"]');
    state = await page.evaluate(() => ({focus:document.activeElement?.dataset.a2, model:getState().profile.experience,
      pressed:document.querySelector('[data-act="setP"][data-a1="experience"][data-a2="a"]').getAttribute('aria-pressed'),
      others:[...document.querySelectorAll('[data-act="setP"][data-a1="experience"]')].filter(e=>e.dataset.a2!=='a').every(e=>e.getAttribute('aria-pressed')==='false')}));
    check('experience selection keeps focus and exposes the selected state',state.focus==='a' && state.model==='a' && state.pressed==='true' && state.others,JSON.stringify(state));
    const experienceAX = await axNode(page,'[data-act="setP"][data-a1="experience"][data-a2="a"]');
    check('Chrome exposes the experience choice as a pressed button',!!experienceAX && experienceAX.role?.value==='button' &&
      experienceAX.properties?.some(p=>p.name==='pressed' && String(p.value?.value)==='true'),JSON.stringify(experienceAX?.properties));
    await key(page,'[data-act="setP"][data-a1="goal"][data-a2="s"]');
    check('a second onboarding choice is reachable and announced as selected',await page.evaluate(()=>
      document.activeElement?.dataset.a2==='s' && document.activeElement?.getAttribute('aria-pressed')==='true' && getState().profile.goal==='s'));
    await key(page,'[data-act="onbNext"]');
    check('moving between onboarding steps does not strand focus on the removed button',(await active(page)).tag==='H1');

    // Details use real keyboard activation under the enforced CSP. An explicit
    // close must win over the automatic opening for a changed exercise group.
    await page.evaluate(()=>onbGo(9));
    const groupSelector = 'details[data-ex-scope="onb"]';
    const group = await page.$eval(groupSelector,el=>({pat:el.dataset.exGroup,id:el.querySelector('[data-act="toggleEx"]').dataset.a1}));
    const groupBase = `details[data-ex-scope="onb"][data-ex-group="${group.pat}"]`;
    await key(page,groupBase+' > summary');
    check('an exercise group opens with the keyboard',await page.$eval(groupBase,el=>el.open));
    await key(page,`${groupBase} [data-act="toggleEx"][data-a1="${group.id}"]`);
    state = await page.evaluate(({pat,id}) => {
      const g=document.querySelector(`details[data-ex-scope="onb"][data-ex-group="${pat}"]`);
      return {open:g.open,pressed:g.querySelector(`[data-a1="${id}"]`).getAttribute('aria-pressed'),
        focus:document.activeElement?.dataset.a1,allowed:getState().profile.exercises[id]};
    },group);
    check('removing an exercise preserves the open group and the focused, unpressed choice',
      state.open && state.pressed==='false' && state.focus===group.id && state.allowed===false,JSON.stringify(state));
    await key(page,groupBase+' > summary');
    await page.evaluate(()=>render());
    check('an explicitly closed changed group stays closed after a rerender',await page.$eval(groupBase,el=>!el.open));
    await key(page,groupBase+' > summary');
    await key(page,`${groupBase} [data-act="toggleEx"][data-a1="${group.id}"]`);
    check('restoring the exercise leaves its explicitly opened group open',await page.evaluate(({pat,id})=>{
      const g=document.querySelector(`details[data-ex-scope="onb"][data-ex-group="${pat}"]`);
      return g.open && getState().profile.exercises[id]===true && document.activeElement?.dataset.a1===id;
    },group));

    await page.evaluate(()=>onbGo(10));
    await key(page,'[data-act="finishOnboarding"]');
    check('finishing onboarding puts focus on Today’s heading',(await active(page)).tag==='H1');
    await key(page,'[data-remember="home-week"] > summary');
    const metricTip='[data-remember="home-week"] .metric:first-child .tip';
    await key(page,metricTip);
    state=await page.evaluate(selector=>{const b=document.querySelector(selector), info=b?.closest('.metric')?.querySelector('.metric-help');
      return {expanded:b?.getAttribute('aria-expanded'),visible:!!info&&!info.hidden,text:info?.textContent};},metricTip);
    check('keyboard activation reveals the metric explanation and its expanded state',
      state.expanded==='true' && state.visible && /most recent session/i.test(state.text||''),JSON.stringify(state));
    await key(page,metricTip);
    check('activating the metric explanation again closes it',await page.evaluate(selector=>{
      const b=document.querySelector(selector); return b?.getAttribute('aria-expanded')==='false' &&
        b.closest('.metric').querySelector('.metric-help')?.hidden;
    },metricTip));
    await page.click(metricTip);
    state=await page.evaluate(selector=>{const b=document.querySelector(selector), r=b.getBoundingClientRect();
      return {expanded:b.getAttribute('aria-expanded'),visible:!b.closest('.metric').querySelector('.metric-help').hidden,
        width:r.width,height:r.height};},metricTip);
    check('a pointer click opens a metric explanation with at least a 24px target',
      state.expanded==='true' && state.visible && state.width>=24 && state.height>=24,JSON.stringify(state));
    await page.click(metricTip);
    await key(page,'[data-remember="home-week"] [data-act="openSheet"][data-a1="sleep"]');
    state = await page.evaluate(()=>({inside:!!document.activeElement?.closest('[role="dialog"]'),
      inert:['main','nav','restHost'].every(id=>document.getElementById(id).hasAttribute('inert')),
      label:document.querySelector('#sheetHost [role="dialog"]')?.getAttribute('aria-label')}));
    check('the sleep sheet receives focus and makes the background inert',state.inside && state.inert && !!state.label,JSON.stringify(state));
    const modalTreeClient=await page.createCDPSession();
    const modalTree=await modalTreeClient.send('Accessibility.getFullAXTree'); await modalTreeClient.detach();
    check('background navigation is absent from Chrome’s active accessibility tree while the sheet is open',
      !modalTree.nodes.some(n=>!n.ignored && n.role?.value==='navigation'));
    await reverseTab(page);
    check('Shift+Tab from the sheet container wraps to its last visible control',(await active(page)).act==='saveSleep');
    await page.keyboard.press('Tab'); await pause(50);
    check('Tab from the last sheet control wraps to the close button',(await active(page)).act==='closeSheet');
    await reverseTab(page);
    check('Shift+Tab from the first sheet control wraps back to Save',(await active(page)).act==='saveSleep');
    state = await page.evaluate(()=>{ const before=document.activeElement; document.querySelector('#nav button').focus();
      return {kept:document.activeElement===before, inside:!!document.activeElement.closest('[role="dialog"]')}; });
    check('background controls cannot steal focus while the modal is open',state.kept && state.inside,JSON.stringify(state));
    await key(page,'#sl_q [data-a1="5"]');
    state = await page.evaluate(()=>({quality:QUALITY,pressed:document.activeElement.getAttribute('aria-pressed'),
      others:[...document.querySelectorAll('#sl_q button')].filter(b=>b.dataset.a1!=='5').every(b=>b.getAttribute('aria-pressed')==='false')}));
    check('sleep quality exposes its current selection',state.quality===5 && state.pressed==='true' && state.others,JSON.stringify(state));
    await page.keyboard.press('Escape'); await pause(50);
    state=await page.evaluate(()=>({closed:!document.querySelector('#sheetHost [role="dialog"]'),
      restored:document.activeElement?.matches('[data-act="openSheet"][data-a1="sleep"]'),
      inert:document.querySelectorAll('#main[inert],#nav[inert],#restHost[inert]').length}));
    check('Escape closes the sheet, restores its opener and releases the background',state.closed && state.restored && state.inert===0,JSON.stringify(state));
    await key(page,'[data-remember="home-week"] [data-act="openSheet"][data-a1="sleep"]');
    state=await page.evaluate(()=>({quality:QUALITY,visible:document.querySelector('#sl_q .on')?.dataset.a1,
      pressed:document.querySelector('#sl_q [data-a1="3"]').getAttribute('aria-pressed')}));
    check('cancelled sleep choices do not silently survive under a different displayed default',
      state.quality===3 && state.visible==='3' && state.pressed==='true',JSON.stringify(state));
    await key(page,'#sl_q [data-a1="4"]');
    await key(page,'[data-act="saveSleep"]');
    state=await page.evaluate(()=>({quality:getState().sleep.at(-1)?.quality,
      focus:document.activeElement?.matches('[data-act="openSheet"][data-a1="sleep"]'),inert:document.getElementById('main').hasAttribute('inert')}));
    check('saving the selected sleep quality preserves it and restores the opener after rerender',
      state.quality===4 && state.focus && !state.inert,JSON.stringify(state));

    await key(page,'[data-remember="home-week"] [data-act="openSheet"][data-a1="feel"]');
    state=await page.evaluate(()=>({value:FEEL.illness,text:document.querySelector('[role="dialog"] .banner.warn').textContent}));
    check('the default symptom sheet offers conditional safety advice without claiming symptoms were reported',
      state.value===0 && /If you have pain or illness, stop training/.test(state.text) && !/you reported/i.test(state.text),JSON.stringify(state));
    await key(page,'#fl_illness [data-a2="3"]');
    check('a feeling choice exposes its selected state',await page.evaluate(()=>FEEL.illness===3 && document.activeElement.getAttribute('aria-pressed')==='true'));
    await page.keyboard.press('Escape');
    await key(page,'[data-remember="home-week"] [data-act="openSheet"][data-a1="feel"]');
    state=await page.evaluate(()=>({value:FEEL.illness,visible:document.querySelector('#fl_illness .on')?.dataset.a2,
      pressed:document.querySelector('#fl_illness [data-a2="0"]').getAttribute('aria-pressed')}));
    check('cancelled symptom choices cannot be saved behind a different visible default',
      state.value===0 && state.visible==='0' && state.pressed==='true',JSON.stringify(state));
    await key(page,'[data-act="saveFeel"]');
    check('saving the reopened feelings sheet records its displayed none selection',
      await page.evaluate(()=>getState().feelings.at(-1)?.illness===0 && !document.getElementById('main').hasAttribute('inert')));

    // Closed details and disabled controls are not tab endpoints, even when a
    // browser gives their descendants a nonzero layout rectangle.
    await page.evaluate(()=>{ document.getElementById('restHost').setAttribute('inert',''); sheet('Keyboard fixture',
      '<button id="fixtureFirst">First</button><details><summary id="fixtureSummary">More</summary>' +
      '<button id="fixtureHidden">Hidden</button></details><button id="fixtureLast">Last</button>' +
      '<button disabled id="fixtureDisabled">Disabled</button>'); });
    await pause(80); await reverseTab(page);
    check('tab wrapping ignores disabled and closed-disclosure descendants',(await active(page)).id==='fixtureLast');
    await page.keyboard.press('Tab'); await pause(40);
    check('tab wrapping still reaches the sheet close button',(await active(page)).act==='closeSheet');
    await page.keyboard.press('Escape');
    check('closing a modal preserves any background inert state that predated it',
      await page.evaluate(()=>document.getElementById('restHost').hasAttribute('inert') && !document.getElementById('main').hasAttribute('inert')));
    await page.evaluate(()=>document.getElementById('restHost').removeAttribute('inert'));

    // Profile settings rerender in place; switches change their argument when
    // toggled, so focus must follow the stable setting rather than stale text.
    await key(page,'#nav [data-nav="profile"]');
    check('keyboard navigation announces the destination heading',(await active(page)).tag==='H1');
    await key(page,'[data-remember="profile-access"] > summary');
    await key(page,'[data-remember="profile-access"] [data-act="setDisplay"][data-a1="theme"]');
    state=await page.evaluate(()=>({theme:document.documentElement.dataset.theme,
      focus:document.activeElement?.dataset.a1,checked:document.activeElement?.getAttribute('aria-checked'),
      open:document.querySelector('[data-remember="profile-access"]').open}));
    check('the paper-theme switch remains focused, checked and inside its open group',
      state.theme==='paper' && state.focus==='theme' && state.checked==='true' && state.open,JSON.stringify(state));
    const switchAX=await axNode(page,'[data-act="setDisplay"][data-a1="theme"]');
    check('Chrome exposes the setting as a checked switch',!!switchAX && switchAX.role?.value==='switch' &&
      switchAX.properties?.some(p=>p.name==='checked' && String(p.value?.value)==='true'),JSON.stringify(switchAX?.properties));
    await page.keyboard.press('Tab'); await pause(50);
    check('Tab continues to the next setting after a switch rerender',(await active(page)).arg==='highContrast');
    await key(page,'[data-act="setDisplay"][data-a1="textScale"][data-a2="1.3"]');
    check('text-size choices report their selected state and retain focus',await page.evaluate(()=>
      document.activeElement?.dataset.a2==='1.3' && document.activeElement?.getAttribute('aria-pressed')==='true'));
    await page.evaluate(()=>setDisplay('textScale',1));

    await key(page,'#nav [data-nav="library"]');
    await key(page,'[data-remember="library-filters"] > summary');
    await key(page,'[data-act="setLibMuscle"][data-a1="chest"]');
    state=await page.evaluate(()=>({focus:document.activeElement?.dataset.a1,pressed:document.activeElement?.getAttribute('aria-pressed'),
      open:document.querySelector('[data-remember="library-filters"]').open,
      groups:[...document.querySelectorAll('[data-remember="library-filters"] [role="group"]')].map(x=>x.getAttribute('aria-label'))}));
    check('library filter choices retain focus, selection and the open disclosure',state.focus==='chest' && state.pressed==='true' && state.open,JSON.stringify(state));
    check('the three library filter groups have distinct accessible names',state.groups.length===3 && new Set(state.groups).size===3 && state.groups.every(Boolean),JSON.stringify(state.groups));

    // Real workout, real saved set and the real completion overlay. The plan
    // is a fixture solely so this journey has a single predictable set.
    await page.evaluate(()=>{
      getState().plan={mode:'std',split:1,restSec:120,builtAt:Date.now(),sessions:[
        {id:'A',name:'Keyboard fixture',focus:['chest'],exercises:[{id:'bb-bench',sets:1,reps:[6,10],rir:2}]}]};
      saveState(); PLAN_DAY='A'; SESSION_SUB='plan'; go('session');
    });
    await key(page,'[data-act="togglePlanEdit"]');
    await key(page,'[data-act="openRestPicker"]');
    await key(page,'#sheetHost [data-act="setPlanRestPick"][data-a1="90"]');
    state=await page.evaluate(()=>({rest:getState().plan.restSec,focus:document.activeElement?.dataset.act,
      inert:document.getElementById('main').hasAttribute('inert')}));
    check('a rest choice survives its background rerender and returns focus to the picker',
      state.rest===90 && state.focus==='openRestPicker' && !state.inert,JSON.stringify(state));
    await key(page,'[data-act="startSession"][data-a1="A"]');
    await page.waitForSelector('#sf_0_0_load',{visible:true});
    await page.focus('#sf_0_0_load'); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.type('60');
    await page.focus('#sf_0_0_reps'); await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control'); await page.keyboard.type('8');
    await key(page,'#logbtn_0_0');
    check('a set can be entered and committed with the keyboard',await page.evaluate(()=>
      ACTIVE?.exercises[0].sets[0].committed && ACTIVE.exercises[0].sets[0].w==='60' && ACTIVE.exercises[0].sets[0].r==='8'));
    await key(page,'[data-act="finishSession"]');
    await page.waitForSelector('#doneOverlay [data-act="closeCompletion"]',{visible:true}); await pause(80);
    state=await page.evaluate(()=>({inside:!!document.activeElement?.closest('#doneOverlay'),
      inert:document.getElementById('main').hasAttribute('inert'), count:getState().sessions.length,
      set:getState().sessions.at(-1)?.exercises[0].sets[0]}));
    check('completion is a modal and contains the genuinely saved set',state.inside && state.inert && state.count===1 && +state.set?.w===60 && +state.set?.r===8,JSON.stringify(state));
    await reverseTab(page);
    check('Shift+Tab from completion wraps to its last action',(await active(page)).text.toLowerCase().includes('today'));
    await page.keyboard.press('Tab'); await pause(40);
    check('Tab from the last completion action wraps to its first action',(await active(page)).act==='closeCompletion' && (await active(page)).arg==='progress');
    await page.keyboard.press('Escape'); await pause(80);
    state=await page.evaluate(()=>({closed:!document.getElementById('doneOverlay'), view:ANC.view,
      heading:document.activeElement?.tagName, inert:document.querySelectorAll('#main[inert],#nav[inert]').length,
      saved:getState().sessions.length}));
    check('Escape dismisses completion to Progress without losing the saved workout',
      state.closed && state.view==='progress' && state.heading==='H1' && state.inert===0 && state.saved===1,JSON.stringify(state));

    // Deleting a bodyweight re-renders the background and replaces the open
    // sheet. The original trigger remains meaningful even if another button
    // with the same action appears in the empty state.
    await page.evaluate(()=>{ addBodyweight(75,Date.now()); render(); });
    await key(page,'[data-remember="progress-weight"] > summary');
    await key(page,'[data-remember="progress-weight"] .chip[data-act="openSheet"][data-a1="bw"]');
    await key(page,'#sheetHost [data-act="removeBodyweightRow"]');
    state=await page.evaluate(()=>({count:getState().bodyweights.length,inside:!!document.activeElement?.closest('[role="dialog"]'),
      inert:document.getElementById('main').hasAttribute('inert')}));
    check('deleting a bodyweight reopens the sheet and keeps modal focus',state.count===0 && state.inside && state.inert,JSON.stringify(state));
    await page.keyboard.press('Escape'); await pause(50);
    state=await page.evaluate(()=>({act:document.activeElement?.dataset.act,kind:document.activeElement?.dataset.a1,
      chip:document.activeElement?.classList.contains('chip'),inert:document.getElementById('main').hasAttribute('inert')}));
    check('closing a replaced sheet restores its original, unambiguous opener',
      state.act==='openSheet' && state.kind==='bw' && state.chip && !state.inert,JSON.stringify(state));

    // Generated chart points use delegated events so the strict CSP can stay
    // enabled. Quotation marks and apostrophes must remain data, never code.
    await page.evaluate(()=>{
      document.querySelector('#screenBody').insertAdjacentHTML('beforeend','<section id="chartFixture"><button id="chartBefore">Fixture</button>' +
        lineChart({title:'Fixture',period:'test',unit:'kg',label:'Load',points:[{label:`O'Brien & "Co"`,v:12},{label:'Last',v:15}]}) + '</section>');
    });
    await page.focus('#chartBefore'); await page.keyboard.press('Tab'); await pause(60);
    state=await page.evaluate(()=>({expected:document.querySelector('#chartFixture .chart-pt').getAttribute('aria-label'),
      actual:document.querySelector('#chartFixture .chart-pt').closest('svg').nextElementSibling.querySelector('.chart-tip-readout').textContent,
      inline:document.querySelector('#chartFixture .chart-pt').hasAttribute('onfocus')}));
    check('keyboard focus updates chart details under CSP without corrupting apostrophes',
      state.actual===state.expected && state.actual.includes(`O'Brien & "Co"`) && !state.inline && (await active(page)).tag==='g',JSON.stringify(state));
    const chartAX = await axNode(page,'#chartFixture .chart-pt');
    check('the focused chart point is named and exposed in Chrome’s accessibility tree',
      !!chartAX && !chartAX.ignored && chartAX.role?.value==='listitem' && chartAX.name?.value===state.expected,JSON.stringify(chartAX?.role));
    await page.hover('#chartFixture .chart-pt:nth-of-type(2)'); await pause(60);
    state=await page.evaluate(()=>({expected:document.querySelectorAll('#chartFixture .chart-pt')[1].getAttribute('aria-label'),
      actual:document.querySelector('#chartFixture .chart-pt').closest('svg').nextElementSibling.querySelector('.chart-tip-readout').textContent,
      inline:document.querySelectorAll('#chartFixture .chart-pt')[1].hasAttribute('onmouseenter')}));
    check('pointer hover updates chart details without inline handlers',state.actual===state.expected && !state.inline,JSON.stringify(state));

    await page.setViewport({width:320,height:760,deviceScaleFactor:1});
    for(const theme of ['dark','paper']) for(const lang of ['en','fr','es','de','it','nl','ar']){
      state=await page.evaluate(({l,theme})=>{
        switchLang(l); setDisplay('theme',theme); go('profile');
        const group=document.querySelector('[data-remember="profile-access"]'); group.open=true;
        const text=document.querySelector('[data-act="setDisplay"][data-a1="theme"]');
        return {dir:document.documentElement.dir, label:text.textContent.trim(), checked:text.getAttribute('aria-checked'),
          main:document.getElementById('main').getAttribute('aria-label'), expectedMain:t('a11y.main'),
          theme:document.documentElement.dataset.theme || 'dark',overflow:document.documentElement.scrollWidth-innerWidth};
      },{l:lang,theme});
      check(theme+' / '+lang+': the setting remains named, stateful and fits at 320px',
        state.dir===(lang==='ar'?'rtl':'ltr') && state.theme===theme && !!state.label && state.main===state.expectedMain &&
        ['true','false'].includes(state.checked) && state.overflow<=0,JSON.stringify(state));
    }
    await key(page,'[data-act="setDisplay"][data-a1="theme"]');
    check('a switch remains keyboard-operable and focused in Arabic RTL',await page.evaluate(()=>
      document.documentElement.dir==='rtl' && document.activeElement?.dataset.a1==='theme' && document.activeElement?.getAttribute('role')==='switch'));

    if(/^https?:/.test(url)){
      await page.waitForFunction(async()=>{
        if(!('serviceWorker' in navigator)) return false;
        await navigator.serviceWorker.ready;
        const cache=await caches.open('ancestor-'+APP_BUILD);
        return !!(await cache.match('./index.html')) && !!(await cache.match('./js/app.js'));
      },{timeout:30000});
    }
    // A new document gets a new listener and buffer. Capture the first buffer
    // before reload so violations during the actual journey are not discarded.
    const violationsBeforeReload=await page.evaluate(()=>window.__cspViolations || []);
    await page.setOfflineMode(true); await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>!document.getElementById('appBoot'));
    await page.evaluate(()=>go('profile'));
    const accessOpen=await page.$eval('[data-remember="profile-access"]',el=>el.open);
    if(!accessOpen) await key(page,'[data-remember="profile-access"] > summary');
    await key(page,'[data-act="setDisplay"][data-a1="theme"]');
    check('keyboard settings still work after an offline reload',await page.evaluate(()=>
      document.activeElement?.dataset.a1==='theme' && document.activeElement?.getAttribute('role')==='switch'));
    await page.setOfflineMode(false);
    const reloadedCspListener=await page.evaluate(()=>{
      const n=window.__cspViolations.length;
      document.dispatchEvent(new SecurityPolicyViolationEvent('securitypolicyviolation',
        {violatedDirective:'test-only',blockedURI:'listener-sentinel'}));
      return window.__cspViolations.splice(n).join() === 'test-only: listener-sentinel';
    });
    check('the CSP listener is active before and after reload',initialCspListener && reloadedCspListener);
    const violations=violationsBeforeReload.concat(await page.evaluate(()=>window.__cspViolations || []));
    check('the journey triggered no CSP violations across both documents',violations.length===0,violations.join('; '));
    check('the journey raised no uncaught page errors',errors.length===0,errors.join('; '));
  } finally { await ctx.close(); await browser.close(); }
  console.log('\n'+passed+' passed, '+failed+' failed');
  if(failed) process.exitCode=1;
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
