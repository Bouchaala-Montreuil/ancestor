/* ============================================================================
   ANCESTOR — i18n runtime. Loaded first; everything else depends on t().
   ========================================================================== */

let CURRENT_LANG = 'en';
try {
  const saved = localStorage.getItem('ancestor.lang');
  if (saved && LANGS.indexOf(saved) >= 0) CURRENT_LANG = saved;
} catch (e) {}

/* t() interpolates {name} placeholders when a vars object is passed.
   Previously it silently ignored them, so callers like
   t('why.prog.what', {load:60}) rendered the raw "{load}" text. */
function t(key, vars){
  let s;
  const bag = T[CURRENT_LANG];
  if (bag && bag[key] !== undefined && bag[key] !== '') s = bag[key];
  else if (T.en && T.en[key] !== undefined) s = T.en[key];
  else return key;                 // never blank, never throw
  if (vars) Object.keys(vars).forEach(k => { s = String(s).split('{' + k + '}').join(vars[k]); });
  return s;
}
function setLang(l){
  CURRENT_LANG = l;
  try{ localStorage.setItem('ancestor.lang', l); }catch(e){}
  if(typeof applyLocale === 'function') applyLocale(l);
}
/* Apply the saved direction on first paint to avoid a visible LTR flash. */
try {
  if(typeof applyLocale === 'function') applyLocale(CURRENT_LANG);
} catch(e){}
/* langLabel lives in locale.js, which owns the locale tables and the RTL rule.
   A second, shorter copy here was shadowed by it and quietly did nothing. */

/* Interpolate {n} placeholders */
function tf(key, vars){
  let s = t(key);
  if (!vars) return s;
  Object.keys(vars).forEach(k => { s = s.split('{'+k+'}').join(vars[k]); });
  return s;
}
