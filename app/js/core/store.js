/* ============================================================================
   ANCESTOR — Local persistence
   One localStorage key. Versioned schema. Export / import / erase.
   Nothing leaves the device. Ever.
   ========================================================================== */

const STORE_KEY = 'ancestor.state.v1';
const SCHEMA_VERSION = 3;

/* What is actually running in this tab, as a deploy identity rather than a
   schema number. `sw.js` carries the same value inside its cache name and
   `tests/ui.js` fails when the two disagree — so a deploy that forgets to bump
   one of them is caught by the gate instead of being discovered by a person
   whose browser is holding two builds at once. */
const APP_BUILD = 'v45';
const BUILD_KEY = 'ancestor.build.v1';

/* The last uncaught error, kept across the tab that saw it. `LAST_UNCAUGHT`
   lived in memory, so the one moment it was needed — after the tab had gone —
   it no longer existed. Stored beside the log, never inside it: a crash record
   that could damage the record it is meant to describe would be worse than
   none. Every write is guarded, because the storage layer is often what is
   already failing when this runs. */
const CRASH_KEY = 'ancestor.lastcrash.v1';

function rememberCrash(err){
  try{
    const e = err || {};
    localStorage.setItem(CRASH_KEY, JSON.stringify({
      build: APP_BUILD,
      at: Date.now(),
      message: String(e.message || e).slice(0, 240),
      stack: String(e.stack || '').slice(0, 1200)
    }));
  }catch(_e){ /* the storage strip is the honest report of that failure */ }
}
function lastCrash(){
  try{
    const raw = localStorage.getItem(CRASH_KEY);
    const rec = raw ? JSON.parse(raw) : null;
    return (rec && typeof rec === 'object') ? rec : null;
  }catch(e){ return null; }
}
function forgetCrash(){
  try{ localStorage.removeItem(CRASH_KEY); }catch(e){}
}

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function defaultState(){
  return {
    version: SCHEMA_VERSION,
    created: Date.now(),
    onboarded: false,
    consented: false,
    /* First-launch language. `langChosen` is what makes the language screen a
       once-only event: the language itself lives in its own key so a person can
       change it from settings without touching this record, but the fact that
       they were asked belongs here, with the rest of their answers. A record
       written before this field existed reads as `false` and is asked once. */
    lang: null,
    langChosen: false,
    profile: {
      name: '',
      experience: null,        // 'b' | 'i' | 'a'
      goal: null,              // 'h' | 's' | 'r' | 'g'
      equipment: 'gym',        // 'gym' | 'home' | 'minimal'
      limits: [],              // subset of ['shoulder','knee','lowback','wrist','elbow']
      daysPerWeek: 3,
      sessionMinutes: 50,
      shiftType: 'none',       // 'none' | 'night' | 'rotating'
      sleepHours: 7,
      sleepVariability: 2,     // 1 consistent .. 3 irregular
      usualWake: 7,
      style: 'std',            // 'hit' | 'std' | 'min' | 'freq'
      unit: 'kg',
      /* Opt-in, and only ever asked for from the settings switch — never on
         boot. When rest ends while the tab is in the background and the browser
         has granted permission, a notification is posted through the service
         worker. Otherwise nothing is claimed: the countdown is a page timer. */
      restNotify: false,
      exercises: null,         // {id:true} once chosen
      /* --- schema v2, additive --- */
      goals: ['h'],
      environment: 'gym',
      positions: [],
      needs: {},
      display: { textScale:1, highContrast:false, reducedMotion:'auto', simpleUI:false, captions:true, theme:'dark' },
      /* --- schema v3, additive ---
         Optional. Only ever used to report total system load for bodyweight
         movements. Null means "not recorded", and the app then reports
         repetitions instead of inventing a load. */
      bodyweight: null
    },
    plan: null,                // generated program
    sessions: [],
    sleep: [],
    shifts: [],
    feelings: [],
    bodyweights: [],           // dated weigh-in log [{id, date, w}]
    lastExportAt: null,        // timestamp of most recent JSON export
    adaptation: {},            // per-muscle learned recovery multiplier
    science: {                 // Science Hub progress — additive, never destructive
      read: [], achievements: [], explorers: [], evidenceOpened: []
    }
  };
}

