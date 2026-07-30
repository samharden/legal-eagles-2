"use strict";
// ============================== THE OPENING ==============================
// One continuous cinematic that ends on a two-choice dialog with a cursor
// blinking in an empty To: field. There is no confirmation prompt and no way
// back. Whichever key the player hits is the game they get:
//
//   SEND   -> layer 'street' -> THE SOLO SHINGLE
//   DELETE -> layer 'floor'  -> WAS THIS ALL A DREAM?

import { ctx, W, H, C, IS_TOUCH, wrapText } from '../engine/stage.js';
import { SPR, drawSprite } from '../engine/sprites.js';
import { Typewriter, Transition, Easing, clamp } from '../engine/anim.js';
import { SFX } from '../engine/audio.js';
import * as Input from '../engine/input.js';
import { AREAS, DEFAULT_AREA, importLE1 } from './areas.js';

const CPS = IS_TOUCH ? 62 : 55;
const FS = IS_TOUCH ? 19 : 17;      // body type
const WRAP = IS_TOUCH ? 0.82 : 0.66; // fraction of the board the text may use

/* ------------------------------ scene art ------------------------------ */

function drawTower(g, t) {
  const cx = W / 2, base = H * 0.78;
  const tw = Math.min(W * 0.30, 240), th = H * 0.52;
  // the tower
  g.fillStyle = '#0e0b18';
  g.fillRect(cx - tw / 2, base - th, tw, th);
  g.fillStyle = '#171327';
  g.fillRect(cx - tw / 2, base - th, tw, 6);
  // windows — dark, except one
  const cols = 6, rows = 12;
  const mw = tw / (cols + 1), mh = th / (rows + 1);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = cx - tw / 2 + mw * 0.6 + c * mw, y = base - th + mh * 0.7 + r * mh;
    const lit = (r === 2 && c === 4);
    g.fillStyle = lit ? '#f0c75e' : '#16122340';
    g.fillRect(x, y, mw * 0.62, mh * 0.5);
    if (lit) {
      g.save();
      g.globalAlpha = 0.22 + Math.sin(t * 1.6) * 0.05;
      const grad = g.createRadialGradient(x + mw * 0.3, y + mh * 0.25, 0, x + mw * 0.3, y + mh * 0.25, 90);
      grad.addColorStop(0, 'rgba(240,199,94,0.7)'); grad.addColorStop(1, 'rgba(240,199,94,0)');
      g.fillStyle = grad; g.fillRect(x - 90, y - 90, 180, 180);
      g.restore();
    }
  }
  // ground haze
  g.fillStyle = '#0a0812';
  g.fillRect(0, base, W, H - base);
}

