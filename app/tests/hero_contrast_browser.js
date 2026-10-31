/* Conservative hero contrast bound in Chromium. Axe cannot sample text over a
   background image. This checks the shipped gradient and text styles against
   an all-white image, the brightest possible backdrop, in both themes. It is
   not a substitute for manual visual or assistive-technology testing. */
const path = require('path');
const {pathToFileURL} = require('url');
const puppeteer = require('puppeteer');
const target = process.env.ANCESTOR_TEST_TARGET || path.resolve(__dirname,'../index.html');
const url = /^https?:\/\//.test(target) ? target : pathToFileURL(path.resolve(target)).href;
let pass=0, fail=0;
function check(name,ok,detail){
  if(ok){pass++;console.log('  PASS  '+name+(detail?' — '+detail:''));}
  else {fail++;console.error('  FAIL  '+name+(detail?' — '+detail:''));}
}
function luminance(rgb){
  return rgb.map(c=>c/255).map(c=>c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4))
    .reduce((sum,c,i)=>sum+c*[0.2126,0.7152,0.0722][i],0);
}
function ratio(fg,bg){return (luminance(fg)+0.05)/(luminance(bg)+0.05);}
function worstRatio(fg,scrim,alpha,grain){
  // Bound both sides independently: bright white behind the least-opaque
  // gradient stop, then maximally light grain on the background and dark grain
  // on the text. Any actual image and bounded blend must be no worse.
  const bg=scrim.map(c=>((1-alpha)*255+alpha*c)*(1-grain)+255*grain);
  const text=fg.map(c=>c*(1-grain));
  return ratio(text,bg);
}
function rgb(value){
  const m=/^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)$/.exec(value);
  return m ? [Number(m[1]),Number(m[2]),Number(m[3]),m[4]===undefined?1:Number(m[4])] : null;
}
(async()=>{
  check('contrast calculation rejects a missing scrim',worstRatio([213,210,202],[9,9,9],0,0.035)<4.5);
  const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox',
    '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await browser.createBrowserContext(), page=await ctx.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.setViewport({width:390,height:844});
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.goto(url,{waitUntil:'load'});
    await page.waitForFunction(()=>!document.getElementById('appBoot'),{timeout:30000});
    await page.evaluate(()=>{chooseLang('en');finishOnboarding();});
    for(const theme of ['dark','paper']){
      await page.evaluate(theme=>setDisplay('theme',theme),theme);
      for(const [view,marker] of Object.entries({home:'.masthead-today',session:'.masthead-train',
        library:'.masthead-library',progress:'.masthead-progress',profile:'.masthead-profile',body:'.masthead-body'})){
        await page.evaluate(view=>{if(view==='session')openTrain();else if(view==='library')openExerciseLibrary();else go(view);},view);
        await page.waitForSelector(marker,{timeout:15000});
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const styles=await page.evaluate(selector=>{
          const hero=document.querySelector(selector), before=getComputedStyle(hero,'::before'), root=getComputedStyle(hero);
          const grain=getComputedStyle(document.body,'::after');
          const texts=[...hero.querySelectorAll('.masthead-idx,.masthead-title,.masthead-sub')].map(el=>{
            const css=getComputedStyle(el); return {selector:el.className,color:css.color,opacity:css.opacity};
          });
          return {gradient:before.backgroundImage,content:before.content,position:before.position,
            inset:before.inset,zIndex:before.zIndex,opacity:before.opacity,isolation:root.isolation,
            image:root.backgroundImage,grain:Number(grain.opacity),texts};
        },marker);
        const stops=[...styles.gradient.matchAll(/rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)/g)]
          .map(m=>m.slice(1).map(Number));
        const valid=styles.content==='""' && styles.position==='absolute' && styles.inset==='0px' &&
          styles.zIndex==='-1' && Number(styles.opacity)===1 && styles.isolation==='isolate' &&
          styles.image!=='none' && stops.length>=2 && stops.every(s=>s.slice(0,3).every(c=>c===9)) &&
          styles.texts.length===((view==='progress'||view==='profile')?2:3) &&
          styles.texts.some(t=>t.selector==='masthead-idx') && styles.texts.some(t=>t.selector==='masthead-title') &&
          styles.texts.every(t=>Number(t.opacity)===1 && rgb(t.color)?.[3]===1) &&
          styles.grain>=0 && styles.grain<=1;
        const minAlpha=valid?Math.min(...stops.map(s=>s[3])):0;
        const results=valid?styles.texts.map(t=>({selector:t.selector,ratio:worstRatio(rgb(t.color).slice(0,3),[9,9,9],minAlpha,styles.grain)})):[];
        check(theme+' / '+view+' hero has ≥4.5:1 conservative contrast over any image',
          valid && results.every(r=>r.ratio>=4.5),valid?results.map(r=>r.selector+' '+r.ratio.toFixed(2)+':1').join(', '):JSON.stringify(styles));
      }
    }
    check('no uncaught browser errors',errors.length===0,errors.join('; '));
  }finally{await ctx.close();await browser.close();}
  console.log('\n'+pass+' passed, '+fail+' failed.');
  if(fail)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