let STATE = null;
let STORAGE_PERSISTED = null;  // null = unknown, true/false once queried
const IDB_NAME = 'ancestor_vault';
const IDB_STORE = 'kv';
/* A durable tombstone prevents an old mirror from being resurrected when an
   erase or a delayed IndexedDB operation fails. It contains no user data. */
const IDB_ERASE_KEY = 'ancestor.mirror.erased.v1';
const ERASE_NOTICE_KEY = 'ancestor.erase.incomplete.v1';
const IDB_UNCHECKED_KEY = 'ancestor.mirror.unchecked.v1';
let ERASE_INCOMPLETE = false, MIRROR_UNCHECKED = false;

/* Old versions could create an empty database while clearing. Repair only that
   case by upgrading it; a healthy v1 vault and its records stay untouched. */
function openVault(onOpen, onFailure){
  let settled = false;
  const fail = () => { if(settled) return; settled = true; if(onFailure) onFailure(); };
  function open(version){
    const req = version ? indexedDB.open(IDB_NAME, version) : indexedDB.open(IDB_NAME);
    req.onupgradeneeded = () => {
      if(!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
    };
    req.onerror = req.onblocked = fail;
    req.onsuccess = () => {
      const db = req.result;
      if(settled){ db.close(); return; }
      if(!db.objectStoreNames.contains(IDB_STORE)){
        const next = db.version + 1; db.close();
        try{ open(next); }catch(e){ fail(); }
        return;
      }
      settled = true; onOpen(db);
    };
  }
  try{
    if(typeof indexedDB === 'undefined' || !indexedDB ||
       (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || ''))) return fail();
    open();
  }catch(e){ fail(); }
}

function idbMirrorPut(raw, onDone){
  let done = false;
  const finish = ok => { if(done) return; done = true; if(typeof onDone === 'function') onDone(ok); };
  openVault(db => {
      if(done){ db.close(); return; }
      try{
        /* A newer write or erase wins over a queued, older mirror put. */
        if(MIRROR_UNCHECKED || localStorage.getItem(IDB_UNCHECKED_KEY) !== null ||
           localStorage.getItem(STORE_KEY) !== raw){ db.close(); finish(false); return; }
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(raw, STORE_KEY);
        tx.oncomplete = () => {
          db.close();
          try{
            if(localStorage.getItem(STORE_KEY) === raw && localStorage.getItem(IDB_ERASE_KEY) !== null)
              localStorage.removeItem(IDB_ERASE_KEY);
          }catch(e){ /* leaving the tombstone is safer than restoring old data */ }
          finish(true);
        };
        tx.onerror = tx.onabort = () => { db.close(); finish(false); };
      }catch(e){ db.close(); finish(false); }
  }, () => finish(false));
}

function idbMirrorClear(onDone){
  let done = false;
  const timer = setTimeout(() => finish(false), 10000);
  const finish = ok => { if(done) return; done = true; clearTimeout(timer); if(typeof onDone === 'function') onDone(ok); };
  openVault(db => {
      if(done){ db.close(); return; }
      try{
        /* A new primary record may have been saved while the erase was pending.
           Mirror that new record instead of clearing its backup. */
        const current = localStorage.getItem(STORE_KEY);
        if(current !== null){ db.close(); idbMirrorPut(current, finish); return; }
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(STORE_KEY);
        tx.oncomplete = () => {
          db.close();
          try{
            const after = localStorage.getItem(STORE_KEY);
            if(after !== null){ idbMirrorPut(after, finish); return; }
            finish(true);
          }catch(e){ finish(false); }
        };
        tx.onerror = tx.onabort = () => { db.close(); finish(false); };
      }catch(e){ db.close(); finish(false); }
  }, () => finish(false));
}

