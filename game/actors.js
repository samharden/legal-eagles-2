"use strict";
// ============================== ACTORS ==============================
// The full opposition, both paths. DESIGN §3 and §4 name eleven of these and
// the useful thing about the list is that barely any of them are "a thing that
// walks at you and reduces a number" — a Collections Agent wants money, an
// Ambulance Chaser wants your client and is not interested in you at all, and
// The Ones Who Stayed do not want anything and do not move.
//
// So the roster is expressed as BEHAVIOUR FLAGS rather than subclasses, and the
// host has one branch per flag. A new enemy is a row in this table until it
// needs a verb nothing else has.
//
//   harmless   ignores you; wanders
//   still      never moves. Hurts what touches it. That is the whole design
//   drain      takes MONEY on contact instead of energy
//   debuff     applies a named stacking condition on contact
//   poach      ignores you entirely and walks at the nearest client
//   steal      takes something you are carrying
//   ranged     fires; {dmg, speed, every, life}
//   past       a Past Self: fires YOUR practice area's attack back at you,
//              which is DESIGN §4's whole idea and is now a lookup
//   scales     THE FLOOR's pressure multiplies its speed and damage
//   hours      tenths recovered when it goes down (floor only)
//   needs      a predicate name the host checks before spawning it at all

export const ACTOR_TYPES = {

  /* ------------------------------ THE STREET ------------------------------ */

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

  // Fast, and being served is not damage — it is a condition. Every tag slows
  // you, they stack, and they last until you sleep, so a bad afternoon on the
  // courthouse steps is a bad afternoon and not a bad four seconds.
  server: {
    spr: 'server', size: 34, r: 14, hp: 30, speed: 104, dmg: 9, chase: 360,
    barks: ['Are you—', 'Got a minute?', 'You ARE her, right?'],
    onTouch: 'SERVED', debuff: 'served',
  },

  // Does not want to hurt you. Wants $140, and will take it off the operating
  // account every time it reaches you, forever, because it does not tire and it
  // has sixty hit points and you have somewhere to be.
  collections: {
    spr: 'collections', size: 34, r: 14, hp: 62, speed: 54, dmg: 0, chase: 620,
    barks: ['This is an attempt to collect a debt.', 'Any information obtained will be used for that purpose.', 'We can do this on a schedule.'],
    onTouch: 'DEMAND', drain: 140,
  },

  // The rival solo. Completely uninterested in you — she walks at whoever your
  // current objective is, and if she gets there first she signs them. You cannot
  // fight her off you, because she is never on you. You have to get in the way.
  chaser: {
    spr: 'chaser', size: 34, r: 14, hp: 34, speed: 96, dmg: 0, chase: 0,
    barks: ['No fee unless we win.', 'Free consultation.', 'Did somebody already call you?'],
    poach: true, onTouch: 'SIGNED',
  },

  // Stands where it was served and throws paper. It has no interest in closing.
  depo: {
    spr: 'depo', size: 34, r: 15, hp: 40, speed: 0, dmg: 0, chase: 460,
    still: true,
    barks: ['You are commanded to appear.', 'Bring the documents identified in Schedule A.', 'Nine a.m. Nine a.m. Nine a.m.'],
    ranged: { dmg: 11, speed: 210, every: 2.1, life: 3.2, label: 'SUBPOENA' },
  },

  // Only exists while you owe him. Turns up when you are in arrears, hits hard,
  // and is gone the moment you are current — he is not a fight, he is a bill
  // with a walking speed.
  landlord: {
    spr: 'landlord', size: 36, r: 15, hp: 96, speed: 76, dmg: 17, chase: 700,
    barks: ['The first. It is always the first.', 'I have been more than reasonable.', 'I do not want to change the lock.'],
    onTouch: 'ARREARS', needs: 'arrears',
  },

  // DC&H sent three. You left with the client list in your head and the firm
  // knows it, so they take what you are carrying and they come in threes.
  retrieval: {
    spr: 'retrieval', size: 34, r: 14, hp: 52, speed: 124, dmg: 12, chase: 560,
    barks: ['Retrieval.', 'The firm considers that property.', 'It was on our system.'],
    onTouch: 'RETRIEVED', steal: true,
  },

  /* ------------------------------- THE FLOOR ------------------------------- */

  // Your own hours, itemized. Put one down and you get the time back.
  unbilled: {
    spr: 'unbilled', size: 34, r: 14, hp: 44, speed: 58, dmg: 12, chase: 480,
    barks: ['0.1 — reviewed email re: lunch.', '0.2 — conference with self.', '0.1 — no charge.'],
    onTouch: 'BILLED', hours: 6, scales: true,
  },

  // They do not chase, because they are not looking for you and never were.
  // They are at their desks. Walking into one is your decision every time.
  stayed: {
    spr: 'stayed', size: 34, r: 15, hp: 84, speed: 0, dmg: 15, chase: 0,
    still: true, hours: 10, scales: true,
    barks: ['I said I would look at it tonight.', 'It is not a bad firm.', 'I have three more and then I am going.'],
    onTouch: 'STAYED',
  },

  // Past Selves. Each one fights the way you fought at that rank, and `past`
  // means the projectile is YOUR practice area's attack aimed back at you —
  // DESIGN §4's requirement, satisfied literally now that the LE1 save import
  // decides which area that is. A litigator's past selves object at them
  // constantly; a tax lawyer's arrive slowly and hit like a filing deadline.
  past_junior: {
    spr: 'past_junior', size: 34, r: 14, hp: 70, speed: 132, dmg: 10, chase: 620,
    scales: true, hours: 14, past: true,
    barks: ['I can take that.', 'No, I can take it.', 'What time do people go home?'],
    onTouch: 'OVERRULED',
  },
  past_counsel: {
    spr: 'past_counsel', size: 34, r: 14, hp: 96, speed: 74, dmg: 13, chase: 560,
    scales: true, hours: 18, past: true,
    barks: ['I have seen this argument before.', 'It did not work then either.', 'You will want to sit down for the cross.'],
    onTouch: 'DISTINGUISHED',
  },
  past_partner: {
    spr: 'past_partner', size: 38, r: 16, hp: 150, speed: 92, dmg: 18, chase: 800,
    scales: true, hours: 26, past: true,
    barks: ['You made the same call I did.', 'Say the part about the trust account again.', 'I am what happened. I am not a warning.'],
    onTouch: 'PARTNER',
  },
  /* -------------------------------- BOSSES -------------------------------- */
  // `boss` does three things: names it in the HUD with a bar, keeps it asleep
  // until the matter that summons it is live, and makes it worth the walk.
  // Neither of these is a puzzle — LE1's bosses were endurance and pattern, and
  // so are these. The writing does the rest.

  // DESIGN §3's finale opposition: the covenant itself, cousin to LE1's
  // Founding Agreement. Two years, fifty miles, and a definition of CLIENT
  // that covers everyone the firm ever opened a file on — walking.
  noncompete: {
    spr: 'noncompete', size: 52, r: 24, hp: 340, speed: 62, dmg: 21, chase: 900,
    boss: true, title: 'THE NON-COMPETE', needs: 'sued',
    ranged: { dmg: 13, speed: 250, every: 1.25, life: 3.6, label: 'PARA. 41' },
    barks: [
      'Two years.', 'Fifty miles.',
      'CLIENT OF THE FIRM is defined at paragraph forty-one.',
      'You signed this.', 'You did not read it. That is not a defence.',
    ],
    onTouch: 'ENJOINED',
  },

  // DESIGN §5. The version of you that hit the other key, in a courtroom where
  // you are simultaneously counsel and party.
  //
  // `past: true` on purpose and not as a shortcut: it means the thing throws
  // YOUR practice area's attack back at you, which is what the Past Selves do
  // and what this is the last and largest of. It is deliberately NOT `scales` —
  // pressure is a floor-only quantity, and this is the one fight that has to be
  // the same fight from both sides of the door.
  yourself: {
    spr: 'yourself', size: 56, r: 26, hp: 380, speed: 78, dmg: 20, chase: 1000,
    boss: true, title: 'THE PARTY OF THE SECOND PART', needs: 'yourselfopen',
    past: true, hours: 40,
    barks: [
      'You pressed a key.', 'I pressed the other one.',
      'Neither of us read it back.',
      'I have the same nine years you have.',
      'Ask him which of us is the party.',
      'You have been arguing with me since 2:47.',
    ],
    onTouch: 'STIPULATED',
  },

  // What is running the copier in Sublevel C. Not a person and not pretending
  // to be — it is the going concern, and it has four hundred people's work in
  // it, and it is still going.
  thefirm: {
    spr: 'thefirm', size: 54, r: 25, hp: 420, speed: 54, dmg: 22, chase: 1000,
    boss: true, title: 'THE FIRM', scales: true, hours: 60, needs: 'sublevelopen',
    ranged: { dmg: 14, speed: 210, every: 1.05, life: 4.0, label: '0.1' },
    barks: [
      'It is not a bad firm.', 'Four hundred people chose this.',
      'You are still here.', 'Somebody has to keep the lights on.',
      'I did not ask anybody to stay.',
    ],
    onTouch: 'RETAINED',
  },
};

export function actorDef(type) { return ACTOR_TYPES[type] || ACTOR_TYPES.civ; }
