"use strict";
// ============================== THE CASEFILE ==============================
// Press C. Three tabs, because a solo practice has exactly three questions:
//
//   MATTERS   what am I working on, what do I know, what don't I know
//   DOCKET    what is coming due, and how soon
//   ACCOUNTS  whose money is this
//
// LE1's equivalent was a MATTERS tab listing quest titles. That is a to-do
// list. This one has to show its working, or the player cannot tell the
// difference between being stuck and being early — and cannot tell the
// difference between having money and holding someone else's.
//
// On THE FLOOR only MATTERS exists. That layer has no clock and no books, and
// offering tabs that would read $0 forever would be a lie about the game.

import { allQuests, isDone, isFailed, started, currentStage, outcomeOf, qstate } from '../engine/quests.js';
import { knownFacts, openFacts, factCount } from '../engine/facts.js';
import { Cal, dateString, relative, allEntries } from '../engine/clock.js';
import { Books, Rep, Office, repLabel } from '../engine/practice.js';
import { Hours, fmtHours, isLit, pressureStep } from '../engine/hours.js';
import { REGIONS } from './city.js';

let cfRoot, cfBody, cfTabs;
export const Casefile = { open: false, tab: 'matters', hasClock: true, _layer: 'street' };

function cfBuild() {
  if (cfRoot) return;
  cfRoot = document.getElementById('casefile');
  cfBody = document.getElementById('cfBody');
  cfTabs = document.getElementById('cfTabs');
  document.getElementById('cfClose').addEventListener('click', () => Casefile.hide());
  cfTabs.addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    Casefile.tab = b.dataset.tab;
    Casefile.render(Casefile._layer);
  });
}

Casefile.show = function (layer, hasClock) {
  cfBuild();
  this.open = true;
  this.hasClock = hasClock !== false;
  cfRoot.classList.add('open');
  this.render(layer);
};
Casefile.hide = function () {
  cfBuild();
  this.open = false;
  cfRoot.classList.remove('open');
};
Casefile.toggle = function (layer, hasClock) {
  this.open ? this.hide() : this.show(layer, hasClock);
};

Casefile.render = function (layer) {
  cfBuild();
  this._layer = layer;

  // Each layer gets the tabs its systems justify and no others. THE STREET has
  // dates and money; THE FLOOR has neither and has the timesheet instead.
  const tabs = this.hasClock ? ['matters', 'docket', 'accounts'] : ['matters', 'hours'];
  if (!tabs.includes(this.tab)) this.tab = 'matters';
  cfTabs.innerHTML = tabs.map(t =>
    `<button data-tab="${t}" class="cfTab${t === this.tab ? ' on' : ''}">${t === 'hours' ? 'THE HOURS' : t.toUpperCase()}</button>`).join('');

  if (this.tab === 'docket') return renderDocket();
  if (this.tab === 'accounts') return renderAccounts();
  if (this.tab === 'hours') return renderHours();
  renderMatters(layer);
};

