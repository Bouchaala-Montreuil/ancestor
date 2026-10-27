/* ============================================================================
   ANCESTOR — Time, shifts and sleep
   Everything is local time. Shifts that cross midnight are first-class, not
   an edge case. The calendar date is never assumed to be the biological day.
   ========================================================================== */

const HOUR = 3600000, DAY = 86400000;

/* ---------- local-time helpers (never use toISOString for local wall clock) ---------- */
function pad(n){ return (n<10?'0':'')+n; }

/* ms -> 'YYYY-MM-DDTHH:mm' in LOCAL time (what <input type=datetime-local> wants) */
function toLocalInput(ms){
  const d = new Date(ms);
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
}
/* 'YYYY-MM-DDTHH:mm' -> ms interpreted as LOCAL time */
function fromLocalInput(s){
  if(!s) return NaN;
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(s));
  if(!m) return NaN;
  return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], 0, 0).getTime();
}
/* ms -> 'YYYY-MM-DD' local */
function dateKey(ms){
  const d = new Date(ms);
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
function startOfDay(ms){ const d=new Date(ms); d.setHours(0,0,0,0); return d.getTime(); }
function addDays(ms,n){ const d=new Date(ms); d.setDate(d.getDate()+n); return d.getTime(); }

function hourOf(ms){ return new Date(ms).getHours(); }
function hhmm(ms){ const d=new Date(ms); return pad(d.getHours())+':'+pad(d.getMinutes()); }

function dayLabel(ms){
  const loc = {en:'en-GB',fr:'fr-FR',es:'es-ES',de:'de-DE',it:'it-IT',nl:'nl-NL'}[CURRENT_LANG]||'en-GB';
  return new Date(ms).toLocaleDateString(loc,{weekday:'short'}).replace('.','').slice(0,3);
}
function dateLabel(ms){
  const loc = {en:'en-GB',fr:'fr-FR',es:'es-ES',de:'de-DE',it:'it-IT',nl:'nl-NL'}[CURRENT_LANG]||'en-GB';
  return new Date(ms).toLocaleDateString(loc,{day:'2-digit',month:'short'});
}

/* ---------- the biological day ----------
   A person who wakes at 16:00 and trains at 22:00 is living the same
   "day" as someone who wakes at 07:00 and trains at 13:00. Anchoring on
   wall-clock midnight would split their day in half.
   anchorHour should be the hour at which the user's day typically begins. */
function bioDayKey(ms, anchorHour){
  const a = (anchorHour===undefined||anchorHour===null) ? 4 : anchorHour;
  const d = new Date(ms - a*HOUR);
  return dateKey(d.getTime());
}
/* start (ms) of the biological day containing ms */
function bioDayStart(ms, anchorHour){
  const a = (anchorHour===undefined||anchorHour===null) ? 4 : anchorHour;
  const shifted = new Date(ms - a*HOUR);
  shifted.setHours(0,0,0,0);
  return shifted.getTime() + a*HOUR;
}

function hoursBetween(a,b){ return (b-a)/HOUR; }
function daysBetween(a,b){ return (b-a)/DAY; }

/* ---------- shifts ---------- */
/* A shift is {start:'YYYY-MM-DDTHH:mm', end:'YYYY-MM-DDTHH:mm'} in local time.
   If end <= start we treat it as crossing midnight. */
function shiftRange(s){
  let a = fromLocalInput(s.start), b = fromLocalInput(s.end);
  if(!isFinite(a)) return null;
  if(!isFinite(b)) return null;
  if(b <= a) b += DAY;               // crosses midnight
  return {start:a, end:b, hours:(b-a)/HOUR, crosses: b-a > 0 && fromLocalInput(s.end) <= a};
}
function shiftHours(s){ const r = shiftRange(s); return r ? r.hours : 0; }
function isNightShift(s){
  const r = shiftRange(s); if(!r) return false;
  // counts as night if any part falls in 22:00-06:00
  let t = r.start, end = r.end;
  while(t < end){
    const h = hourOf(t);
    if(h >= 22 || h < 6) return true;
    t += HOUR;
  }
  return false;
}
function shiftsOverlapping(shifts, fromMs, toMs){
  const out = [];
  (shifts||[]).forEach(s => {
    const r = shiftRange(s); if(!r) return;
    if(r.start < toMs && r.end > fromMs) out.push(Object.assign({range:r}, s));
  });
  return out.sort((a,b)=>a.range.start-b.range.start);
}
/* Did the user work within the last N hours? */
function workedWithin(shifts, hours, now){
  const from = now - hours*HOUR;
  return shiftsOverlapping(shifts, from, now+1);
}
/* Next shift starting within N hours */
function nextShift(shifts, now, hours){
  let best = null;
  (shifts||[]).forEach(s => {
    const r = shiftRange(s); if(!r) return;
    if(r.start >= now && r.start <= now + hours*HOUR){
      if(!best || r.start < best.range.start) best = Object.assign({range:r}, s);
    }
  });
  return best;
}

/* ---------- sleep ---------- */
/* {start:'...', end:'...', quality:1-5}. Also handles crossing midnight. */
function sleepRange(r){
  let a = fromLocalInput(r.start), b = fromLocalInput(r.end);
  if(!isFinite(a)||!isFinite(b)) return null;
  if(b <= a) b += DAY;
  return {start:a, end:b, hours:(b-a)/HOUR};
}
function sleepHours(r){ const s = sleepRange(r); return s ? s.hours : 0; }

/* Sleep statistics over the last `days` calendar days */
function sleepStats(sleep, now, days){
  const from = now - (days||7)*DAY;
  const recs = (sleep||[]).map(r => ({raw:r, rng:sleepRange(r)}))
                          .filter(x => x.rng && x.rng.end > from && x.rng.end <= now + 12*HOUR)
                          .sort((a,b)=>a.rng.end-b.rng.end);
  if(!recs.length) return {n:0, avg:null, sd:null, last:null, qualityAvg:null};
  const hs = recs.map(x=>x.rng.hours);
  const avg = hs.reduce((a,b)=>a+b,0)/hs.length;
  let v = 0; hs.forEach(h => v += (h-avg)*(h-avg));
  const sd = Math.sqrt(v/hs.length);
  const qs = recs.map(x=>+x.raw.quality||0).filter(q=>q>0);
  const qualityAvg = qs.length ? qs.reduce((a,b)=>a+b,0)/qs.length : null;
  return {
    n: recs.length,
    avg: avg,
    sd: sd,
    last: recs[recs.length-1],
    lastHours: recs[recs.length-1].rng.hours,
    qualityAvg: qualityAvg,
    times: recs.map(x=>x.rng.start)
  };
}

/* Variability of sleep START times, in hours (circadian strain proxy).
   Deliberately framed as schedule variability, not a biological measurement. */
function sleepStartVariability(sleep, now, days){
  const from = now - (days||7)*DAY;
  const starts = (sleep||[]).map(r=>sleepRange(r)).filter(r=>r && r.end > from && r.end <= now+12*HOUR)
                            .map(r => (r.start % DAY)/HOUR)
                            .sort((a,b)=>a-b);
  if(starts.length < 2) return null;
  // circular spread: max gap-free arc is complex; use simple range on sorted hours
  let min = 24, max = -24;
  for(let i=1;i<starts.length;i++){
    const d = starts[i]-starts[i-1];
    if(d < 0.5) continue;                     // ignore near-duplicates
    min = Math.min(min, d); max = Math.max(max, d);
  }
  if(max < 0) return 0;
  return max;
}

/* Most recent wake moment (end of the last sleep block that has finished) */
function lastWake(sleep, now){
  let best = null;
  (sleep||[]).forEach(r => {
    const s = sleepRange(r); if(!s) return;
    if(s.end <= now && (!best || s.end > best)) best = s.end;
  });
  return best;
}

/* Typical sleep start hour, used to predict tonight's sleep window.
   Returns {startHour, endHour} or null. */
function typicalSleepWindow(sleep, profile){
  const recs = (sleep||[]).map(r=>sleepRange(r)).filter(Boolean).slice(-10);
  if(!recs.length){
    if(profile && profile.usualWake != null) return null;
    return null;
  }
  // circular mean of start hours
  let x=0, y=0;
  recs.forEach(r => { const a = (r.start % DAY)/HOUR * (2*Math.PI/24); x+=Math.cos(a); y+=Math.sin(a); });
  let ang = Math.atan2(y/nrecsSafe(recs), x/nrecsSafe(recs));
  if(ang < 0) ang += 2*Math.PI;
  const startHour = ang * 24/(2*Math.PI);
  const avgDur = recs.reduce((a,r)=>a+r.hours,0)/recs.length;
  return { startHour: startHour, hours: avgDur, endHour: (startHour+avgDur)%24 };
}
function nrecsSafe(r){ return Math.max(1, r.length); }

/* Would a session of `mins` minutes starting now run into the predicted
   sleep window (within `bufferHours` before sleep start)? */
function intrudesOnSleep(window, now, mins, bufferHours){
  if(!window) return false;
  const buf = (bufferHours===undefined?1.5:bufferHours);
  const end = now + mins*60000;
  const dur = (window.hours || 8)*HOUR;
  // Check the occurrence before, during and after `now`: you can be
  // approaching the window, already inside it, or racing the next one.
  for(let k=-1;k<=1;k++){
    const t = startOfDay(now) + window.startHour*HOUR + k*DAY;
    const tEnd = t + dur;
    if(end > (t - buf*HOUR) && now < tEnd) return true;
  }
  return false;
}

/* ---------- misc ---------- */
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function round(v,d){ const p = Math.pow(10, d===undefined?0:d); return Math.round(v*p)/p; }
