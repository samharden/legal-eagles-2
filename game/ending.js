"use strict";
// ============================== THE ENDINGS ==============================
// DESIGN §3 and §4 name seven. They are not seven variants of one screen —
// four of them are what a solo practice can become and three of them are what
// a building does with a person, and the whole game has been the argument
// about which list you are on.
//
//   WIN · SETTLE · COUNTERSUE · GO BACK      the street's
//   WAKE · FILE · DISSOLVE                   the floor's
//
// Every one of them is reachable from either path, because by the time this
// screen runs the player has been through a door. Which list you can reach is
// decided by what you DID — the matters you closed, the outcomes you picked,
// the facts you went and got — and never by the key you pressed in the reel.
// SETTLE and WAKE are ungated, one per list, and both of them are surrender.
//
// Presentation is the opening reel's, deliberately: same typewriter, same
// slate, same stamp. The game began with a letter being typed and it ends with
// one, and the second one is being typed by somebody who knows what the first
// one cost.

import { ctx, W, H, C, IS_TOUCH, wrapText } from '../engine/stage.js';
import { Typewriter, Transition, Easing, clamp } from '../engine/anim.js';
import { SFX } from '../engine/audio.js';
import * as Input from '../engine/input.js';
import { Books, Firm, Office } from '../engine/practice.js';
import { Hours, fmtHours } from '../engine/hours.js';
import { Bleed } from '../engine/bleed.js';

const E_CPS = IS_TOUCH ? 64 : 57;
const E_FS = IS_TOUCH ? 19 : 17;
const E_WRAP = IS_TOUCH ? 0.84 : 0.68;

/* -------------------------------- the seven ------------------------------ */

