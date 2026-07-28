"use strict";
// ============================== THE CASEFILE ==============================
// Press C. Every matter you have open, what you are supposed to do next, and —
// the part that matters — everything you KNOW, separated from everything you
// still don't.
//
// LE1's equivalent was a MATTERS tab listing quest titles. That is a to-do
// list. This is the case: an investigation game has to show its working, or
// the player cannot tell the difference between being stuck and being early.

import { allQuests, isActive, isDone, started, currentStage, outcomeOf, questDef } from '../engine/quests.js';
import { knownFacts, openFacts, factCount } from '../engine/facts.js';

let cfRoot, cfBody;
export const Casefile = { open: false };

function cfBuild() {
  if (cfRoot) return;
  cfRoot = document.getElementById('casefile');
  cfBody = document.getElementById('cfBody');
  document.getElementById('cfClose').addEventListener('click', () => Casefile.hide());
}

Casefile.show = function (layer) {
  cfBuild();
  this.open = true;
  cfRoot.classList.add('open');
  this.render(layer);
};
Casefile.hide = function () {
  cfBuild();
  this.open = false;
  cfRoot.classList.remove('open');
};
Casefile.toggle = function (layer) { this.open ? this.hide() : this.show(layer); };

Casefile.render = function (layer) {
  cfBuild();
  const mine = allQuests().filter(q => (!q.layer || q.layer === layer) && started(q.id));
  if (!mine.length) {
    cfBody.innerHTML = `<div class="cfEmpty">No open matters.<br><span>Work is out there. It does not come to you — that was the old job.</span></div>`;
    return;
  }

  let html = '';
  for (const q of mine) {
    const done = isDone(q.id);
    const stage = currentStage(q.id);
    const n = factCount(q.id);
    html += `<section class="cfCase${done ? ' closed' : ''}">`;
    html += `<h3>${q.name}<span class="cfStatus">${done ? 'CLOSED — ' + String(outcomeOf(q.id) || '').toUpperCase() : 'OPEN'}</span></h3>`;
    html += `<p class="cfBlurb">${q.blurb}</p>`;

    if (!done && stage && stage.hint)
      html += `<p class="cfNext"><b>NEXT</b> ${stage.hint}</p>`;

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
};
