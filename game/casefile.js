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

import { allQuests, isDone, isFailed, started, currentStage, outcomeOf, qstate, hintText } from '../engine/quests.js';
import { knownFacts, openFacts, factCount } from '../engine/facts.js';
import { Cal, dateString, relative, allEntries } from '../engine/clock.js';
import { Books, Rep, Office, repLabel, Firm, STAFF, UPGRADES, payrollTotal, hasUpgrade, staffPower } from '../engine/practice.js';
import { Hours, fmtHours, isLit, pressureStep } from '../engine/hours.js';
import { Bleed, bleedAt, witnessed, canCross, LEVEL_NAME } from '../engine/bleed.js';
import { hasWalked, walkedIn } from '../engine/atlas.js';
import { coda, endingMeta, endingSide } from './ending.js';
import { REGIONS } from './city.js';

let cfRoot, cfBody, cfTabs, cfTitle, cfCloseBtn, cfHint;
export const Casefile = {
  open: false, tab: 'matters', hasClock: true, _layer: 'street',
  // the run summary borrows this whole panel; non-null while it is up
  summary: null,
  onSummaryClose: null,
  // The map needs to know where the player is standing, and casefile.js cannot
  // import main.js. Same hooks idiom the engine uses to ask the game questions.
  hooks: { player: () => null },
};

function cfBuild() {
  if (cfRoot) return;
  cfRoot = document.getElementById('casefile');
  cfBody = document.getElementById('cfBody');
  cfTabs = document.getElementById('cfTabs');
  cfTitle = cfRoot.querySelector('#cfHead h2');
  cfHint = cfRoot.querySelector('#cfHead .hint');
  cfCloseBtn = document.getElementById('cfClose');
  cfCloseBtn.addEventListener('click', () => Casefile.hide());
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
  const wasSummary = this.summary;
  this.open = false;
  this.summary = null;
  cfRoot.classList.remove('open');
  cfTitle.textContent = 'THE CASEFILE';
  cfHint.textContent = '';
  cfCloseBtn.innerHTML = 'CLOSE &nbsp;C';
  // Closing the summary is the last input of a run, so it is the thing that
  // finally puts the player back at the title — not the ending reel, which is
  // still on screen behind this panel.
  if (wasSummary && this.onSummaryClose) this.onSummaryClose();
};

/**
 * The run, accounted for. Borrows the Casefile's own panel and every one of its
 * renderers' CSS classes, because a run summary IS a casefile — the final one,
 * with no tabs, and with the parts that were per-layer shown side by side.
 */
Casefile.showSummary = function (endingId) {
  cfBuild();
  this.open = true;
  this.summary = endingId || 'settle';
  cfRoot.classList.add('open');
  cfTitle.textContent = 'THE FILE, CLOSED';
  cfTabs.innerHTML = '';
  cfHint.textContent = '↑ ↓ scroll';
  cfCloseBtn.textContent = 'CLOSE';
  renderSummary(this.summary);
};
Casefile.toggle = function (layer, hasClock) {
  this.open ? this.hide() : this.show(layer, hasClock);
};

// Each layer gets the tabs its systems justify and no others. THE STREET has
// dates and money; THE FLOOR has neither and has the timesheet instead.
// MAP is on both layers: it is the one panel that is about the city itself
// rather than about a system only one layer has.
const tabsFor = hasClock => hasClock
  ? ['matters', 'map', 'docket', 'accounts']
  : ['matters', 'map', 'hours'];

/* ------------------------------ driving it ----------------------------- */
// The casefile is DOM, so a mouse gets all of this for free — the wheel
// scrolls it and the tabs are buttons. A pad gets NONE of it for free: the
// panel is not in the tab order, `navigator.getGamepads()` moves no scrollbar,
// and until these existed the only thing a controller could do with an open
// casefile was close it again. Which made a stick the one way to open a screen
// you then could not read.
//
// The keyboard was in the same position and it did not look it: input.js
// preventDefaults the arrow keys, so they never reached the scroller either.

/** Scroll the panel body. `dy` is in pixels; the scroller clamps its own ends. */
Casefile.scrollBy = function (dy) {
  cfBuild();
  cfBody.scrollTop += dy;
};

