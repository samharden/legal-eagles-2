"use strict";
// ============================== ACTORS ==============================
// Phase 0 keeps the roster to three: one harmless, one hostile, one from the
// other side. Enough to exercise spawning, chasing, dying and — the point of
// the spike — staying dead across an eviction.

export const ACTOR_TYPES = {
  civ: {
    spr: 'civ', size: 32, r: 13, hp: 14, speed: 46, harmless: true,
    barks: [
      'They moved the filing window again.',
      'Is four o\'clock four, or is it four-thirty?',
      'I just need somebody to look at it.',
      'My brother-in-law said he knew a guy.',
      'Do you validate?',
    ],
  },
  server: {
    spr: 'server', size: 34, r: 14, hp: 30, speed: 104, dmg: 9, chase: 360,
    barks: ['Are you—', 'Got a minute?', 'You ARE her, right?'],
    onTouch: 'SERVED',
  },
  unbilled: {
    spr: 'unbilled', size: 34, r: 14, hp: 44, speed: 58, dmg: 12, chase: 480,
    barks: ['0.1 — reviewed email re: lunch.', '0.2 — conference with self.', '0.1 — no charge.'],
    onTouch: 'BILLED',
  },
};

export function actorDef(type) { return ACTOR_TYPES[type] || ACTOR_TYPES.civ; }