const ENDINGS = {
  win: {
    stamp: 'WIN', color: '#9be05e', part: 'THE SOLO SHINGLE',
    title: 'THE REST OF IT IS A CASE',
    body: [
      'Paragraph 41 is struck and stays struck, and the order runs three pages, and two and a half of those pages are Bane explaining at length what a covenant is for — which is not for this — to a firm that has four hundred lawyers and did not need telling.\n'
        + 'The poaching claim survives. So does the partnership agreement. Those are real claims and they are going to take two years and they are going to be expensive and you are going to be the smallest firm in the room every single day of it.',
      'You file the answer yourself, at the window, at ten to four, and the clerk stamps it without looking up, the way she has stamped nine thousand others.\n'
        + 'That is the whole of it. There is no music. You have a case, and a case is a thing you can work, and for the first time since 2:47 in the morning the thing in front of you is the size of a thing you can work.',
    ],
  },

  settle: {
    stamp: 'SETTLED', color: '#f0c75e', part: 'BY AGREEMENT OF THE PARTIES',
    title: 'A NUMBER, TO MAKE IT STOP',
    body: [
      'It is done in a corridor in eleven minutes by two people who both have somewhere else to be. There is a number. The number is not the point and both sides know the number is not the point.\n'
        + 'You sign a paragraph saying that nothing in the agreement is an admission by anybody of anything, which is true, and which is the most expensive true sentence you will ever put your name to.',
      'Nobody finds out. That is what you bought.\n'
        + 'The covenant is not struck; it is released, as to you, personally, on terms — so the next one out of that building starts where you started, in front of the same door, reading the same paragraph, with nothing on the record to help them at all.',
    ],
  },

  countersue: {
    stamp: 'COUNTERCLAIM', color: '#e0b25e', part: 'REALISATION BY ASSOCIATE, FOUR YEARS',
    title: 'THE COLUMN ON THE RIGHT',
    body: [
      'You put the internal billing summary in as an exhibit. Not the client copy — the one with the write-offs in their own column and the note at the bottom about which of them to have the conversation with.\n'
        + 'It is nineteen pages and it is not about you. That is why it works. Four years of realisation rates by associate is not a document about a covenant, it is a document about what the covenant was for.',
      'It goes on the public docket at 4:51 on a Thursday and by Monday two of the names in the right-hand column have called you, and by the Friday after that it is eleven.\n'
        + 'You did not set out to do this. You set out to keep a laptop and a bar card. But the thing about a record is that it is a record, and a refusal now has to be a refusal OF something, and there is a column with names in it that people can read.',
    ],
  },

  goback: {
    stamp: 'OF COUNSEL', color: '#c9a2e0', part: 'A FLOOR, AND YOUR NAME GOING ON THE DOOR',
    title: 'THEY OFFER YOU YOUR OFFICE',
    body: [
      'The covenant is bought out on your first day, by them, as a line item, the way you would buy out a photocopier lease. It costs them less than the case would have.\n'
        + 'The office is on eleven. It is a good office. The chair is the chair you spent nine years being told was for partners and it is, in the end, a chair.',
      'The carpet is the same. You noticed that in the lobby the first time and you notice it again on the first morning and then, at some point in the following weeks, you stop noticing it.\n'
        + 'Somebody junior comes to your door at about a quarter to eleven at night with a question they have clearly rehearsed, and you answer it well, and you are good at this, and you have always been good at this, and that was never once the problem.',
    ],
  },

  wake: {
    stamp: 'AWAKE', color: '#8e8aa0', part: 'IT WAS THREE SECONDS',
    title: 'YOU PUT YOUR HEAD DOWN FOR A SECOND',
    body: [
      'You lift your head off the desk.\n'
        + 'The coffee is still warm. The screen has not slept. The cursor is in the To: field where you left it and the draft is where you left it, and it is 2:47 in the morning, and it has been 2:47 in the morning for three seconds.',
      'You do not delete it. You do not send it. You minimise it, which is a third thing, and which neither the reel nor the building ever offered you as an option because it is not a decision and it will never be one.\n'
        + 'Then you open the next document, because it is due at nine, and you are the person this firm sends. There are four hundred lawyers in this building and one working printer, and tonight there is one working lawyer, and it is not a metaphor, it is a Tuesday.',
    ],
  },

  file: {
    stamp: 'FILED', color: '#5ee0c7', part: 'IT IS NOT YOURS',
    title: 'ONE OF THEM WILL STILL SEND',
    body: [
      'Four hundred letters and three hundred and ninety-nine of them are dead paper, because a resignation does not take effect when you write it. It takes effect when somebody files it, and there is nobody left to file them, and that is the entire architecture of this place.\n'
        + 'One is not dead. P. LOCKE — who banned midnight meetings, and who vanished at 11:59 p.m., one minute before a meeting she had banned.',
      'The Night Clerk stamps it. The stamp is very loud. He slides a copy back across the counter without being asked — a copy for the file, counsellor, always keep a copy — and somewhere a long way above you a light goes off instead of on.\n'
        + 'One, on a floor with four hundred. It is not much.\n'
        + 'It is one, and it is hers, and you were the person who was standing at the window.',
    ],
  },

  dissolve: {
    stamp: 'DISSOLVED', color: '#e05e5e', part: 'THE HONEST FIGHT',
    title: 'IT SHOULD NOT HAVE BEEN ALLOWED TO BE A PERSON',
    body: [
      'A going concern is a legal fiction and the fiction is doing work: it lets four hundred people\'s labour keep being somebody\'s asset after every one of the four hundred has stopped. That is not a haunting. That is a balance sheet with nobody left to argue with it.\n'
        + 'So you argue with it. Not that it was cruel — it was not cruel, it never once asked anybody to stay. That is true and it is the whole of its defence and it is not a defence.',
      'It comes apart the way a going concern comes apart, which is slowly and into constituent parts, and every one of the parts is somebody\'s work and not one of them stops being good work on the way down.\n'
        + 'The lights go out floor by floor from the top, on a schedule, the way they would at the end of any ordinary Friday in any ordinary building where everybody has gone home.',
    ],
  },
};

/* ------------------------------- the coda -------------------------------- */
// The last paragraph is not written; it is read off the save. DESIGN §5 says
// which of you is real depends on what you did with the trust account, the
// letters, and the four hundred who did not leave — so those three, plus the
// doors, are what the game says back to you at the end. Nothing here scores
// the run; Phase 5 gets the run summary. This is the game noticing.

