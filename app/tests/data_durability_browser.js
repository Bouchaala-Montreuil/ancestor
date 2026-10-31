/* Real-Chromium data-safety regressions. All records here are test fixtures.
   Run after `source tools/chromium.sh`; ANCESTOR_TEST_TARGET selects modular,
   HTTP, or standalone. The file-picker and confirmation use real browser UI. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');
const target = process.env.ANCESTOR_TEST_TARGET || path.resolve(__dirname, '../index.html');
const url = /^https?:\/\//.test(target) ? target : pathToFileURL(path.resolve(target)).href;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ancestor-data-test-'));
const files = {};
for(const [name, value] of Object.entries({
  invalid: '[]', newer: JSON.stringify({version:99, profile:{}, sessions:[]}),
  legacy: JSON.stringify({version:2, profile:{name:'Legacy',extra:'kept'}, sessions:[{
    id:'legacy-session',date:1700000000000,exercises:[{id:'unknown-exercise-42',
      custom:'keep me',sets:[{w:47,r:7,rir:2,customSet:'keep set'}]}]}],
    sleep:[{date:'2024-01-01',hours:7}], unknownTop:{a:1}})
})) { files[name] = path.join(temp,name + '.json'); fs.writeFileSync(files[name],value); }
let passed = 0, failed = 0;
const errors = [];
function check(name, ok, detail){
  if(ok){ passed++; console.log('  PASS  ' + name); }
  else { failed++; console.error('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
async function click(page, selector){
  const el = await page.waitForSelector(selector,{visible:true,timeout:10000});
  await el.evaluate(node => node.scrollIntoView({block:'center',inline:'nearest'}));
  await page.evaluate(() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await el.click();
}
async function profileData(page){
  if(await page.evaluate(() => VIEW !== 'profile')) await click(page,'#nav [data-nav="profile"]');
  const open = await page.$eval('[data-remember="profile-data"]', el=>el.open);
  if(!open) await click(page,'[data-remember="profile-data"] > summary');
}
async function chooseFile(page, file){
  const chooser = page.waitForFileChooser({timeout:10000});
  await click(page,'[data-act="doImport"]');
  await (await chooser).accept([file]);
}
async function waitToast(page, key){
  await page.waitForFunction(k => document.getElementById('toast')?.textContent === t(k), {timeout:10000}, key);
}
async function readMirror(page){
  return page.evaluate(() => new Promise((resolve,reject) => {
    const r = indexedDB.open(IDB_NAME);
    r.onupgradeneeded = () => { if(!r.result.objectStoreNames.contains(IDB_STORE)) r.result.createObjectStore(IDB_STORE); };
    r.onerror=()=>reject(r.error); r.onsuccess=()=>{
      const db=r.result, tx=db.transaction(IDB_STORE,'readonly'), g=tx.objectStore(IDB_STORE).get(STORE_KEY);
      g.onsuccess=()=>{ const value=g.result; db.close(); resolve(value ?? null); };
      g.onerror=()=>{ db.close(); reject(g.error); };
    };
  }));
}
async function writeMirror(page, raw){
  await page.evaluate(value => new Promise((resolve,reject) => {
    const r=indexedDB.open(IDB_NAME);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(IDB_STORE))r.result.createObjectStore(IDB_STORE);};
    r.onerror=()=>reject(r.error);r.onsuccess=()=>{
      const db=r.result,tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(value,STORE_KEY);
      tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
    };
  }),raw);
}
async function waitMirror(page){
  await page.waitForFunction(async () => {
    const primary=localStorage.getItem(STORE_KEY); if(!primary) return false;
    return new Promise(resolve=>{
      const r=indexedDB.open(IDB_NAME);
      r.onerror=()=>resolve(false);r.onsuccess=()=>{
        const db=r.result;if(!db.objectStoreNames.contains(IDB_STORE)){db.close();resolve(false);return;}
        const g=db.transaction(IDB_STORE,'readonly').objectStore(IDB_STORE).get(STORE_KEY);
        g.onsuccess=()=>{const ok=g.result===primary;db.close();resolve(ok);};g.onerror=()=>{db.close();resolve(false);};
      };
    });
  },{timeout:10000});
}

(async function(){
  const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox',
    '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  async function fresh(seed=true){
    const ctx=await browser.createBrowserContext(), page=await ctx.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width:390,height:844,deviceScaleFactor:1});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.goto(url,{waitUntil:'load'});
    await page.waitForFunction(()=>!document.getElementById('appBoot'));
    if(seed){
      await page.evaluate(()=>{chooseLang('en');finishOnboarding();addSession({id:'original',name:'Real',exercises:[]});});
      await waitMirror(page);
    }
    return {ctx,page};
  }
  try {
    {
      const {ctx,page}=await fresh(false);
      const table=await page.evaluate(()=>Object.keys(DATA_SAFETY_VALUES).map(l=>({lang:l,count:DATA_SAFETY_VALUES[l].length,
        keys:DATA_SAFETY_KEYS.length,missing:DATA_SAFETY_KEYS.filter(k=>typeof T[l][k]!=='string'||!T[l][k].trim())})));
      check('all seven backup and draft copy tables have aligned, nonempty values',
        table.length===7&&table.every(x=>x.count===x.keys&&x.missing.length===0),JSON.stringify(table));
      await ctx.close();
    }

    /* Strict rejection occurs before a destructive confirmation or write. */
    {
      const {ctx,page}=await fresh();
      const result=await page.evaluate(()=>{
        const disk=localStorage.getItem(STORE_KEY), mem=JSON.stringify(getState());
        const inputs=['[]','null','{}','"str"','', '{bad', '{"version":3,"sessions":{}}',
          '{"version":3,"sessions":[null]}','{"version":3,"sessions":[{"exercises":"x"}]}',
          '{"version":3,"sessions":[{"exercises":[{"sets":[null]}]}]}',
          '{"version":3,"bodyweights":[{"w":0}]}','{"version":3,"plan":[]}',
          '{"version":3,"science":"bad"}','{"version":"3","profile":{}}'];
        return inputs.map(input=>{let code='';try{importJSON(input);}catch(e){code=e.code;}
          return {code,sameDisk:localStorage.getItem(STORE_KEY)===disk,sameMemory:JSON.stringify(getState())===mem};});
      });
      check('invalid JSON and malformed record shapes cannot replace memory or disk',
        result.every(x=>x.code==='invalid'&&x.sameDisk&&x.sameMemory),JSON.stringify(result));
      const future=await page.evaluate(()=>{
        const disk=localStorage.getItem(STORE_KEY),mem=JSON.stringify(getState());let code='';
        try{importJSON(JSON.stringify({version:99,profile:{name:'future'},sessions:[]}));}catch(e){code=e.code;}
        return {code,disk:localStorage.getItem(STORE_KEY)===disk,mem:JSON.stringify(getState())===mem};
      });
      check('future-version imports are refused without downgrade',future.code==='newer'&&future.disk&&future.mem,JSON.stringify(future));
      await profileData(page);
      const copy=await page.evaluate(()=>({note:document.querySelector('[data-remember="profile-data"]').textContent,
        expected:t('data.exportNote'),label:document.querySelector('[data-act="doExport"]').textContent,expectedLabel:t('data.exportLabel')}));
      check('Me explains exports exclude an active workout and names the log scope',
        copy.note.includes(copy.expected)&&copy.label===copy.expectedLabel&&/log/i.test(copy.label),JSON.stringify(copy));

      await chooseFile(page,files.invalid); await waitToast(page,'data.importInvalid');
      let state=await page.evaluate(()=>({toast:document.getElementById('toast').textContent,
        ids:getState().sessions.map(s=>s.id),busy:document.querySelector('[data-act="doImport"]').getAttribute('aria-busy')}));
      check('real file picker gives an actionable invalid-file error and keeps the log',
        state.ids.includes('original')&&state.busy!=='true',JSON.stringify(state));
      await chooseFile(page,files.newer); await waitToast(page,'data.importNewer');
      state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),raw:JSON.parse(localStorage.getItem(STORE_KEY))}));
      check('real file picker reports a newer backup and leaves the original on disk',
        state.ids.includes('original')&&state.raw.sessions.some(x=>x.id==='original')&&state.raw.version===3,JSON.stringify(state));

      let dialog = new Promise(resolve => page.once('dialog', async d=>{const msg=d.message();await d.dismiss();resolve(msg);}));
      await chooseFile(page,files.legacy); const cancelText=await dialog;
      state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),disk:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id)}));
      check('canceling the actual replacement confirmation keeps both copies',
        /replace/i.test(cancelText)&&state.ids.includes('original')&&state.disk.includes('original'),JSON.stringify(state));

      await page.evaluate(()=>{
        window.__originalSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){if(k===STORE_KEY)throw new Error('quota');return window.__originalSet.call(this,k,v);};
      });
      dialog = new Promise(resolve => page.once('dialog', async d=>{await d.accept();resolve();}));
      await chooseFile(page,files.legacy); await dialog; await waitToast(page,'data.importWrite');
      state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),disk:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id)}));
      check('a failed import write preserves the original in memory and storage',
        state.ids.includes('original')&&state.disk.includes('original'),JSON.stringify(state));
      await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSet;});

      dialog = new Promise(resolve => page.once('dialog', async d=>{const msg=d.message();await d.accept();resolve(msg);}));
      await chooseFile(page,files.legacy); const acceptText=await dialog;
      await page.waitForFunction(()=>getState().sessions[0]?.id==='legacy-session');
      state=await page.evaluate(()=>({s:getState(),disk:JSON.parse(localStorage.getItem(STORE_KEY))}));
      const ex=state.s.sessions[0]?.exercises[0], set=ex?.sets[0];
      check('confirming a legacy file replaces the log only after saving',
        /replace/i.test(acceptText)&&state.s.version===3&&state.disk.sessions[0].id==='legacy-session'&&state.s.profile.name==='Legacy');
      check('legacy migration preserves unknown exercise IDs, fields and entered set values',
        ex?.id==='unknown-exercise-42'&&ex.custom==='keep me'&&set?.w===47&&set.r===7&&set.customSet==='keep set'&&
        state.s.profile.extra==='kept'&&state.s.unknownTop.a===1,JSON.stringify(ex));
      await ctx.close();
    }

    /* A workout or a failed save prevents import even if a handler is invoked. */
    {
      const {ctx,page}=await fresh(); await profileData(page);
      await page.evaluate(()=>{ACTIVE={startedAt:123,exercises:[]};saveDraft();});
      await click(page,'[data-act="doImport"]'); await waitToast(page,'data.importActive');
      let state=await page.evaluate(()=>({active:ACTIVE,raw:localStorage.getItem(DRAFT_KEY),ids:getState().sessions.map(s=>s.id)}));
      check('import is blocked during an active workout without touching its draft',
        state.active.startedAt===123&&JSON.parse(state.raw).startedAt===123&&state.ids.includes('original'));
      await page.evaluate(()=>{
        ACTIVE=null;clearDraft();window.__originalSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){if(k===STORE_KEY)throw new Error('quota');return window.__originalSet.call(this,k,v);};
        addSession({id:'unsaved',exercises:[]});
      });
      await click(page,'[data-act="doImport"]'); await waitToast(page,'data.importUnsaved');
      state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),failed:STORAGE_FAILED}));
      check('import is blocked while this tab has unsaved changes',state.failed&&state.ids.includes('unsaved'));
      await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSet;});
      await ctx.close();
    }

    /* A syntactically valid but unusable disk record remains exactly intact. */
    for(const bad of ['null','[]','',JSON.stringify({version:99,profile:{},sessions:[]})]){
      const {ctx,page}=await fresh();
      await page.evaluate(raw=>localStorage.setItem(STORE_KEY,raw),bad);
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!document.getElementById('appBoot'));
      const state=await page.evaluate(()=>{
        const raw=localStorage.getItem(STORE_KEY),saved=saveState();
        return {raw,after:localStorage.getItem(STORE_KEY),held:RAW_RECORD,guard:LOAD_FAILED,newer:LOAD_NEWER,saved};
      });
      check('unreadable stored record is guarded byte-for-byte: '+JSON.stringify(bad).slice(0,45),
        state.guard&&state.raw===bad&&state.after===bad&&state.held===bad&&!state.saved&&
        state.newer===(bad.includes('99')),JSON.stringify(state));
      await ctx.close();
    }

    /* Archive failure never clears the guard or overwrites the only bytes. */
    {
      const {ctx,page}=await fresh();
      const broken='{"version":3,"sessions":[';
      await page.evaluate(raw=>{localStorage.setItem(STORE_KEY,raw);reloadState();paintStoreFlag();
        window.__originalSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){if(k.includes('.damaged.'))throw new Error('quota');return window.__originalSet.call(this,k,v);};
        window.__captured=[];URL.createObjectURL=b=>{window.__captured.push(b.text());return 'blob:durability-test';};
        HTMLAnchorElement.prototype.click=function(){};
      },broken);
      const claim=await page.evaluate(()=>{addSession({id:'not-yet-saved',exercises:[]});return {claimed:savedToast('you.saved'),guard:LOAD_FAILED};});
      check('a protected unreadable log never produces a false Saved confirmation',!claim.claimed&&claim.guard,JSON.stringify(claim));
      await click(page,'#storeFlag [data-act="storeRecovery"]');await waitToast(page,'data.archiveFailed');
      let state=await page.evaluate(async()=>({guard:LOAD_FAILED,raw:RAW_RECORD,disk:localStorage.getItem(STORE_KEY),
        archives:Object.keys(localStorage).filter(k=>k.includes('.damaged.')),downloads:await Promise.all(window.__captured)}));
      check('failed archival keeps the original bytes and the write guard',
        state.guard&&state.raw===broken&&state.disk===broken&&state.archives.length===0&&state.downloads[0]===broken,JSON.stringify(state));
      await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSet;});
      await click(page,'#storeFlag [data-act="storeRecovery"]');
      state=await page.evaluate(async()=>({guard:LOAD_FAILED,raw:localStorage.getItem(STORE_KEY),
        archived:Object.keys(localStorage).filter(k=>k.includes('.damaged.')).map(k=>localStorage.getItem(k)),
        downloads:await Promise.all(window.__captured)}));
      check('retry archives exact bytes before allowing a fresh local record',
        !state.guard&&state.archived.includes(broken)&&state.downloads.length===2&&JSON.parse(state.raw).version===3,JSON.stringify(state));
      await ctx.close();
    }

    {
      const {ctx,page}=await fresh();const broken='{"version":3,"sessions":[';
      await page.evaluate(raw=>{localStorage.setItem(STORE_KEY,raw);reloadState();paintStoreFlag();
        window.__remove=Storage.prototype.removeItem;
        Storage.prototype.removeItem=function(k){if(k===STORE_KEY)throw new Error('blocked');return window.__remove.call(this,k);};
        URL.createObjectURL=()=> 'blob:archive-test';HTMLAnchorElement.prototype.click=function(){};
      },broken);
      await click(page,'#storeFlag [data-act="storeRecovery"]');await waitToast(page,'data.archiveFailed');
      const state=await page.evaluate(()=>({guard:LOAD_FAILED,disk:localStorage.getItem(STORE_KEY),
        archives:Object.keys(localStorage).filter(k=>k.includes('.damaged.')).map(k=>localStorage.getItem(k)),
        message:document.getElementById('toast').textContent}));
      check('failed original removal keeps its guard even if the archive copy was created',
        state.guard&&state.disk===broken&&state.archives.includes(broken)&&!/no local copy/i.test(state.message),JSON.stringify(state));
      await ctx.close();
    }

    /* Exports report only an initiated download; setup failures do not change the timestamp. */
    {
      const {ctx,page}=await fresh();await profileData(page);
      await page.evaluate(()=>{window.__originalURL=URL.createObjectURL;URL.createObjectURL=()=>{throw new Error('blocked');};});
      const before=await page.evaluate(()=>getState().lastExportAt);
      await click(page,'[data-act="doExport"]');await waitToast(page,'data.exportFailed');
      let state=await page.evaluate(()=>({at:getState().lastExportAt,stored:JSON.parse(localStorage.getItem(STORE_KEY)).lastExportAt}));
      check('a failed export does not record a successful backup or change the timestamp',state.at===before&&state.stored===before,JSON.stringify(state));
      await page.evaluate(()=>{
        URL.createObjectURL=b=>{window.__export=b.text();return 'blob:durability-test';};
        HTMLAnchorElement.prototype.click=function(){};
        ACTIVE={startedAt:999,exercises:[]};
      });
      await click(page,'[data-act="doExport"]');await waitToast(page,'data.exportStarted');
      state=await page.evaluate(async()=>({at:getState().lastExportAt,file:JSON.parse(await window.__export),
        label:document.querySelector('[data-remember="profile-data"]').textContent,expected:t('you.lastBackup')}));
      check('export starts with saved-log content and does not imply the active draft was exported',
        state.at>0&&state.file.sessions.some(s=>s.id==='original')&&!('ACTIVE' in state.file)&&state.label.includes(state.expected),JSON.stringify(state));
      await ctx.close();
    }

    /* A first-time erase and an old empty-vault bug must not disable mirrors. */
    for(const legacyEmpty of [false,true]){
      const {ctx,page}=await fresh(false);
      await page.evaluate(async legacy => {
        await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(IDB_NAME);r.onsuccess=resolve;r.onerror=reject;});
        if(legacy) await new Promise((resolve,reject)=>{const r=indexedDB.open(IDB_NAME,1);r.onsuccess=()=>{r.result.close();resolve();};r.onerror=reject;});
        await new Promise(resolve=>idbMirrorClear(resolve));
        addSession({id:'after-empty-vault',exercises:[]});
      },legacyEmpty);
      await waitMirror(page);
      const state=await page.evaluate(async()=>new Promise((resolve,reject)=>{const r=indexedDB.open(IDB_NAME);r.onsuccess=()=>{
        const db=r.result;const info={version:db.version,store:db.objectStoreNames.contains(IDB_STORE)};db.close();resolve(info);};r.onerror=reject;}));
      const mirror=JSON.parse(await readMirror(page));
      check(legacyEmpty?'legacy empty vault is repaired before later writes':'first clear of an absent vault still allows later mirrors',
        state.store&&mirror.sessions.some(s=>s.id==='after-empty-vault')&&(legacyEmpty?state.version===2:state.version===1),JSON.stringify(state));
      await ctx.close();
    }

    /* Mirror recovery, an in-flight unsaved race, and failed mirror restoration. */
    {
      const {ctx,page}=await fresh();
      const old=await page.evaluate(()=>localStorage.getItem(STORE_KEY)); await writeMirror(page,old);
      await page.evaluate(()=>{
        localStorage.removeItem(STORE_KEY); LAST_STORED_RAW=null;STATE=defaultState();
        window.__originalSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){if(k===STORE_KEY)throw new Error('quota');return window.__originalSet.call(this,k,v);};
        idbRecoverIfEmpty(()=>{});addSession({id:'unsaved',exercises:[]});
      });
      await new Promise(r=>setTimeout(r,350));
      let state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),failed:STORAGE_FAILED,disk:localStorage.getItem(STORE_KEY)}));
      check('asynchronous mirror recovery never replaces a newer unsaved in-memory session',
        state.failed&&state.disk===null&&state.ids.includes('unsaved')&&!state.ids.includes('original'),JSON.stringify(state));
      await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSet;});
      state=await page.evaluate(()=>({marker:localStorage.getItem(IDB_UNCHECKED_KEY),unchecked:MIRROR_UNCHECKED}));
      check('the older mirror stays protected after a recovery race',state.unchecked&&state.marker==='1',JSON.stringify(state));
      await ctx.close();
    }
    {
      const {ctx,page}=await fresh();
      await page.evaluate(()=>{localStorage.removeItem(STORE_KEY);STATE=defaultState();LAST_STORED_RAW=null;});
      await page.evaluate(()=>idbRecoverIfEmpty(()=>{}));
      await page.waitForFunction(()=>getState().sessions.some(s=>s.id==='original'));
      state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),disk:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id)}));
      check('an intact mirror is restored to localStorage when no newer state exists',state.ids.includes('original')&&state.disk.includes('original'));
      await waitMirror(page);
      await page.evaluate(()=>{
        localStorage.removeItem(STORE_KEY);LAST_STORED_RAW=null;STATE=defaultState();STORAGE_FAILED=false;
        window.__originalSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){if(k===STORE_KEY)throw new Error('quota');return window.__originalSet.call(this,k,v);};
        idbRecoverIfEmpty(()=>{});
      });
      await page.waitForFunction(()=>STORAGE_FAILED&&getState().sessions.some(s=>s.id==='original'));
      state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),failed:STORAGE_FAILED,damaged:LOAD_FAILED,disk:localStorage.getItem(STORE_KEY)}));
      check('a valid mirror refused by storage stays exportable in memory with a write warning',
        state.failed&&!state.damaged&&state.disk===null&&state.ids.includes('original'),JSON.stringify(state));
      await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSet;retryStore();});
      state=await page.evaluate(()=>({failed:STORAGE_FAILED,ids:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id)}));
      check('retry saves the recovered mirror once storage works',!state.failed&&state.ids.includes('original'),JSON.stringify(state));
      await ctx.close();
    }

    /* Even successful writes made while recovery is still opening must not replace an older mirror. */
    {
      const {ctx,page}=await fresh();const old=await page.evaluate(()=>localStorage.getItem(STORE_KEY));
      await page.evaluate(()=>{
        localStorage.removeItem(STORE_KEY);STATE=defaultState();LAST_STORED_RAW=null;
        window.__open=indexedDB.open.bind(indexedDB);window.__hold=true;
        indexedDB.open=function(...args){const r=window.__open(...args);if(!window.__hold)return r;window.__hold=false;
          const proxy={get result(){return r.result;},onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};
          r.onupgradeneeded=e=>proxy.onupgradeneeded?.(e);r.onsuccess=e=>{window.__releaseRecovery=()=>proxy.onsuccess?.(e);};
          r.onerror=e=>proxy.onerror?.(e);r.onblocked=e=>proxy.onblocked?.(e);return proxy;};
        idbRecoverIfEmpty(()=>{});
      });
      await page.waitForFunction(()=>typeof window.__releaseRecovery==='function');
      await page.evaluate(()=>{addSession({id:'new-before-recovery',exercises:[]});window.__releaseRecovery();});
      await new Promise(r=>setTimeout(r,300));
      const state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),disk:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id),
        unchecked:MIRROR_UNCHECKED,marker:localStorage.getItem(IDB_UNCHECKED_KEY)}));
      const mirror=await readMirror(page);
      check('a pending recovery keeps both a newer successful primary write and the older mirror',
        state.ids.includes('new-before-recovery')&&state.disk.includes('new-before-recovery')&&state.unchecked&&state.marker==='1'&&mirror===old,JSON.stringify(state));
      await ctx.close();
    }

    /* A failed vault open must not let a new log overwrite the only old mirror. */
    {
      const {ctx,page}=await fresh();
      const old=await page.evaluate(()=>localStorage.getItem(STORE_KEY));
      await page.evaluate(()=>localStorage.removeItem(STORE_KEY));
      await page.evaluateOnNewDocument(()=>{
        const open=indexedDB.open.bind(indexedDB);window.__allowMirror=false;
        indexedDB.open=(...args)=>{if(!window.__allowMirror)throw new Error('blocked');return open(...args);};
      });
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!document.getElementById('appBoot')&&MIRROR_UNCHECKED);
      await page.evaluate(()=>{window.__allowMirror=true;chooseLang('en');finishOnboarding();addSession({id:'new-log',exercises:[]});});
      await new Promise(r=>setTimeout(r,250));
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!document.getElementById('appBoot')&&MIRROR_UNCHECKED);
      await page.evaluate(()=>{window.__allowMirror=true;});
      let state=await page.evaluate(()=>({marker:localStorage.getItem(IDB_UNCHECKED_KEY),unchecked:MIRROR_UNCHECKED,
        title:document.querySelector('#storeFlag .sf-t').textContent,expected:t('data.mirrorTitle'),ids:getState().sessions.map(s=>s.id)}));
      let mirror=await readMirror(page);
      check('a failed mirror check blocks later overwrites and gives a warning',
        state.marker==='1'&&state.unchecked&&state.title===state.expected&&state.ids.includes('new-log')&&mirror===old,JSON.stringify(state));
      const other=await ctx.newPage();other.on('pageerror',e=>errors.push(e.message));
      await other.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await other.goto(url,{waitUntil:'load'});await other.waitForFunction(()=>!document.getElementById('appBoot')&&MIRROR_UNCHECKED);
      const activeCopy=await page.evaluate(()=>{ACTIVE={startedAt:333,exercises:[]};paintStoreFlag();
        const body=document.querySelector('#storeFlag .sf-b').textContent, note=t('data.exportNote');ACTIVE=null;paintStoreFlag();return {body,note};});
      check('unchecked-mirror warning explains that an active workout is not exported',activeCopy.body.includes(activeCopy.note));
      await page.setViewport({width:320,height:844,deviceScaleFactor:1});
      for(const lang of ['en','fr','es','de','it','nl','ar']){
        const fit=await page.evaluate(l=>{switchLang(l);const f=document.getElementById('storeFlag');return {
          title:f.querySelector('.sf-t').textContent,expected:t('data.mirrorTitle'),
          body:f.querySelector('.sf-b').textContent,expectedBody:t('data.mirrorBody'),
          width:document.documentElement.scrollWidth,viewport:innerWidth,
          clipped:[...f.querySelectorAll('.sf-t,.sf-b,.sf-x')].some(el=>el.scrollWidth>el.clientWidth+1)};},lang);
        check('unchecked-mirror warning is localized and fits at 320px: '+lang,
          fit.title===fit.expected&&fit.body===fit.expectedBody&&fit.width<=fit.viewport&&!fit.clipped,JSON.stringify(fit));
      }
      await page.evaluate(()=>switchLang('en'));
      await page.evaluate(()=>{window.__originalSet=Storage.prototype.setItem;
        URL.createObjectURL=b=>{window.__failedDownload=b.text();return 'blob:older-copy';};HTMLAnchorElement.prototype.click=function(){};
        Storage.prototype.setItem=function(k,v){if(k.includes('.damaged.'))throw new Error('quota');return window.__originalSet.call(this,k,v);};});
      await click(page,'#storeFlag [data-act="storeRecovery"]');await waitToast(page,'data.archiveFailed');
      state=await page.evaluate(async()=>({marker:localStorage.getItem(IDB_UNCHECKED_KEY),unchecked:MIRROR_UNCHECKED,download:await window.__failedDownload}));mirror=await readMirror(page);
      check('failed archival preserves the old mirror and offers its exact bytes as a download',
        state.marker==='1'&&state.unchecked&&state.download===old&&mirror===old,JSON.stringify(state));
      await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSet;
        URL.createObjectURL=b=>{window.__olderDownload=b.text();return 'blob:older-copy';};HTMLAnchorElement.prototype.click=function(){};});
      await click(page,'#storeFlag [data-act="storeRecovery"]');
      await page.waitForFunction(()=>!MIRROR_UNCHECKED&&localStorage.getItem(IDB_UNCHECKED_KEY)===null);
      await other.waitForFunction(()=>!MIRROR_UNCHECKED);
      check('other open tabs clear the unchecked warning after a verified archive',true);
      await waitMirror(page);
      state=await page.evaluate(async()=>({archives:Object.keys(localStorage).filter(k=>k.includes('.damaged.')).map(k=>localStorage.getItem(k)),
        download:await window.__olderDownload,current:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id)}));
      mirror=JSON.parse(await readMirror(page));
      check('retry archives and downloads the exact older mirror before mirroring the new log',
        state.archives.includes(old)&&state.download===old&&state.current.includes('new-log')&&mirror.sessions.some(s=>s.id==='new-log'),JSON.stringify(state));
      await ctx.close();
    }

    {
      const {ctx,page}=await fresh();page.on('dialog',async d=>await d.accept());
      await page.evaluate(()=>startCustomSession());
      await page.waitForFunction(()=>ACTIVE&&ACTIVE.exercises.length>0&&!!localStorage.getItem(DRAFT_KEY));
      const started=await page.evaluate(()=>ACTIVE.startedAt);await waitMirror(page);
      await page.evaluate(()=>localStorage.removeItem(STORE_KEY));
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!document.getElementById('appBoot'));
      await page.waitForFunction(()=>getState().onboarded&&getState().sessions.some(s=>s.id==='original'));
      const state=await page.evaluate(()=>({view:VIEW,started:ACTIVE?.startedAt,ids:getState().sessions.map(s=>s.id)}));
      check('mirror recovery retains the active workout and returns to its screen',
        state.view==='session'&&state.started===started&&state.ids.includes('original'),JSON.stringify(state));
      await ctx.close();
    }

    for(const raw of ['null',JSON.stringify({version:99,profile:{},sessions:[]})]){
      const {ctx,page}=await fresh(false);await writeMirror(page,raw);
      await page.evaluate(()=>{localStorage.removeItem(STORE_KEY);LAST_STORED_RAW=null;STATE=defaultState();idbRecoverIfEmpty(()=>{});});
      await page.waitForFunction(()=>LOAD_FAILED);
      const state=await page.evaluate(()=>({raw:RAW_RECORD,disk:localStorage.getItem(STORE_KEY),newer:LOAD_NEWER,saved:saveState()}));
      check('unreadable mirror is held without being downgraded: '+raw.slice(0,30),
        state.raw===raw&&state.disk===null&&!state.saved&&state.newer===raw.includes('99'),JSON.stringify(state));
      await ctx.close();
    }

    /* An unreadable primary on boot must never be replaced once reads recover. */
    {
      const {ctx,page}=await fresh();
      await page.evaluateOnNewDocument(()=>{
        const original=Storage.prototype.getItem;window.__readAllowed=false;window.__originalGet=original;
        Storage.prototype.getItem=function(k){if(k==='ancestor.state.v1'&&!window.__readAllowed)throw new Error('blocked');return original.call(this,k);};
      });
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!document.getElementById('appBoot'));
      await page.evaluate(()=>{addSession({id:'unsaved-after-read-error',exercises:[]});window.__readAllowed=true;retryStore();});
      const state=await page.evaluate(()=>({readFailed:STORAGE_READ_FAILED,failed:STORAGE_FAILED,conflict:STORE_CONFLICT,
        ids:getState().sessions.map(s=>s.id),disk:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id)}));
      check('a failed boot read cannot later overwrite an unseen record',
        state.readFailed&&state.failed&&state.conflict&&state.ids.includes('unsaved-after-read-error')&&state.disk.includes('original'),JSON.stringify(state));
      await ctx.close();
    }

    /* Real tabs: a clean tab adopts a write; a dirty one preserves and exports its branch. */
    {
      const {ctx,page:a}=await fresh();const b=await ctx.newPage();
      b.on('pageerror',e=>errors.push(e.message));
      await b.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await b.goto(url,{waitUntil:'load'});await b.waitForFunction(()=>!document.getElementById('appBoot'));
      await b.evaluate(()=>addSession({id:'clean-update',exercises:[]}));
      await a.waitForFunction(()=>getState().sessions.some(s=>s.id==='clean-update'));
      let state=await a.evaluate(()=>({ids:getState().sessions.map(s=>s.id),failed:STORAGE_FAILED,conflict:STORE_CONFLICT}));
      check('a clean tab adopts another tab’s saved update',!state.failed&&!state.conflict&&state.ids.includes('clean-update'),JSON.stringify(state));
      await a.evaluate(()=>{
        window.__originalSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){if(k===STORE_KEY)throw new Error('quota');return window.__originalSet.call(this,k,v);};
        addSession({id:'tab-a-unsaved',exercises:[]});
      });
      await b.evaluate(()=>addSession({id:'tab-b-saved',exercises:[]}));
      await a.waitForFunction(()=>STORE_CONFLICT);
      await a.evaluate(()=>{Storage.prototype.setItem=window.__originalSet;retryStore();saveState();});
      state=await a.evaluate(()=>({ids:getState().sessions.map(s=>s.id),disk:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id),
        conflict:STORE_CONFLICT,failed:STORAGE_FAILED,title:document.querySelector('#storeFlag .sf-t').textContent,
        expected:t('data.conflictTitle')}));
      check('a storage event preserves unsaved tab A and leaves tab B’s write intact',
        state.conflict&&state.failed&&state.ids.includes('tab-a-unsaved')&&!state.ids.includes('tab-b-saved')&&
        state.disk.includes('tab-b-saved')&&!state.disk.includes('tab-a-unsaved')&&state.title===state.expected,JSON.stringify(state));
      await a.setViewport({width:320,height:844,deviceScaleFactor:1});
      for(const theme of ['dark','paper']){
        await a.evaluate(value=>{getState().profile.display.theme=value;document.documentElement.dataset.theme=value;},theme);
        for(const lang of ['en','fr','es','de','it','nl','ar']){
          const warning=await a.evaluate(l=>{
            switchLang(l);const flag=document.getElementById('storeFlag');
            return {title:flag.querySelector('.sf-t').textContent,expected:t('data.conflictTitle'),
              body:flag.querySelector('.sf-b').textContent,expectedBody:t('data.conflictBody'),
              hidden:flag.hidden,width:document.documentElement.scrollWidth,viewport:innerWidth,
              clipped:[...flag.querySelectorAll('.sf-t,.sf-b,.sf-x')].some(el=>el.scrollWidth>el.clientWidth+1)};
          },lang);
          check('conflict warning fits and is localized at 320px: '+theme+' / '+lang,
            !warning.hidden&&warning.title===warning.expected&&warning.body===warning.expectedBody&&
            warning.width<=warning.viewport&&!warning.clipped,JSON.stringify(warning));
        }
      }
      await a.evaluate(()=>{
        ACTIVE={startedAt:222,exercises:[]};paintStoreFlag();
        URL.createObjectURL=b=>{window.__branchExport=b.text();return 'blob:branch-export';};HTMLAnchorElement.prototype.click=function(){};
      });
      state=await a.evaluate(()=>({body:document.querySelector('#storeFlag .sf-b').textContent,expected:t('data.conflictActive')}));
      check('an active conflict explicitly warns that the workout is excluded',state.body===state.expected);
      await click(a,'#storeFlag [data-act="storeRecovery"]');
      state=await a.evaluate(async()=>({file:JSON.parse(await window.__branchExport),disk:JSON.parse(localStorage.getItem(STORE_KEY))}));
      check('the conflict action exports this tab’s unsaved branch without overwriting the other tab',
        state.file.sessions.some(s=>s.id==='tab-a-unsaved')&&state.disk.sessions.some(s=>s.id==='tab-b-saved'));
      await ctx.close();
    }

    /* Two tabs editing the same live workout must not overwrite each other. */
    {
      const {ctx,page:a}=await fresh();
      a.on('dialog',async d=>await d.accept());
      await a.evaluate(()=>startCustomSession());
      await a.waitForFunction(()=>ACTIVE && ACTIVE.exercises.length>0 && localStorage.getItem(DRAFT_KEY));
      const b=await ctx.newPage();b.on('pageerror',e=>errors.push(e.message));
      await b.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await b.goto(url,{waitUntil:'load'});await b.waitForFunction(()=>!document.getElementById('appBoot')&&!!ACTIVE);
      await a.evaluate(()=>{
        window.__draftSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){if(k===DRAFT_KEY)throw new Error('quota');return window.__draftSet.call(this,k,v);};
        ACTIVE.exercises[0].sets[0].w='61';saveDraft();
      });
      await b.evaluate(()=>{ACTIVE.exercises[0].sets[0].w='82';saveDraft();});
      await a.waitForFunction(()=>DRAFT_CONFLICT);
      let state=await a.evaluate(()=>{
        Storage.prototype.setItem=window.__draftSet;retryStore();const saved=saveDraft();const cleared=clearDraft();
        return {conflict:DRAFT_CONFLICT,failed:DRAFT_STORAGE_FAILED,saved,cleared,
          memory:ACTIVE.exercises[0].sets[0].w,disk:JSON.parse(localStorage.getItem(DRAFT_KEY)).exercises[0].sets[0].w,
          title:document.querySelector('#storeFlag .sf-t').textContent,expected:t('data.draftConflictTitle')};
      });
      check('another tab’s draft write preserves this tab’s unsaved workout and pauses retry',
        state.conflict&&state.failed&&!state.saved&&!state.cleared&&state.memory==='61'&&state.disk==='82'&&state.title===state.expected,JSON.stringify(state));
      await a.setViewport({width:320,height:844,deviceScaleFactor:1});
      for(const lang of ['en','fr','es','de','it','nl','ar']){
        const fit=await a.evaluate(l=>{switchLang(l);const f=document.getElementById('storeFlag');return {
          title:f.querySelector('.sf-t').textContent,expected:t('data.draftConflictTitle'),
          body:f.querySelector('.sf-b').textContent,expectedBody:t('data.draftConflictActive'),
          width:document.documentElement.scrollWidth,viewport:innerWidth,
          clipped:[...f.querySelectorAll('.sf-t,.sf-b,.sf-x')].some(el=>el.scrollWidth>el.clientWidth+1)};},lang);
        check('live draft-conflict warning is localized and fits at 320px: '+lang,
          fit.title===fit.expected&&fit.body===fit.expectedBody&&fit.width<=fit.viewport&&!fit.clipped,JSON.stringify(fit));
      }
      await a.evaluate(()=>discardSession());
      state=await a.evaluate(()=>({active:!!ACTIVE,disk:JSON.parse(localStorage.getItem(DRAFT_KEY)).exercises[0].sets[0].w,conflict:DRAFT_CONFLICT}));
      check('explicitly discarding this tab’s workout does not erase the other tab’s draft',!state.active&&state.disk==='82'&&state.conflict,JSON.stringify(state));
      await ctx.close();
    }

    /* A second idle tab cannot start over a workout created elsewhere. */
    {
      const {ctx,page:a}=await fresh();const b=await ctx.newPage();
      b.on('pageerror',e=>errors.push(e.message));
      await b.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await b.goto(url,{waitUntil:'load'});await b.waitForFunction(()=>!document.getElementById('appBoot'));
      a.on('dialog',async d=>await d.accept());await a.evaluate(()=>startCustomSession());
      await a.waitForFunction(()=>!!ACTIVE&&!!localStorage.getItem(DRAFT_KEY));
      await b.waitForFunction(()=>DRAFT_CONFLICT);
      const state=await b.evaluate(()=>{const raw=localStorage.getItem(DRAFT_KEY);startCustomSession();return {
        active:!!ACTIVE,conflict:DRAFT_CONFLICT,same:localStorage.getItem(DRAFT_KEY)===raw,
        label:document.querySelector('#storeFlag .sf-x').textContent,expected:t('data.draftReload')};});
      check('an idle tab cannot start a new workout over another tab’s draft',
        !state.active&&state.conflict&&state.same&&state.label===state.expected,JSON.stringify(state));
      await ctx.close();
    }

    for(const broken of ['null','[]','', '{"startedAt":123,"exercises":[']){
      const {ctx,page}=await fresh();await page.evaluate(raw=>localStorage.setItem(DRAFT_KEY,raw),broken);
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!document.getElementById('appBoot'));
      await page.evaluate(()=>{
        URL.createObjectURL=b=>{window.__draftDownload=b.text();return 'blob:unreadable-draft';};
        HTMLAnchorElement.prototype.click=function(){};startCustomSession();
      });
      let state=await page.evaluate(()=>({raw:RAW_DRAFT,disk:localStorage.getItem(DRAFT_KEY),active:!!ACTIVE,
        title:document.querySelector('#storeFlag .sf-t').textContent,expected:t('data.draftUnreadableTitle')}));
      check('unreadable workout draft remains protected: '+JSON.stringify(broken).slice(0,35),
        state.raw===broken&&state.disk===broken&&!state.active&&state.title===state.expected,JSON.stringify(state));
      await click(page,'#storeFlag [data-act="storeRecovery"]');
      state=await page.evaluate(async()=>({download:await window.__draftDownload,disk:localStorage.getItem(DRAFT_KEY),raw:RAW_DRAFT}));
      check('unreadable workout draft can be downloaded byte-for-byte without clearing its guard: '+JSON.stringify(broken).slice(0,35),
        state.download===broken&&state.disk===broken&&state.raw===broken,JSON.stringify(state));
      await ctx.close();
    }

    /* Hold a real IndexedDB open callback to simulate a late put after erase. */
    {
      const {ctx,page}=await fresh(); await profileData(page);
      await page.evaluate(()=>{
        localStorage.setItem(STORE_KEY+'.damaged.fixture','old unreadable bytes');
        localStorage.setItem(DRAFT_KEY,JSON.stringify({startedAt:123,exercises:[]}));
        window.__open=indexedDB.open.bind(indexedDB);window.__hold=true;
        indexedDB.open=function(...args){
          const r=window.__open(...args);
          if(!window.__hold || args[0]!==IDB_NAME)return r;
          window.__hold=false;
          const proxy={get result(){return r.result;},onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};
          r.onupgradeneeded=e=>proxy.onupgradeneeded?.(e);
          r.onsuccess=e=>{window.__releaseHeld=()=>proxy.onsuccess?.(e);};
          r.onerror=e=>proxy.onerror?.(e);r.onblocked=e=>proxy.onblocked?.(e);
          return proxy;
        };
        addSession({id:'queued-before-erase',exercises:[]});
      });
      await page.waitForFunction(()=>typeof window.__releaseHeld==='function');
      const dialogs=[];page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
      await click(page,'[data-act="doErase"]');
      await page.waitForFunction(()=>localStorage.getItem(STORE_KEY)===null&&localStorage.getItem(IDB_ERASE_KEY)==='1');
      await page.waitForFunction(()=>VIEW==='onb');
      await page.evaluate(()=>window.__releaseHeld());
      await new Promise(r=>setTimeout(r,300));
      let mirror=await readMirror(page);
      let state=await page.evaluate(()=>({raw:localStorage.getItem(STORE_KEY),draft:localStorage.getItem(DRAFT_KEY),
        archives:Object.keys(localStorage).filter(k=>k.includes('.damaged.')),incomplete:ERASE_INCOMPLETE,marker:localStorage.getItem(IDB_ERASE_KEY)}));
      check('two actual erase confirmations precede removal of primary, draft and archived records',
        dialogs.length===2&&/delete/i.test(dialogs[0])&&state.raw===null&&state.draft===null&&state.archives.length===0&&!state.incomplete,JSON.stringify({dialogs,state}));
      check('a delayed pre-erase IndexedDB put cannot resurrect the deleted mirror',mirror===null&&state.marker==='1',JSON.stringify({mirror,state}));
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!document.getElementById('appBoot'));
      state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),active:!!ACTIVE,raw:localStorage.getItem(STORE_KEY)}));
      check('reload after erase cannot restore the old log or workout',state.ids.length===0&&!state.active&&state.raw===null,JSON.stringify(state));
      await page.evaluate(()=>{chooseLang('en');finishOnboarding();addSession({id:'new-after-erase',exercises:[]});});await waitMirror(page);
      await page.waitForFunction(()=>localStorage.getItem(IDB_ERASE_KEY)===null);
      await page.evaluate(()=>localStorage.removeItem(STORE_KEY));
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!document.getElementById('appBoot'));
      await page.waitForFunction(()=>getState().sessions.some(s=>s.id==='new-after-erase'));
      state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),disk:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id)}));
      check('a new record written after erase gets its own usable mirror',state.ids.includes('new-after-erase')&&state.disk.includes('new-after-erase'));
      await ctx.close();
    }

    /* A delayed erase must not clear a new mirror created after the erase. */
    {
      const {ctx,page}=await fresh();await profileData(page);
      await page.evaluate(()=>{
        window.__open=indexedDB.open.bind(indexedDB);window.__hold=true;
        indexedDB.open=function(...args){
          const r=window.__open(...args);if(!window.__hold||args[0]!==IDB_NAME)return r;
          window.__hold=false;
          const proxy={get result(){return r.result;},onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};
          r.onupgradeneeded=e=>proxy.onupgradeneeded?.(e);r.onsuccess=e=>{window.__releaseClear=()=>proxy.onsuccess?.(e);};
          r.onerror=e=>proxy.onerror?.(e);r.onblocked=e=>proxy.onblocked?.(e);return proxy;
        };
        window.confirm=()=>true;doErase();
      });
      await page.waitForFunction(()=>typeof window.__releaseClear==='function');
      await page.evaluate(()=>{getState().onboarded=true;getState().langChosen=true;addSession({id:'new-before-clear',exercises:[]});});
      await waitMirror(page);
      await page.evaluate(()=>window.__releaseClear());
      await new Promise(r=>setTimeout(r,300));
      const mirror=JSON.parse(await readMirror(page));
      const state=await page.evaluate(()=>({ids:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id),
        marker:localStorage.getItem(IDB_ERASE_KEY),incomplete:ERASE_INCOMPLETE}));
      check('a delayed erase preserves a newer primary and its mirror',
        state.ids.includes('new-before-clear')&&mirror.sessions.some(s=>s.id==='new-before-clear')&&state.marker===null&&!state.incomplete,JSON.stringify(state));
      await ctx.close();
    }

    /* A failed mirror clear is disclosed and its tombstone prevents resurrection. */
    {
      const {ctx,page}=await fresh();await profileData(page);
      await page.evaluate(()=>{window.__open=indexedDB.open.bind(indexedDB);indexedDB.open=()=>{throw new Error('blocked');};});
      const dialogs=[];page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
      await click(page,'[data-act="doErase"]');
      await page.waitForFunction(()=>ERASE_INCOMPLETE);
      let state=await page.evaluate(()=>({marker:localStorage.getItem(IDB_ERASE_KEY),notice:localStorage.getItem(ERASE_NOTICE_KEY),
        raw:localStorage.getItem(STORE_KEY),title:document.querySelector('#storeFlag .sf-t').textContent,expected:t('data.eraseIncompleteTitle')}));
      check('failed IndexedDB deletion raises a persistent, actionable warning',
        state.raw===null&&state.marker==='1'&&state.notice==='1'&&state.title===state.expected,JSON.stringify(state));
      await page.evaluate(()=>{indexedDB.open=window.__open;});
      const old=await readMirror(page);
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!document.getElementById('appBoot'));
      await new Promise(r=>setTimeout(r,200));
      state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),raw:localStorage.getItem(STORE_KEY),
        warning:ERASE_INCOMPLETE&&!document.getElementById('storeFlag').hidden}));
      check('failed mirror clear cannot silently restore old data after reload',
        !!old&&state.ids.length===0&&state.raw===null&&state.warning,JSON.stringify(state));
      await click(page,'#storeFlag [data-act="storeRecovery"]');
      state=await page.evaluate(()=>({notice:ERASE_INCOMPLETE,stored:localStorage.getItem(ERASE_NOTICE_KEY),marker:localStorage.getItem(IDB_ERASE_KEY)}));
      check('the erase warning can be dismissed without removing the recovery tombstone',
        !state.notice&&state.stored===null&&state.marker==='1',JSON.stringify(state));
      await ctx.close();
    }

    /* A draft-removal failure is reported and cannot reopen an erased workout. */
    {
      const {ctx,page}=await fresh();await profileData(page);
      await page.evaluate(()=>{
        ACTIVE={startedAt:456,exercises:[]};saveDraft();
        window.__remove=Storage.prototype.removeItem;
        Storage.prototype.removeItem=function(k){if(k===DRAFT_KEY)throw new Error('blocked');return window.__remove.call(this,k);};
      });
      page.on('dialog',async d=>await d.accept());await click(page,'[data-act="doErase"]');
      await page.waitForFunction(()=>ERASE_INCOMPLETE);
      let state=await page.evaluate(()=>({marker:localStorage.getItem(DRAFT_ERASE_KEY),old:localStorage.getItem(DRAFT_KEY),notice:ERASE_INCOMPLETE}));
      check('failed draft removal is reported and leaves an erase marker',state.marker==='1'&&!!state.old&&state.notice,JSON.stringify(state));
      await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!document.getElementById('appBoot'));
      state=await page.evaluate(()=>({active:!!ACTIVE,marker:localStorage.getItem(DRAFT_ERASE_KEY),old:localStorage.getItem(DRAFT_KEY)}));
      check('an erased draft is not reopened even if its physical removal failed',!state.active&&state.marker==='1'&&!!state.old,JSON.stringify(state));
      state=await page.evaluate(()=>{ACTIVE={startedAt:789,exercises:[]};const ok=saveDraft();return {ok,marker:localStorage.getItem(DRAFT_ERASE_KEY),draft:JSON.parse(localStorage.getItem(DRAFT_KEY))};});
      check('a newly written workout replaces the old draft and clears the draft marker',state.ok&&state.marker===null&&state.draft.startedAt===789,JSON.stringify(state));
      await ctx.close();
    }

    /* Failure to delete the primary must not reset the in-memory session. */
    {
      const {ctx,page}=await fresh();await profileData(page);
      await page.evaluate(()=>{window.__remove=Storage.prototype.removeItem;
        Storage.prototype.removeItem=function(k){if(k===STORE_KEY)throw new Error('blocked');return window.__remove.call(this,k);};});
      page.on('dialog',async d=>await d.accept());await click(page,'[data-act="doErase"]');await waitToast(page,'data.eraseFailed');
      const state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),disk:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id),view:VIEW}));
      check('a failed primary deletion does not reset the app or its log',
        state.ids.includes('original')&&state.disk.includes('original')&&state.view==='profile',JSON.stringify(state));
      await ctx.close();
    }

    /* On the HTTP build, exercise a cached offline recovery as well. */
    if(/^https?:/.test(url)){
      const {ctx,page}=await fresh();
      await page.waitForFunction(async()=>{
        await navigator.serviceWorker.ready;const c=await caches.open('ancestor-'+APP_BUILD);
        return !!(await c.match('./index.html'))&&!!(await c.match('./js/i18n/data_safety.js'));
      },{timeout:30000});
      const raw=await page.evaluate(()=>localStorage.getItem(STORE_KEY));await writeMirror(page,raw);
      await page.evaluate(()=>localStorage.removeItem(STORE_KEY));
      await page.setOfflineMode(true);await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!document.getElementById('appBoot'));
      await page.waitForFunction(()=>getState().sessions.some(s=>s.id==='original'));
      const state=await page.evaluate(()=>({ids:getState().sessions.map(s=>s.id),disk:JSON.parse(localStorage.getItem(STORE_KEY)).sessions.map(s=>s.id),
        copy:t('data.exportNote'),build:APP_BUILD}));
      check('the cached v45 app recovers a saved mirror and localized safety copy offline',
        state.ids.includes('original')&&state.disk.includes('original')&&state.copy.includes('active workout')&&state.build==='v45',JSON.stringify(state));
      await page.setOfflineMode(false);await ctx.close();
    }
    check('no uncaught browser errors in durability journeys',errors.length===0,errors.join('; '));
  } finally { await browser.close(); fs.rmSync(temp,{recursive:true,force:true}); }
  console.log('\n'+passed+' passed, '+failed+' failed');
  if(failed) process.exitCode=1;
})().catch(error=>{console.error(error.stack||error);fs.rmSync(temp,{recursive:true,force:true});process.exitCode=1;});
