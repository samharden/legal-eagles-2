"use strict";
// ============================== THE ATLAS ==============================
// Which districts you have actually set foot in. The map fills in from this and
// from nothing else — a district you have not walked is a rectangle with no name
// in it, because the point of a map in a game about a city you do not know yet
// is that it is mostly blank.
//
// Keyed "<layer>:<region>", the same way region deltas are, and for the same
// reason: THE STREET and THE FLOOR are the same geometry and emphatically not
// the same world. Crossing over hands you a map of streets you have walked a
// hundred times and have never been down, which is the whole of what the
// crossover is for and costs nothing to express here.
//
// Deliberately NOT `Bleed.seen`, which is the nearest existing thing and means
// something else: that you read the evidence in a district, not that you were
// ever in it.

const walked = new Set();

/** Record a district. Returns true the first time, so callers can react. */
export function walkInto(layer, id) {
  if (!layer || !id) return false;
  const key = layer + ':' + id;
  if (walked.has(key)) return false;
  walked.add(key);
  return true;
}

export const hasWalked = (layer, id) => walked.has(layer + ':' + id);
export const walkedIn = layer => [...walked].filter(k => k.startsWith(layer + ':')).length;

export function saveAtlas() { return [...walked]; }
export function loadAtlas(a) { walked.clear(); for (const k of a || []) walked.add(k); }
export function resetAtlas() { walked.clear(); }