function clearUncheckedMirror(){
  try{ localStorage.removeItem(IDB_UNCHECKED_KEY); MIRROR_UNCHECKED = false; return true; }
  catch(e){ return false; }
}
function markUncheckedMirror(){
  MIRROR_UNCHECKED = true;
  try{ localStorage.setItem(IDB_UNCHECKED_KEY, '1'); }catch(e){}
}
function showUncheckedMirror(){ if(typeof paintStoreFlag === 'function') paintStoreFlag(); }
function idbRecoverIfEmpty(onRecovered){
  try{
    if(typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) return;
    if(localStorage.getItem(STORE_KEY) !== null || localStorage.getItem(IDB_ERASE_KEY) !== null || LOAD_FAILED) return;
    if(MIRROR_UNCHECKED || localStorage.getItem(IDB_UNCHECKED_KEY) !== null){ MIRROR_UNCHECKED = true; showUncheckedMirror(); return; }
    /* Block mirror writes until the potentially older copy has been checked. */
    markUncheckedMirror();
    const initialState = STATE, initialSnapshot = JSON.stringify(STATE);
    openVault(db => {
      try{
        const tx = db.transaction(IDB_STORE, 'readonly');
        const g = tx.objectStore(IDB_STORE).get(STORE_KEY);
        g.onsuccess = () => {
          db.close();
          try{
            if(g.result == null){
              if(clearUncheckedMirror()){
                const current = localStorage.getItem(STORE_KEY);
                if(current !== null) idbMirrorPut(current);
              }
              showUncheckedMirror(); return;
            }
            /* A person may have entered data, or another tab may have written,
               while IndexedDB was opening. Neither may be replaced by a mirror. */
            if(STATE !== initialState || JSON.stringify(STATE) !== initialSnapshot ||
               LOAD_FAILED || STORAGE_FAILED || STORE_CONFLICT || localStorage.getItem(STORE_KEY) !== null ||
               localStorage.getItem(IDB_ERASE_KEY) !== null){ showUncheckedMirror(); return; }
            const raw = typeof g.result === 'string' ? g.result : JSON.stringify(g.result);
            let recovered, stored;
            try{
              const parsed = JSON.parse(raw);
              validateDataRecord(parsed);
              recovered = migrate(parsed); stored = JSON.stringify(recovered);
            }catch(err){
              /* The mirror may be the only surviving copy. Keep its exact bytes
                 and block writes when it is malformed or from a newer schema. */
              LOAD_FAILED = true; LOAD_NEWER = !!(err && err.code === 'newer'); RAW_RECORD = raw;
              if(typeof paintStoreFlag === 'function') paintStoreFlag();
              return;
            }
            let saved = false;
            try{ localStorage.setItem(STORE_KEY, stored); LAST_STORED_RAW = stored; saved = true; }
            catch(err){ STORAGE_FAILED = true; }
            /* The unchanged initial state may safely adopt the valid mirror even
               if its write failed: the warning and export now protect that data. */
            STATE = recovered;
            if(saved && clearUncheckedMirror()) idbMirrorPut(stored);
            showUncheckedMirror();
            if(typeof onRecovered === 'function') onRecovered(STATE, saved);
          }catch(err){}
        };
        g.onerror = () => { db.close(); showUncheckedMirror(); };
      }catch(e){ db.close(); showUncheckedMirror(); }
    }, showUncheckedMirror);
  }catch(e){}
}

function keepUncheckedMirror(){
  openVault(db => {
    try{
      const g = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(STORE_KEY);
      g.onsuccess = () => {
        db.close();
        try{
          if(g.result != null){
            const raw = typeof g.result === 'string' ? g.result : JSON.stringify(g.result);
            const key = STORE_KEY + '.damaged.' + Date.now() + '.' + Math.random().toString(36).slice(2,7);
            try{
              const u=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
              const a=document.createElement('a');a.href=u;a.download='ancestor-older-backup.json';
              document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);
            }catch(e){ /* The archive below is the second copy. */ }
            localStorage.setItem(key, raw);
            if(localStorage.getItem(key) !== raw) throw new Error('archive failed');
          }
          if(!clearUncheckedMirror()) throw new Error('marker failed');
          const current = localStorage.getItem(STORE_KEY);
          if(current !== null) idbMirrorPut(current);
          showUncheckedMirror();
          if(g.result != null) toast(t('app.load.kept'), 'ok');
        }catch(e){ toast(t('data.archiveFailed'), 'alert'); }
      };
      g.onerror = () => { db.close(); toast(t('data.archiveFailed'), 'alert'); };
    }catch(e){ db.close(); toast(t('data.archiveFailed'), 'alert'); }
  }, () => toast(t('data.archiveFailed'), 'alert'));
}

