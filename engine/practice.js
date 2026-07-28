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

export const Rep = { courthouse: 0, strand: 0 };

export const Office = { held: true };

export const practiceHooks = { onPost: null, onCommingle: null, onEvict: null };

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
  return { books: { ...Books, entries: Books.entries.slice(-120) }, rep: { ...Rep }, office: { ...Office } };
}
export function loadPractice(o) {
  Object.assign(Books, { operating: 0, trust: 0, entries: [], commingled: 0, arrears: 0 }, (o && o.books) || {});
  Object.assign(Rep, { courthouse: 0, strand: 0 }, (o && o.rep) || {});
  Object.assign(Office, { held: true }, (o && o.office) || {});
}
export function resetPractice() {
  Books.operating = 0; Books.trust = 0; Books.entries = []; Books.commingled = 0; Books.arrears = 0;
  Rep.courthouse = 0; Rep.strand = 0;
  Office.held = true;
}