/* ------------------------------- MATTERS ------------------------------- */
function renderMatters(layer) {
  const mine = allQuests().filter(q => (!q.layer || q.layer === layer) && started(q.id));
  if (!mine.length) {
    cfBody.innerHTML = `<div class="cfEmpty">No open matters.<br><span>Work is out there. It does not come to you — that was the old job.</span></div>`;
    return;
  }

  let html = '';
  for (const q of mine) {
    const done = isDone(q.id), failed = isFailed(q.id);
    const stage = currentStage(q.id);
    const n = factCount(q.id);
    const cls = failed ? ' failed' : done ? ' closed' : '';
    const status = failed ? 'LOST — ' + String((qstate[q.id] && qstate[q.id].reason) || '').toUpperCase()
      : done ? 'CLOSED — ' + String(outcomeOf(q.id) || '').toUpperCase()
        : 'OPEN';

    html += `<section class="cfCase${cls}">`;
    html += `<h3>${q.name}<span class="cfStatus">${status}</span></h3>`;
    html += `<p class="cfBlurb">${q.blurb}</p>`;

    if (!done && stage && stage.hint) html += `<p class="cfNext"><b>NEXT</b> ${stage.hint}</p>`;

    if (!done && q.due) {
      const e = allEntries().find(x => x.ref === q.id && x.kind === 'deadline');
      if (e) {
        const urgent = e.day <= Cal.day;
        html += `<p class="cfDue${urgent ? ' urgent' : ''}"><b>DUE</b> ${dateString(e.day)} — ${relative(e.day)}</p>`;
      }
    }

    html += `<div class="cfBar"><div class="cfBarFill" style="width:${n.total ? (n.known / n.total) * 100 : 0}%"></div></div>`;
    html += `<div class="cfCount">${n.known} of ${n.total} established</div>`;

    const kf = knownFacts(q.id);
    if (kf.length) {
      html += `<h4>ESTABLISHED</h4><ul class="cfFacts">`;
      for (const f of kf) html += `<li>${f.text}</li>`;
      html += `</ul>`;
    }
    const of = openFacts(q.id);
    if (of.length && !done) {
      html += `<h4 class="cfOpenH">NOT ESTABLISHED</h4><ul class="cfFacts cfOpen">`;
      // never show what the unknown fact SAYS — only that there is a hole
      for (let i = 0; i < of.length; i++) html += `<li>—</li>`;
      html += `</ul>`;
    }
    html += `</section>`;
  }
  cfBody.innerHTML = html;
}

/* -------------------------------- DOCKET ------------------------------- */
function renderDocket() {
  // Everything late or current, plus three weeks ahead. The full rent schedule
  // runs to the end of the year and listing all of it buries the one line that
  // is about to cost you a case.
  const HORIZON = 21;
  const all = allEntries().sort((a, b) => a.day - b.day);
  const entries = all.filter(e => e.day <= Cal.day + HORIZON);
  const hidden = all.length - entries.length;
  let html = `<div class="cfToday">TODAY IS ${dateString()} &nbsp;·&nbsp; DAY ${Cal.day}</div>`;

  if (!entries.length) {
    html += `<div class="cfEmpty">Nothing on the docket.<br><span>Enjoy it. It is not a state that persists.</span></div>`;
    cfBody.innerHTML = html;
    return;
  }

  html += `<table class="cfDocket"><tbody>`;
  for (const e of entries) {
    const late = e.day < Cal.day, today = e.day === Cal.day;
    html += `<tr class="${late ? 'late' : today ? 'today' : ''}">`
      + `<td class="d">${dateString(e.day)}</td>`
      + `<td class="r">${relative(e.day)}</td>`
      + `<td class="k">${e.kind}</td>`
      + `<td class="l">${e.label}</td></tr>`;
  }
  html += `</tbody></table>`;
  if (hidden > 0) html += `<p class="cfFoot">${hidden} further item${hidden > 1 ? 's' : ''} beyond three weeks out. The rent, mostly. It does not stop.</p>`;
  html += `<p class="cfFoot">The day ends when you go up to Suite 2B. Nothing on this list moves until then — and then all of it moves at once.</p>`;
  cfBody.innerHTML = html;
}

/* ------------------------------- THE HOURS ----------------------------- */
// THE FLOOR's answer to ACCOUNTS, and shaped like it on purpose — two columns,
// one of them somebody else's. The difference is that on the street the money
// you are holding for other people can be given back. Nothing gives hours back.

const PRESSURE_TEXT = [
  'The building has not noticed you.',
  'The building has noticed you.',
  'The building is keeping the corridor lights on ahead of you now.',
  'You are being routed. You have not been asked where you are going.',
  'Your name has appeared on doors you have not opened.',
  'You are the most productive person on this floor.',
  'There is nobody else on this floor.',
];