function requestPersistentStorage(onDone){
  try{
    if(typeof navigator === 'undefined' || !navigator.storage) return;
    if(/jsdom/i.test(navigator.userAgent || '')) return;
    const finish = val => {
      STORAGE_PERSISTED = !!val;
      if(typeof onDone === 'function') onDone(STORAGE_PERSISTED);
    };
    if(typeof navigator.storage.persist === 'function'){
      navigator.storage.persist().then(finish).catch(() => {});
    } else if(typeof navigator.storage.persisted === 'function'){
      navigator.storage.persisted().then(finish).catch(() => {});
    }
  }catch(e){}
}

/* "No record" and "a record that will not open" used to land in the same place:
   a clean state, and then the next save replaced the only copy of the user's log
   with an empty one. The second case is a state now — the bytes are held, writes
   are refused, and the header offers to keep a copy before anything is replaced. */
let LOAD_FAILED = false;
let LOAD_NEWER = false;   /* …written by a version that knows more than this one */
let RAW_RECORD = null;
/* The exact disk value this tab last read or wrote. `undefined` means this tab
   has not loaded yet; null means it saw no record. A differing value is not
   silently overwritten, even if the other tab's storage event is still queued. */
let LAST_STORED_RAW;
let STORE_CONFLICT = false;
let STORAGE_READ_FAILED = false;

function dataError(code){ const e = new Error(code); e.code = code; return e; }
function dataObject(value){ return !!value && typeof value === 'object' && !Array.isArray(value); }
function dataVersion(record){
  if(!dataObject(record)) throw dataError('invalid');
  if(!Object.prototype.hasOwnProperty.call(record, 'version')) return 0;
  const v = record.version;
  if(!Number.isSafeInteger(v) || v < 0) throw dataError('invalid');
  return v;
}
/* Allow missing fields from older backups, but never "repair" a malformed
   collection into an empty one. Unknown fields and exercise IDs stay intact. */
function validateDataRecord(record){
  const parsed = record;
  dataVersion(parsed);
  if(parsed.version > SCHEMA_VERSION) throw dataError('newer');
  const known = ['profile','sessions','sleep','shifts','feelings','bodyweights','plan','science'];
  if(!known.some(k => Object.prototype.hasOwnProperty.call(record, k))) throw dataError('invalid');
  if(Object.prototype.hasOwnProperty.call(record, 'profile') && !dataObject(record.profile)) throw dataError('invalid');
  for(const key of ['plan','science','adaptation']){
    if(record[key] != null && !dataObject(record[key])) throw dataError('invalid');
  }
  for(const key of ['sessions','sleep','shifts','feelings','bodyweights']){
    if(Object.prototype.hasOwnProperty.call(record, key) && !Array.isArray(record[key])) throw dataError('invalid');
    if(Array.isArray(record[key]) && record[key].some(item => !dataObject(item))) throw dataError('invalid');
  }
  for(const session of record.sessions || []){
    if(Object.prototype.hasOwnProperty.call(session, 'exercises') && !Array.isArray(session.exercises)) throw dataError('invalid');
    for(const ex of session.exercises || []){
      if(!dataObject(ex)) throw dataError('invalid');
      if(Object.prototype.hasOwnProperty.call(ex, 'sets') && !Array.isArray(ex.sets)) throw dataError('invalid');
      if((ex.sets || []).some(set => !dataObject(set))) throw dataError('invalid');
    }
  }
  if((record.bodyweights || []).some(b => typeof b.w !== 'number' || !isFinite(b.w) || b.w <= 0)) throw dataError('invalid');
  return record;
}

