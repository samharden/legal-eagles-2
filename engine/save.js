"use strict";
// ============================== SAVE ==============================
// Versioned from the first commit, with an explicit migration chain. LE1 shipped
// v1, then had to retrofit a v1->v2 flag migration when items landed; doing it
// up front costs nothing and means no future wave has to invent the mechanism
// under pressure.

const KEY = 'legalEagles2.save';
export const SAVE_VERSION = 3;   // continues LE1's numbering; LE2 starts at 3

// from-version -> (data) => data at from+1
const MIGRATIONS = {
  // 3: d => { ...d, /* v4 shape */ },
};

export function saveGame(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, t: Date.now(), data }));
    return true;
  } catch (e) { console.warn('save failed', e); return false; }
}

export function loadGame() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { return null; }
  if (!raw) return null;
  let env;
  try { env = JSON.parse(raw); } catch (e) { console.warn('save corrupt — ignoring'); return null; }
  let { v, data } = env;
  if (typeof v !== 'number' || !data) return null;
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) { console.warn(`no migration from save v${v} — ignoring save`); return null; }
    data = m(data); v++;
  }
  return data;
}

export function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) {} }