function renderHours() {
  let html = '';
  html += `<div class="cfAccts">`;
  html += `<div class="cfAcct"><div class="lbl">BANKED</div><div class="val">${fmtHours(Hours.banked)}</div><div class="sub">spendable</div></div>`;
  html += `<div class="cfAcct trust"><div class="lbl">BILLED, TOTAL</div><div class="val">${fmtHours(Hours.billed)}</div><div class="sub">this does not go down</div></div>`;
  html += `</div>`;

  const step = pressureStep();
  if (step > 0) html += `<p class="cfWarn">${PRESSURE_TEXT[step] || PRESSURE_TEXT[PRESSURE_TEXT.length - 1]}</p>`;

  html += `<h4>THE LIGHTS</h4><ul class="cfFacts">`;
  for (const r of REGIONS) {
    const L = r.layers && r.layers.floor;
    if (!L) continue;
    const lit = isLit(r.id);
    const cost = L.lightCost || 10;
    html += `<li>${r.name} — <b>${lit ? 'ON' : 'DARK'}</b>`
      + (lit ? (L.litFree ? ' <span class="cfDim">(lit when you woke up)</span>' : ' <span class="cfDim">(charged)</span>')
        : ` <span class="cfDim">(${fmtHours(cost)} hours at the panel)</span>`)
      + `</li>`;
  }
  html += `</ul>`;

  const sheet = Hours.entries.slice().reverse().slice(0, 24);
  if (sheet.length) {
    html += `<h4>TIMESHEET</h4><table class="cfLedger"><tbody>`;
    for (const e of sheet) {
      html += `<tr><td class="d"></td>`
        + `<td class="a ${e.tenths > 0 ? 'pos' : e.tenths < 0 ? 'neg' : ''}">${e.tenths ? (e.tenths > 0 ? '+' : '−') + fmtHours(Math.abs(e.tenths)) : '0.0'}</td>`
        + `<td class="k">HRS</td>`
        + `<td class="l">${e.memo}</td></tr>`;
    }
    html += `</tbody></table>`;
  } else {
    html += `<p class="cfFoot">Nothing on the sheet yet. Read something, establish something, or put down something that is carrying your time.</p>`;
  }
  html += `<p class="cfFoot">The lights run as long as the work does.</p>`;
  cfBody.innerHTML = html;
}

/* ------------------------------- ACCOUNTS ------------------------------ */
function renderAccounts() {
  let html = '';
  html += `<div class="cfAccts">`;
  html += `<div class="cfAcct"><div class="lbl">OPERATING</div><div class="val${Books.operating < 0 ? ' bad' : ''}">$${Books.operating}</div><div class="sub">yours</div></div>`;
  html += `<div class="cfAcct trust"><div class="lbl">CLIENT TRUST</div><div class="val">$${Books.trust}</div><div class="sub">theirs</div></div>`;
  html += `</div>`;

  if (Books.commingled) {
    html += `<p class="cfWarn">You have taken unearned money out of trust ${Books.commingled} time${Books.commingled > 1 ? 's' : ''}. `
      + `The grievance stays open until the trust account covers what is owed.</p>`;
  }
  if (!Office.held) html += `<p class="cfWarn">Evicted from Suite 2B. There is nowhere to end the day.</p>`;
  else if (Books.arrears) html += `<p class="cfWarn">Rent in arrears: ${Books.arrears} week${Books.arrears > 1 ? 's' : ''}. Two and the lock changes.</p>`;

  html += `<h4>STANDING</h4><ul class="cfFacts">`;
  for (const k of Object.keys(Rep)) {
    const name = k === 'strand' ? 'The Strand' : 'Courthouse Square';
    html += `<li>${name} — <b>${repLabel(Rep[k])}</b> <span class="cfDim">(${Rep[k] > 0 ? '+' : ''}${Rep[k]})</span></li>`;
  }
  html += `</ul>`;

  const ledger = Books.entries.slice().reverse().slice(0, 24);
  if (ledger.length) {
    html += `<h4>LEDGER</h4><table class="cfLedger"><tbody>`;
    for (const e of ledger) {
      html += `<tr><td class="d">${e.day ? dateString(e.day) : ''}</td>`
        + `<td class="a ${e.amount > 0 ? 'pos' : e.amount < 0 ? 'neg' : ''}">${e.amount ? (e.amount > 0 ? '+$' : '−$') + Math.abs(e.amount) : ''}</td>`
        + `<td class="k">${e.account === 'trust' ? 'TRUST' : 'OPER'}</td>`
        + `<td class="l">${e.memo}</td></tr>`;
    }
    html += `</tbody></table>`;
  }
  cfBody.innerHTML = html;
}