function loadState(){
  try{
    ERASE_INCOMPLETE = localStorage.getItem(ERASE_NOTICE_KEY) === '1';
    MIRROR_UNCHECKED = localStorage.getItem(IDB_UNCHECKED_KEY) !== null;
  }catch(e){}
  let raw = null;
  try{
    raw = localStorage.getItem(STORE_KEY);
  }catch(e){
    /* We do not know whether an existing record is behind the failed read.
       Keep the new state in memory and refuse to overwrite an unseen record. */
    STORAGE_READ_FAILED = true; STORAGE_FAILED = true;
    STATE = defaultState();
    return STATE;
  }
  LAST_STORED_RAW = raw;
  if(raw === null){
    STATE = defaultState();
    return STATE;
  }
  try{
    const parsed = JSON.parse(raw);
    validateDataRecord(parsed);
    STATE = migrate(parsed);
    LOAD_FAILED = false; LOAD_NEWER = false; RAW_RECORD = null;
    return STATE;
  }catch(e){
    /* Syntactically valid JSON can still be a damaged or newer log. Keep its
       exact bytes and refuse writes rather than migrating it into an empty log. */
    LOAD_NEWER = !!(e && e.code === 'newer');
    LOAD_FAILED = true;
    RAW_RECORD = raw;
    STATE = defaultState();
    return STATE;
  }
}

/* Another tab just wrote. The state in memory is now older than the state on
   disk, and the next save from this tab would erase what the other one did —
   the classic last-write-wins loss. Adopt the disk instead. */
function reloadState(){
  STATE = null;
  LOAD_FAILED = false;
  LOAD_NEWER = false;
  RAW_RECORD = null;
  return loadState();
}

/* Take the damaged record out of the way without destroying it: it is copied to
   its own key with the moment it was set aside, and only then may the log start
   again. Returns the bytes that were held, so the caller can hand them over. */
function archiveDamagedRecord(){
  const raw = RAW_RECORD;
  if(raw == null) return false;
  const stamped = STORE_KEY + '.damaged.' + Date.now() + '.' + Math.random().toString(36).slice(2,7);
  try{
    const current = localStorage.getItem(STORE_KEY);
    /* A different tab may have replaced the record since this one was read. */
    if(current !== null && current !== raw) return false;
    localStorage.setItem(stamped, raw);
    if(localStorage.getItem(stamped) !== raw) return false;
    if(current !== null) localStorage.removeItem(STORE_KEY);
  }catch(e){ return false; }
  LAST_STORED_RAW = null;
  STORE_CONFLICT = false;
  LOAD_FAILED = false;
  LOAD_NEWER = false;
  RAW_RECORD = null;
  return raw;
}

/* Fill in anything a older/partial record is missing, without losing data. */
function migrate(s){
  const d = defaultState();
  if(!s || typeof s !== 'object') return d;
  const out = Object.assign({}, d, s);
  out.profile = Object.assign({}, d.profile, s.profile || {});
  out.profile = migrateProfile(out.profile);      // v1 -> v2, additive, never destroys
  if(out.profile.bodyweight !== null && typeof out.profile.bodyweight !== 'number'){
    out.profile.bodyweight = null;
  }
  ['sessions','sleep','shifts','feelings','bodyweights'].forEach(k => { if(!Array.isArray(out[k])) out[k] = []; });
  out.bodyweights = out.bodyweights.filter(b => b && typeof b.w === 'number' && isFinite(b.w) && b.w > 0);
  if(out.lastExportAt !== null && typeof out.lastExportAt !== 'number') out.lastExportAt = null;
  (out.sessions || []).forEach(migrateSession);
  if(!Array.isArray(out.profile.limits)) out.profile.limits = [];
  if(!out.adaptation || typeof out.adaptation !== 'object') out.adaptation = {};
  out.science = Object.assign({ read:[], achievements:[], explorers:[], evidenceOpened:[] },
                              out.science || {});
  /* Language: only one of the seven we ship, otherwise "not chosen". */
  if(typeof out.lang !== 'string' || (typeof LANGS !== 'undefined' && LANGS.indexOf(out.lang) < 0)) out.lang = null;
  out.langChosen = out.langChosen === true || !!out.lang;
  out.version = SCHEMA_VERSION;
  return out;
}