/** Move `n` tabs along, stopping at the ends. No-op on the summary, which has none. */
Casefile.cycleTab = function (n) {
  cfBuild();
  if (this.summary) return false;
  const tabs = tabsFor(this.hasClock);
  const i = tabs.indexOf(this.tab), j = Math.max(0, Math.min(tabs.length - 1, i + n));
  if (j === i) return false;
  this.tab = tabs[j];
  this.render(this._layer);
  cfBody.scrollTop = 0;
  return true;
};

Casefile.render = function (layer) {
  cfBuild();
  // refreshCasefile() fires on every fact, fee and stage change; none of that
  // may redraw over a finished run's summary.
  if (this.summary) return;
  this._layer = layer;

  const tabs = tabsFor(this.hasClock);
  if (!tabs.includes(this.tab)) this.tab = 'matters';
  // Said once, in the panel's own header, because nothing else in the game
  // teaches it: the tabs look clickable and the body looks scrollable, and on a
  // pad neither is reachable by the means they advertise.
  cfHint.textContent = '← → tabs  ·  ↑ ↓ scroll';
  cfTabs.innerHTML = tabs.map(t =>
    `<button data-tab="${t}" class="cfTab${t === this.tab ? ' on' : ''}">${t === 'hours' ? 'THE HOURS' : t.toUpperCase()}</button>`).join('');

  if (this.tab === 'map') return renderMap(layer);
  if (this.tab === 'docket') return renderDocket();
  if (this.tab === 'accounts') return renderAccounts();
  if (this.tab === 'hours') return renderHours();
  renderMatters(layer);
};

/* -------------------------------- THE MAP ------------------------------ */
// Drawn from REGIONS' own origins, so it is the city rather than a picture of
// the city: adding a district puts it on the map and nothing here changes.
//
// A district you have not walked is an empty dashed rectangle with no name in
// it. That is the whole requirement — you can see there is something there and
// you are not told what — and it is why this reads off engine/atlas.js and not
// off `Bleed.seen`, which means you found the evidence somewhere, not that you
// were ever in it.

/** Does this district have a crossing authored on this layer? */
const hasCrossing = (r, layer) =>
  !!(r.layers && r.layers[layer] && (r.layers[layer].props || []).some(p => p.cross));

function renderMap(layer) {
  const here = (Casefile.hooks.player && Casefile.hooks.player()) || null;
  const PAD = 2;
  let mx = 0, my = 0;
  for (const r of REGIONS) {
    mx = Math.max(mx, r.ox + r.rows[0].length);
    my = Math.max(my, r.oy + r.rows.length);
  }

  let svg = `<svg class="cfMap" viewBox="${-PAD} ${-PAD} ${mx + PAD * 2} ${my + PAD * 2}" `
    + `xmlns="http://www.w3.org/2000/svg" role="img" aria-label="city map">`;

  for (const r of REGIONS) {
    const w = r.rows[0].length, h = r.rows.length;
    const known = hasWalked(layer, r.id);
    const cur = here && here.region === r.id;
    const amt = bleedAt(r.id);

    if (!known) {
      svg += `<rect x="${r.ox}" y="${r.oy}" width="${w}" height="${h}" fill="none"`
        + ` stroke="rgba(107,92,143,.30)" stroke-width=".35" stroke-dasharray="1.6 1.6"/>`;
      continue;
    }

    // a walked district is filled, and warmer the further through it has bled
    const tint = amt > 0 ? `rgba(201,162,224,${(0.10 + amt * 0.20).toFixed(3)})` : 'rgba(107,92,143,.20)';
    svg += `<rect x="${r.ox}" y="${r.oy}" width="${w}" height="${h}" fill="${tint}"`
      + ` stroke="${cur ? '#f0c75e' : '#6b5c8f'}" stroke-width="${cur ? '.7' : '.4'}"/>`;

    // `paint-order` puts the dark stroke behind the glyphs, so the name stays
    // readable when the player dot happens to land on top of it — which it can,
    // because the dot is at a real tile and the label is at the centre.
    svg += `<text x="${r.ox + w / 2}" y="${r.oy + h / 2 - 1}" text-anchor="middle"`
      + ` font-size="2.3" font-family="Courier New, monospace" font-weight="bold"`
      + ` paint-order="stroke" stroke="#0a0812" stroke-width=".7"`
      + ` fill="${cur ? '#f0c75e' : '#b6a9d0'}">${r.name}</text>`;

    // `repLabel` returns "unknown" at neutral, which on a MAP reads as the
    // district being unknown rather than your standing in it being nothing yet.
    // Qualified, and omitted entirely at neutral — a walked district needs no
    // caption to say you have no reputation there.
    const state = layer === 'floor'
      ? (isLit(r.id) ? 'ON THE LIGHTS' : 'DARK')
      : (r.id in Rep && Math.abs(Rep[r.id]) >= 2 ? 'YOU ARE ' + repLabel(Rep[r.id]).toUpperCase() : '');
    const sub = [state, amt > 0 ? `BLED ${Math.round(amt * 100)}%` : ''].filter(Boolean).join('  ·  ');
    if (sub)
      svg += `<text x="${r.ox + w / 2}" y="${r.oy + h / 2 + 2.6}" text-anchor="middle"`
        + ` font-size="1.7" font-family="Courier New, monospace" fill="#8d82a8">${sub}</text>`;

    // a way through, once the bleed has put one there
    if (Bleed.level >= 2 && hasCrossing(r, layer))
      svg += `<circle cx="${r.ox + w - 3}" cy="${r.oy + 3}" r="1.1" fill="none"`
        + ` stroke="${canCross() ? '#5ee0c7' : '#6b5c8f'}" stroke-width=".45"/>`;
  }

  // you, at your actual tile
  if (here && here.region && hasWalked(layer, here.region))
    svg += `<circle cx="${here.gx}" cy="${here.gy}" r="1.5" fill="#f0c75e"/>`;

  svg += `</svg>`;

  const known = REGIONS.filter(r => hasWalked(layer, r.id));
  let html = svg;
  html += `<div class="cfCount">${known.length} of ${REGIONS.length} districts walked</div>`;
  if (known.length < REGIONS.length)
    html += `<p class="cfFoot">The rest of it is on the map because it is there, not because you have been. Nothing fills a district in but going to it.</p>`;
  if (Bleed.level >= 2 && REGIONS.some(r => hasCrossing(r, layer)))
    html += `<p class="cfFoot">A ring marks a district with a way through in it. ${canCross() ? 'They are open.' : 'They are not open yet.'}</p>`;
  cfBody.innerHTML = html;
}

