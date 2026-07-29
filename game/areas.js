"use strict";
// ============================== PRACTICE AREAS ==============================
// LE2's ranged weapon, which in LE1 was not a weapon — it was your PRACTICE
// AREA. You did not pick a gun, you picked what kind of lawyer you were, and
// the thing that came out of you when you pressed the button was the argument
// that area actually makes. Litigation objects, fast and loud and constantly.
// Corporate makes one slow enormous non-negotiable point. Criminal defence
// throws three of something and only needs one to land. IP sends a letter that
// finds you. Tax audits everything in the room at once.
//
// Ported from LE1's CLASSES with the same names, the same attacks, the same
// specials and the same colours, retuned for LE2's health pools. Melee is 18 a
// swing at 0.36 (≈50 dps) and requires standing next to a Collections Agent
// while it takes $140 off you, so ranged is deliberately a little weaker per
// second and much safer, and that is the whole trade.
//
// This table is also two other things DESIGN needs:
//   §6  what the LE1 save import carries over — `classId` off
//       `legalEagles.save.v1` is a key in here
//   §4  what a Past Self fights with, since Past Selves are supposed to use
//       YOUR attack, and now literally do

// `letter` is the clause that goes in the blank in the resignation letter, and
// it is where the player actually chooses this — not on a class-select screen.
// You are not picking a weapon, you are finishing a sentence about what you did
// for these people for nine years, which is the same decision and reads better.

export const AREAS = {
  lit: {
    id: 'lit', name: 'LITIGATION', attack: 'OBJECTION!',
    blurb: 'Fast, loud, dramatic. Bills by the outburst.',
    letter: 'somebody has to stand up and say no out loud.',
    dmg: 9, cd: 0.26, speed: 560, count: 1, size: 5, color: '#ff6b6b', special: null,
    // 1-in-4 shots shout, exactly as in LE1
    shout: 'OBJECTION!',
  },
  corp: {
    id: 'corp', name: 'CORPORATE M&A', attack: 'Hostile Takeover',
    blurb: 'Slow, heavy, and absolutely non-negotiable.',
    letter: 'a deal needs a signature and does not deserve one.',
    dmg: 26, cd: 0.8, speed: 300, count: 1, size: 11, color: '#5ec8f0', special: null,
  },
  crim: {
    id: 'crim', name: 'CRIMINAL DEFENSE', attack: 'Cross-Examination',
    blurb: 'Rapid-fire triple shot of doubt. Reasonable doubt.',
    letter: 'everybody in the room has already decided.',
    dmg: 5, cd: 0.38, speed: 500, count: 3, size: 4, color: '#9be05e', special: 'spread',
  },
  ip: {
    id: 'ip', name: 'INTELLECTUAL PROPERTY', attack: 'Cease & Desist',
    blurb: 'Letters that hunt down infringers automatically.',
    letter: 'somebody has taken a thing that cannot be held.',
    dmg: 12, cd: 0.5, speed: 380, count: 1, size: 6, color: '#e05ed8', special: 'homing',
  },
  tax: {
    id: 'tax', name: 'TAX', attack: 'Surprise Audit',
    blurb: 'Nothing is certain except death and this nova.',
    letter: 'the numbers have to be looked at properly, once.',
    dmg: 7, cd: 1.0, speed: 330, count: 10, size: 5, color: '#f0c75e', special: 'nova',
    shout: 'AUDIT!',
  },
};

export const DEFAULT_AREA = 'lit';
export const areaOf = id => AREAS[id] || AREAS[DEFAULT_AREA];

/**
 * DESIGN §6's LE1 save import, the practice-area half of it.
 *
 * LE1 writes `legalEagles.save.v1` with `classId` and `genderId` at the top
 * level, so this is a read and two lookups. Deliberately tolerant: a missing
 * save, a corrupted one, private-mode localStorage that throws on read, or a
 * class id LE2 does not know all land on the same answer, which is "you are a
 * litigator and we will not make a fuss about it".
 */
export function importLE1() {
  try {
    const raw = localStorage.getItem('legalEagles.save.v1');
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d) return null;
    return {
      area: AREAS[d.classId] ? d.classId : DEFAULT_AREA,
      spr: d.genderId === 'm' ? 'p_m' : 'p_f',
      rank: (d.player && d.player.xp) || 0,
      found: true,
    };
  } catch (e) { return null; }
}
