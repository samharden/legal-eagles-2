"use strict";
// ============================== FACTS ==============================
// What you KNOW, as opposed to what you are carrying.
//
// This is the spine of LE2's investigation loop and the thing LE1 had no model
// for. LE1 gated dialogue on stats (`[AMBITION 3]`) and on inventory flags,
// which works for a dungeon and falls apart for a case: an investigation is not
// about collecting objects, it is about being able to say a specific sentence to
// a specific person. A fact is that sentence.
//
// Facts are learned once, are permanent, and are the currency every other
// system spends: dialogue choices unlock on them, quest stages complete on
// them, doors open on them, and the Casefile is just a rendering of them.

const FACTS = new Map();     // id -> def
const known = new Set();
// Order learned, not game time: the Casefile wants "the order you found them
// out", and a monotonic counter cannot be wrong the way a clock passed in by
// four different call sites can.
const learnedAt = new Map();
let seq = 0;

export const onLearn = [];   // subscribers: (id, def) => void

/** Register fact definitions. `case` groups them in the Casefile. */
export function defineFacts(defs) {
  for (const d of defs) FACTS.set(d.id, d);
}

export function factDef(id) { return FACTS.get(id) || { id, text: id, case: null }; }

export function knows(...ids) { return ids.every(id => known.has(id)); }
export function knowsAny(...ids) { return ids.some(id => known.has(id)); }

/** Learn a fact. Returns false if it was already known, so callers can stay quiet. */
export function learn(id) {
  if (known.has(id)) return false;
  known.add(id);
  learnedAt.set(id, ++seq);
  const def = factDef(id);
  for (const fn of onLearn) fn(id, def);
  return true;
}

export function forget(id) { known.delete(id); learnedAt.delete(id); }

/** Everything known, newest last, optionally filtered to one case. */
export function knownFacts(caseId) {
  return [...known]
    .map(id => factDef(id))
    .filter(d => !caseId || d.case === caseId)
    .sort((a, b) => (learnedAt.get(a.id) || 0) - (learnedAt.get(b.id) || 0));
}

/** Facts defined for a case but not yet learned — the Casefile's "open questions". */
export function openFacts(caseId) {
  return [...FACTS.values()].filter(d => d.case === caseId && !known.has(d.id) && !d.hidden);
}

export function factCount(caseId) {
  const all = [...FACTS.values()].filter(d => d.case === caseId && !d.hidden);
  return { known: all.filter(d => known.has(d.id)).length, total: all.length };
}

export function saveFacts() { return { known: [...known], at: [...learnedAt], seq }; }
export function loadFacts(o) {
  known.clear(); learnedAt.clear();
  for (const id of (o && o.known) || []) known.add(id);
  for (const [id, t] of (o && o.at) || []) learnedAt.set(id, t);
  seq = (o && o.seq) || learnedAt.size;
}
export function resetFacts() { known.clear(); learnedAt.clear(); seq = 0; }
