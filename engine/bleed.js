"use strict";
// ============================== THE BLEED ==============================
// DESIGN §2: "Mid-game the layers start to bleed — Path A finds doors that
// shouldn't exist; Path B finds a window with a living city behind it. Late
// game you can move between them."
//
// This is the state behind that sentence, and it is deliberately ONE number.
// The whole of Phase 3 was built on the two layers being sealed from each other
// — separate deltas, separate dockets, `layerOk` keeping a floor matter shut
// while you are in daylight — so the crossover cannot be a second world model.
// It is a dial on the one that exists:
//
//   0  SEALED      the game as Phase 3 shipped it
//   1  SEEPAGE     cosmetic. The other layer's colour is in this one, and the
//                  things that stand still over there are faintly here
//   2  THE SEAM    content. Props authored with `bleed: 2` come into being —
//                  the door that shouldn't exist, the window with traffic
//   3  TRAVERSAL   the crossings open and you can walk through one
//
// The level only ever goes UP, and it is derived from matters closed rather
// than stored as a story flag, so a save cannot disagree with the docket about
// how far in you are. `seen` is per-region and is what makes the bleed local:
// a district you have read the evidence in shows much more of the other side
// than one you have only walked through.

export const Bleed = {
  level: 0,
  crossed: 0,          // how many times you have gone through. Never resets.
  seen: new Set(),     // regions where you have read what is bleeding into them
};

export const bleedHooks = {
  onLevel: null,       // (level, from) => void
};

export const LEVEL_NAME = ['SEALED', 'SEEPAGE', 'THE SEAM', 'TRAVERSAL'];
export const MAX_LEVEL = 3;

/** Raise the level. Refuses to lower it — there is no way back down. */
export function setBleed(n) {
  const want = Math.max(0, Math.min(MAX_LEVEL, n | 0));
  if (want <= Bleed.level) return false;
  const from = Bleed.level;
  Bleed.level = want;
  if (bleedHooks.onLevel) bleedHooks.onLevel(want, from);
  return true;
}

/** You have read the thing in this district that does not belong to it. */
export function witness(regionId) {
  if (!regionId || Bleed.seen.has(regionId)) return false;
  Bleed.seen.add(regionId);
  return true;
}
export const witnessed = id => Bleed.seen.has(id);

/**
 * How much of the other layer is showing in this district, 0..1. The renderer
 * lerps every colour it owns by this, so one number drives palette, mood,
 * motes and the ghosts. A witnessed district reads roughly three levels ahead
 * of an unwitnessed one, which is the point: the bleed is something you find,
 * not something that is done to you on a schedule.
 */
export function bleedAt(regionId) {
  if (!Bleed.level) return 0;
  return Math.min(1, 0.11 * Bleed.level + (Bleed.seen.has(regionId) ? 0.30 : 0));
}

export const canCross = () => Bleed.level >= MAX_LEVEL;

export function saveBleed() {
  return { level: Bleed.level, crossed: Bleed.crossed, seen: [...Bleed.seen] };
}
export function loadBleed(o) {
  Bleed.level = (o && o.level) || 0;
  Bleed.crossed = (o && o.crossed) || 0;
  Bleed.seen = new Set((o && o.seen) || []);
}
export function resetBleed() {
  Bleed.level = 0; Bleed.crossed = 0; Bleed.seen = new Set();
}
