"use strict";
// ============================== THE RUN RECORD ==============================
// What survives a finished run, as distinct from what survives a closed browser
// tab. `engine/save.js` holds a mid-run snapshot you can resume; this holds the
// short account of a run that is over and cannot be resumed, and it is what
// NEW GAME + is built on.
//
// Separate key on purpose. Clearing a save should not erase the fact that you
// once finished the game, and finishing the game should not clear your save —
// DESIGN's finale leaves the city standing and a finished run is a thing you
// should be able to load and walk around in.
//
// Records accumulate, newest first, because the building's whole premise is
// that it keeps four hundred resignation letters and does not throw any of them
// away. Yours go in the same run of boxes.

const RUNS_KEY = 'legalEagles2.runs.v1';
const CAP = 8;

/** One finished run, small enough that eight of them are still nothing. */
export function recordRun(rec) {
  const list = runs();
  list.unshift({ v: 1, at: Date.now(), ...rec });
  try { localStorage.setItem(RUNS_KEY, JSON.stringify(list.slice(0, CAP))); return true; }
  catch (e) { console.warn('run record failed', e); return false; }
}

/** Every finished run, newest first. Tolerant: a corrupt store reads as none. */
export function runs() {
  let raw = null;
  try { raw = localStorage.getItem(RUNS_KEY); } catch (e) { return []; }
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(r => r && r.ending) : [];
  } catch (e) { console.warn('run records corrupt — ignoring'); return []; }
}

export const lastRun = () => runs()[0] || null;
export const hasRun = () => runs().length > 0;

/**
 * Which path a NEW GAME + should open on: the one the last run did not take.
 * The fork is the whole game, so a second run is the other side of it — not the
 * same side again with numbers turned up.
 */
export function nextPath() {
  const r = lastRun();
  if (!r) return null;
  return r.path === 'send' ? 'delete' : 'send';
}
export const nextLayer = () => (nextPath() === 'delete' ? 'floor' : 'street');

export function clearRuns() { try { localStorage.removeItem(RUNS_KEY); } catch (e) {} }