/* A refused write is the worst thing that can happen to this product: the set
   the user just logged is in memory and nowhere else. It used to be swallowed —
   `saveState()` returned false and every caller ignored it — so the app looked
   completely healthy while the last session existed only until the next reload.
   Now the failure is a state, and the header says so until a write succeeds. */
let STORAGE_FAILED = false;

function saveState(){
  if(LOAD_FAILED){
    if(typeof paintStoreFlag === 'function'){
      try{ paintStoreFlag(); } catch(e){ /* the flag must never break a save */ }
    }
    return false;
  }
  if(STORE_CONFLICT){
    if(typeof paintStoreFlag === 'function') try{ paintStoreFlag(); } catch(e){}
    return false;
  }
  let ok = false;
  try{
    const current = localStorage.getItem(STORE_KEY);
    if(STORAGE_READ_FAILED && current === null){ STORAGE_READ_FAILED = false; LAST_STORED_RAW = null; }
    if((STORAGE_READ_FAILED && current !== null) ||
       (LAST_STORED_RAW !== undefined && current !== LAST_STORED_RAW)){
      STORE_CONFLICT = true; STORAGE_FAILED = true;
    } else {
      const raw = JSON.stringify(STATE);
      localStorage.setItem(STORE_KEY, raw);
      LAST_STORED_RAW = raw;
      idbMirrorPut(raw);
      ok = true;
    }
  }
  catch(e){ ok = false; }
  STORAGE_FAILED = !ok;
  if(typeof paintStoreFlag === 'function'){
    try{ paintStoreFlag(); } catch(e){ /* the flag must never break a save */ }
  }
  return ok;
}

function getState(){ return STATE || loadState(); }

function eraseAll(onMirrorCleared){
  let previousMarker = null;
  try{
    previousMarker = localStorage.getItem(IDB_ERASE_KEY);
    localStorage.setItem(IDB_ERASE_KEY, '1');
    localStorage.removeItem(STORE_KEY);
  }catch(e){
    try{
      if(previousMarker === null) localStorage.removeItem(IDB_ERASE_KEY);
      else localStorage.setItem(IDB_ERASE_KEY, previousMarker);
    }catch(_e){}
    return false;
  }
  LAST_STORED_RAW = null;
  STORE_CONFLICT = false;
  STORAGE_FAILED = false; STORAGE_READ_FAILED = false;
  LOAD_FAILED = false;
  LOAD_NEWER = false;
  RAW_RECORD = null;
  STATE = defaultState();
  idbMirrorClear(onMirrorCleared);
  return STATE;
}

/* ------------------------------------------------------------------------
   Schema v3 — sets became exercise-aware.

   A v2 set is {w, r, rir}. A v3 set carries every field any mode may need
   ({w, r, t, d, a, rir, skipped, committed, warmup}). Migration adds the
   missing keys rather than rewriting values, so an existing log keeps its
   numbers exactly as the user entered them. Nothing is inferred: a v2 set
   has no duration and no distance, and migration does not invent one.
   ---------------------------------------------------------------------- */
/* Metric fields are stored as numbers or null — the same shape
   normaliseLoggedSet() writes for newly logged sets. Empty strings are the
   live-draft convention (input values are strings) and must never be written
   into the log, or a saved record ends up holding two different kinds of
   "nothing". */
