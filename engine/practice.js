"use strict";
// ============================== THE PRACTICE ==============================
// The state of your law firm: two bank accounts, a ledger, standing in each
// district, and whether you still have an office.
//
// The two accounts are the point. Client money is NOT your money — an unearned
// retainer sits in trust until you earn it, and moving it across before then is
// the single most tempting shortcut in a solo practice and the one that ends
// careers. So the game gives you exactly that button, on the day rent is due,
// when the operating account is short. It always works. It is always available.
// It is never free.

export const Books = {
  operating: 0,      // yours
  trust: 0,          // the clients', held for them
  entries: [],       // ledger, newest last
  commingled: 0,     // count of times you crossed the line
  arrears: 0,        // missed rent payments
};

// Standing, per district. Deliberately NOT a fixed shape — the host seeds it
// from the city, so adding a district is a change to game/city.js and nowhere
// else. DESIGN §3: The Flats trusting you and the Tower District trusting you
// are different currencies, and mildly incompatible.
export const Rep = {};

/** Ensure every district exists at zero, without disturbing any that have moved. */
export function seedRep(ids) {
  for (const id of ids) if (!(id in Rep)) Rep[id] = 0;
}

export const Office = { held: true, upgrades: [] };

/* ================================ THE FIRM =============================== */
// Staff and office upgrades — the growth half of DESIGN §3, and the reason
// this file is called `practice` and not `wallet`.
//
// The important thing about hiring is NOT the hire fee. It is that a person is
// a WEEKLY EXPENSE, forever, arriving on a different day from the rent so that
// a solo practice gets squeezed twice a week instead of once. You buy capability
// with a lump sum and pay for it with a standing obligation, which is exactly
// the trade a real practice makes and exactly the pressure that makes the trust
// account look like an account rather than a rule.
//
// Miss a payroll and everybody goes. Not one of them — all of them. A firm that
// cannot make payroll does not get to keep half its people, and the street finds
// out the same afternoon.

export const STAFF = {
  receptionist: {
    id: 'receptionist', name: 'Perla Ocampo', role: 'Receptionist', spr: 'receptionist',
    hire: 500, wage: 280,
    blurb: 'Answers the phone you are never at. Knows every clerk in the building by their first name and which of them means it.',
    effect: 'A lapsed deadline gets one day of grace. Once per matter.',
  },
  paralegal: {
    id: 'paralegal', name: 'Renata Vosloo', role: 'Paralegal', spr: 'paralegal',
    hire: 900, wage: 420,
    blurb: 'Fifteen years of other people\'s filings. Carries a redweld the way other people carry a weapon, which is a coincidence.',
    effect: 'Does not stand there while something is happening to you.',
  },
  associate: {
    id: 'associate', name: 'Desmond Achebe', role: 'Associate', spr: 'associate',
    hire: 1600, wage: 900,
    blurb: 'Two years out, one year in a job he could describe to his parents. Wants the work. Will take the work.',
    effect: 'Works a second matter overnight. You wake up to a fact you did not go and get.',
  },
};

/**
 * What one throw from somebody on the payroll is worth.
 *
 * Everybody you hire walks with you now, so the roster needed a combat stat and
 * there was already an honest one on the table: the hire fee. $60 of fee is one
 * point of damage, which puts Perla at 8, Renata at 15 and Desmond at 27 — and
 * means the price list IS the power curve. Nothing to tune twice, and no hidden
 * number: the expensive one hits harder, on the screen where you pay for them.
 */
export const staffPower = s => Math.max(6, Math.round(s.hire / 60));

export const UPGRADES = {
  bed: {
    id: 'bed', name: 'A bed, and the cot goes out', cost: 650,
    blurb: 'You have been calling it a cot to make it sound temporary. A bed is an admission and also a night\'s sleep.',
    effect: '+12 energy, permanently.',
  },
  chair: {
    id: 'chair', name: 'A second chair and a phone that rings', cost: 900,
    blurb: 'One chair is an office where you work. Two chairs is an office where somebody else can be.',
    effect: 'You cannot hire anybody until there is somewhere to put them.',
  },
  door: {
    id: 'door', name: 'Your name on the door, in vinyl', cost: 1400,
    blurb: 'Not the masking tape. The tape has been on that buzzer since the first week and everybody on this street has watched it curl.',
    effect: '+2 standing in every district, once and for good.',
  },
};

export const Firm = { staff: [] };

export const hasStaff = id => Firm.staff.includes(id);
export const hasUpgrade = id => Office.upgrades.includes(id);
export function payrollTotal() { return Firm.staff.reduce((n, id) => n + (STAFF[id] ? STAFF[id].wage : 0), 0); }

/** Take somebody on. Costs the hire fee now and the wage every week after. */
export function hire(id, day = 0) {
  const s = STAFF[id];
  if (!s || hasStaff(id) || !canPay(s.hire)) return false;
  expense(s.hire, `${s.role} — ${s.name}, engaged`, day);
  Firm.staff.push(id);
  if (practiceHooks.onHire) practiceHooks.onHire(s);
  return true;
}