/* ------------------------------ THE SUMMARY ---------------------------- */
// Shown once, after the ending reel, over the top of it. Everything in here is
// read off the same state the game has been keeping all along — there is no
// separate scorekeeping, and deliberately no score.

// Grouped on the quest's own `layer`, with a third bucket for the one matter
// that has none. `(q.layer || layer) === layer` would have been the obvious
// line and it puts In re Yourself in BOTH lists, because that is what having no
// layer means to it.
const DOCKETS = [
  ['street', 'THE STREET'],
  ['floor', 'THE FLOOR'],
  ['both', 'BOTH'],
];

function renderSummary(endingId) {
  const E = endingMeta(endingId);
  const all = allQuests();
  const closed = all.filter(q => isDone(q.id) && !isFailed(q.id));
  const lost = all.filter(q => isFailed(q.id));
  const openM = all.filter(q => started(q.id) && !isDone(q.id));
  const never = all.filter(q => !started(q.id));

  // facts, summed over every case that has any
  let fk = 0, ft = 0;
  for (const q of all) { const n = factCount(q.id); fk += n.known; ft += n.total; }

  let html = '';

  // ---- the verdict ----
  html += `<section class="cfCase">`;
  html += `<h3>${E.stamp}<span class="cfStatus">${endingSide(endingId)}</span></h3>`;
  html += `<p class="cfBlurb">${E.title}</p>`;
  html += `<p class="cfFoot">Entered by the court. The court did not entertain an amendment.</p>`;
  html += `</section>`;

  // ---- the docket, both of them ----
  html += `<h4>THE DOCKET</h4>`;
  html += `<div class="cfAccts">`;
  html += `<div class="cfAcct"><div class="lbl">CLOSED</div><div class="val">${closed.length}</div><div class="sub">of ${all.length} matters</div></div>`;
  html += `<div class="cfAcct trust"><div class="lbl">ESTABLISHED</div><div class="val">${fk}</div><div class="sub">of ${ft} things to know</div></div>`;
  html += `</div>`;
  if (lost.length)
    html += `<p class="cfWarn">${lost.length} matter${lost.length > 1 ? 's' : ''} lost on the date. There is no version of the game in which those come back.</p>`;

  for (const [key, label] of DOCKETS) {
    const mine = all.filter(q => (q.layer || 'both') === key && started(q.id));
    if (!mine.length) continue;
    html += `<h4>${label}</h4><ul class="cfFacts">`;
    for (const q of mine) {
      const failed = isFailed(q.id), done = isDone(q.id);
      const status = failed ? `<span class="bad">LOST</span>`
        : done ? `<b>${String(outcomeOf(q.id) || 'closed').toUpperCase()}</b>`
          : `<span class="cfDim">still open</span>`;
      html += `<li>${q.name} — ${status}</li>`;
    }
    html += `</ul>`;
  }
  if (openM.length || never.length)
    html += `<p class="cfFoot">${openM.length} left open, ${never.length} never opened at all. A docket is not a checklist and was never going to be finished.</p>`;

  // ---- the books, if there was ever an economy ----
  if (Books.entries.length) {
    html += `<h4>THE BOOKS</h4><div class="cfAccts">`;
    html += `<div class="cfAcct"><div class="lbl">OPERATING</div><div class="val${Books.operating < 0 ? ' bad' : ''}">$${Books.operating}</div><div class="sub">yours</div></div>`;
    html += `<div class="cfAcct trust"><div class="lbl">CLIENT TRUST</div><div class="val">$${Books.trust}</div><div class="sub">theirs</div></div>`;
    html += `</div>`;
    html += `<ul class="cfFacts">`;
    html += `<li>Trust account crossed — <b>${Books.commingled || 'never'}</b>${Books.commingled ? ' time' + (Books.commingled > 1 ? 's' : '') : ''}</li>`;
    html += `<li>Suite 2B — <b>${Office.held ? 'held' : 'lost'}</b>${Books.arrears ? ` <span class="cfDim">(${Books.arrears} week${Books.arrears > 1 ? 's' : ''} behind)</span>` : ''}</li>`;
    html += `<li>On the payroll at the end — <b>${Firm.staff.length ? Firm.staff.map(id => STAFF[id].name).join(', ') : 'nobody but you'}</b></li>`;
    const bought = Object.values(UPGRADES).filter(u => hasUpgrade(u.id));
    if (bought.length) html += `<li>The room — <b>${bought.map(u => u.name).join(' · ')}</b></li>`;
    html += `</ul>`;
    html += `<p class="cfFoot">${allEntries().length ? `Day ${Cal.day} — ${dateString()}.` : ''} ${Books.entries.length} entries in the ledger.</p>`;
  }

  // ---- the hours, if the building ever billed ----
  if (Hours.billed > 0) {
    const lit = REGIONS.filter(r => r.layers && r.layers.floor && isLit(r.id));
    html += `<h4>THE HOURS</h4><div class="cfAccts">`;
    html += `<div class="cfAcct"><div class="lbl">BANKED</div><div class="val">${fmtHours(Hours.banked)}</div><div class="sub">left over</div></div>`;
    html += `<div class="cfAcct trust"><div class="lbl">BILLED, TOTAL</div><div class="val">${fmtHours(Hours.billed)}</div><div class="sub">this never went down</div></div>`;
    html += `</div>`;
    html += `<p class="cfFoot">${lit.length} of ${REGIONS.length} floors on the lights at the end. Nothing gives hours back.</p>`;
  }

  // ---- standing ----
  const rep = REGIONS.filter(r => r.id in Rep);
  if (rep.length) {
    html += `<h4>STANDING</h4><ul class="cfFacts">`;
    for (const r of rep)
      html += `<li>${r.name} — <b>${repLabel(Rep[r.id])}</b> <span class="cfDim">(${Rep[r.id] > 0 ? '+' : ''}${Rep[r.id]})</span></li>`;
    html += `</ul>`;
  }

  // ---- the city ----
  html += `<h4>THE CITY</h4><ul class="cfFacts">`;
  html += `<li>The bleed reached — <b>${LEVEL_NAME[Bleed.level]}</b></li>`;
  html += `<li>Districts you found it in — <b>${REGIONS.filter(r => witnessed(r.id)).length} of ${REGIONS.length}</b></li>`;
  html += `<li>Times you went through — <b>${Bleed.crossed || 'none'}</b></li>`;
  html += `</ul>`;

  // ---- and what the game makes of it ----
  const lines = coda();
  if (lines.length) {
    html += `<h4>THE RECORD</h4>`;
    for (const l of lines) html += `<p class="cfBlurb">${l}</p>`;
  }
  html += `<p class="cfFoot">A motion to withdraw shall state the reasons therefor, unless the reasons are obvious.</p>`;

  cfBody.innerHTML = html;
  cfBody.scrollTop = 0;
}

