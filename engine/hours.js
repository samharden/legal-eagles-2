"use strict";
// ============================== THE HOURS ==============================
// THE FLOOR's resource, and the exact structural inverse of THE STREET's.
//
// On the street the pressure comes from outside: rent is imposed, the docket is
// imposed, and paying is how you keep working. Refusing costs you the office.
//
// Here nothing is imposed. The building offers. Floors are dark and hostile
// until you open a matter and bill against them, and then the lights come on
// and stay on for exactly as long as the work does. Nobody makes you. There is
// no landlord on this layer and no date on the calendar. You will do it anyway,
// because the alternative is the dark, and that is the whole thesis of Path B:
//
//   the trap is not that they keep you here, it is that you keep billing.
//
// Two numbers, and the difference between them is the game:
//
//   banked   hours you have recovered and can spend on light. Goes up and down.
//   billed   hours you have put into this building, ever. Only goes up. The
//            endgame reads this number. Every light you turn on is on it.
//
// Everything is stored in TENTHS of an hour, as integers, because a law firm
// bills in six-minute increments and because floats accumulate lies. `fmtHours`
// is the only thing that ever divides by ten.

export const Hours = {
  banked: 0,       // tenths, spendable
  billed: 0,       // tenths, lifetime — never decreases
  lit: [],         // region ids currently on the lights
  entries: [],     // the timesheet, newest last
};

export const hoursHooks = {
  onBill: null,      // (tenths, memo) => void
  onSpend: null,     // (tenths, memo) => void
  onLight: null,     // (regionId, tenths) => void
  onPressure: null,  // (step) => void — fired when the building notices
};

/** "12.4" — the only place tenths become an hour. */
export function fmtHours(t) { return (Math.max(0, t) / 10).toFixed(1); }

function entry(tenths, memo) {
  Hours.entries.push({ tenths, memo });
  if (Hours.entries.length > 200) Hours.entries.shift();
}

/**
 * Work done. Bank it, and add it to the number that never goes down.
 *
 * Note what this does NOT do: distinguish between the work you wanted to do and
 * the work the building wanted. It cannot. That is the point — a timesheet has
 * no column for why.
 */
export function bill(tenths, memo) {
  if (tenths <= 0) return 0;
  Hours.banked += tenths;
  const before = pressureStep();
  Hours.billed += tenths;
  entry(tenths, memo);
  if (hoursHooks.onBill) hoursHooks.onBill(tenths, memo);
  const after = pressureStep();
  if (after > before && hoursHooks.onPressure) hoursHooks.onPressure(after);
  return tenths;
}

/** Spend banked hours. Returns false and changes nothing if you are short. */
export function spend(tenths, memo) {
  if (tenths <= 0 || Hours.banked < tenths) return false;
  Hours.banked -= tenths;
  entry(-tenths, memo);
  if (hoursHooks.onSpend) hoursHooks.onSpend(tenths, memo);
  return true;
}

/**
 * The building bills YOU. Used when you lose time you cannot account for —
 * collapsing in the dark is still time on the floor, and the floor writes it
 * down. Never goes below zero: there is no such thing as owing the building
 * hours, only having none.
 */
export function writeDown(tenths, label) {
  const n = Math.min(Hours.banked, Math.max(0, tenths));
  // The entry quotes what was ACTUALLY taken, not what was asked for — a
  // timesheet line that says 2.0 next to a 0.4 movement is the kind of small
  // lie this whole layer is about, and it should not be one the UI tells by
  // accident. Hence the label arrives without a figure and gets one here.
  if (n <= 0) { entry(0, `0.0 — ${label} (no charge — nothing left to take)`); return 0; }
  Hours.banked -= n;
  entry(-n, `${fmtHours(n)} — ${label}`);
  return n;
}

/* ------------------------------- the lights ------------------------------- */

export function isLit(regionId) { return Hours.lit.includes(regionId); }

/**
 * Put a floor on the lights. This is the transaction the whole layer turns on:
 * it costs banked hours, it adds nothing to `billed` (you already billed those
 * hours to get them) — and it is permanent, because the building does not take
 * light back once it has been given. It has no reason to. You are still here.
 */
export function lightUp(regionId, cost) {
  if (isLit(regionId)) return true;
  if (!spend(cost, `LIGHTING — ${regionId} (charged to matter)`)) return false;
  Hours.lit.push(regionId);
  if (hoursHooks.onLight) hoursHooks.onLight(regionId, cost);
  return true;
}

/** Lit from the start, no charge — where you wake up, and nowhere else. */
export function lightFree(regionId) {
  if (!isLit(regionId)) Hours.lit.push(regionId);
}

/* ------------------------------- the pressure ------------------------------ */
// The trap, made mechanical. Every ten hours you put into this building, the
// building notices, and what is out in the dark gets a little more urgent about
// collecting. Lighting a floor makes that floor safe and everywhere else worse.
// You cannot buy your way out; you can only buy your way further in.

const PRESSURE_PER = 100;    // tenths of an hour per step — 10.0 hours
const PRESSURE_CAP = 6;      // 6 steps: a hard ceiling, so this stays survivable

export function pressureStep() { return Math.min(PRESSURE_CAP, Math.floor(Hours.billed / PRESSURE_PER)); }
/** 1.0 at the start, 1.6 once the building has your full attention. */
export function pressure() { return 1 + pressureStep() * 0.1; }

/* ----------------------------- serialization ------------------------------ */

export function saveHours() {
  return { banked: Hours.banked, billed: Hours.billed, lit: [...Hours.lit], entries: Hours.entries.slice(-80) };
}
export function loadHours(o) {
  Hours.banked = (o && o.banked) || 0;
  Hours.billed = (o && o.billed) || 0;
  Hours.lit = (o && o.lit) ? [...o.lit] : [];
  Hours.entries = (o && o.entries) ? [...o.entries] : [];
}
export function resetHours() {
  Hours.banked = 0; Hours.billed = 0; Hours.lit = []; Hours.entries = [];
}