function migrateSet(s){
  if(!s || typeof s !== 'object') return s;
  if(s.w      === undefined) s.w = null;
  if(s.r      === undefined) s.r = null;
  if(s.t      === undefined) s.t = null;
  if(s.d      === undefined) s.d = null;
  if(s.a      === undefined) s.a = null;
  if(s.rir    === undefined) s.rir = null;
  if(s.skipped   === undefined) s.skipped = false;
  if(s.committed === undefined) s.committed = true;   // a stored set was logged
  if(s.warmup    === undefined) s.warmup = false;
  return s;
}
function migrateSession(sess){
  if(!sess || typeof sess !== 'object') return sess;
  if(typeof sess.startedAt !== 'number') sess.startedAt = sess.date || Date.now();
  (sess.exercises || []).forEach(e => {
    if(!e || !Array.isArray(e.sets)) return;
    e.sets.forEach(migrateSet);
  });
  return sess;
}

/* ---------- export / import ---------- */
function exportJSON(){
  return JSON.stringify(getState(), null, 2);
}
function prepareImport(text){
  let parsed;
  try{ parsed = JSON.parse(text); }catch(e){ throw dataError('invalid'); }
  validateDataRecord(parsed);
  try{ return migrate(parsed); }catch(e){ throw dataError('invalid'); }
}
function commitImport(candidate){
  if(LOAD_FAILED || (typeof RAW_DRAFT !== 'undefined' && RAW_DRAFT !== null)) throw dataError('unreadable');
  if(typeof ACTIVE !== 'undefined' && ACTIVE) throw dataError('active');
  if(STORAGE_FAILED || STORE_CONFLICT || (typeof DRAFT_CONFLICT !== 'undefined' && DRAFT_CONFLICT)) throw dataError('unsaved');
  let raw;
  try{
    const current = localStorage.getItem(STORE_KEY);
    if(LAST_STORED_RAW !== undefined && current !== LAST_STORED_RAW){
      STORE_CONFLICT = true; STORAGE_FAILED = true;
      if(typeof paintStoreFlag === 'function') paintStoreFlag();
      throw dataError('unsaved');
    }
    raw = JSON.stringify(candidate);
    localStorage.setItem(STORE_KEY, raw);
  }catch(e){ if(e && e.code === 'unsaved') throw e; throw dataError('write'); }
  /* Never adopt a replacement in memory until its local write has succeeded. */
  STATE = candidate;
  LAST_STORED_RAW = raw;
  idbMirrorPut(raw);
  return STATE;
}
function importJSON(text){ return commitImport(prepareImport(text)); }

/* ---------- logging helpers ---------- */
function addSession(obj){
  const s = getState();
  const rec = Object.assign({ id: uid(), date: Date.now(), exercises: [] }, obj);
  s.sessions.push(rec);
  saveState();
  return rec;
}
function deleteSession(id){
  const s = getState();
  s.sessions = s.sessions.filter(x => x.id !== id);
  saveState();
}

/* ------------------------------------------------------------------------
   Correcting history.

   Every correction goes through these functions so that the change is saved
   once and every derived figure — volume, records, trends, recovery — is
   recomputed on the next read instead of being cached anywhere.
   ---------------------------------------------------------------------- */
function findSession(id){
  const s = getState();
  return s.sessions.filter(x => x.id === id)[0] || null;
}
function updateSet(sessionId, exIdx, setIdx, patch){
  const sess = findSession(sessionId);
  if(!sess || !sess.exercises[exIdx] || !sess.exercises[exIdx].sets[setIdx]) return false;
  Object.assign(sess.exercises[exIdx].sets[setIdx], patch || {});
  saveState();
  return true;
}
function deleteSet(sessionId, exIdx, setIdx){
  const sess = findSession(sessionId);
  if(!sess || !sess.exercises[exIdx] || !sess.exercises[exIdx].sets[setIdx]) return false;
  sess.exercises[exIdx].sets.splice(setIdx, 1);
  // an exercise with nothing left is not an exercise that was performed
  if(!sess.exercises[exIdx].sets.length) sess.exercises.splice(exIdx, 1);
  saveState();
  return true;
}
/* A session with no work left in it is removed rather than left as an empty
   row that would otherwise be counted as a training day. */