function drawDesk(g, t) {
  const cx = W / 2, cy = H * 0.46;
  const mw = Math.min(W * 0.44, 340), mh = mw * 0.62;
  // monitor glow
  const grad = g.createRadialGradient(cx, cy, 10, cx, cy, mw);
  grad.addColorStop(0, 'rgba(120,150,190,0.20)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(cx - mw, cy - mw, mw * 2, mw * 2);
  // bezel + screen
  g.fillStyle = '#1c1830'; g.fillRect(cx - mw / 2 - 8, cy - mh / 2 - 8, mw + 16, mh + 16);
  g.fillStyle = '#0e1420'; g.fillRect(cx - mw / 2, cy - mh / 2, mw, mh);
  // draft lines
  g.fillStyle = '#3d5570';
  for (let i = 0; i < 6; i++) g.fillRect(cx - mw / 2 + 18, cy - mh / 2 + 24 + i * 15, mw * (0.62 - i * 0.06), 4);
  // the cursor
  if (Math.floor(t * 1.6) % 2 === 0) {
    g.fillStyle = '#c9d8ea';
    g.fillRect(cx - mw / 2 + 18, cy - mh / 2 + 24 + 6 * 15, 9, 13);
  }
  // desk edge
  g.fillStyle = '#141021'; g.fillRect(0, cy + mh / 2 + 30, W, H);
}

function drawLetter(g, t) {
  const pw = Math.min(W * 0.46, 330), ph = pw * 1.28;
  const cx = W / 2, cy = H * 0.44;
  g.save();
  g.translate(cx, cy);
  g.rotate(-0.02 + Math.sin(t * 0.6) * 0.004);
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(-pw / 2 + 6, -ph / 2 + 8, pw, ph);
  g.fillStyle = '#e9e2d2';
  g.fillRect(-pw / 2, -ph / 2, pw, ph);
  g.fillStyle = '#b9ae97';
  for (let i = 0; i < 14; i++) g.fillRect(-pw / 2 + 22, -ph / 2 + 40 + i * 17, pw * (0.5 + (i % 4) * 0.11), 3);
  g.fillStyle = '#8a7f68';
  g.fillRect(-pw / 2 + 22, ph / 2 - 52, pw * 0.42, 3);
  g.restore();
}

/**
 * The bar card, with both photographs on it. The portraits are the actual
 * player sprites at size — you should be able to see which one you are picking
 * rather than read a description of it and hope.
 */
function drawBarCard(g, t, I) {
  const cx = W / 2, cy = H * 0.30;
  const cw = Math.min(W * 0.62, 460), ch = 150;
  g.save();
  g.translate(cx, cy);
  g.rotate(-0.015);
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(-cw / 2 + 5, -ch / 2 + 6, cw, ch);
  g.fillStyle = '#ddd6c4';
  g.fillRect(-cw / 2, -ch / 2, cw, ch);
  g.strokeStyle = '#b0a68e'; g.lineWidth = 2;
  g.strokeRect(-cw / 2, -ch / 2, cw, ch);
  g.font = 'bold 11px "Courier New", monospace';
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#6b6248';
  g.fillText('STATE BAR — ADMITTED', -cw / 2 + 16, -ch / 2 + 18);
  g.fillStyle = '#8a7f68';
  for (let i = 0; i < 3; i++) g.fillRect(-cw / 2 + 16, ch / 2 - 40 + i * 11, cw * (0.30 + i * 0.06), 2);

  // the two photographs, side by side, the live one lit
  const list = I && I._choices();
  const pick = I && I.look;
  const px = [-cw * 0.16, cw * 0.22];
  for (let i = 0; i < 2; i++) {
    const key = ['p_f', 'p_m'][i];
    const on = pick ? pick === key : !!(list && list[i] && I.sel === i);
    g.fillStyle = on ? '#f4efe2' : '#c6bda7';
    g.fillRect(px[i] - 34, -34, 68, 84);
    g.strokeStyle = on ? '#caa84a' : '#a89e86'; g.lineWidth = on ? 3 : 1;
    g.strokeRect(px[i] - 34, -34, 68, 84);
    g.globalAlpha = on ? 1 : 0.45;
    drawSprite(g, SPR[key], px[i], 4, 66);
    g.globalAlpha = 1;
  }
  g.restore();
}

function drawChoiceArt(g, t) {
  const cx = W / 2, cy = H * 0.30;
  const bw = Math.min(W * 0.56, 420);
  g.fillStyle = '#0e1420';
  g.fillRect(cx - bw / 2, cy - 46, bw, 92);
  g.strokeStyle = '#2c3a4e'; g.lineWidth = 2;
  g.strokeRect(cx - bw / 2, cy - 46, bw, 92);
  g.font = `bold 14px "Courier New", monospace`;
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#5f7590';
  g.fillText('To:', cx - bw / 2 + 16, cy - 22);
  g.fillText('Subject:', cx - bw / 2 + 16, cy + 6);
  g.fillStyle = '#c9d8ea';
  g.fillText('Notice of Withdrawal', cx - bw / 2 + 96, cy + 6);
  // the empty To: field, and the cursor sitting in it
  if (Math.floor(t * 1.7) % 2 === 0) {
    g.fillStyle = '#f0c75e';
    g.fillRect(cx - bw / 2 + 96, cy - 31, 9, 17);
  }
  g.fillStyle = '#3d5570';
  g.fillRect(cx - bw / 2 + 16, cy + 30, bw - 32, 3);
}

/* -------------------------------- script -------------------------------- */

const SCENES = [
  {
    id: 'A', tag: 'EXHIBIT A', title: '2:47 A.M.', art: drawTower,
    body: 'The firm has four hundred lawyers and one working printer. Tonight it has one working lawyer.\n'
      + 'You have been at this desk for nineteen hours. For the last forty minutes you have not been billing them for it.',
  },
  {
    id: 'B', tag: 'EXHIBIT B', title: 'THE DRAFT', art: drawDesk,
    body: 'You have written this letter eleven times.\n'
      + 'The first ten were arguments. This one is two paragraphs and it does not argue with anybody.',
  },
  {
    // Who you are, asked rather than assumed. DESIGN §6 anticipates a short
    // character creation when there is no LE1 save; there is no good reason for
    // it to be shorter when there IS one, because most people will never have
    // played the first game and the ones who did should still get to decide.
    // The bar card is the diegetic place for a photograph.
    id: 'P', tag: 'EXHIBIT C', title: 'THE BAR CARD', art: drawBarCard,
    field: 'look',
    body: 'Your bar card has been on this desk for nine years, under a coffee ring that has been there almost as long.\n'
      + 'The photograph was taken the week you were admitted. It is of somebody who had no idea, and it is the only picture of you anybody at this firm has ever seen.',
    choices: [
      { key: 'p_f', label: 'THE DARK HAIR, THE WINE SUIT', sub: 'You have worn it to every hearing that mattered.' },
      { key: 'p_m', label: 'THE SHORT HAIR, THE NAVY SUIT', sub: 'The tie was a gift. You never did replace it.' },
    ],
  },
  {
    // The practice area is chosen HERE, by finishing a sentence in the letter.
    // It is the ranged attack for the whole game — DESIGN §3's practice area and
    // LE1's five classes — but the player is not picking a weapon, they are
    // saying what they did for these people for nine years. Same decision, and
    // it belongs in the resignation rather than on a select screen.
    //
    // If an LE1 save exists it has already answered this, so the blank arrives
    // filled in and there is nothing to choose. That is the better beat anyway.
    id: 'C', tag: 'EXHIBIT D', title: 'THE LETTER', art: drawLetter,
    field: 'area',
    body: I => {
      const head = 'Dear Managing Partner Hargrove:\n'
        + 'Please accept this as notice of my resignation, effective immediately.\n';
      const a = I.area && AREAS[I.area];
      if (!a) return head + 'For nine years I have been the person this firm sends when ______________________.';
      return head
        + `For nine years I have been the person this firm sends when ${a.letter}\n`
        + 'I am grateful for the opportunity. I am not grateful for the rest of it.\n'
        + 'Very truly yours,';
    },
    choices: Object.values(AREAS).map(a => ({ key: a.id, label: a.name, sub: a.letter })),
  },
  {
    id: 'D', fork: true, tag: 'EXHIBIT E', title: 'THE CHOICE', art: drawChoiceArt,
    body: I => I.forced
      ? 'The cursor is in an empty To: field and the draft is open and you have been at this desk before.\n'
        + `Last time you ${I.prev && I.prev.path === 'send' ? 'sent it' : 'deleted it'}, and that is on the record, and the record is not a thing this building revises.\n`
        + 'There is one key left. There was only ever going to be one key left.'
      : 'The cursor is in an empty To: field.\n'
        + 'There is no confirmation dialog. There is no draft folder that forgives you.\n'
        + 'Whichever key you press is the rest of your life.',
    choices: [
      { key: 'send', label: 'SEND IT.', sub: 'Resign. Hang your own shingle. Survive it.' },
      { key: 'delete', label: 'DELETE IT.', sub: 'Close the draft. Put your head down. Just for a second.' },
    ],
  },
];

const OUTCOMES = {
  send: {
    layer: 'street', part: 'THE SOLO SHINGLE',
    line: 'SENT — 2:51 A.M. For eleven seconds it feels exactly like flight. Then you remember you have no clients, no office, and eleven hundred dollars.',
  },
  delete: {
    layer: 'floor', part: 'WAS THIS ALL A DREAM?',
    line: 'DELETED. You put your head down on the desk. Just for a second.\n\nWhen you lift it, the lights are off, the dust is thick, and the calendar on the wall is wrong by a number of years you decide not to work out yet.',
  },
};

/* -------------------------------- engine -------------------------------- */

export const Intro = {
  active: false,
  i: 0,
  sceneT: 0,
  tw: null,
  trans: new Transition(0.55),
  sel: 0,
  choice: null,
  outroT: 0,
  onDone: null,

  area: null,
  le1: null,
  // NEW GAME +: the key the last run did not press, and the record of the one it did
  forced: null,
  prev: null,

  start(onDone, plus = null) {
    this.active = true; this.i = 0; this.sceneT = 0; this.sel = 0;
    this.choice = null; this.outroT = 0; this.onDone = onDone;
    this.forced = (plus && plus.forcePath) || null;
    this.prev = (plus && plus.prev) || null;
    // DESIGN §6: the first game answers these if it can — but it does not get to
    // answer them FOR you, and it does not get to put the cursor on its answer
    // either. Most people will never have played LE1; the ones who did should
    // still be the ones deciding. An LE1 save MARKS its rows and moves nothing.
    this.le1 = importLE1();
    this.area = null;
    this.look = null;
    document.body.classList.add('reel');
    this._load();
  },

  /** The scene's text, which for the letter depends on what is in the blank. */
  _body() {
    const s = SCENES[this.i];
    return typeof s.body === 'function' ? s.body(this) : s.body;
  },
  /**
   * The choices actually on offer — none once the scene's field is decided.
   * An LE1 save annotates the row it came from rather than removing the list.
   */
  _choices() {
    const s = SCENES[this.i];
    if (!s.choices) return null;
    if (s.field && this[s.field]) return null;
    // A `mark`, not a longer `sub`: the sub column already runs most of the way
    // to the edge of the row on the five-wide layout, and appending to it put
    // the note outside the box it belongs to.
    if (s.field === 'area' && this.le1)
      return s.choices.map(c => c.key === this.le1.area ? { ...c, mark: 'LAST TIME' } : c);
    if (s.field === 'look' && this.le1)
      return s.choices.map(c => c.key === this.le1.spr ? { ...c, mark: 'LAST TIME' } : c);
    // The fork is spent on a second run. Both keys are still shown — the one you
    // pressed last time has to be visible, or "the other one" means nothing —
    // but only one of them is still a key you can press.
    if (s.fork && this.forced)
      return s.choices.map(c => c.key === this.forced
        ? c
        : { ...c, spent: true, sub: 'You did this. It is done and it does not undo.' });
    return s.choices;
  },

  _load() {
    this.tw = new Typewriter(this._body(), { cps: CPS, onShout: () => SFX.ret() });
    this.trans.start();
    this.sceneT = 0;
    // Land the cursor on what the last game said you were, so an LE1 player
    // confirms rather than hunts. Still a keystroke, and still theirs.
    const s = SCENES[this.i];
    // The cursor starts at the top of every list for everybody. It used to land
    // on whatever LE1 said you were, which is still a default however it is
    // labelled — press confirm without looking and you get the last game's
    // answer. The mark stays; the cursor does not move.
    if (s.choices) this.sel = 0;
    // ...except onto a key that cannot be pressed
    if (s.fork && this.forced) {
      const at = s.choices.findIndex(c => c.key === this.forced);
      this.sel = at >= 0 ? at : 0;
    }
  },

  /** Next selectable row in `dir`, skipping anything spent. */
  _seek(list, dir) {
    let i = this.sel;
    for (let n = 0; n < list.length; n++) {
      i = (i + dir + list.length) % list.length;
      if (!list[i].spent) return i;
    }
    return this.sel;
  },
  finish() {
    this.active = false;
    document.body.classList.remove('reel');
    // On a second run the fallback is the key that is still available, never the
    // hardcoded 'send' — which on a NG+ following a SEND run is the spent one.
    const key = this.choice || this.forced || 'send';
    const out = OUTCOMES[key];
    // Skipping the reel never reaches either question, so the LE1 answer is the
    // best one available before the hardcoded default.
    const area = this.area || (this.le1 && this.le1.area) || DEFAULT_AREA;
    const look = this.look || (this.le1 && this.le1.spr) || 'p_f';
    if (this.onDone) this.onDone(out.layer, key, area, look);
  },
  skip() {
    // Esc/B before the fork still has to produce a fork — jump to it rather
    // than picking for the player.
    if (this.choice) { this.finish(); return; }
    this.i = SCENES.length - 1;
    this._load();
    this.tw.finish();
  },

  advance() {
    if (this.choice) { if (this.outroT > 1.2) this.finish(); return; }
    if (!this.tw.done) { this.tw.finish(); SFX.page(); return; }
    if (this._choices()) return;       // an undecided choice does not auto-advance
    if (this.i < SCENES.length - 1) { this.i++; this._load(); SFX.page(); }
  },

  pick(n) {
    const s = SCENES[this.i];
    const list = this._choices();
    if (!list || this.choice) return;
    const c = list[n];
    if (!c) return;
    if (c.spent) { SFX.del(); return; }   // the key you already pressed

    // A `field` scene records an answer and stays put — the letter re-types
    // itself with the blank filled, and the player reads their own sentence
    // back before the page turns. The fork is the only choice that ends the reel.
    if (s.field) {
      this[s.field] = c.key;
      this.sel = 0;
      SFX.ret();
      this._load();
      return;
    }
    this.choice = c.key;
    this.outroT = 0;
    if (c.key === 'send') SFX.send(); else SFX.del();
  },

  step(dt) {
    this.sceneT += dt;
    this.trans.step(dt);
    if (this.choice) {
      this.outroT += dt;
      if (this.outroT > 1.2 && (Input.pressed('confirm') || Input.pressed('interact')
        || Input.pressed('strike') || Input.pressed('fire') || Input.pressed('cancel'))) this.finish();
      return;
    }
    const before = this.tw.count;
    this.tw.step(dt);
    if (this.tw.count !== before && this.tw.count % 3 === 0) SFX.key();

    const list = this._choices();
    // No auto page-turn. The reel used to advance itself a few seconds after the
    // narration landed, which reads fine at the pace it was written at and takes
    // the page away from anybody reading slower than that — on the one screen in
    // the game where every word is doing work. It waits now.

    // input
    if (Input.pressed('cancel')) { this.skip(); return; }
    if (list && this.tw.done) {
      const nv = Input.nav();
      if (nv === 'up') { this.sel = this._seek(list, -1); SFX.blip(); }
      if (nv === 'down') { this.sel = this._seek(list, 1); SFX.blip(); }
      const n = Input.numberPressed();
      if (n >= 1 && n <= list.length) { this.pick(n - 1); return; }
      if (Input.pressed('confirm') || Input.pressed('interact')) { this.pick(this.sel); return; }
    } else if (Input.pressed('confirm') || Input.pressed('interact') || Input.pressed('fire') || Input.pressed('strike')) {
      this.advance();
    }
  },

  // a tap anywhere: fast-forward, turn the page, or hit a choice row
  tap(x, y) {
    if (this.choice) { if (this.outroT > 1.2) this.finish(); return; }
    if (x > W - 110 && y < 54) { this.skip(); return; }
    if (this._choices() && this.tw.done) {
      for (let i = 0; i < this._rects.length; i++) {
        const r = this._rects[i];
        if (!r) continue;      // spent row — no hit box
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { this.pick(i); return; }
      }
      return;
    }
    this.advance();
  },

  _rects: [],

  draw() {
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#08060f';
    g.fillRect(0, 0, W, H);

    if (this.choice) { this._drawOutro(g); return; }

    const s = SCENES[this.i];
    const a = this.trans.contentAlpha, slide = this.trans.slideY;

    g.save();
    g.globalAlpha = a;
    g.translate(0, slide);

    // art, with a slow Ken Burns push
    g.save();
    const k = this.trans.kenBurns(this.sceneT, 0.04, 11);
    g.translate(W / 2, H / 2); g.scale(k, k); g.translate(-W / 2, -H / 2);
    if (s.art) s.art(g, this.sceneT, this);
    g.restore();

    // ---- layout, bottom-up ----------------------------------------------
    // The type block is measured against the FULL scene text, not the portion
    // typed so far, so the slate does not creep upward as characters land — and
    // the choice rows get a reserved band that the body can never grow into.
    g.font = `${FS}px "Courier New", monospace`;
    const maxW = W * WRAP;
    const paras = this._body().split('\n').map(p => wrapText(g, p, maxW));
    const lineH = FS + 8;
    const bodyH = paras.reduce((n, ls) => n + ls.length * lineH + 5, 0);

    // The fork is two fat rows. The practice area is five, and five rows at the
    // fork's height would push the letter off the top of the board — so the row
    // shrinks with the count rather than the letter being cut.
    const list = this._choices();
    const rowH = list && list.length > 3 ? 38 : 54;
    const showChoices = !!(list && this.tw.done);
    const choicesH = list ? list.length * rowH : 0;
    const choicesTop = H - 26 - choicesH;
    const bodyBottom = (list ? choicesTop : H - 44) - 14;
    const bodyTop = bodyBottom - bodyH;
    const ruleY = bodyTop - 18;
    const titleY = ruleY - 20;
    const tagY = titleY - 26;

    // scrim under the type so the art can be as bright as it likes
    const scrimTop = tagY - 40;
    const grd = g.createLinearGradient(0, scrimTop, 0, H);
    grd.addColorStop(0, 'rgba(8,6,15,0)'); grd.addColorStop(0.30, 'rgba(8,6,15,0.92)'); grd.addColorStop(1, 'rgba(8,6,15,0.98)');
    g.fillStyle = grd; g.fillRect(0, scrimTop, W, H - scrimTop);

    // slate
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = 'bold 12px "Courier New", monospace';
    g.fillStyle = C.dim;
    g.fillText(s.tag, 34, tagY);
    g.font = `bold ${IS_TOUCH ? 24 : 22}px "Courier New", monospace`;
    g.fillStyle = C.gold;
    g.fillText(s.title, 34, titleY);
    g.strokeStyle = C.rule; g.lineWidth = 2;
    g.beginPath(); g.moveTo(34, ruleY); g.lineTo(W - 34, ruleY); g.stroke();

    // body — typed portion, laid out on the measured grid
    g.font = `${FS}px "Courier New", monospace`;
    g.fillStyle = C.ink;
    let y = bodyTop + lineH / 2;
    for (const para of this.tw.shown.split('\n')) {
      for (const ln of wrapText(g, para, maxW)) { g.fillText(ln, 34, y); y += lineH; }
      y += 5;
    }

    // choices
    this._rects = [];
    if (showChoices) {
      let cy = choicesTop;
      const tight = rowH < 54;
      list.forEach((c, i) => {
        const on = i === this.sel && !c.spent;
        // The five-wide layout gets a wider row than the fork's two: it carries a
        // label, a clause and possibly a mark on one line, and at 640 the clause
        // finished about twenty pixels short of the border.
        const rw = Math.min(W - 68, tight ? 780 : 520), rh = rowH - 8;
        // a spent row is not tappable either — null keeps its place in the index
        this._rects.push(c.spent ? null : { x: 34, y: cy - 4, w: rw, h: rh });
        g.fillStyle = on ? 'rgba(240,199,94,0.13)' : c.spent ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.03)';
        g.fillRect(34, cy - 4, rw, rh);
        g.strokeStyle = on ? C.gold : C.rule; g.lineWidth = on ? 2 : 1;
        g.strokeRect(34, cy - 4, rw, rh);
        if (tight) {
          // one line: the area, then the clause it puts in the letter
          g.font = `bold ${FS - 2}px "Courier New", monospace`;
          g.fillStyle = on ? C.gold : C.muted;
          const head = `${i + 1}.  ${c.label}`;
          g.fillText(head, 48, cy + rh / 2 - 2);
          g.font = `${FS - 5}px "Courier New", monospace`;
          g.fillStyle = C.dim;
          g.fillText(c.sub, 48 + Math.max(230, g.measureText(head).width + 24), cy + rh / 2 - 2);
          // right-aligned inside the row, so it cannot run past the border no
          // matter how long the clause beside it is
          if (c.mark) {
            g.textAlign = 'right';
            g.fillStyle = on ? C.gold : C.muted;
            g.fillText(c.mark, 34 + rw - 14, cy + rh / 2 - 2);
            g.textAlign = 'left';
          }
        } else {
          g.font = `bold ${FS}px "Courier New", monospace`;
          g.fillStyle = c.spent ? C.rule : on ? C.gold : C.muted;
          const head = c.spent ? `—   ${c.label}` : `${i + 1}.  ${c.label}`;
          g.fillText(head, 48, cy + 12);
          // struck through, at the width of the text and not the row: this key
          // was pressed, it is on the record, and the record does not get revised
          if (c.spent) {
            const w = g.measureText(head).width;
            g.strokeStyle = C.rule; g.lineWidth = 2;
            g.beginPath(); g.moveTo(48, cy + 13); g.lineTo(48 + w, cy + 13); g.stroke();
          }
          g.font = `${FS - 4}px "Courier New", monospace`;
          g.fillStyle = c.spent ? C.rule : C.dim;
          g.fillText(c.sub, 48, cy + 32);
          // the LE1 mark belongs on the fat rows too — the bar card is two rows,
          // and it was the one scene where the mark silently did not render
          if (c.mark) {
            g.font = `bold ${FS - 5}px "Courier New", monospace`;
            g.textAlign = 'right';
            g.fillStyle = on ? C.gold : C.muted;
            g.fillText(c.mark, 34 + rw - 14, cy + 12);
            g.textAlign = 'left';
          }
        }
        cy += rowH;
      });
    } else if (!list) {
      g.font = '12px "Courier New", monospace';
      g.fillStyle = C.dim;
      g.textAlign = 'right';
      g.fillText(this.tw.done ? (IS_TOUCH ? 'tap to continue' : 'press E / SPACE to continue')
        : (IS_TOUCH ? 'tap to skip ahead' : 'any key to skip ahead'), W - 34, H - 26);
    }
    g.restore();

    // skip chip
    g.globalAlpha = 1;
    g.font = 'bold 12px "Courier New", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(9,7,15,0.75)';
    g.fillRect(W - 104, 14, 88, 30);
    g.strokeStyle = C.line; g.lineWidth = 1;
    g.strokeRect(W - 104, 14, 88, 30);
    g.fillStyle = C.muted;
    g.fillText(IS_TOUCH ? 'SKIP' : 'SKIP ESC', W - 60, 30);

    // splice flash
    if (this.trans.flash > 0) {
      g.fillStyle = `rgba(255,255,255,${this.trans.flash * 0.5})`;
      g.fillRect(0, 0, W, H);
    }
  },

  _drawOutro(g) {
    const out = OUTCOMES[this.choice];
    const t = this.outroT;
    const a = clamp(t / 0.6, 0, 1);

    g.globalAlpha = a;
    g.textAlign = 'center'; g.textBaseline = 'middle';

    // the stamp: which way the life went
    const k = Easing.outBack(clamp(t / 0.5, 0, 1));
    g.save();
    g.translate(W / 2, H * 0.30);
    g.scale(k, k);
    g.rotate(-0.05);
    g.font = 'bold 40px "Courier New", monospace';
    g.strokeStyle = this.choice === 'send' ? C.gold : C.red;
    g.lineWidth = 3;
    const label = this.choice === 'send' ? 'SENT' : 'DELETED';
    const w = g.measureText(label).width;
    g.strokeRect(-w / 2 - 22, -32, w + 44, 64);
    g.fillStyle = this.choice === 'send' ? C.gold : C.red;
    g.fillText(label, 0, 0);
    g.restore();

    if (t > 0.5) {
      g.globalAlpha = clamp((t - 0.5) / 0.6, 0, 1);
      g.font = `${FS}px "Courier New", monospace`;
      g.fillStyle = C.ink;
      let y = H * 0.50;
      for (const para of out.line.split('\n')) {
        if (!para) { y += 12; continue; }
        for (const ln of wrapText(g, para, W * 0.74)) { g.fillText(ln, W / 2, y); y += FS + 9; }
      }
    }
    if (t > 1.2) {
      g.globalAlpha = clamp((t - 1.2) / 0.5, 0, 1);
      g.font = 'bold 13px "Courier New", monospace';
      g.fillStyle = C.dim;
      g.fillText('PART ONE', W / 2, H - 96);
      g.font = `bold ${IS_TOUCH ? 26 : 24}px "Courier New", monospace`;
      g.fillStyle = C.gold;
      g.fillText(out.part, W / 2, H - 68);
      g.font = '12px "Courier New", monospace';
      g.fillStyle = C.dim;
      g.fillText(IS_TOUCH ? 'tap to begin' : 'press E / SPACE to begin', W / 2, H - 32);
    }
    g.globalAlpha = 1;
  },
};