/* ------------------------------- THE BLEED ----------------------------- */
// Sits above MATTERS rather than in a tab of its own, because it is not a
// system the player operates — there is nothing to spend and nothing to
// choose. It is a note about the state of the world, and the only actionable
// line in it is the last one.

const BLEED_NOTE = [
  '',
  'Colour that belongs to somewhere else is in the light here. Nothing has moved.',
  'There are things in these districts that are not in these districts. They can be read. They cannot yet be used.',
  'The crossings are open. What is on the other side of one is this city, dressed the other way, and everything you do there is real there.',
];

function bleedPanel() {
  if (!Bleed.level) return '';
  let html = `<section class="cfCase"><h3>THE BLEED<span class="cfStatus">${LEVEL_NAME[Bleed.level]}</span></h3>`;
  html += `<p class="cfBlurb">${BLEED_NOTE[Bleed.level]}</p>`;
  // Which districts have gone over, and which are only tinted. The list is the
  // reason to go back to a district you have finished with.
  const gone = REGIONS.filter(r => witnessed(r.id));
  if (gone.length) {
    html += `<h4>FOUND IN</h4><ul class="cfFacts">`;
    for (const r of gone) html += `<li>${r.name} <span class="cfDim">(${Math.round(bleedAt(r.id) * 100)}% through)</span></li>`;
    html += `</ul>`;
  }
  const left = REGIONS.length - gone.length;
  if (Bleed.level >= 2 && left > 0)
    html += `<p class="cfFoot">${left} district${left > 1 ? 's have' : ' has'} something in ${left > 1 ? 'them' : 'it'} you have not read yet.</p>`;
  if (canCross())
    html += `<p class="cfWarn">You have crossed ${Bleed.crossed} time${Bleed.crossed === 1 ? '' : 's'}. The day does not advance on THE FLOOR and there is no money on it; nothing bills on THE STREET and the lights are somebody else's problem. Both sides keep what you did to them.</p>`;
  html += `</section>`;
  return html;
}

