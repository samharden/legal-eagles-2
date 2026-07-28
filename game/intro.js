"use strict";
// ============================== THE OPENING ==============================
// One continuous cinematic that ends on a two-choice dialog with a cursor
// blinking in an empty To: field. There is no confirmation prompt and no way
// back. Whichever key the player hits is the game they get:
//
//   SEND   -> layer 'street' -> THE SOLO SHINGLE
//   DELETE -> layer 'floor'  -> WAS THIS ALL A DREAM?

import { ctx, W, H, C, IS_TOUCH, wrapText } from '../engine/stage.js';
import { Typewriter, Transition, Easing, clamp } from '../engine/anim.js';
import { SFX } from '../engine/audio.js';
import * as Input from '../engine/input.js';

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
    id: 'C', tag: 'EXHIBIT C', title: 'THE LETTER', art: drawLetter,
    body: 'Dear Managing Partner Hargrove:\n'
      + 'Please accept this as notice of my resignation, effective immediately.\n'
      + 'I am grateful for the opportunity. I am not grateful for the rest of it.\n'
      + 'Very truly yours,',
  },
  {
    id: 'D', tag: 'EXHIBIT D', title: 'THE CHOICE', art: drawChoiceArt,
    body: 'The cursor is in an empty To: field.\n'
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

  start(onDone) {
    this.active = true; this.i = 0; this.sceneT = 0; this.sel = 0;
    this.choice = null; this.outroT = 0; this.onDone = onDone;
    document.body.classList.add('reel');
    this._load();
  },
  _load() {
    const s = SCENES[this.i];
    this.tw = new Typewriter(s.body, { cps: CPS, onShout: () => SFX.ret() });
    this.trans.start();
    this.sceneT = 0;
  },
  finish() {
    this.active = false;
    document.body.classList.remove('reel');
    const out = OUTCOMES[this.choice || 'send'];
    if (this.onDone) this.onDone(out.layer, this.choice || 'send');
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
    const s = SCENES[this.i];
    if (!this.tw.done) { this.tw.finish(); SFX.page(); return; }
    if (s.choices) return;             // the fork does not auto-advance
    if (this.i < SCENES.length - 1) { this.i++; this._load(); SFX.page(); }
  },

  pick(n) {
    const s = SCENES[this.i];
    if (!s.choices || this.choice) return;
    const c = s.choices[n];
    if (!c) return;
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

    const s = SCENES[this.i];
    // auto page-turn once the narration has landed — except on the fork
    if (this.tw.done && !s.choices && this.sceneT > 3.6 + this.tw.text.length / CPS) this.advance();

    // input
    if (Input.pressed('cancel')) { this.skip(); return; }
    if (s.choices && this.tw.done) {
      const nv = Input.nav();
      if (nv === 'up') { this.sel = (this.sel + s.choices.length - 1) % s.choices.length; SFX.blip(); }
      if (nv === 'down') { this.sel = (this.sel + 1) % s.choices.length; SFX.blip(); }
      const n = Input.numberPressed();
      if (n >= 1 && n <= s.choices.length) { this.pick(n - 1); return; }
      if (Input.pressed('confirm') || Input.pressed('interact')) { this.pick(this.sel); return; }
    } else if (Input.pressed('confirm') || Input.pressed('interact') || Input.pressed('fire') || Input.pressed('strike')) {
      this.advance();
    }
  },

  // a tap anywhere: fast-forward, turn the page, or hit a choice row
  tap(x, y) {
    const s = SCENES[this.i];
    if (this.choice) { if (this.outroT > 1.2) this.finish(); return; }
    if (x > W - 110 && y < 54) { this.skip(); return; }
    if (s.choices && this.tw.done) {
      for (let i = 0; i < this._rects.length; i++) {
        const r = this._rects[i];
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
    if (s.art) s.art(g, this.sceneT);
    g.restore();

    // ---- layout, bottom-up ----------------------------------------------
    // The type block is measured against the FULL scene text, not the portion
    // typed so far, so the slate does not creep upward as characters land — and
    // the choice rows get a reserved band that the body can never grow into.
    g.font = `${FS}px "Courier New", monospace`;
    const maxW = W * WRAP;
    const paras = SCENES[this.i].body.split('\n').map(p => wrapText(g, p, maxW));
    const lineH = FS + 8;
    const bodyH = paras.reduce((n, ls) => n + ls.length * lineH + 5, 0);

    const showChoices = !!(s.choices && this.tw.done);
    const choicesH = s.choices ? s.choices.length * 54 : 0;
    const choicesTop = H - 26 - choicesH;
    const bodyBottom = (s.choices ? choicesTop : H - 44) - 14;
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
      s.choices.forEach((c, i) => {
        const on = i === this.sel;
        const rw = Math.min(W - 68, 520), rh = 46;
        this._rects.push({ x: 34, y: cy - 4, w: rw, h: rh });
        g.fillStyle = on ? 'rgba(240,199,94,0.13)' : 'rgba(255,255,255,0.03)';
        g.fillRect(34, cy - 4, rw, rh);
        g.strokeStyle = on ? C.gold : C.rule; g.lineWidth = on ? 2 : 1;
        g.strokeRect(34, cy - 4, rw, rh);
        g.font = `bold ${FS}px "Courier New", monospace`;
        g.fillStyle = on ? C.gold : C.muted;
        g.fillText(`${i + 1}.  ${c.label}`, 48, cy + 12);
        g.font = `${FS - 4}px "Courier New", monospace`;
        g.fillStyle = C.dim;
        g.fillText(c.sub, 48, cy + 32);
        cy += 54;
      });
    } else if (!s.choices) {
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