function coda() {
  const lines = [];

  if (Books.commingled)
    lines.push(`You crossed the trust account ${Books.commingled} time${Books.commingled > 1 ? 's' : ''}. It worked every time. Nobody looked, which is the entire reason it works, and you know now exactly how long you can go without anybody looking.`);
  else if (Books.entries.length)
    lines.push('The client trust account balanced every week you held one. Nobody will ever know that, including the clients, and that is what the rule is: the one you keep when it costs you and nobody is counting.');

  if (!Office.held)
    lines.push('You did not keep the room over the Golden Wok. It turns out a practice is not a room, which is easy to say afterwards and is not remotely what it felt like on the sidewalk with four boxes.');
  if (Firm.staff.length)
    lines.push(`${Firm.staff.length === 1 ? 'One person' : `${Firm.staff.length} people`} made their own rent out of that folding table. They will not put it that way and neither should you, but payroll was made and it was made on time.`);

  if (Hours.billed > 0)
    lines.push(`You billed ${fmtHours(Hours.billed)} hours to a building that has no client, no matter number and no way to invoice anybody. Every one of those entries is still on the sheet. Nothing gives hours back.`);

  if (Bleed.crossed >= 4)
    lines.push(`You went through ${Bleed.crossed} times. It stopped being frightening at about the third, which is the part worth being frightened of.`);
  else if (Bleed.crossed > 1)
    lines.push(`You went through ${Bleed.crossed} times, and you checked the handle on the way past more often than that.`);
  else
    lines.push('You went through once, and once was the whole thing, and you did not need to do it twice to know.');

  return lines;
}

/* ------------------------------- the engine ------------------------------ */

