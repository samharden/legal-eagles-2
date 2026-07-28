"use strict";
// ============================== THE DOCKET ==============================
// A day counter and the things that come due on it.
//
// This is the pressure the Solo Shingle runs on, and the reason an open world
// doesn't turn into aimless wandering: everything you are putting off has a
// date on it. Deadlines are the first thing in LE2 that can make you LOSE —
// not by dying, but by a case being dismissed with prejudice while you were
// somewhere else.
//
// THE FLOOR has no clock. Per the design, its calendar reads the same date
// forever; the host simply never advances the day on that layer. That is not a
// gap, it is the difference between the two games.

const WD = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MO = ['MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_LEN = 30;
const DAY0 = 2;   // day 1 is the 3rd of March, a Monday

export const Cal = { day: 1 };

// scheduled entries: { day, kind, label, ref, once }
let entries = [];

export const clockHooks = {
  onDue: null,    // (entry) => void       — fired for each entry on its day
  onDay: null,    // (day) => void         — fired after the day advances
};

export function dayOfWeek(d = Cal.day) { return WD[(d - 1) % 7]; }
export function dateOf(d = Cal.day) {
  const total = d + DAY0;
  return { m: MO[Math.floor((total - 1) / MONTH_LEN) % MO.length], d: ((total - 1) % MONTH_LEN) + 1 };
}
export function dateString(d = Cal.day) {
  const { m, d: dom } = dateOf(d);
  return `${dayOfWeek(d)} ${dom} ${m}`;
}
/** "in 3 days" / "TOMORROW" / "TODAY" / "2 days ago" */
export function relative(d) {
  const n = d - Cal.day;
  if (n === 0) return 'TODAY';
  if (n === 1) return 'TOMORROW';
  if (n > 1) return `in ${n} days`;
  if (n === -1) return 'YESTERDAY';
  return `${-n} days ago`;
}

export function schedule(entry) {
  const e = { once: true, ...entry };
  entries.push(e);
  entries.sort((a, b) => a.day - b.day);
  return e;
}
/** Drop every entry matching a ref — used when a matter closes early. */
export function unschedule(ref) { entries = entries.filter(e => e.ref !== ref); }

export function entriesFor(day) { return entries.filter(e => e.day === day); }
export function upcoming(within = 14) {
  return entries.filter(e => e.day >= Cal.day && e.day <= Cal.day + within);
}
export function overdue() { return entries.filter(e => e.day < Cal.day); }
export function allEntries() { return entries.slice(); }

/**
 * Advance one day and fire everything that lands on it. The host does the
 * consequences; the clock only says what came due.
 */
export function advanceDay() {
  Cal.day++;
  const due = entriesFor(Cal.day);
  for (const e of due) if (clockHooks.onDue) clockHooks.onDue(e);
  entries = entries.filter(e => !(e.once && due.includes(e)));
  if (clockHooks.onDay) clockHooks.onDay(Cal.day);
  return Cal.day;
}

export function saveClock() { return { day: Cal.day, entries }; }
export function loadClock(o) {
  Cal.day = (o && o.day) || 1;
  entries = (o && o.entries) || [];
}
export function resetClock() { Cal.day = 1; entries = []; }
