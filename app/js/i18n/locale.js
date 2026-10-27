/* ============================================================================
   ANCESTOR — locale, RTL, formatting and coverage

   Localization must fail visibly, never silently. `coverage()` measures the
   real number of translated keys so the UI can say "partially supported"
   instead of falling back to English with no warning.
   ========================================================================== */

/* Arabic is the first right-to-left language. Add more here as they land. */
const RTL_LANGS = ['ar','fa','he','ur'];

/* BCP-47 tags used for dates, numbers and plural rules. */
const LOCALE_TAG = {
  en:'en-GB', fr:'fr-FR', es:'es-ES', de:'de-DE', it:'it-IT', nl:'nl-NL', ar:'ar'
};
const LANG_NAME = {
  en:'English', fr:'Français', es:'Español', de:'Deutsch', it:'Italiano', nl:'Nederlands', ar:'العربية'
};

function localeTag(lang){ return LOCALE_TAG[lang] || 'en-GB'; }
function isRTL(lang){ return RTL_LANGS.indexOf(lang) >= 0; }
function langName(l){ return LANG_NAME[l] || l.toUpperCase(); }
function langLabel(l){
  // short label for the header chips: keep Arabic readable, others as codes
  return l === 'ar' ? 'ع' : (LANG_LABEL[l] || l.toUpperCase());
}

/* --------------------------------------------------------------- numbers */
function formatNumber(v, lang, opts){
  if(v === null || v === undefined || !isFinite(v)) return '—';
  try {
    return new Intl.NumberFormat(localeTag(lang), opts || {maximumFractionDigits:1}).format(v);
  } catch(e){ return String(v); }
}

function formatDate(ms, lang){
  try {
    return new Date(ms).toLocaleDateString(localeTag(lang), {day:'2-digit', month:'short'});
  } catch(e){ return dateLabel(ms); }
}

/* Pluralisation. Arabic has six forms; Intl.PluralRules handles the rules so
   we do not hard-code a guess. */
function plural(lang, n, forms){
  let rule = 'other';
  try { rule = new Intl.PluralRules(localeTag(lang)).select(n); } catch(e){ rule = n === 1 ? 'one' : 'other'; }
  if(forms && forms[rule] !== undefined) return forms[rule];
  if(forms && forms.other !== undefined) return forms.other;
  return '';
}

/* ----------------------------------------------------------------- units */
const KG_PER_LB = 0.45359237;
function convertWeight(w, from, to){
  if(from === to) return w;
  return (to === 'lb') ? w / KG_PER_LB : w * KG_PER_LB;
}

/* Converts every stored load when the user changes their unit preference, so
   the numbers stay truthful rather than merely relabelled. Rounding follows
   the real increments available in a gym. */
function convertStateUnits(state, to){
  const from = state.profile.unit === 'lb' ? 'lb' : 'kg';
  if(from === to) return false;
  let touched = 0;
  state.sessions.forEach(sess => (sess.exercises||[]).forEach(e => (e.sets||[]).forEach(set => {
    if(set && typeof set.w === 'number' && set.w > 0){
      const v = convertWeight(set.w, from, to);
      const step = to === 'lb' ? 5 : 2.5;
      set.w = Math.round(v/step)*step;
      touched++;
    }
  })));
  if(state.profile && typeof state.profile.bodyweight === 'number' && state.profile.bodyweight > 0){
    state.profile.bodyweight = Math.round(convertWeight(state.profile.bodyweight, from, to) * 10) / 10;
  }
  (state.bodyweights || []).forEach(b => {
    if(b && typeof b.w === 'number' && b.w > 0){
      b.w = Math.round(convertWeight(b.w, from, to) * 10) / 10;
      touched++;
    }
  });
  state.profile.unit = to;
  return touched;
}

/* -------------------------------------------------------------- coverage */
/* Keys that define a language being genuinely usable. Everything else may
   legitimately fall back. */
/* The prefixes that decide whether a language is genuinely usable.
   log./hist./pat./equip. cover the exercise-aware logging model: they are
   on the session screen and in the history editor, so a missing translation
   there is a real gap and must be counted, not hidden. */
const CORE_PREFIXES = [
  'app.','nav.','btn.','c.','home.','decision.','readiness.','state.','body.','progress.',
  'session.','profile.','you.','mg.','mst.','onb.','sleep.','shift.','feel.',
  'chart.','tl.','about.p','unc.','dlg.','err.','goal.','env.','need.','a11y.',
  'log.','hist.','pat.','equip.','lab3d.','done.','tip.','mod.','modA.','modB.','modC.','mile.','bw.','exd.','rsn.','plan.'
];

function coreKeys(){
  const en = T.en || {};
  return Object.keys(en).filter(k => CORE_PREFIXES.some(p => k.indexOf(p) === 0));
}
function coverage(lang){
  const core = coreKeys();
  const bag = T[lang] || {};
  const have = core.filter(k => bag[k] !== undefined && bag[k] !== '');
  return {
    lang: lang,
    translated: have.length,
    total: core.length,
    percent: core.length ? Math.round(have.length / core.length * 100) : 0
  };
}
function coverageAll(){
  return LANGS.map(coverage).sort((a,b) => b.percent - a.percent);
}
/* A language is only called "supported" when the important flows are
   translated. This is checked, not asserted. */
const SUPPORT_THRESHOLD = 95;
function isSupported(lang){ return coverage(lang).percent >= SUPPORT_THRESHOLD; }
function langStatus(lang){
  const c = coverage(lang);
  return { lang:lang, percent:c.percent, status: c.percent >= SUPPORT_THRESHOLD ? 'full' : 'partial' };
}

/* ------------------------------------------------------------ applying */
function applyLocale(lang){
  if(typeof document === 'undefined' || !document.documentElement) return;
  const r = document.documentElement;
  r.lang = lang || 'en';
  r.dir = isRTL(lang) ? 'rtl' : 'ltr';
  if(RTL_LANGS.indexOf(lang) >= 0) r.dataset.rtl = 'on';
  else delete r.dataset.rtl;
}

/* A missing translation should be traceable in development but never show a
   raw key to a user. */
function missingKeys(lang){
  const core = coreKeys();
  const bag = T[lang] || {};
  return core.filter(k => bag[k] === undefined || bag[k] === '');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RTL_LANGS, LOCALE_TAG, LANG_NAME, localeTag, isRTL, langName, langLabel,
                     formatNumber, formatDate, plural, convertWeight, convertStateUnits,
                     coverage, coverageAll, isSupported, langStatus, applyLocale, missingKeys,
                     coreKeys, KG_PER_LB };
}