export const Ending = {
  active: false,
  id: null,
  def: null,
  scenes: [],
  i: 0,
  t: 0,
  tw: null,
  trans: new Transition(0.6),
  done: false,
  onDone: null,

  start(id, onDone) {
    this.def = ENDINGS[id] || ENDINGS.settle;
    this.id = id;
    this.active = true;
    this.i = -1;              // -1 is the stamp card, before any body
    this.t = 0;
    this.done = false;
    this.onDone = onDone;
    // The coda is one scene, assembled from the save, always last.
    this.scenes = [...this.def.body, coda().join('\n')];
    this.tw = new Typewriter('', { cps: E_CPS });
    document.body.classList.add('reel');
    SFX.send();
  },

  finish() {
    this.active = false;
    document.body.classList.remove('reel');
    if (this.onDone) this.onDone();
  },

  _load() {
    this.tw = new Typewriter(this.scenes[this.i] || '', { cps: E_CPS, onShout: () => SFX.ret() });
    this.trans.start();
    this.t = 0;
  },

  advance() {
    if (this.done) return;
    if (this.i < 0) { this.i = 0; this._load(); SFX.page(); return; }
    if (!this.tw.done) { this.tw.finish(); SFX.page(); return; }
    if (this.i < this.scenes.length - 1) { this.i++; this._load(); SFX.page(); return; }
    this.done = true;
    this.t = 0;
    SFX.ret();
  },

  step(dt) {
    this.t += dt;
    this.trans.step(dt);
    if (this.i >= 0 && !this.done) {
      const before = this.tw.count;
      this.tw.step(dt);
      if (this.tw.count !== before && this.tw.count % 3 === 0) SFX.key();
    }
    const go = Input.pressed('confirm') || Input.pressed('interact')
      || Input.pressed('strike') || Input.pressed('fire') || Input.pressed('cancel');
    // The stamp card holds for a beat before it will take an input — the last
    // thing this game should do is let a mashed key skip its own ending.
    if (go && (this.i >= 0 || this.t > 1.1)) {
      if (this.done) { this.finish(); return; }
      this.advance();
    }
  },

  tap() { this.step(0); if (this.i >= 0 || this.t > 1.1) { if (this.done) this.finish(); else this.advance(); } },

  draw() {
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#08060f';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';

    const d = this.def;

    // ---- the stamp card ----
    if (this.i < 0) {
      const k = Easing.outBack(clamp(this.t / 0.55, 0, 1));
      g.save();
      g.translate(W / 2, H * 0.38);
      g.scale(k, k);
      g.rotate(-0.04);
      g.font = `bold ${IS_TOUCH ? 44 : 42}px "Courier New", monospace`;
      g.strokeStyle = d.color; g.lineWidth = 3;
      const w = g.measureText(d.stamp).width;
      g.strokeRect(-w / 2 - 24, -34, w + 48, 68);
      g.fillStyle = d.color;
      g.fillText(d.stamp, 0, 0);
      g.restore();

      if (this.t > 0.6) {
        g.globalAlpha = clamp((this.t - 0.6) / 0.6, 0, 1);
        g.font = 'bold 13px "Courier New", monospace';
        g.fillStyle = C.dim;
        g.fillText('IN RE YOURSELF', W / 2, H * 0.55);
        g.font = `bold ${IS_TOUCH ? 22 : 20}px "Courier New", monospace`;
        g.fillStyle = C.gold;
        g.fillText(d.title, W / 2, H * 0.60);
        g.globalAlpha = 1;
      }
      if (this.t > 1.1) {
        g.font = '12px "Courier New", monospace';
        g.fillStyle = C.dim;
        g.fillText(IS_TOUCH ? 'tap to continue' : 'press E / SPACE to continue', W / 2, H - 40);
      }
      return;
    }

    // ---- the close ----
    // Replaces the body rather than fading over it. A translucent scrim on top
    // of live text is two things fighting for the same pixels and neither of
    // them wins; the last card in the game should be the only thing on screen.
    if (this.done) {
      const k = clamp(this.t / 0.8, 0, 1);
      g.globalAlpha = k;
      g.font = 'bold 13px "Courier New", monospace';
      g.fillStyle = C.dim;
      g.fillText(d.part, W / 2, H * 0.42);
      g.font = `bold ${IS_TOUCH ? 40 : 38}px "Courier New", monospace`;
      g.fillStyle = d.color;
      g.fillText(d.stamp, W / 2, H * 0.50);
      g.strokeStyle = C.rule; g.lineWidth = 1;
      g.beginPath(); g.moveTo(W * 0.32, H * 0.57); g.lineTo(W * 0.68, H * 0.57); g.stroke();
      g.font = 'bold 15px "Courier New", monospace';
      g.fillStyle = C.gold;
      g.fillText('LEGAL EAGLES II: MOTION TO WITHDRAW', W / 2, H * 0.63);
      g.globalAlpha = 1;
      if (this.t > 1.4) {
        g.font = '12px "Courier New", monospace';
        g.fillStyle = C.dim;
        g.fillText(IS_TOUCH ? 'tap to return to the title' : 'press E / SPACE to return to the title', W / 2, H - 40);
      }
      return;
    }

    // ---- the body, on the reel's slate ----
    const a = this.trans.contentAlpha;
    g.save();
    g.globalAlpha = a;
    g.translate(0, this.trans.slideY);

    g.textAlign = 'left';
    g.font = `${E_FS}px "Courier New", monospace`;
    const maxW = W * E_WRAP;
    const lineH = E_FS + 8;
    const paras = this.scenes[this.i].split('\n').map(p => wrapText(g, p, maxW));
    const bodyH = paras.reduce((n, ls) => n + ls.length * lineH + 6, 0);
    const bodyTop = Math.max(H * 0.26, (H - bodyH) / 2);

    const tag = this.i === this.scenes.length - 1 ? 'THE RECORD' : d.stamp;
    g.font = 'bold 12px "Courier New", monospace';
    g.fillStyle = C.dim;
    g.fillText(tag, 40, bodyTop - 58);
    g.font = `bold ${IS_TOUCH ? 22 : 20}px "Courier New", monospace`;
    g.fillStyle = d.color;
    g.fillText(this.i === this.scenes.length - 1 ? 'WHAT YOU DID' : d.title, 40, bodyTop - 34);
    g.strokeStyle = C.rule; g.lineWidth = 2;
    g.beginPath(); g.moveTo(40, bodyTop - 16); g.lineTo(W - 40, bodyTop - 16); g.stroke();

    g.font = `${E_FS}px "Courier New", monospace`;
    g.fillStyle = C.ink;
    let y = bodyTop + lineH / 2;
    for (const para of this.tw.shown.split('\n')) {
      for (const ln of wrapText(g, para, maxW)) { g.fillText(ln, 40, y); y += lineH; }
      y += 6;
    }
    g.restore();

    g.globalAlpha = 1;
    g.font = '12px "Courier New", monospace';
    g.fillStyle = C.dim;
    g.textAlign = 'right';
    g.fillText(this.tw.done ? (IS_TOUCH ? 'tap to continue' : 'press E / SPACE to continue')
      : (IS_TOUCH ? 'tap to skip ahead' : 'any key to skip ahead'), W - 40, H - 30);
  },
};

export const ENDING_IDS = Object.keys(ENDINGS);