/** Everybody leaves. The only caller is a payroll you did not make. */
export function loseStaff(day = 0) {
  if (!Firm.staff.length) return [];
  const gone = Firm.staff.map(id => STAFF[id]);
  Firm.staff = [];
  Books.entries.push({ day, amount: 0, memo: 'PAYROLL NOT MADE — staff released', account: 'operating' });
  if (practiceHooks.onLoseStaff) practiceHooks.onLoseStaff(gone);
  return gone;
}

export function buyUpgrade(id, day = 0) {
  const u = UPGRADES[id];
  if (!u || hasUpgrade(id) || !canPay(u.cost)) return false;
  expense(u.cost, `Suite 2B — ${u.name}`, day);
  Office.upgrades.push(id);
  if (practiceHooks.onUpgrade) practiceHooks.onUpgrade(u);
  return true;
}

export const practiceHooks = {
  onPost: null, onCommingle: null, onEvict: null,
  onHire: null, onLoseStaff: null, onUpgrade: null,
};

const pclamp = (v, a, b) => v < a ? a : v > b ? b : v;

/** Record a movement. `account` is 'operating' | 'trust'. */
export function post(amount, memo, account = 'operating', day = 0) {
  Books[account] += amount;
  Books.entries.push({ day, amount, memo, account });
  if (Books.entries.length > 300) Books.entries.shift();
  if (practiceHooks.onPost) practiceHooks.onPost(amount, memo, account);
  return Books[account];
}

export const canPay = n => Books.operating >= n;

/** A retainer arrives. It is the client's money and it goes to trust. */
export function retainer(amount, memo, day = 0) { return post(amount, memo, 'trust', day); }

/** Work done: move earned fees out of trust into operating. This is legitimate. */
export function earn(amount, memo, day = 0) {
  const n = Math.min(amount, Books.trust);
  if (n > 0) { post(-n, memo + ' (earned)', 'trust', day); post(n, memo + ' (earned)', 'operating', day); }
  return n;
}

/** A fee that was never client money to begin with — a referral, a judgment. */
export function fee(amount, memo, day = 0) { return post(amount, memo, 'operating', day); }

export function expense(amount, memo, day = 0) { return post(-Math.abs(amount), memo, 'operating', day); }

/**
 * Take client money you have not earned. Works. Always works.
 */
export function commingle(amount, memo, day = 0) {
  const n = Math.min(amount, Books.trust);
  if (n <= 0) return 0;
  post(-n, memo + ' (TRUST — UNEARNED)', 'trust', day);
  post(n, memo + ' (from trust)', 'operating', day);
  Books.commingled++;
  if (practiceHooks.onCommingle) practiceHooks.onCommingle(n, Books.commingled);
  return n;
}

/** Put it back before anyone notices. Does not un-count the crossing. */
export function restoreTrust(amount, memo, day = 0) {
  const n = Math.min(amount, Books.operating);
  if (n <= 0) return 0;
  post(-n, memo, 'operating', day);
  post(n, memo, 'trust', day);
  return n;
}

/** How far under water the trust account is against what clients are owed. */
export function trustShortfall(owed) { return Math.max(0, owed - Books.trust); }

export function missRent(day = 0) {
  Books.arrears++;
  Books.entries.push({ day, amount: 0, memo: `RENT NOT PAID (arrears: ${Books.arrears})`, account: 'operating' });
  if (Books.arrears >= 2 && Office.held) {
    Office.held = false;
    if (practiceHooks.onEvict) practiceHooks.onEvict();
  }
  return Books.arrears;
}
export function clearArrears() { Books.arrears = 0; }

export function bumpRep(district, n) {
  if (!(district in Rep)) Rep[district] = 0;
  Rep[district] = pclamp(Rep[district] + n, -10, 10);
  return Rep[district];
}
export function repLabel(n) {
  if (n <= -6) return 'notorious';
  if (n <= -2) return 'poorly thought of';
  if (n < 2) return 'unknown';
  if (n < 6) return 'known';
  return 'trusted';
}

export function savePractice() {
  return {
    books: { ...Books, entries: Books.entries.slice(-120) },
    rep: { ...Rep },
    office: { held: Office.held, upgrades: [...Office.upgrades] },
    firm: { staff: [...Firm.staff] },
  };
}
export function loadPractice(o) {
  Object.assign(Books, { operating: 0, trust: 0, entries: [], commingled: 0, arrears: 0 }, (o && o.books) || {});
  for (const k in Rep) delete Rep[k];
  Object.assign(Rep, (o && o.rep) || {});
  Office.held = (o && o.office) ? o.office.held !== false : true;
  Office.upgrades = (o && o.office && o.office.upgrades) ? [...o.office.upgrades] : [];
  Firm.staff = (o && o.firm && o.firm.staff) ? [...o.firm.staff] : [];
}
export function resetPractice() {
  Books.operating = 0; Books.trust = 0; Books.entries = []; Books.commingled = 0; Books.arrears = 0;
  for (const k in Rep) delete Rep[k];
  Office.held = true; Office.upgrades = [];
  Firm.staff = [];
}