function pruneEmptySessions(){
  const s = getState();
  const before = s.sessions.length;
  s.sessions = s.sessions.filter(sess =>
    (sess.exercises || []).some(e => (e.sets || []).some(x => x && !x.skipped)));
  if(s.sessions.length !== before) saveState();
  return before - s.sessions.length;
}
function addSleep(rec){
  const s = getState();
  const r = Object.assign({ id: uid() }, rec);
  s.sleep.push(r); saveState(); return r;
}
function addShift(rec){
  const s = getState();
  const r = Object.assign({ id: uid() }, rec);
  s.shifts.push(r); saveState(); return r;
}
function addFeeling(rec){
  const s = getState();
  const r = Object.assign({ id: uid(), date: Date.now() }, rec);
  s.feelings.push(r); saveState(); return r;
}
function latestFeeling(){
  const s = getState();
  if(!s.feelings.length) return null;
  return s.feelings.slice().sort((a,b)=>b.date-a.date)[0];
}
function addBodyweight(weightVal, dateMs){
  const w = +weightVal;
  if(!isFinite(w) || w <= 0) return null;
  const s = getState();
  s.bodyweights = s.bodyweights || [];
  const rec = { id: uid(), date: dateMs || Date.now(), w: Math.round(w * 10) / 10 };
  s.bodyweights.push(rec);
  s.bodyweights.sort((a,b) => a.date - b.date);
  s.profile.bodyweight = s.bodyweights[s.bodyweights.length - 1].w;
  saveState();
  return rec;
}
function deleteBodyweight(id){
  const s = getState();
  s.bodyweights = (s.bodyweights || []).filter(b => b.id !== id);
  s.profile.bodyweight = s.bodyweights.length ? s.bodyweights[s.bodyweights.length - 1].w : null;
  saveState();
}

/* ---------- history access ---------- */
/* Every logged working set for one exercise, oldest first.
   Returns [{date, sets:[...], sessionId}]

   Completeness is decided by the exercise's mode, not by "+r > 0". That test
   made timed and distance work invisible: a plank logged as 40 seconds was
   dropped from history, so the exercise never registered as trained. */
/* An id the build does not know cannot have a history we can score. Records
   arrive from imports, older versions and renamed exercises, and a missing
   exercise used to crash every screen that reads the log: `isSetComplete` was
   called with `undefined` and took the whole render with it. The record is kept
   as it is; it simply has nothing to plot. */
function exerciseHistory(exId){
  const s = getState();
  const ex = EX_BY_ID[exId];
  if(!ex) return [];
  const rows = [];
  s.sessions.forEach(sess => {
    (sess.exercises||[]).forEach(e => {
      if(e.id !== exId) return;
      const done = (e.sets||[]).filter(x => x && !x.skipped && isSetComplete(x, ex));
      if(done.length) rows.push({ date: sess.date, sessionId: sess.id, sets: done });
    });
  });
  return rows.sort((a,b)=>a.date-b.date);
}

/* Last time each muscle was directly trained, derived from the log. */
function lastTrainedByMuscle(){
  const s = getState();
  const out = {};
  s.sessions.forEach(sess => {
    (sess.exercises||[]).forEach(e => {
      const ex = EX_BY_ID[e.id]; if(!ex) return;
      const done = workingSets(e.sets);
      if(!done.length) return;
      /* Weighted SET COUNT, not load volume. Load volume is meaningless for
         holds and carries and is zero for unweighted bodyweight work, which
         used to make bodyweight training look like no training at all. */
      ex.m.forEach(([m,w]) => {
        const stim = done.length * w;
        if(!out[m] || sess.date > out[m].date){
          out[m] = { date: sess.date, stimulus: stim, exId: e.id };
        } else if (sess.date === out[m].date) {
          out[m].stimulus += stim;
        }
      });
    });
  });
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { defaultState, migrate, addSession, addBodyweight, deleteBodyweight,
                     exerciseHistory, lastTrainedByMuscle, uid,
                     migrateSet, migrateSession, findSession, updateSet, deleteSet, pruneEmptySessions };
}