/* ------------------------------- MATTERS ------------------------------- */
function renderMatters(layer) {
  const mine = allQuests().filter(q => (!q.layer || q.layer === layer) && started(q.id));
  if (!mine.length) {
    cfBody.innerHTML = bleedPanel()
      + `<div class="cfEmpty">No open matters.<br><span>Work is out there. It does not come to you — that was the old job.</span></div>`;
    return;
  }

  let html = bleedPanel();
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

    const next = done ? null : hintText(stage);
    if (next) html += `<p class="cfNext"><b>NEXT</b> ${next}</p>`;

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

  // The firm. Wages are shown as a weekly number rather than a headcount,
  // because the headcount is not the thing that will get you — the standing
  // obligation is, and it should be legible next to the balance it comes out of.
  const wages = payrollTotal();
  html += `<h4>THE FIRM</h4>`;
  if (Firm.staff.length) {
    html += `<ul class="cfFacts">`;
    for (const id of Firm.staff) {
      const s = STAFF[id];
      html += `<li>${s.name} — <b>${s.role}</b> <span class="cfDim">$${s.wage}/wk · throws for ${staffPower(s)}</span><br><span class="cfDim">${s.effect}</span></li>`;
    }
    html += `</ul><p class="cfFoot">Payroll runs $${wages} a week, on top of $1,100 rent. That is $${wages + 1100} a week before you have eaten.</p>`;
  } else {
    html += `<p class="cfFoot">Nobody but you. Nothing to make on a Friday, and nobody to answer the phone on a Tuesday.</p>`;
  }

  const bought = Object.values(UPGRADES).filter(u => hasUpgrade(u.id));
  if (bought.length) html += `<p class="cfFoot">Suite 2B: ${bought.map(u => u.name).join(' · ')}.</p>`;

  html += `<h4>STANDING</h4><ul class="cfFacts">`;
  for (const r of REGIONS) {
    if (!(r.id in Rep)) continue;
    html += `<li>${r.name} — <b>${repLabel(Rep[r.id])}</b> <span class="cfDim">(${Rep[r.id] > 0 ? '+' : ''}${Rep[r.id]})</span></li>`;
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
